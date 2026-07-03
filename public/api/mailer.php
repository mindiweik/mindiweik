<?php
declare(strict_types=1);

// SMTP sender for comment verification emails. Uses the vendored PHPMailer so
// no Composer is needed on the Hostinger server. SMTP credentials come from the
// server-only comments-config.php (a Hostinger mailbox on this domain, so SPF
// and DKIM are already set up for good deliverability).

use PHPMailer\PHPMailer\PHPMailer;

require_once __DIR__ . '/lib/PHPMailer/Exception.php';
require_once __DIR__ . '/lib/PHPMailer/PHPMailer.php';
require_once __DIR__ . '/lib/PHPMailer/SMTP.php';

// Sends the confirmation email. Throws on failure so the caller can react
// (PHPMailer is constructed with exceptions enabled).
function send_verification_email(array $config, string $toEmail, string $toName, string $verifyLink): void {
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
  $mail->addAddress($toEmail, $toName);

  $mail->isHTML(false);
  $mail->Subject = 'Confirm your comment on mindiweik.com';
  $mail->Body =
    'Hi ' . $toName . ",\n\n" .
    "Thanks for commenting on mindiweik.com. Confirm it with this link and your comment goes live:\n\n" .
    $verifyLink . "\n\n" .
    "If you did not write this, ignore this email and nothing is posted.\n";

  $mail->send();
}
