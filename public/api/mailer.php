<?php
declare(strict_types=1);

// SMTP senders for the comments system. Uses the vendored PHPMailer so no
// Composer is needed on the Hostinger server. SMTP credentials come from the
// server-only comments-config.php (a Hostinger mailbox on this domain, so SPF
// and DKIM are already set up for good deliverability).

use PHPMailer\PHPMailer\PHPMailer;

require_once __DIR__ . '/lib/PHPMailer/Exception.php';
require_once __DIR__ . '/lib/PHPMailer/PHPMailer.php';
require_once __DIR__ . '/lib/PHPMailer/SMTP.php';

// Builds a PHPMailer instance wired to the configured SMTP mailbox. Both
// senders share this so config wiring lives in one place. Constructed with
// exceptions enabled, so send() throws and callers decide how to react.
function build_mailer(array $config): PHPMailer {
  $mail = new PHPMailer(true);
  $mail->isSMTP();
  $mail->Host       = (string) ($config['smtp_host'] ?? '');
  $mail->SMTPAuth   = true;
  $mail->Username   = (string) ($config['smtp_user'] ?? '');
  $mail->Password   = (string) ($config['smtp_pass'] ?? '');
  $mail->Port       = (int) ($config['smtp_port'] ?? 465);
  // Port 465 uses implicit TLS (SMTPS); 587 uses STARTTLS. Driven by config.
  $mail->SMTPSecure = ($config['smtp_secure'] ?? 'ssl') === 'tls'
    ? PHPMailer::ENCRYPTION_STARTTLS
    : PHPMailer::ENCRYPTION_SMTPS;
  $mail->CharSet    = PHPMailer::CHARSET_UTF8;

  $mail->setFrom((string) $config['from_email'], (string) ($config['from_name'] ?? 'mindiweik.com'));
  $mail->addReplyTo((string) $config['from_email'], (string) ($config['from_name'] ?? 'mindiweik.com'));
  $mail->isHTML(false);
  return $mail;
}

// Sends the commenter their confirmation email. Throws on failure so the
// caller can react.
function send_verification_email(array $config, string $toEmail, string $toName, string $verifyLink): void {
  $mail = build_mailer($config);
  $mail->addAddress($toEmail, $toName);

  $mail->Subject = 'Confirm your comment on mindiweik.com';
  $mail->Body =
    'Hi ' . $toName . ",\n\n" .
    "Thanks for commenting on mindiweik.com. Confirm it with this link and your comment goes live:\n\n" .
    $verifyLink . "\n\n" .
    "If you did not write this, ignore this email and nothing is posted.\n";

  $mail->send();
}

// Emails the site owner that a comment just went live. $comment needs
// page_key, author_name, author_email, and body. Throws on failure; the
// caller (verify.php) treats the send as best-effort.
function send_new_comment_notification(array $config, array $comment, string $postUrl): void {
  $mail = build_mailer($config);
  $mail->addAddress((string) $config['notify_email']);

  $siteUrl = rtrim((string) ($config['site_url'] ?? 'https://mindiweik.com'), '/');

  $mail->Subject = 'New comment on ' . (string) $comment['page_key'];
  $mail->Body =
    'A new comment just went live on ' . $postUrl . "\n\n" .
    'From: ' . (string) $comment['author_name'] . ' <' . (string) $comment['author_email'] . ">\n\n" .
    (string) $comment['body'] . "\n\n" .
    'Manage comments (delete if junk): ' . $siteUrl . "/api/admin.php\n";

  $mail->send();
}
