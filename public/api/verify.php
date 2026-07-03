<?php
declare(strict_types=1);

// Comment confirmation endpoint. The link emailed to a commenter points here:
//   GET /api/verify.php?token=<64 hex>
// A valid token flips its comment from pending (approved=0) to live
// (approved=1) and clears the token so the link cannot be reused.

$config = require __DIR__ . '/../../comments-config.php';

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

$siteUrl = rtrim((string) ($config['site_url'] ?? 'https://mindiweik.com'), '/');

function render(string $title, string $message, string $link, string $linkLabel): void {
  echo '<!doctype html><html lang="en"><head><meta charset="utf-8">'
     . '<meta name="robots" content="noindex"><meta name="viewport" content="width=device-width,initial-scale=1">'
     . '<title>' . h($title) . '</title></head>'
     . '<body style="font-family:system-ui,sans-serif;max-width:34rem;margin:4rem auto;padding:0 1rem;line-height:1.5">'
     . '<h1 style="font-size:1.3rem">' . h($title) . '</h1>'
     . '<p>' . h($message) . '</p>'
     . '<p><a href="' . h($link) . '">' . h($linkLabel) . '</a></p>'
     . '</body></html>';
  exit;
}

$token = (string) ($_GET['token'] ?? '');

// Tokens are 64 hex chars (bin2hex of 32 random bytes). Reject anything else
// before touching the database.
if (!preg_match('/^[a-f0-9]{64}$/', $token)) {
  http_response_code(400);
  render('Invalid link', 'This confirmation link is not valid.', $siteUrl, 'Back to mindiweik.com');
}

try {
  $pdo = db($config);

  $sel = $pdo->prepare('SELECT id, page_key FROM comments WHERE verify_token = ? AND approved = 0 LIMIT 1');
  $sel->execute([$token]);
  $row = $sel->fetch();

  if (!$row) {
    http_response_code(410);
    render('Link expired or already used', 'This comment may already be live, or the link has expired.', $siteUrl, 'Back to mindiweik.com');
  }

  $pdo->prepare('UPDATE comments SET approved = 1, verify_token = NULL WHERE id = ?')->execute([(int) $row['id']]);

  // page_key ("blog/slug" or "podcast/id") maps directly to a site route.
  $postUrl = $siteUrl . '/' . ltrim((string) $row['page_key'], '/');
  render('Comment confirmed', 'Thanks. Your comment is now live.', $postUrl, 'Back to the post');
} catch (Throwable $e) {
  http_response_code(500);
  render('Something went wrong', 'Please try the link again in a little while.', $siteUrl, 'Back to mindiweik.com');
}
