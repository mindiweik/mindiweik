<?php
declare(strict_types=1);

// Subscription confirmation endpoint. The link emailed by subscribe.php
// points here:
//   GET /api/confirm.php?token=<64 hex>
// A valid token flips its subscriber from pending (status=0) to active
// (status=1) and clears the token so the link cannot be reused.

$config = require __DIR__ . '/../../comments-config.php';
require __DIR__ . '/lib/subscribe-lib.php';

header('Content-Type: text/html; charset=utf-8');
header('X-Robots-Tag: noindex, nofollow');

$siteUrl = sub_site_url($config);
$token = (string) ($_GET['token'] ?? '');

if (!sub_valid_token($token)) {
  http_response_code(400);
  sub_render_page('Invalid link', 'This confirmation link is not valid.', $siteUrl, 'Back to mindiweik.com');
}

try {
  $pdo = sub_db($config);

  $sel = $pdo->prepare('SELECT id FROM subscribers WHERE verify_token = ? AND status = 0 LIMIT 1');
  $sel->execute([$token]);
  $row = $sel->fetch();

  if (!$row) {
    http_response_code(410);
    sub_render_page(
      'Link expired or already used',
      'You may already be subscribed, or the link has expired. Subscribing again from the site sends a fresh link.',
      $siteUrl,
      'Back to mindiweik.com'
    );
  }

  $pdo->prepare(
    'UPDATE subscribers SET status = 1, confirmed_at = UTC_TIMESTAMP(), verify_token = NULL WHERE id = ?'
  )->execute([(int) $row['id']]);

  sub_render_page(
    'Subscription confirmed',
    'Thanks, you are on the list. New posts and episodes will land in your inbox.',
    $siteUrl,
    'Back to mindiweik.com'
  );
} catch (Throwable $e) {
  http_response_code(500);
  sub_render_page('Something went wrong', 'Please try the link again in a little while.', $siteUrl, 'Back to mindiweik.com');
}
