<?php
declare(strict_types=1);

// One-click unsubscribe.
//   GET  /api/unsubscribe.php?token=<64 hex>  -> confirmation page with one button
//   POST                                       -> status=2, done
// GET never mutates: mail scanners prefetch every link in an email, and a
// GET-effective unsubscribe would let them silently drop subscribers. The
// List-Unsubscribe header advertises the POST path per RFC 8058, so mail
// clients' native Unsubscribe buttons work in one click.

$config = require __DIR__ . '/../../comments-config.php';
require __DIR__ . '/lib/subscribe-lib.php';

header('Content-Type: text/html; charset=utf-8');
header('X-Robots-Tag: noindex, nofollow');
header('Referrer-Policy: no-referrer');

$siteUrl = sub_site_url($config);
$token = (string) ($_GET['token'] ?? ($_POST['token'] ?? ''));

if (!sub_valid_token($token)) {
  http_response_code(400);
  sub_render_page('Invalid link', 'This unsubscribe link is not valid.', $siteUrl, 'Back to mindiweik.com');
}

try {
  $pdo = sub_db($config);
  $sel = $pdo->prepare('SELECT id, email FROM subscribers WHERE manage_token = ? LIMIT 1');
  $sel->execute([$token]);
  $sub = $sel->fetch();

  if (!$sub) {
    http_response_code(404);
    sub_render_page('Not found', 'This unsubscribe link does not match a subscription.', $siteUrl, 'Back to mindiweik.com');
  }

  if (($_SERVER['REQUEST_METHOD'] ?? '') === 'POST') {
    $pdo->prepare('UPDATE subscribers SET status = 2 WHERE id = ?')->execute([(int) $sub['id']]);
    sub_render_page('Unsubscribed', 'You will not get any more emails from mindiweik.com.', $siteUrl, 'Back to mindiweik.com');
  }

  // GET: confirm with a button. The form posts back to this same URL.
  echo '<!doctype html><html lang="en"><head><meta charset="utf-8">'
     . '<meta name="robots" content="noindex"><meta name="viewport" content="width=device-width,initial-scale=1">'
     . '<title>Unsubscribe</title></head>'
     . '<body style="font-family:system-ui,sans-serif;max-width:34rem;margin:4rem auto;padding:0 1rem;line-height:1.5">'
     . '<h1 style="font-size:1.3rem">Unsubscribe</h1>'
     . '<p>Stop all emails from mindiweik.com to <strong>' . sub_h($sub['email']) . '</strong>?</p>'
     . '<form method="post" action="/api/unsubscribe.php">'
     . '<input type="hidden" name="token" value="' . sub_h($token) . '">'
     . '<button type="submit" style="padding:.5rem 1rem">yes, unsubscribe me</button>'
     . '</form>'
     . '<p style="margin-top:1rem"><a href="/api/preferences.php?token=' . sub_h($token) . '">'
     . 'Or just change which topics you get</a></p>'
     . '</body></html>';
} catch (Throwable $e) {
  http_response_code(500);
  sub_render_page('Something went wrong', 'Please try the link again in a little while.', $siteUrl, 'Back to mindiweik.com');
}
