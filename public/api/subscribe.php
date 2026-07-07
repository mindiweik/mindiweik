<?php
declare(strict_types=1);

// Email subscription signup.
//   POST /api/subscribe.php  { email, wants_blog, wants_podcast, wants_newsletter, website }
// Double opt-in: rows start pending (status=0); confirm.php flips them active.
// The response is deliberately identical for new / pending / active /
// unsubscribed addresses so the form cannot be used to probe list membership.

$config = require __DIR__ . '/../../comments-config.php';
require __DIR__ . '/lib/subscribe-lib.php';
require __DIR__ . '/mailer.php';

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: ' . ($config['allowed_origin'] ?? ''));
header('Vary: Origin');
header('X-Content-Type-Options: nosniff');

function respond(int $status, array $payload): void {
  http_response_code($status);
  echo json_encode($payload);
  exit;
}

const SUCCESS = ['ok' => true, 'message' => 'Almost there. Check your email to confirm your subscription.'];

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
  respond(405, ['error' => 'method not allowed']);
}

try {
  $ctype = $_SERVER['CONTENT_TYPE'] ?? '';
  if (str_contains($ctype, 'application/json')) {
    $data = json_decode((string) file_get_contents('php://input'), true) ?: [];
  } else {
    $data = $_POST;
  }

  // Honeypot: humans never see "website"; bots fill it. Pretend success.
  if (!empty($data['website'])) {
    respond(200, SUCCESS);
  }

  $email      = strtolower(trim((string) ($data['email'] ?? '')));
  $wantsBlog  = !empty($data['wants_blog']) ? 1 : 0;
  $wantsPod   = !empty($data['wants_podcast']) ? 1 : 0;
  $wantsNews  = !empty($data['wants_newsletter']) ? 1 : 0;

  $errors = [];
  if (!sub_valid_email($email))                    $errors[] = 'email';
  if ($wantsBlog + $wantsPod + $wantsNews === 0)   $errors[] = 'topics';
  if ($errors) respond(422, ['error' => 'invalid', 'fields' => $errors]);

  $pdo = sub_db($config);
  $ip  = $_SERVER['REMOTE_ADDR'] ?? null;

  // Rate limit new signups: at most 3 per minute and 10 per hour per IP.
  // Counts inserted rows only; re-sends to an existing address are instead
  // bounded by the per-address daily cap below.
  if ($ip !== null) {
    $rl = $pdo->prepare(
      'SELECT
         SUM(created_at >= UTC_TIMESTAMP() - INTERVAL 1 MINUTE) AS last_min,
         SUM(created_at >= UTC_TIMESTAMP() - INTERVAL 1 HOUR)   AS last_hour
       FROM subscribers WHERE ip_address = ?'
    );
    $rl->execute([$ip]);
    $c = $rl->fetch();
    if ((int) $c['last_min'] >= 3 || (int) $c['last_hour'] >= 10) {
      respond(429, ['error' => 'Too many signups. Please wait a bit.']);
    }
  }

  $sel = $pdo->prepare(
    'SELECT id, status, confirm_sends, confirm_sends_date FROM subscribers WHERE email = ? LIMIT 1'
  );
  $sel->execute([$email]);
  $row = $sel->fetch();

  // Per-address cap: at most 3 confirmation emails per day, so the form
  // cannot be used to bombard a victim's inbox. Resets when the date rolls.
  $underCap = function (array $r): bool {
    $today = gmdate('Y-m-d');
    return $r['confirm_sends_date'] !== $today || (int) $r['confirm_sends'] < 3;
  };
  $topicNames = array_filter([
    $wantsBlog  ? 'blog posts' : null,
    $wantsPod   ? 'podcast episodes' : null,
    $wantsNews  ? 'newsletter' : null,
  ]);

  if ($row === false) {
    // New address: pending row + confirmation email.
    $verify = bin2hex(random_bytes(32));
    $manage = bin2hex(random_bytes(32));
    $ins = $pdo->prepare(
      'INSERT INTO subscribers
         (email, status, verify_token, manage_token, wants_blog, wants_podcast, wants_newsletter,
          confirm_sends, confirm_sends_date, created_at, ip_address)
       VALUES (?, 0, ?, ?, ?, ?, ?, 1, UTC_DATE(), UTC_TIMESTAMP(), ?)'
    );
    $ins->execute([$email, $verify, $manage, $wantsBlog, $wantsPod, $wantsNews, $ip]);
    $id = (int) $pdo->lastInsertId();
    $confirmLink = sub_site_url($config) . '/api/confirm.php?token=' . $verify;
    try {
      send_subscribe_confirm_email($config, $email, $topicNames, $confirmLink);
    } catch (Throwable $mailError) {
      // A failed send must not leave an orphaned pending row.
      $pdo->prepare('DELETE FROM subscribers WHERE id = ?')->execute([$id]);
      respond(502, ['error' => 'We could not send the confirmation email. Please try again.']);
    }
    respond(200, SUCCESS);
  }

  if ((int) $row['status'] === 1) {
    // Already active: nothing to do, identical response.
    respond(200, SUCCESS);
  }

  // Pending or unsubscribed: back to pending with a fresh single-use token
  // and the latest topic choices. manage_token never changes.
  if ($underCap($row)) {
    $verify = bin2hex(random_bytes(32));
    $upd = $pdo->prepare(
      'UPDATE subscribers
          SET status = 0, verify_token = ?, wants_blog = ?, wants_podcast = ?, wants_newsletter = ?,
              confirm_sends = IF(confirm_sends_date = UTC_DATE(), confirm_sends + 1, 1),
              confirm_sends_date = UTC_DATE()
        WHERE id = ?'
    );
    $upd->execute([$verify, $wantsBlog, $wantsPod, $wantsNews, (int) $row['id']]);
    $confirmLink = sub_site_url($config) . '/api/confirm.php?token=' . $verify;
    try {
      send_subscribe_confirm_email($config, $email, $topicNames, $confirmLink);
    } catch (Throwable $mailError) {
      // Row already existed; keep it, just report the send failure.
      respond(502, ['error' => 'We could not send the confirmation email. Please try again.']);
    }
  }
  // Capped: silently skip the send. Same response either way.
  respond(200, SUCCESS);
} catch (Throwable $e) {
  respond(500, ['error' => 'server error']);
}
