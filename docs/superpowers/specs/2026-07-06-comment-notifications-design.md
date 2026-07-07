# New-comment email notification - design

**Date:** 2026-07-06
**Branch:** `feat/comment-notifications`
**Status:** Approved

## Purpose

Email the site owner when a comment goes live on mindiweik.com. Today the
comments system (PHP + MySQL on Hostinger, built on `feat/comments`) emails
the *commenter* a verification link, but the owner only discovers new
comments by visiting the site or `admin.php`.

## Decision summary

- **Trigger: on verification.** The notification fires in `verify.php`
  immediately after the `UPDATE` that flips a comment to `approved = 1`.
  The owner only hears about real, confirmed comments - never spam or
  abandoned submissions that fail email verification.
- **Delivery: inline best-effort send** over the existing PHPMailer/SMTP
  path. No cron, no digest, no new infrastructure. Rejected alternatives:
  a cron digest (overkill at current comment volume) and PHP `mail()`
  (worse deliverability, inconsistent with the existing code path).

## Changes

### `public/api/mailer.php`

- Extract the shared SMTP/PHPMailer construction (host, auth, port,
  encryption, charset, from/reply-to) into a small private helper so the
  two sender functions do not duplicate config wiring.
- Add `send_new_comment_notification(array $config, array $comment, string $postUrl): void`:
  - **To:** `$config['notify_email']`
  - **Subject:** `New comment on <page_key>`
  - **Body (plain text):** commenter name and email, the comment text,
    link to the post (`$postUrl`), link to `admin.php` for quick deletion.
  - Throws on failure (PHPMailer exceptions enabled), same contract as the
    existing `send_verification_email()`.

### `public/api/verify.php`

- Widen the existing `SELECT` from `id, page_key` to also fetch
  `author_name, author_email, body` so the notification has content
  without a second query.
- After the `UPDATE` succeeds, call `send_new_comment_notification()`
  inside its own `try/catch`:
  - **Skip entirely** if `notify_email` is missing or empty in config
    (feature is opt-in; old configs stay valid).
  - **On failure, swallow the error.** The reader must always see the
    normal "Comment confirmed" page; a mail hiccup lands in the Hostinger
    PHP error log, nothing more. Never notify before the UPDATE commits,
    so a notification always corresponds to a live comment.

### `comments-config.example.php`

- Add `notify_email` key with a placeholder value and a comment explaining
  it (owner notification recipient; leave empty to disable).

## Error handling

| Failure | Behavior |
|---------|----------|
| SMTP send fails | Caught in `verify.php`, swallowed; reader sees success page; error reaches PHP error log |
| `notify_email` absent/empty | Send skipped, no error |
| DB/verify failure | Unchanged existing behavior (500 page); no notification attempted |

## Deployment

1. Merge to `main`; existing FTP pipeline ships the PHP verbatim (files in
   `public/` are copied to `dist/` by Astro; no build change).
2. One manual step: add `notify_email` with the real address to the live
   `comments-config.php` on Hostinger (above `public_html/`, not in git).

## Testing

No PHP test harness exists (consistent with the current comments PHP -
thin glue over PHPMailer). No TypeScript changes, so vitest is untouched
(98 tests remain the regression gate). Verification is post-deploy
end-to-end: submit a test comment, click the verification link, confirm
the notification arrives and the reader-facing confirm page still renders.
