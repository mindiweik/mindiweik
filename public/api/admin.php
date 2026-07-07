<?php
declare(strict_types=1);

// Token-gated comment management. Comments publish themselves once the author
// confirms via the emailed link, so there is no approval queue: this page lists
// every comment (live and pending confirmation) and lets you delete spam or
// abuse. The admin token is accepted only once, on the login POST, and is never
// rendered into HTML. After login an HttpOnly session cookie keeps the admin
// in; the Delete action is authorised by a random per-session CSRF token, so
// the secret token never appears on the page. Serve only over HTTPS.

$config = require __DIR__ . '/../../comments-config.php';
require __DIR__ . '/lib/subscribe-lib.php';
require __DIR__ . '/mailer.php';

session_set_cookie_params([
  'httponly' => true,
  'secure'   => true,
  'samesite' => 'Strict',
]);
session_start();

function db(array $config): PDO {
  $dsn = sprintf('mysql:host=%s;dbname=%s;charset=utf8mb4', $config['db_host'], $config['db_name']);
  return new PDO($dsn, $config['db_user'], $config['db_pass'], [
    PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    PDO::ATTR_EMULATE_PREPARES   => false,
  ]);
}
function h(?string $s): string {
  return htmlspecialchars((string) $s, ENT_QUOTES, 'UTF-8');
}

header('Content-Type: text/html; charset=utf-8');
header('X-Robots-Tag: noindex, nofollow');

$token = (string) ($config['admin_token'] ?? '');

// Login: the ONLY place the raw token is read. Compared, then discarded.
if (isset($_POST['token'])) {
  if ($token !== '' && hash_equals($token, (string) $_POST['token'])) {
    session_regenerate_id(true);
    $_SESSION['comments_admin'] = true;
  } else {
    usleep(300000); // small penalty to slow brute force
  }
}

$authed = ($_SESSION['comments_admin'] ?? false) === true;

if (!$authed) {
  echo '<!doctype html><html><head><meta name="robots" content="noindex">'
     . '<meta name="viewport" content="width=device-width,initial-scale=1">'
     . '<title>comments admin</title></head><body style="font-family:sans-serif;max-width:32rem;margin:3rem auto">'
     . '<h1>comments admin</h1><form method="post">'
     . '<input type="password" name="token" placeholder="admin token" autofocus style="padding:.5rem;width:60%">'
     . '<button type="submit" style="padding:.5rem 1rem">sign in</button></form></body></html>';
  exit;
}

// Per-session CSRF token for action forms. Never reveals the admin token.
if (empty($_SESSION['csrf'])) {
  $_SESSION['csrf'] = bin2hex(random_bytes(16));
}
$csrf = (string) $_SESSION['csrf'];

$pdo = db($config);

$action = (string) ($_POST['action'] ?? '');
if ($action === 'delete') {
  if (!hash_equals($csrf, (string) ($_POST['csrf'] ?? ''))) {
    http_response_code(400);
    echo 'bad request';
    exit;
  }
  $id = (int) ($_POST['id'] ?? 0);
  if ($id > 0) {
    $pdo->prepare('DELETE FROM comments WHERE id = ?')->execute([$id]);
  }
}

$notice = '';
if ($action === 'sub_delete') {
  if (!hash_equals($csrf, (string) ($_POST['csrf'] ?? ''))) {
    http_response_code(400);
    echo 'bad request';
    exit;
  }
  $id = (int) ($_POST['id'] ?? 0);
  if ($id > 0) {
    // Queue rows cascade via fk_sq_subscriber.
    $pdo->prepare('DELETE FROM subscribers WHERE id = ?')->execute([$id]);
    $notice = 'subscriber deleted.';
  }
}

if ($action === 'newsletter_test' || $action === 'newsletter_send') {
  if (!hash_equals($csrf, (string) ($_POST['csrf'] ?? ''))) {
    http_response_code(400);
    echo 'bad request';
    exit;
  }
  $subject = trim((string) ($_POST['subject'] ?? ''));
  $body    = trim((string) ($_POST['body'] ?? ''));
  if ($subject === '' || mb_strlen($subject) > 190 || $body === '') {
    $notice = 'newsletter needs a subject (max 190 chars) and a body.';
  } elseif ($action === 'newsletter_test') {
    // Sends the draft to the from address only; no rows are created. Empty
    // manage token = no footer, since the links would be fake anyway.
    try {
      send_list_email($config, (string) $config['from_email'], $subject, $body, '');
      $notice = 'test sent to ' . (string) $config['from_email'] . '.';
    } catch (Throwable $mailError) {
      $notice = 'test send FAILED: ' . $mailError->getMessage();
    }
  } else {
    // Real send: record the issue, enqueue one row per active newsletter
    // subscriber. recipient_count and sent_at are filled here, at send time;
    // the cron does the actual SMTP work in batches.
    $pdo->prepare('INSERT INTO issues (subject, body, sent_at) VALUES (?, ?, UTC_TIMESTAMP())')
        ->execute([$subject, $body]);
    $issueId = (int) $pdo->lastInsertId();
    $q = $pdo->prepare(
      'INSERT INTO send_queue (subscriber_id, issue_id, status, attempts, created_at)
       SELECT id, ?, 0, 0, UTC_TIMESTAMP() FROM subscribers WHERE status = 1 AND wants_newsletter = 1'
    );
    $q->execute([$issueId]);
    $count = $q->rowCount();
    $pdo->prepare('UPDATE issues SET recipient_count = ? WHERE id = ?')->execute([$count, $issueId]);
    $notice = "issue queued for {$count} subscribers. the cron sends it within ~" . (int) ceil($count / 40) * 15 . ' minutes.';
  }
}

