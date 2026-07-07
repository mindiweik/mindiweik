# Email subscription for mindiweik.com

Date: 2026-07-05
Status: approved, ready for implementation planning
Scope: double-opt-in email list with automated new-content notifications
(blog + podcast), subscriber topic preferences, and hand-written newsletter
issues composed from the admin page.

## Goal

Let readers subscribe by email and automatically hear about new blog posts and
podcast episodes, with the option for Mindi to send occasional hand-written
newsletter issues to the same list. Subscribers choose which of the three
streams (blog / podcast / newsletter) they receive. The list is owned entirely
by Mindi, no third-party newsletter service.

## Why this architecture

Same seam as the comments system (see `2026-07-03-comments-design.md`): the
site is a static Astro build FTP-deployed to Hostinger, and PHP files placed in
`public/api/` land in `public_html/api/` and execute on the server. The
comments system already proved the full stack this feature needs: MySQL via
PDO, vendored PHPMailer sending through the Hostinger mailbox
(`noreply@mindiweik.com`, SPF/DKIM configured), a double-opt-in token flow
(`verify.php`), per-IP rate limiting, a per-address daily email cap, and a
session-authed admin page. This design reuses all of it.

Alternatives considered and rejected:

- Newsletter service (Buttondown, MailerLite, Kit): least code, deliverability
  handled, but a third party holds the list, RSS-to-email automation is
  typically paid past ~100 subscribers, and it cuts against the own-your-data
  decision already made for comments.
- Self-hosted list + rented transactional SMTP (Brevo/Resend/SES): identical
  build; only the SMTP credentials differ. Because `mailer.php` reads
  host/user/pass entirely from config, this remains a config-only escape hatch
  if Hostinger deliverability ever degrades. Not needed at current scale.

Expected scale: small (under a few hundred subscribers). Hostinger SMTP with
batched sending is comfortable at this size.

## Decisions (locked)

- Store: MySQL + PHP on the existing Hostinger box, same database as comments.
- Auto notifications for both blog posts and podcast episodes.
- Hand-written newsletter issues composed and sent from the admin page.
- Subscriber choice: three topic flags (blog / podcast / newsletter), all on by
  default at signup, editable via a tokenized preferences page.
- Double opt-in: a subscription is inert until the address confirms via
  emailed link (same pattern as comment verification).
- Unsubscribed addresses are kept as suppression records, not deleted.
- Form placement: end of posts/episodes, site footer, and a homepage section.
- Sending: queued and drained in batches by a Hostinger cron job.

## Data model

`subscribers`:

| column             | type                  | notes                                          |
|--------------------|-----------------------|------------------------------------------------|
| `id`               | INT AUTO_INCREMENT PK |                                                |
| `email`            | VARCHAR(190) UNIQUE   | one row per address                            |
| `status`           | TINYINT NOT NULL      | 0 pending, 1 active, 2 unsubscribed            |
| `verify_token`     | VARCHAR(64) NULL      | single-use, cleared on confirm                 |
| `manage_token`     | VARCHAR(64) NOT NULL  | permanent; powers unsubscribe/preferences URLs |
| `wants_blog`       | TINYINT(1) DEFAULT 1  | topic preference                               |
| `wants_podcast`    | TINYINT(1) DEFAULT 1  | topic preference                               |
| `wants_newsletter` | TINYINT(1) DEFAULT 1  | topic preference                               |
| `created_at`       | DATETIME NOT NULL     | UTC                                            |
| `confirmed_at`     | DATETIME NULL         | set when status flips to active                |
| `ip_address`       | VARCHAR(45) NULL      | private, rate limiting                         |

`sent_items` — which content keys have already been announced. The notifier
diffs feed items against this so a redeploy or feed reorder can never re-email
the list:

| column      | type                       | notes                              |
|-------------|----------------------------|------------------------------------|
| `item_key`  | VARCHAR(191) PK            | `blog/<slug>` or `podcast/<id>`    |
| `sent_at`   | DATETIME NOT NULL          |                                    |

`issues` — hand-written newsletters:

