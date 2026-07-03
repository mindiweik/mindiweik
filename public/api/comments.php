<?php
declare(strict_types=1);

// Self-hosted comments API for mindiweik.com.
//   GET  /api/comments.php?page=<page_key>  -> approved comments as JSON
//   POST /api/comments.php                  -> insert one pending comment
// Credentials load from a file above the web root; see comments-config.example.php.

$config = require __DIR__ . '/../../comments-config.php';
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

function db(array $config): PDO {
  $dsn = sprintf('mysql:host=%s;dbname=%s;charset=utf8mb4', $config['db_host'], $config['db_name']);
  return new PDO($dsn, $config['db_user'], $config['db_pass'], [
    PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    PDO::ATTR_EMULATE_PREPARES   => false,
  ]);
}

function valid_page_key(string $key): bool {
  return (bool) preg_match('#^(blog|podcast)/[A-Za-z0-9._/-]{1,180}$#', $key);
}
function valid_email(string $e): bool {
  return strlen($e) <= 190 && filter_var($e, FILTER_VALIDATE_EMAIL) !== false;
}

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

try {
  $pdo = db($config);

  if ($method === 'GET') {
    $page = (string) ($_GET['page'] ?? '');
    if (!valid_page_key($page)) respond(422, ['error' => 'invalid page']);
    $stmt = $pdo->prepare(
      'SELECT author_name AS name, body, created_at
         FROM comments
        WHERE page_key = ? AND approved = 1
        ORDER BY created_at ASC
        LIMIT 500'
    );
    $stmt->execute([$page]);
    $rows = $stmt->fetchAll();
    foreach ($rows as &$r) {
      $r['created_at'] = gmdate('Y-m-d\TH:i:s\Z', strtotime($r['created_at'] . ' UTC'));
    }
    unset($r);
    respond(200, ['comments' => $rows]);
  }

  if ($method === 'POST') {
    $ctype = $_SERVER['CONTENT_TYPE'] ?? '';
    if (str_contains($ctype, 'application/json')) {
      $data = json_decode((string) file_get_contents('php://input'), true) ?: [];
    } else {
      $data = $_POST;
    }

    // Honeypot: humans never see "website"; bots fill it. Pretend success.
    if (!empty($data['website'])) {
      respond(200, ['ok' => true, 'message' => 'Almost there. Check your email for the link to confirm your comment.']);
    }

    $page  = trim((string) ($data['page_key'] ?? ''));
    $name  = trim((string) ($data['name'] ?? ''));
    $email = trim((string) ($data['email'] ?? ''));
    $body  = trim((string) ($data['body'] ?? ''));

    $errors = [];
    if (!valid_page_key($page))                     $errors[] = 'page_key';
    if ($name === '' || mb_strlen($name) > 80)      $errors[] = 'name';
    if (!valid_email($email))                        $errors[] = 'email';
    if ($body === '' || mb_strlen($body) > 5000)    $errors[] = 'body';
    if ($errors) respond(422, ['error' => 'invalid', 'fields' => $errors]);

    $ip = $_SERVER['REMOTE_ADDR'] ?? null;

    // Rate limit: at most 3 per minute and 10 per hour per IP.
    if ($ip !== null) {
      $rl = $pdo->prepare(
        'SELECT
           SUM(created_at >= UTC_TIMESTAMP() - INTERVAL 1 MINUTE) AS last_min,
           SUM(created_at >= UTC_TIMESTAMP() - INTERVAL 1 HOUR)   AS last_hour
         FROM comments WHERE ip_address = ?'
      );
      $rl->execute([$ip]);
      $c = $rl->fetch();
      if ((int) $c['last_min'] >= 3 || (int) $c['last_hour'] >= 10) {
        respond(429, ['error' => 'Too many comments. Please wait a bit.']);
      }
    }

    // Store as unverified (approved=0) with a one-time token. The link emailed
    // below flips it to approved=1 (live) when the commenter clicks it.
    $token = bin2hex(random_bytes(32));
    $ins = $pdo->prepare(
      'INSERT INTO comments (page_key, author_name, author_email, body, created_at, approved, verify_token, ip_address)
       VALUES (?, ?, ?, ?, UTC_TIMESTAMP(), 0, ?, ?)'
    );
    $ins->execute([$page, $name, $email, $body, $token, $ip]);
    $id = (int) $pdo->lastInsertId();

    $siteUrl = rtrim((string) ($config['site_url'] ?? 'https://mindiweik.com'), '/');
    $verifyLink = $siteUrl . '/api/verify.php?token=' . $token;
    try {
      send_verification_email($config, $email, $name, $verifyLink);
    } catch (Throwable $mailError) {
      // A failed send must not leave an orphaned pending row.
      $pdo->prepare('DELETE FROM comments WHERE id = ?')->execute([$id]);
      respond(502, ['error' => 'We could not send the confirmation email. Please try again.']);
    }
    respond(201, ['ok' => true, 'message' => 'Almost there. Check your email for the link to confirm your comment.']);
  }

  respond(405, ['error' => 'method not allowed']);
} catch (Throwable $e) {
  respond(500, ['error' => 'server error']);
}