$rows = $pdo->query(
  'SELECT id, page_key, author_name, author_email, body, created_at, ip_address, approved
     FROM comments ORDER BY created_at DESC'
)->fetchAll();

echo '<!doctype html><html><head><meta name="robots" content="noindex">'
   . '<meta name="viewport" content="width=device-width,initial-scale=1">'
   . '<title>comments admin</title></head>'
   . '<body style="font-family:sans-serif;max-width:48rem;margin:2rem auto">';
echo '<h1>comments (' . count($rows) . ')</h1>';
if (!$rows) {
  echo '<p>no comments yet.</p>';
}
foreach ($rows as $r) {
  $live = (int) $r['approved'] === 1;
  $badge = $live ? 'live' : 'pending confirmation';
  echo '<div style="border:1px solid #ccc;border-radius:8px;padding:1rem;margin:1rem 0">';
  echo '<div style="font-size:.8rem;color:#555">'
     . '[' . $badge . '] '
     . h($r['author_name']) . ' &lt;' . h($r['author_email']) . '&gt; · '
     . h($r['page_key']) . ' · ' . h($r['created_at']) . ' · ' . h($r['ip_address']) . '</div>';
  echo '<p style="white-space:pre-wrap">' . h($r['body']) . '</p>';
  echo '<form method="post" style="display:inline">'
     . '<input type="hidden" name="csrf" value="' . h($csrf) . '">'
     . '<input type="hidden" name="id" value="' . (int) $r['id'] . '">'
     . '<button name="action" value="delete" onclick="return confirm(\'delete?\')">delete</button>'
     . '</form>';
  echo '</div>';
}

// ---- newsletter section ----------------------------------------------------
$counts = $pdo->query(
  'SELECT
     SUM(status = 1 AND wants_blog = 1)       AS blog,
     SUM(status = 1 AND wants_podcast = 1)    AS podcast,
     SUM(status = 1 AND wants_newsletter = 1) AS newsletter,
     SUM(status = 1)                          AS active,
     SUM(status = 0)                          AS pending,
     SUM(status = 2)                          AS unsubscribed
   FROM subscribers'
)->fetch();
$queueDepth = (int) $pdo->query('SELECT COUNT(*) FROM send_queue WHERE status = 0')->fetchColumn();

echo '<hr style="margin:2rem 0"><h1>newsletter</h1>';
if ($notice !== '') {
  echo '<p style="border-left:3px solid #6e7bff;padding-left:.7rem">' . h($notice) . '</p>';
}
echo '<p style="font-size:.85rem;color:#555">active: ' . (int) $counts['active']
   . ' (blog ' . (int) $counts['blog'] . ' · podcast ' . (int) $counts['podcast']
   . ' · newsletter ' . (int) $counts['newsletter'] . ') · pending: ' . (int) $counts['pending']
   . ' · unsubscribed: ' . (int) $counts['unsubscribed']
   . ' · queue depth: ' . $queueDepth . '</p>';

echo '<form method="post" style="border:1px solid #ccc;border-radius:8px;padding:1rem;margin:1rem 0">'
   . '<input type="hidden" name="csrf" value="' . h($csrf) . '">'
   . '<p><input name="subject" placeholder="subject" maxlength="190" style="padding:.5rem;width:100%"'
   . ' value="' . h((string) ($_POST['subject'] ?? '')) . '"></p>'
   . '<p><textarea name="body" rows="10" placeholder="plain text body" style="padding:.5rem;width:100%">'
   . h((string) ($_POST['body'] ?? '')) . '</textarea></p>'
   . '<button name="action" value="newsletter_test" style="padding:.5rem 1rem">send test to me</button> '
   . '<button name="action" value="newsletter_send" style="padding:.5rem 1rem"'
   . ' onclick="return confirm(\'send to all newsletter subscribers?\')">send</button>'
   . '</form>';

// ---- subscriber list ---------------------------------------------------
$subs = $pdo->query(
  'SELECT id, email, status, wants_blog, wants_podcast, wants_newsletter, created_at, confirmed_at
     FROM subscribers ORDER BY created_at DESC'
)->fetchAll();
echo '<h2 style="font-size:1rem">subscribers (' . count($subs) . ')</h2>';
if (!$subs) {
  echo '<p>no subscribers yet.</p>';
}
$statusLabel = [0 => 'pending', 1 => 'active', 2 => 'unsubscribed'];
foreach ($subs as $s) {
  $topics = implode(' ', array_filter([
    (int) $s['wants_blog'] ? 'blog' : null,
    (int) $s['wants_podcast'] ? 'podcast' : null,
    (int) $s['wants_newsletter'] ? 'newsletter' : null,
  ]));
  echo '<div style="border:1px solid #ccc;border-radius:8px;padding:.7rem 1rem;margin:.6rem 0;font-size:.85rem">'
     . '[' . h($statusLabel[(int) $s['status']] ?? '?') . '] '
     . h($s['email']) . ' · ' . h($topics)
     . ' · joined ' . h($s['created_at'])
     . ((string) $s['confirmed_at'] !== '' ? ' · confirmed ' . h((string) $s['confirmed_at']) : '')
     . ' <form method="post" style="display:inline">'
     . '<input type="hidden" name="csrf" value="' . h($csrf) . '">'
     . '<input type="hidden" name="id" value="' . (int) $s['id'] . '">'
     . '<button name="action" value="sub_delete" onclick="return confirm(\'delete subscriber?\')">delete</button>'
     . '</form></div>';
}
echo '</body></html>';
