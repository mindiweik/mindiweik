<?php
declare(strict_types=1);

// Shared helpers for the email subscription endpoints (subscribe.php,
// confirm.php, preferences.php, unsubscribe.php, notify.php, admin.php).
// Prefixed sub_ to avoid collisions with the per-file helpers in the comments
// endpoints. Same rules as comments: PDO exceptions on, prepared statements
// only, htmlspecialchars on every HTML output.

function sub_db(array $config): PDO {
  $dsn = sprintf('mysql:host=%s;dbname=%s;charset=utf8mb4', $config['db_host'], $config['db_name']);
  return new PDO($dsn, $config['db_user'], $config['db_pass'], [
    PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    PDO::ATTR_EMULATE_PREPARES   => false,
  ]);
}

function sub_h(?string $s): string {
  return htmlspecialchars((string) $s, ENT_QUOTES, 'UTF-8');
}

// Tokens are 64 hex chars (bin2hex of 32 random bytes). Reject anything else
// before touching the database.
function sub_valid_token(string $t): bool {
  return (bool) preg_match('/^[a-f0-9]{64}$/', $t);
}

function sub_valid_email(string $e): bool {
  return strlen($e) <= 190 && filter_var($e, FILTER_VALIDATE_EMAIL) !== false;
}

function sub_site_url(array $config): string {
  return rtrim((string) ($config['site_url'] ?? 'https://mindiweik.com'), '/');
}

// Minimal standalone page for confirm/preferences/unsubscribe responses.
// Same look as verify.php so the whole flow feels consistent.
function sub_render_page(string $title, string $message, string $link, string $linkLabel): void {
  echo '<!doctype html><html lang="en"><head><meta charset="utf-8">'
     . '<meta name="robots" content="noindex"><meta name="viewport" content="width=device-width,initial-scale=1">'
     . '<title>' . sub_h($title) . '</title></head>'
     . '<body style="font-family:system-ui,sans-serif;max-width:34rem;margin:4rem auto;padding:0 1rem;line-height:1.5">'
     . '<h1 style="font-size:1.3rem">' . sub_h($title) . '</h1>'
     . '<p>' . sub_h($message) . '</p>'
     . '<p><a href="' . sub_h($link) . '">' . sub_h($linkLabel) . '</a></p>'
     . '</body></html>';
  exit;
}

// Builds the subject and plain-text body for a content notification (a new
// blog post or podcast episode). $item is a notify-feed.json row with keys
// type, title, description, link. The description line is skipped when empty
// (podcast episodes without a descriptor). Shared by notify.php (real sends)
// and its sample mode, so a preview is byte-identical to the real thing.
function sub_content_email(array $item): array {
  $isPodcast = ($item['type'] ?? '') === 'podcast';
  $title = (string) ($item['title'] ?? '');
  $desc  = trim((string) ($item['description'] ?? ''));
  $link  = (string) ($item['link'] ?? '');

  if ($isPodcast) {
    $subject = 'New episode: ' . $title;
    $intro   = 'Hey! A new episode just dropped 🎙️';
    $cta     = 'Have a listen → ' . $link;
    $signoff = "Thanks for tuning in,\nMindi";
  } else {
    $subject = 'New post: ' . $title;
    $intro   = 'Hey! Just published something new 📝';
    $cta     = 'Give it a read → ' . $link;
    $signoff = "Thanks for following along,\nMindi";
  }

  $body = $intro . "\n\n" . $title . "\n";
  if ($desc !== '') {
    $body .= $desc . "\n";
  }
  $body .= "\n" . $cta . "\n\n" . $signoff;

  return ['subject' => $subject, 'body' => $body];
}
