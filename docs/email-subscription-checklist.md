# Email subscription: local verification checklist

> **Local execution status (2026-07-07):** the DB-backed flows below (subscribe,
> confirm, notify, preferences, unsubscribe, admin) require a local MySQL
> database, which is not available in the dev environment. They are verified
> in the production smoke section after deploy instead. The DB-free checks
> (php -l on every endpoint, build + notify-feed.json shape, JS suite, lint,
> prose:lint) were run and passed on this branch.

PHP has no test toolchain in this repo, so the endpoints are verified with
curl against a local server and database. Run after any change to
`public/api/`.

## Setup

1. Local MySQL (or MariaDB) with a scratch database:
   `mysql -u root -e "CREATE DATABASE IF NOT EXISTS mw_local"` then run the
   four CREATE TABLE statements from `docs/email-subscription-setup.md`
   against `mw_local`, plus the comments table if absent.
2. Copy `comments-config.example.php` to `comments-config.php` in the REPO
   ROOT (gitignored; `dist/api/../../` resolves there). Fill in local DB
   creds, real SMTP creds if you want actual mail, and set:
   `'site_url' => 'http://localhost:8080'`, `'cron_key' => 'localtestkey...'`
   (any 64-hex string).
3. `npm run build && php -S localhost:8080 -t dist`

Tip for a mail-free run: point `smtp_host` at nothing and treat every send as
the failure path, or use a Mailtrap/mailpit inbox. The flows below assume
sends work.

## Subscribe flow

- [ ] Subscribe (new): `curl -si -X POST localhost:8080/api/subscribe.php -H 'Content-Type: application/json' -d '{"email":"me@example.com","wants_blog":true,"wants_podcast":false,"wants_newsletter":true}'`
      -> 200, "Almost there" message; DB row status=0, wants_podcast=0.
- [ ] Honeypot: same call plus `"website":"x"` -> 200 success, NO new row.
- [ ] Bad email: `-d '{"email":"nope","wants_blog":true}'` -> 422 fields ["email"].
- [ ] No topics: all wants false -> 422 fields ["topics"].
- [ ] Duplicate pending: repeat the first call -> 200, verify_token CHANGED in DB (re-send), confirm_sends=2.
- [ ] Cap: two more repeats -> 200 each; after the 3rd, confirm_sends stays 3 and no mail goes out.
- [ ] Confirm: `curl -si "localhost:8080/api/confirm.php?token=<verify_token from DB>"` -> 200 page, row status=1, confirmed_at set, verify_token NULL.
- [ ] Confirm reuse: same URL again -> 410 page.
- [ ] Subscribe while active: original POST again -> 200, still status=1, no mail.

## Notify flow

- [ ] Seed: `curl -s "localhost:8080/api/notify.php?key=<cron_key>"` -> every feed item enqueues... with 1 subscriber wanting blog+newsletter, expect queue rows for blog items only, then drain output "sent: N".
      (For a smaller test: `DELETE FROM sent_items` for all but one key first.)
- [ ] Wrong key: `curl -si "localhost:8080/api/notify.php?key=wrong"` -> 403.
- [ ] Idempotency: run notify again -> "enqueued: 0", nothing re-sent.
- [ ] Check the received mail: subject "New on mindiweik.com: ...", plain text, footer has preferences + unsubscribe links, headers include List-Unsubscribe and List-Unsubscribe-Post.

## Preferences + unsubscribe

- [ ] GET `localhost:8080/api/preferences.php?token=<manage_token>` -> form shows email + current checkboxes.
- [ ] Save: `curl -si -X POST localhost:8080/api/preferences.php -d 'token=<manage_token>&action=save&wants_blog=1'` -> "Saved.", DB flags 1/0/0.
- [ ] Save zero topics: `-d 'token=...&action=save'` -> "Pick at least one topic" page, flags unchanged.
- [ ] Unsubscribe GET: `curl -si "localhost:8080/api/unsubscribe.php?token=<manage_token>"` -> 200 page with button, DB status STILL 1 (GET must not mutate).
- [ ] Unsubscribe POST (RFC 8058): `curl -si -X POST localhost:8080/api/unsubscribe.php -d 'token=<manage_token>&List-Unsubscribe=One-Click'` -> unsubscribed page, DB status=2.
- [ ] Resubscribe: POST subscribe again -> 200, row back to status=0 with fresh verify_token, same manage_token.
- [ ] Stale queue: with a queued row for this subscriber, run notify -> row flips to status=2 (cancelled), not sent.

## Admin

- [ ] Sign in at `localhost:8080/api/admin.php`; newsletter section shows counts + queue depth.
- [ ] Send test to me -> mail arrives at from_email, no issues/queue rows created.
- [ ] Send -> issues row with sent_at + recipient_count; queue rows = active wants_newsletter count; notify run delivers with subject/body verbatim.
- [ ] Delete subscriber -> row gone, their queued rows gone (cascade).

## Prod smoke (after deploy + docs/email-subscription-setup.md steps)

- [ ] https://mindiweik.com/notify-feed.json returns the latest 20 items.
- [ ] Run the seed notify once BEFORE announcing the form (marks history as sent).
- [ ] Subscribe with a personal address end to end: form -> confirm mail -> confirm -> next content release notifies.
