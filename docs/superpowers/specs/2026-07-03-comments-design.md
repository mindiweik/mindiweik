# Self-hosted comments for mindiweik.com

Date: 2026-07-03
Status: approved, ready for implementation planning
Scope: comments on blog posts and podcast episodes

## Goal

Let readers leave comments on blog posts and podcast episodes, with the data
owned entirely by Mindi (no third-party service, no GitHub tie-in). The site is
a fully static Astro build deployed to Hostinger over FTP, so the comment store
lives in the MySQL + PHP that the Hostinger plan already provides.

## Why this architecture

The site has no application runtime. `deploy.yml` builds `dist/` and uploads it
to `/domains/mindiweik.com/public_html/` over FTP. Astro copies `public/**`
into `dist/` verbatim, so a PHP file placed at `public/api/comments.php` lands
at `public_html/api/comments.php` and executes as PHP on Hostinger. That is the
seam: we get a backend with zero changes to the build or deploy pipeline, apart
from one hand-uploaded secrets file.

Alternatives considered and rejected:

- Giscus (GitHub Discussions): least work, near-zero maintenance, but ties
  commenting to GitHub logins and stores comment data in GitHub. Rejected
  because Mindi wants to own the data and not require accounts.
- Hosted service (Hyvor Talk, Commento, etc.): still third-party, some paid.
- Custom serverless backend: extra infra when Hostinger already has MySQL + PHP.

## Decisions (locked)

- Store: MySQL + PHP on the existing Hostinger box.
- Scope: blog posts and podcast episodes.
- Moderation: queue. New comments are held as pending and only appear after
  approval.
- Identity: name and email both required. Email is private, never shown.
- Structure: flat chronological list, no threading.
- Admin: a token-protected `admin.php` page with Approve / Delete.
- Email notifications: deferred to v2.

## Deploy seam and secrets

- `public/api/comments.php` and `public/api/admin.php` ship through the normal
  Astro build and FTP upload. No pipeline change needed for them.
- DB credentials and the admin token live in `comments-config.php` at
  `/domains/mindiweik.com/comments-config.php`, one level ABOVE `public_html/`.
  This means:
  - it is never web-accessible (nothing above the web root is served),
  - it is outside the FTP mirror target, so deploys cannot overwrite or delete
    it,
  - it is never committed to git.
- `comments.php` loads it with `require __DIR__ . '/../../comments-config.php';`
  (`public_html/api/` up two levels reaches `/domains/mindiweik.com/`).
- The file is uploaded once by hand via hPanel File Manager or FTP.

## Data model

One table, `comments`:

| column        | type                  | notes                                        |
|---------------|-----------------------|----------------------------------------------|
| `id`          | INT AUTO_INCREMENT PK |                                              |
| `page_key`    | VARCHAR(191)          | e.g. `blog/my-slug`, `podcast/v1.0.3`        |
| `author_name` | VARCHAR(80)           | shown publicly                               |
| `author_email`| VARCHAR(190)          | private, never returned by the public GET    |
| `body`        | TEXT                  | plain text, stored raw                       |
| `created_at`  | DATETIME              | UTC                                          |
| `approved`    | TINYINT(1) DEFAULT 0  | moderation flag; 1 = visible                 |
| `ip_address`  | VARCHAR(45)           | private, for rate limiting; IPv4/IPv6        |

Index on `(page_key, approved, created_at)` for a fast public read.

