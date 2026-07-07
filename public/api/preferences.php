<?php
declare(strict_types=1);

// Subscriber preferences page, keyed by the permanent manage_token from the
// email footer.
//   GET  /api/preferences.php?token=<64 hex>   -> render form
//   POST action=save          -> update topic flags
//   POST action=unsubscribe   -> status=2
// The token itself is the credential (a secret URL only the subscriber's
// inbox has), so there is no separate session or CSRF token here.

$config = require __DIR__ . '/../../comments-config.php';
require __DIR__ . '/lib/subscribe-lib.php';

header('Content-Type: text/html; charset=utf-8');
header('X-Robots-Tag: noindex, nofollow');
// Never leak the token to linked pages via the Referer header.
header('Referrer-Policy: no-referrer');

$siteUrl = sub_site_url($config);
$token = (string) ($_GET['token'] ?? ($_POST['token'] ?? ''));

if (!sub_valid_token($token)) {
  http_response_code(400);
  sub_render_page('Invalid link', 'This preferences link is not valid.', $siteUrl, 'Back to mindiweik.com');
}

function render_form(array $sub, string $token, string $siteUrl, string $notice = ''): void {
  $cb = function (string $name, string $label, int $checked): string {
    return '<label style="display:block;margin:.4rem 0"><input type="checkbox" name="' . $name . '" value="1"'
      . ($checked ? ' checked' : '') . '> ' . $label . '</label>';
  };
  echo '<!doctype html><html lang="en"><head><meta charset="utf-8">'
     . '<meta name="robots" content="noindex"><meta name="viewport" content="width=device-width,initial-scale=1">'
     . '<title>Email preferences</title></head>'
     . '<body style="font-family:system-ui,sans-serif;max-width:34rem;margin:4rem auto;padding:0 1rem;line-height:1.5">'
     . '<h1 style="font-size:1.3rem">Email preferences</h1>'
     . '<p>Settings for <strong>' . sub_h($sub['email']) . '</strong>.</p>'
     . ($notice !== '' ? '<p style="border-left:3px solid #6e7bff;padding-left:.7rem">' . sub_h($notice) . '</p>' : '')
     . '<form method="post" action="/api/preferences.php">'
     . '<input type="hidden" name="token" value="' . sub_h($token) . '">'
     . $cb('wants_blog', 'blog posts', (int) $sub['wants_blog'])
     . $cb('wants_podcast', 'podcast episodes', (int) $sub['wants_podcast'])
     . $cb('wants_newsletter', 'newsletter', (int) $sub['wants_newsletter'])
     . '<p style="margin-top:1rem">'
     . '<button name="action" value="save" style="padding:.5rem 1rem">save preferences</button> '
     . '<button name="action" value="unsubscribe" style="padding:.5rem 1rem"'
     . ' onclick="return confirm(\'Unsubscribe from everything?\')">unsubscribe from everything</button>'
     . '</p></form>'
     . '<p><a href="' . sub_h($siteUrl) . '">Back to mindiweik.com</a></p>'
     . '</body></html>';
  exit;
}

try {
  $pdo = sub_db($config);
  $sel = $pdo->prepare(
    'SELECT id, email, status, wants_blog, wants_podcast, wants_newsletter
       FROM subscribers WHERE manage_token = ? LIMIT 1'
  );
  $sel->execute([$token]);
  $sub = $sel->fetch();

  if (!$sub) {
    http_response_code(404);
    sub_render_page('Not found', 'This preferences link does not match a subscription.', $siteUrl, 'Back to mindiweik.com');
  }

  if ((int) $sub['status'] === 2) {
    sub_render_page(
      'Unsubscribed',
      'This address is unsubscribed. To hear from mindiweik.com again, use the subscribe form on the site.',
      $siteUrl,
      'Back to mindiweik.com'
    );
  }

  if (($_SERVER['REQUEST_METHOD'] ?? '') === 'POST') {
    $action = (string) ($_POST['action'] ?? '');
    if ($action === 'unsubscribe') {
      $pdo->prepare('UPDATE subscribers SET status = 2 WHERE id = ?')->execute([(int) $sub['id']]);
      sub_render_page('Unsubscribed', 'You will not get any more emails from mindiweik.com.', $siteUrl, 'Back to mindiweik.com');
    }
    if ($action === 'save') {
      $blog = !empty($_POST['wants_blog']) ? 1 : 0;
      $pod  = !empty($_POST['wants_podcast']) ? 1 : 0;
      $news = !empty($_POST['wants_newsletter']) ? 1 : 0;
      if ($blog + $pod + $news === 0) {
        render_form($sub, $token, $siteUrl, 'Pick at least one topic, or use the unsubscribe button.');
      }
      $pdo->prepare(
        'UPDATE subscribers SET wants_blog = ?, wants_podcast = ?, wants_newsletter = ? WHERE id = ?'
      )->execute([$blog, $pod, $news, (int) $sub['id']]);
      $sub['wants_blog'] = $blog;
      $sub['wants_podcast'] = $pod;
      $sub['wants_newsletter'] = $news;
      render_form($sub, $token, $siteUrl, 'Saved.');
    }
  }

  render_form($sub, $token, $siteUrl);
} catch (Throwable $e) {
  http_response_code(500);
  sub_render_page('Something went wrong', 'Please try the link again in a little while.', $siteUrl, 'Back to mindiweik.com');
}
