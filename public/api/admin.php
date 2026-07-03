<?php
declare(strict_types=1);

// Token-gated moderation for the comments queue. The admin token is accepted
// only once, on the login POST, and is never rendered into HTML. After a
// successful login an HttpOnly session cookie keeps the admin in; Approve and
// Delete actions are authorised by a random per-session CSRF token, so the
// secret token never appears on the page. Serve only over HTTPS.

$config = require __DIR__ . '/../../comments-config.php';

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
if ($action === 'approve' || $action === 'delete') {
  if (!hash_equals($csrf, (string) ($_POST['csrf'] ?? ''))) {
    http_response_code(400);
    echo 'bad request';
    exit;
  }
  $id = (int) ($_POST['id'] ?? 0);
  if ($id > 0) {
    if ($action === 'approve') {
      $pdo->prepare('UPDATE comments SET approved = 1 WHERE id = ?')->execute([$id]);
    } else {
      $pdo->prepare('DELETE FROM comments WHERE id = ?')->execute([$id]);
    }
  }
}

$rows = $pdo->query(
  'SELECT id, page_key, author_name, author_email, body, created_at, ip_address
     FROM comments WHERE approved = 0 ORDER BY created_at DESC'
)->fetchAll();

echo '<!doctype html><html><head><meta name="robots" content="noindex">'
   . '<meta name="viewport" content="width=device-width,initial-scale=1">'
   . '<title>comments admin</title></head>'
   . '<body style="font-family:sans-serif;max-width:48rem;margin:2rem auto">';
echo '<h1>pending comments (' . count($rows) . ')</h1>';
if (!$rows) {
  echo '<p>nothing waiting. nice.</p>';
}
foreach ($rows as $r) {
  echo '<div style="border:1px solid #ccc;border-radius:8px;padding:1rem;margin:1rem 0">';
  echo '<div style="font-size:.8rem;color:#555">'
     . h($r['author_name']) . ' &lt;' . h($r['author_email']) . '&gt; · '
     . h($r['page_key']) . ' · ' . h($r['created_at']) . ' · ' . h($r['ip_address']) . '</div>';
  echo '<p style="white-space:pre-wrap">' . h($r['body']) . '</p>';
  echo '<form method="post" style="display:inline">'
     . '<input type="hidden" name="csrf" value="' . h($csrf) . '">'
     . '<input type="hidden" name="id" value="' . (int) $r['id'] . '">'
     . '<button name="action" value="approve">approve</button> '
     . '<button name="action" value="delete" onclick="return confirm(\'delete?\')">delete</button>'
     . '</form>';
  echo '</div>';
}
echo '</body></html>';