```sql
CREATE TABLE comments (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  page_key      VARCHAR(191) NOT NULL,
  author_name   VARCHAR(80)  NOT NULL,
  author_email  VARCHAR(190) NOT NULL,
  body          TEXT         NOT NULL,
  created_at    DATETIME     NOT NULL,
  approved      TINYINT(1)   NOT NULL DEFAULT 0,
  ip_address    VARCHAR(45)  NULL,
  INDEX idx_page_approved_created (page_key, approved, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

## Endpoints

### GET /api/comments.php?page=<page_key>

Returns approved comments only, oldest first, as JSON:

```json
{ "comments": [ { "name": "...", "body": "...", "created_at": "2026-07-03T15:04:05Z" } ] }
```

Never emits `author_email` or `ip_address`. Validates `page` against an
allowed shape (`blog/...` or `podcast/...`).

### POST /api/comments.php

Body (form-encoded or JSON): `page_key`, `name`, `email`, `body`, `website`.

- `website` is the honeypot. It is a hidden field a human never fills. If it is
  non-empty, respond 200 with the normal success message but do not insert
  (silently drop the bot).
- Validate: `page_key` shape, `name` 1..80, `email` format and <=190, `body`
  1..5000. Reject with 422 and a message on failure.
- Rate limit by `ip_address`: at most 3 inserts per minute and 10 per hour.
  Reject with 429 when exceeded.
- Insert with `approved = 0`. Respond:
  `{ "ok": true, "message": "Thanks. Your comment is awaiting approval." }`

### admin.php

- Gated by a secret token from `comments-config.php`, compared with
  `hash_equals` (constant time). One approach only, for simplicity: a single
  password field submitted with every request (the list view and each
  Approve/Delete action carries the token as a hidden field). No sessions or
  cookies in v1.
- GET: list pending comments (newest first) showing name, email, body, page_key,
  created_at, ip_address, with Approve and Delete actions.
- POST: `approve` sets `approved = 1` for an id; `delete` removes the row. Both
  take the id and re-check the token.
- This is the only surface that ever displays email or IP.

## Frontend integration

New component `src/components/content/Comments.astro`:

- Props: `pageKey: string`, `zone: 'blog' | 'podcast'`.
- Mounts in `ArticleLayout.astro` after `<RelatedPosts>` with
  `pageKey={`blog/${slug}`}` and `zone="blog"`.
- Mounts in `EpisodeLayout.astro` after `<EpisodeNav>` with
  `pageKey={`podcast/${id}`}` and `zone="podcast"`.
- Styling follows the design system: accent-as-fill using `--accent-blog` /
  `--accent-podcast` per zone, JetBrains Mono for UI furniture (labels, meta,
  timestamps), Inter for comment bodies. No hardcoded colors; tokens only.
- Vanilla JS only (the site ships no UI framework). An inline script:
  - on load, `GET /api/comments.php?page=<pageKey>` and render the list,
  - builds each comment node with `textContent` (never `innerHTML`) so stored
    text can never execute as HTML,
  - handles the form submit, showing inline success ("awaiting approval") or
    error states,
  - empty state: "Be the first to comment."
- The API base URL is same-origin (`/api/comments.php`), so no CORS needed in
  production. For local dev, see below.

## Security

- PDO with prepared statements for every query. No string-built SQL.
- Store raw, escape on display. Client renders with `textContent`. Plain text
  only in v1, no markdown or HTML.
- Honeypot field plus IP rate limiting as the spam stack; moderation queue is
  the backstop so nothing unapproved is ever public.
- Input length caps and email-format validation server-side (never trust the
  client).
- Same-origin only; send an appropriate `Content-Type: application/json` and a
  restrictive CORS posture (no `Access-Control-Allow-Origin: *`).
- Admin token compared with `hash_equals`. Served only over HTTPS.

## Testing

Honest split, because this repo is a JS/Astro repo with a Vitest suite and no
PHP toolchain:

- Pure logic lives in `src/lib/comments.ts` and gets real Vitest tests (TDD,
  matching the existing suite): `pageKey` derivation, client-side validation
  rules (name/email/body limits, email shape), and the JSON-to-view shaping and
  date formatting.
- The `Comments.astro` inline script stays thin and delegates to
  `src/lib/comments.ts` so the testable logic is covered.
- PHP has no unit tests here. It is validated with a documented `curl` checklist
  against a local `php -S` server pointed at `dist/`, plus manual review. True
  PHP unit tests (phpunit) are a v2 option.

## Local development

Astro dev serves static files and will not execute PHP. To exercise the full
loop locally:

1. `npm run build`
2. `php -S localhost:8080 -t dist` (PHP CLI serves `dist/`, executing the api).
3. Point the component at `http://localhost:8080/api/comments.php` via an env
   override for local runs, or test the endpoint directly with `curl`.
4. Use a local SQLite or a local MySQL and a local `comments-config.php` so no
   production data is touched.

## One-time manual setup (owner)

1. hPanel > Databases > MySQL Databases: create a database and a database user,
   grant the user all privileges on that database. Record host, db name, user,
   password.
2. Run the `CREATE TABLE` above (hPanel > phpMyAdmin > SQL tab).
3. Create `comments-config.php` from the template and upload it to
   `/domains/mindiweik.com/comments-config.php` (above `public_html/`).

`comments-config.php` template:

```php
<?php
return [
  'db_host'     => 'localhost',        // usually localhost on Hostinger shared
  'db_name'     => 'uXXXXXXXX_comments',
  'db_user'     => 'uXXXXXXXX_cuser',
  'db_pass'     => 'REPLACE_WITH_DB_PASSWORD',
  'admin_token' => 'REPLACE_WITH_LONG_RANDOM_STRING',
  'allowed_origin' => 'https://mindiweik.com',
];
```

## Out of scope for v1 (YAGNI)

Email notifications, threaded replies, editing or deleting your own comment,
markdown, avatars, reactions.
