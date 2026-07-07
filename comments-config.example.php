<?php
// Copy to /domains/mindiweik.com/comments-config.php on Hostinger (ABOVE
// public_html). Never commit the real file. comments.php, verify.php, and
// admin.php load it with require __DIR__ . '/../../comments-config.php'.
return [
  // Database (hPanel > MySQL Databases)
  'db_host'        => 'localhost',
  'db_name'        => 'u112789821_comments',
  'db_user'        => 'u112789821_cuser',
  'db_pass'        => 'REPLACE_WITH_DB_PASSWORD',

  // Moderation page (admin.php) sign-in secret
  'admin_token'    => 'REPLACE_WITH_LONG_RANDOM_STRING',

  // Public site origin (CORS + building verify links)
  'allowed_origin' => 'https://mindiweik.com',
  'site_url'       => 'https://mindiweik.com',

  // SMTP for verification emails (Hostinger mailbox on this domain).
  // Port 465 => 'ssl' (implicit TLS); port 587 => 'tls' (STARTTLS).
  'smtp_host'      => 'smtp.hostinger.com',
  'smtp_port'      => 465,
  'smtp_secure'    => 'ssl',
  'smtp_user'      => 'noreply@mindiweik.com',
  'smtp_pass'      => 'REPLACE_WITH_MAILBOX_PASSWORD',
  'from_email'     => 'noreply@mindiweik.com',
  'from_name'      => 'mindiweik.com',

  // Owner notification: emailed when a comment is verified and goes live.
  // Leave empty ('') to disable.
  'notify_email'   => 'REPLACE_WITH_YOUR_EMAIL',

  // Email subscriptions: secret gating the cron endpoint
  // (notify.php?key=...). Generate with: php -r "echo bin2hex(random_bytes(32));"
  'cron_key'       => 'REPLACE_WITH_LONG_RANDOM_STRING',
];