| column            | type                  | notes                    |
|-------------------|-----------------------|--------------------------|
| `id`              | INT AUTO_INCREMENT PK |                          |
| `subject`         | VARCHAR(190) NOT NULL |                          |
| `body`            | TEXT NOT NULL         | plain text               |
| `sent_at`         | DATETIME NULL         | null until actually sent |
| `recipient_count` | INT NULL              | filled at send time      |

`send_queue` — one row per (subscriber × thing to send). Solves two
shared-hosting constraints: PHP execution time limits (cannot loop hundreds of
SMTP sends in one request) and mailbox hourly send caps. Retries come free via
`attempts`:

| column          | type                  | notes                                         |
|-----------------|-----------------------|-----------------------------------------------|
| `id`            | INT AUTO_INCREMENT PK |                                               |
| `subscriber_id` | INT NOT NULL          | FK to subscribers                             |
| `item_key`      | VARCHAR(191) NULL     | set for content notifications                 |
| `issue_id`      | INT NULL              | set for newsletter issues                     |
| `status`        | TINYINT NOT NULL      | 0 queued, 1 sent, 2 failed (gave up)          |
| `attempts`      | TINYINT DEFAULT 0     | give up after 3                               |
| `created_at`    | DATETIME NOT NULL     |                                               |
| `sent_at`       | DATETIME NULL         |                                               |

Exactly one of `item_key` / `issue_id` is set per row. Index on
`(status, created_at)` for the drain query.

## Endpoints (all in `public/api/`)

### POST subscribe.php

Body: `email`, `wants_blog`, `wants_podcast`, `wants_newsletter`, `website`
(honeypot, silently dropped if filled).

- Validate email format and length; at least one topic must be selected.
- Anti-abuse: per-IP rate limit (3/min, 10/hour, same values as comments) and
  the per-address confirmation-email daily cap (reuse the anti-bombing
  pattern).
- Anti-enumeration: the response is always the same success message
  ("Check your email to confirm") whether the address is new, already pending,
  or already active. Internally: new address inserts pending + sends confirm
  mail; existing pending re-sends (within the daily cap); existing active
  sends nothing; unsubscribed re-enters the pending flow with a fresh token.
- Tokens: `bin2hex(random_bytes(32))` for both `verify_token` and
  `manage_token`.

### GET confirm.php?token=<64-hex>

Mirrors `verify.php`: validates shape, flips the matching pending row to
`status=1`, sets `confirmed_at`, clears `verify_token` (single-use), renders a
friendly confirmation page linking back to the site.

### preferences.php?token=<manage_token>

- GET: renders the three topic checkboxes and an unsubscribe button for the
  matching subscriber. Token compared with a prepared-statement lookup;
  invalid token gets a generic error page.
- POST: updates the three flags, or sets `status=2` on unsubscribe.

### unsubscribe.php?token=<manage_token>

One-click unsubscribe: sets `status=2`. Accepts both GET (footer link — lands
on a confirmation page with a single button, so a link-prefetching mail
scanner cannot unsubscribe anyone) and POST (RFC 8058 one-click, used by the
`List-Unsubscribe` header so Gmail/Yahoo show their native Unsubscribe
button).

### notify.php (cron)

Gated by a `cron_key` secret from config (query param, compared with
`hash_equals`). Each run:

1. Fetch same-origin `/notify-feed.json` (see below).
2. Diff item keys against `sent_items`; for each new item, insert into
   `sent_items` first (idempotency), then enqueue one `send_queue` row per
   active subscriber whose matching topic flag is on.
3. Drain the queue: select up to 40 queued rows oldest-first, send each via
   PHPMailer, mark sent or bump `attempts` (status=2 failed after 3).

Enqueue and drain in one script means one cron job. Hostinger cron runs it
every 15 minutes (~160 emails/hour ceiling, safely under mailbox caps).

### Admin compose (extends admin.php)

New "Newsletter" section on the existing session + CSRF authed admin page:

- Shows counts: active subscribers per topic, pending queue depth.
- Compose form: subject + plain-text body.
- "Send test to me" button: sends the drafted issue to `from_email` only,
  without creating rows.
- "Send" button: inserts the `issues` row and enqueues one `send_queue` row
  per active `wants_newsletter` subscriber. The cron drains it.
