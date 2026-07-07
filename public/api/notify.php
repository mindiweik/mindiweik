<?php
declare(strict_types=1);

// Subscription notifier + queue drain. Hit by Hostinger cron every 15 min:
//   GET /api/notify.php?key=<cron_key>
// 1. Diff /notify-feed.json against sent_items; enqueue new items for every
//    active subscriber whose topic flag matches. Insert into sent_items FIRST
//    so a redeploy or feed reorder can never re-email the list.
// 2. Drain up to 40 queued rows oldest-first through send_list_email.
// 40 per run * 4 runs/hour = 160 emails/hour, under the mailbox cap.

$config = require __DIR__ . '/../../comments-config.php';
require __DIR__ . '/lib/subscribe-lib.php';
require __DIR__ . '/mailer.php';

header('Content-Type: text/plain; charset=utf-8');
header('X-Robots-Tag: noindex, nofollow');

$cronKey = (string) ($config['cron_key'] ?? '');
if ($cronKey === '' || !hash_equals($cronKey, (string) ($_GET['key'] ?? ''))) {
  http_response_code(403);
  echo "forbidden\n";
  exit;
}

// Sample mode: preview the current email copy without touching sent_items or
// the queue. Sends one blog and one podcast sample (newest of each in the
// feed) to an address.
//   GET /api/notify.php?key=<cron_key>&sample=you@example.com
// If that address is a subscriber, the sample carries their real footer +
// unsubscribe links; otherwise it goes without a footer.
if (isset($_GET['sample'])) {
  $to = strtolower(trim((string) $_GET['sample']));
  if (!sub_valid_email($to)) {
    http_response_code(400);
    echo "bad sample address\n";
    exit;
  }
  try {
    $pdo = sub_db($config);
    $tokRow = $pdo->prepare('SELECT manage_token FROM subscribers WHERE email = ? LIMIT 1');
    $tokRow->execute([$to]);
    $sub = $tokRow->fetch();
    $token = $sub ? (string) $sub['manage_token'] : '';

    $raw = @file_get_contents(sub_site_url($config) . '/notify-feed.json');
    $items = $raw !== false ? json_decode($raw, true) : null;
    if (!is_array($items)) {
      http_response_code(502);
      echo "feed unavailable\n";
      exit;
    }
    $sent = [];
    foreach (['blog', 'podcast'] as $type) {
      foreach ($items as $item) {
        if (is_array($item) && ($item['type'] ?? '') === $type) {
          $mail = sub_content_email($item);
          send_list_email($config, $to, '[sample] ' . $mail['subject'], $mail['body'], $token);
          $sent[] = $type;
          break;
        }
      }
    }
    echo 'sample sent to ' . $to . ': ' . implode(', ', $sent) . "\n";
  } catch (Throwable $e) {
    http_response_code(500);
    echo "sample error\n";
  }
  exit;
}

const BATCH_SIZE = 40;
const MAX_ATTEMPTS = 3;

