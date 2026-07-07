# New-Comment Owner Notification Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Email the site owner when a comment goes live (flips to `approved = 1`) on mindiweik.com.

**Architecture:** `verify.php` gains a best-effort notification send immediately after the `UPDATE` that publishes a comment. `mailer.php` gets a second sender function, with the shared PHPMailer/SMTP construction extracted into a `build_mailer()` helper. A new opt-in `notify_email` config key controls the recipient; empty/missing means the feature is off.

**Tech Stack:** PHP 8.x on Hostinger, vendored PHPMailer 6.9.3 (`public/api/lib/PHPMailer/`), MySQL via PDO. No Composer, no build step for PHP (Astro copies `public/` to `dist/` verbatim).

**Spec:** `docs/superpowers/specs/2026-07-06-comment-notifications-design.md`

## Global Constraints

- Work happens in the worktree at `~/dev/mindiweik-worktrees/comment-notifications` on branch `feat/comment-notifications`.
- Emails are plain text (`isHTML(false)`), matching the existing verification email.
- The notification must never break the reader's confirmation page: it runs after the `UPDATE`, in its own `try/catch`, and failures are logged with `error_log()` and swallowed.
- If `notify_email` is missing or empty in config, skip the send entirely (no error). Old configs stay valid.
- There is no PHP test harness in this repo (by design). Verification per task is `php -l` syntax lint plus a `php -r` smoke check; full verification is post-deploy end-to-end (see Deployment notes at the bottom).
- Commit messages: conventional-commit style (`feat:`, `docs:`). NEVER add a `Co-Authored-By` trailer.
- Database columns (already exist, no migration): `comments(id, page_key, author_name, author_email, body, created_at, approved, verify_token, ip_address)`.

---

### Task 1: `build_mailer()` helper + `send_new_comment_notification()` in mailer.php

**Files:**
- Modify: `public/api/mailer.php` (entire file replaced; current file is 45 lines)

**Interfaces:**
- Consumes: vendored PHPMailer at `public/api/lib/PHPMailer/`; config keys `smtp_host`, `smtp_user`, `smtp_pass`, `smtp_port`, `smtp_secure`, `from_email`, `from_name`, `notify_email`, `site_url`.
- Produces: `send_new_comment_notification(array $config, array $comment, string $postUrl): void` — throws `PHPMailer\PHPMailer\Exception` on failure. `$comment` must contain string keys `page_key`, `author_name`, `author_email`, `body`. Also `build_mailer(array $config): PHPMailer` (internal helper). Existing `send_verification_email()` signature is unchanged.

- [ ] **Step 1: Replace the contents of `public/api/mailer.php`**

```php
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
```

- [ ] **Step 2: Lint and smoke-check**

Run:
```bash
cd ~/dev/mindiweik-worktrees/comment-notifications
php -l public/api/mailer.php
php -r "require 'public/api/mailer.php'; exit(function_exists('send_new_comment_notification') && function_exists('send_verification_email') && function_exists('build_mailer') ? 0 : 1);" && echo SMOKE-OK
```
Expected: `No syntax errors detected` and `SMOKE-OK`.

- [ ] **Step 3: Commit**

```bash
cd ~/dev/mindiweik-worktrees/comment-notifications
git add public/api/mailer.php
git commit -m "feat: add owner notification sender, extract shared SMTP setup"
```

---

### Task 2: Fire the notification from verify.php

**Files:**
- Modify: `public/api/verify.php` (the `try` block, currently lines 49-65)

**Interfaces:**
- Consumes: `send_new_comment_notification(array $config, array $comment, string $postUrl): void` from Task 1 (throws on failure); config key `notify_email`.
- Produces: nothing new for later tasks; reader-facing behavior of `verify.php` is unchanged.

- [ ] **Step 1: Widen the SELECT and add the best-effort send**

In `public/api/verify.php`, replace this block:

```php
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
```

with:

```php
try {
  $pdo = db($config);

  $sel = $pdo->prepare('SELECT id, page_key, author_name, author_email, body FROM comments WHERE verify_token = ? AND approved = 0 LIMIT 1');
  $sel->execute([$token]);
  $row = $sel->fetch();

  if (!$row) {
    http_response_code(410);
    render('Link expired or already used', 'This comment may already be live, or the link has expired.', $siteUrl, 'Back to mindiweik.com');
  }

  $pdo->prepare('UPDATE comments SET approved = 1, verify_token = NULL WHERE id = ?')->execute([(int) $row['id']]);

  // page_key ("blog/slug" or "podcast/id") maps directly to a site route.
  $postUrl = $siteUrl . '/' . ltrim((string) $row['page_key'], '/');

  // Owner notification, only after the comment is actually live. Best-effort:
  // a mail hiccup must never break the reader's confirmation page, so failures
  // are logged and swallowed. Skipped when notify_email is unset (opt-in).
  if (!empty($config['notify_email'])) {
    try {
      require_once __DIR__ . '/mailer.php';
      send_new_comment_notification($config, $row, $postUrl);
    } catch (Throwable $e) {
      error_log('comment notification failed: ' . $e->getMessage());
    }
  }

  render('Comment confirmed', 'Thanks. Your comment is now live.', $postUrl, 'Back to the post');
} catch (Throwable $e) {
```

- [ ] **Step 2: Lint**

Run:
```bash
cd ~/dev/mindiweik-worktrees/comment-notifications
php -l public/api/verify.php
```
Expected: `No syntax errors detected`.

- [ ] **Step 3: Commit**

```bash
cd ~/dev/mindiweik-worktrees/comment-notifications
git add public/api/verify.php
git commit -m "feat: email owner when a comment is verified and goes live"
```

---

### Task 3: `notify_email` key in the example config

**Files:**
- Modify: `comments-config.example.php` (append one entry to the returned array)

**Interfaces:**
- Consumes: nothing.
- Produces: documents the `notify_email` config key read by Task 2's guard and Task 1's sender.

- [ ] **Step 1: Add the key**

In `comments-config.example.php`, after the `'from_name' => 'mindiweik.com',` line, add:

```php

  // Owner notification: emailed when a comment is verified and goes live.
  // Leave empty ('') to disable.
  'notify_email'   => 'REPLACE_WITH_YOUR_EMAIL',
```

- [ ] **Step 2: Lint and smoke-check the array parses**

Run:
```bash
cd ~/dev/mindiweik-worktrees/comment-notifications
php -l comments-config.example.php
php -r "\$c = require 'comments-config.example.php'; exit(array_key_exists('notify_email', \$c) ? 0 : 1);" && echo SMOKE-OK
```
Expected: `No syntax errors detected` and `SMOKE-OK`.

- [ ] **Step 3: Commit**

```bash
cd ~/dev/mindiweik-worktrees/comment-notifications
git add comments-config.example.php
git commit -m "docs: document notify_email key in example config"
```

---

## Deployment notes (manual, after merge)

1. Merge `feat/comment-notifications` to `main`; the existing FTP pipeline ships the PHP (no build change).
2. On Hostinger, edit the live `comments-config.php` (above `public_html/`, not in git) and add `'notify_email' => '<real address>',`.
3. End-to-end check: submit a test comment, click the confirmation link, verify (a) the reader still sees "Comment confirmed" and (b) the notification lands in the owner inbox with working post + admin links.