- Subscriber list view (email, status, topics, dates) with delete, mirroring
  the delete-only comments view.

## Feed endpoint

New `src/pages/notify-feed.json.js`: emits blog posts and podcast episodes as
one JSON array — `{ key, type: 'blog'|'podcast', title, description, link,
pubDate }` — sorted newest first, capped at the latest 20. Built with
`getCollection` and the existing `isVisible` publish logic so drafts and
scheduled posts are excluded until live. Because the notifier reads this live
feed, cron-released scheduled posts are picked up automatically on the next
notify run after the 13:00 UTC release.

## Emails

Plain text, matching the comment verification mail's voice:

- **Confirm**: what they signed up for, confirm link, "ignore this and nothing
  happens."
- **Content notification**: subject `New on mindiweik.com: <title>`; body is
  title, description, link.
- **Newsletter issue**: subject and body verbatim from the compose form.
- Every list email (not the confirm mail) carries a footer with the
  preferences link and unsubscribe link, plus headers:
  `List-Unsubscribe: <mailto:...>, <https://mindiweik.com/api/unsubscribe.php?token=...>`
  and `List-Unsubscribe-Post: List-Unsubscribe=One-Click`.
- `mailer.php` grows a small generic `send_list_email()` alongside the
  existing verification sender, sharing SMTP setup.

## Frontend integration

New `src/components/content/SubscribeForm.astro`:

- Props: `variant: 'inline' | 'footer' | 'homepage'`.
- Email field, three topic checkboxes (all checked by default), honeypot
  field, submit. The footer variant collapses the checkboxes behind a small
  disclosure to stay low-key; inline and homepage variants show them.
- Vanilla JS submit to `/api/subscribe.php` with inline success ("Check your
  email to confirm") and error states. No UI framework, matching the site.
- Styling: design-system tokens only, JetBrains Mono labels, accent-as-fill
  consistent with the comments form.

Mounts:

- `ArticleLayout.astro` and `EpisodeLayout.astro`, near where comments mount
  (`variant="inline"`).
- Site footer (`variant="footer"`).
- Homepage section (`variant="homepage"`).

## Security

- PDO prepared statements everywhere; no string-built SQL.
- All tokens 64-hex from `random_bytes(32)`; compared via parameterized
  lookups; `cron_key` via `hash_equals`.
- Honeypot + per-IP rate limits + per-address daily email cap (reuse comments
  values and pattern).
- Uniform subscribe responses prevent list-membership enumeration.
- GET unsubscribe requires a button click (POST) to take effect, so scanners
  and prefetchers cannot unsubscribe people; the RFC 8058 POST path is
  immediate.
- Emails never rendered as HTML; bodies are plain text.
- Admin surface reuses the existing session + CSRF auth; it is the only place
  subscriber emails are ever displayed.

## Testing

Same honest split as comments (JS/Astro repo, no PHP toolchain):

- Pure logic in `src/lib/subscribe.ts` with Vitest (TDD): client-side email
  validation, topic-selection rules, feed item shaping for
  `notify-feed.json`, and any date formatting.
- `notify-feed.json.js` covered by asserting the shaping logic on fixture
  collections.
- PHP validated with a documented curl checklist against `php -S localhost:8080
  -t dist` and a local database: subscribe → confirm → notify run (with a
  seeded feed diff) → preferences update → unsubscribe (GET and POST paths) →
  admin compose test-send. Manual review for the rest.

## Config additions (server-side config file)

Only `cron_key` (long random string). SMTP settings, `site_url`, and
`from_email`/`from_name` already exist from the comments feature.

## One-time manual setup (owner)

1. phpMyAdmin: run the CREATE TABLE statements for `subscribers`,
   `sent_items`, `issues`, `send_queue` (final SQL in the implementation
   plan).
2. Add `cron_key` to the existing config file above `public_html/`.
3. hPanel > Advanced > Cron Jobs: every 15 minutes, request
   `https://mindiweik.com/api/notify.php?key=<cron_key>` (curl or wget).

## Out of scope for v1 (YAGNI)

HTML email templates, open/click tracking, importing existing contacts,
per-post send customization, issue archive pages on the site, digest batching
(each new item sends individually), moving to a transactional SMTP provider.