try {
  $pdo = sub_db($config);

  // --- 1. Fetch the feed and enqueue anything new -------------------------
  $feedOk = false;
  $byKey = [];
  $raw = @file_get_contents(sub_site_url($config) . '/notify-feed.json');
  $items = $raw !== false ? json_decode($raw, true) : null;
  if (is_array($items)) {
    $feedOk = true;
    foreach ($items as $item) {
      if (!is_array($item) || !isset($item['key'], $item['type'], $item['title'], $item['link'])) continue;
      $byKey[(string) $item['key']] = $item;
    }
  } else {
    echo "feed: FETCH FAILED (enqueue skipped, drain continues)\n";
  }

  $enqueued = 0;
  if ($feedOk) {
    $mark = $pdo->prepare('INSERT IGNORE INTO sent_items (item_key, sent_at) VALUES (?, UTC_TIMESTAMP())');
    foreach ($byKey as $key => $item) {
      $mark->execute([$key]);
      if ($mark->rowCount() === 0) continue; // already announced
      $flag = $item['type'] === 'podcast' ? 'wants_podcast' : 'wants_blog';
      // $flag is one of two hardcoded column names, never user input.
      $q = $pdo->prepare(
        "INSERT INTO send_queue (subscriber_id, item_key, status, attempts, created_at)
         SELECT id, ?, 0, 0, UTC_TIMESTAMP() FROM subscribers WHERE status = 1 AND {$flag} = 1"
      );
      $q->execute([$key]);
      $enqueued += $q->rowCount();
      echo 'enqueued ' . $key . ': ' . $q->rowCount() . " recipients\n";
    }
  }

  // --- 2. Cancel queued rows for subscribers who left ---------------------
  $cancelled = $pdo->query(
    'UPDATE send_queue q JOIN subscribers s ON s.id = q.subscriber_id
        SET q.status = 2
      WHERE q.status = 0 AND s.status <> 1'
  )->rowCount();

  // --- 3. Drain ------------------------------------------------------------
  $rows = $pdo->query(
    'SELECT q.id, q.item_key, q.issue_id, q.attempts, s.email, s.manage_token
       FROM send_queue q JOIN subscribers s ON s.id = q.subscriber_id
      WHERE q.status = 0 AND s.status = 1
      ORDER BY q.created_at ASC, q.id ASC
      LIMIT ' . BATCH_SIZE
  )->fetchAll();

  $issueCache = [];
  $issueSel = $pdo->prepare('SELECT subject, body FROM issues WHERE id = ?');
  $ok = $pdo->prepare('UPDATE send_queue SET status = 1, sent_at = UTC_TIMESTAMP() WHERE id = ?');
  $fail = $pdo->prepare('UPDATE send_queue SET attempts = ?, status = ? WHERE id = ?');

  $sent = 0;
  $failed = 0;
  foreach ($rows as $r) {
    $subject = null;
    $body = null;
    if ($r['item_key'] !== null) {
      $item = $byKey[$r['item_key']] ?? null;
      if ($item === null) {
        if (!$feedOk) continue; // transient feed failure: leave untouched for next run
        // Feed parsed fine but the item fell off the 20-item window before
        // its queue row drained. Count it as an attempt so it eventually dies.
        $failed++;
        $attempts = (int) $r['attempts'] + 1;
        $fail->execute([$attempts, $attempts >= MAX_ATTEMPTS ? 2 : 0, (int) $r['id']]);
        continue;
      }
      $email = sub_content_email($item);
      $subject = $email['subject'];
      $body = $email['body'];
    } else {
      $iid = (int) $r['issue_id'];
      if (!isset($issueCache[$iid])) {
        $issueSel->execute([$iid]);
        $issueCache[$iid] = $issueSel->fetch();
      }
      $issue = $issueCache[$iid];
      if (!$issue) { // issue row deleted; cancel
        $fail->execute([(int) $r['attempts'], 2, (int) $r['id']]);
        continue;
      }
      $subject = (string) $issue['subject'];
      $body = (string) $issue['body'];
    }

    try {
      send_list_email($config, (string) $r['email'], $subject, $body, (string) $r['manage_token']);
      $ok->execute([(int) $r['id']]);
      $sent++;
    } catch (Throwable $mailError) {
      $attempts = (int) $r['attempts'] + 1;
      $fail->execute([$attempts, $attempts >= MAX_ATTEMPTS ? 2 : 0, (int) $r['id']]);
      $failed++;
    }
  }

  $remaining = (int) $pdo->query('SELECT COUNT(*) FROM send_queue WHERE status = 0')->fetchColumn();
  echo "enqueued: {$enqueued}, cancelled: {$cancelled}, sent: {$sent}, failed: {$failed}, still queued: {$remaining}\n";
} catch (Throwable $e) {
  http_response_code(500);
  echo "error\n";
}
