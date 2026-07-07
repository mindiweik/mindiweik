# Email Subscription Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Double-opt-in email subscriptions on mindiweik.com with automated new-content notifications (blog + podcast), per-subscriber topic preferences, and hand-written newsletter issues sent from the admin page.

**Architecture:** Same seam as comments: PHP files in `public/api/` land in `public_html/api/` on Hostinger and execute server-side; MySQL via PDO in the existing comments database; vendored PHPMailer through the `noreply@mindiweik.com` mailbox. New pieces: a `send_queue` table drained in batches of 40 by a cron-hit `notify.php` (works around PHP execution limits and mailbox hourly send caps), a `sent_items` table that makes notification enqueueing idempotent, and a static `notify-feed.json` endpoint the notifier diffs against. Pure client logic lives in `src/lib/subscribe.ts` (Vitest, TDD); `SubscribeForm.astro` renders three variants.

**Tech Stack:** Astro (static), TypeScript, Vitest, vanilla JS, PHP 8, MySQL (PDO), PHPMailer (vendored), Hostinger cron.

**Spec:** `docs/superpowers/specs/2026-07-05-email-subscription-design.md`

## Global constraints

- No emdashes in any copy (code comments, UI text, emails, docs). Sentence case for headings except an H1.
- No hardcoded colors in components. Design tokens only (`--accent-blog`, `--accent-podcast`, `--accent-primary`, `--ink`, `--border`, `--text-muted`, `--text`, `--font-mono`, `--font-body`).
- Accent-as-fill: accents are fills (buttons, chips, borders) with `--ink` on top, never small colored text on the canvas.
- Store raw, escape on display. Client renders user text with `textContent`, never `innerHTML`. PHP HTML output uses `htmlspecialchars` (via `sub_h`).
- Every SQL query uses PDO prepared statements. No string-built SQL with user input.
- All secrets live only in `/domains/mindiweik.com/comments-config.php` (above web root, gitignored). This feature adds one key: `cron_key`.
- Tokens: 64 hex chars from `bin2hex(random_bytes(32))`. Shape-check with `/^[a-f0-9]{64}$/` before touching the database. `cron_key` compared with `hash_equals`.
- Email limits: valid format, length <= 190. At least one topic must be selected.
- Anti-enumeration: `subscribe.php` returns the identical success response for new, pending, active, and unsubscribed addresses.
- Emails are plain text only, never HTML.
- Node >= 22.12. Test: `npm test` (vitest run). Lint: `npm run lint`. Build: `npm run build`.
- Work happens on the existing `feat/email-subscription` branch. Conventional commit messages (`feat:`, `docs:`, `chore:`). Never add co-author trailers.

## File map

| File | Role |
|---|---|
| `src/lib/subscribe.ts` (new) | Pure client logic: validation, API URL, feed shaping. Only unit-tested layer. |
| `src/lib/subscribe.test.ts` (new) | Vitest coverage for the above. |
| `src/pages/notify-feed.json.js` (new) | Static JSON feed of latest 20 visible blog posts + podcast episodes. |
| `public/api/lib/subscribe-lib.php` (new) | Shared PHP helpers: db, escaping, token checks, page rendering. |
| `public/api/mailer.php` (modify) | Extract `make_mailer()`, add `send_subscribe_confirm_email()` and `send_list_email()`. |
| `public/api/subscribe.php` (new) | POST signup endpoint (honeypot, rate limits, uniform response). |
| `public/api/confirm.php` (new) | GET double-opt-in confirmation. |
| `public/api/preferences.php` (new) | GET/POST topic preferences + unsubscribe, keyed by manage token. |
| `public/api/unsubscribe.php` (new) | GET confirmation page + POST one-click (RFC 8058). |
| `public/api/notify.php` (new) | Cron endpoint: diff feed, enqueue, drain queue in batches of 40. |
| `public/api/admin.php` (modify) | Newsletter section: counts, compose, test send, send, subscriber list. |
| `src/components/content/SubscribeForm.astro` (new) | Form component, variants inline / footer / homepage. |
| `src/layouts/ArticleLayout.astro`, `src/layouts/EpisodeLayout.astro`, `src/components/layout/Footer.astro`, `src/pages/index.astro` (modify) | Mounts. |
| `comments-config.example.php` (modify) | Document the new `cron_key`. |
| `docs/email-subscription-setup.md` (new) | Owner setup: SQL, config, cron job, seed run. |
| `docs/email-subscription-checklist.md` (new) | Local curl verification runbook. |

## Database schema (final SQL)

Lives in `docs/email-subscription-setup.md` (Task 3) and is run manually in phpMyAdmin against the existing `u112789821_comments` database. Reproduced here because later tasks depend on the exact columns.

One deliberate addition over the spec's table sketch: `confirm_sends` + `confirm_sends_date` on `subscribers`. Comments could count rows per address per day to cap confirmation emails; subscribers have one row per address, so re-sends need their own counter.

```sql
CREATE TABLE subscribers (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  email VARCHAR(190) NOT NULL,
  status TINYINT NOT NULL DEFAULT 0, -- 0 pending, 1 active, 2 unsubscribed
  verify_token VARCHAR(64) NULL,
  manage_token VARCHAR(64) NOT NULL,
  wants_blog TINYINT(1) NOT NULL DEFAULT 1,
  wants_podcast TINYINT(1) NOT NULL DEFAULT 1,
  wants_newsletter TINYINT(1) NOT NULL DEFAULT 1,
  confirm_sends TINYINT NOT NULL DEFAULT 0,
  confirm_sends_date DATE NULL,
  created_at DATETIME NOT NULL,
  confirmed_at DATETIME NULL,
  ip_address VARCHAR(45) NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_email (email),
  KEY idx_verify (verify_token),
  KEY idx_manage (manage_token),
  KEY idx_ip_created (ip_address, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE sent_items (
  item_key VARCHAR(191) NOT NULL, -- 'blog/<slug>' or 'podcast/<id>'
  sent_at DATETIME NOT NULL,
  PRIMARY KEY (item_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE issues (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  subject VARCHAR(190) NOT NULL,
  body TEXT NOT NULL,
  sent_at DATETIME NULL,
  recipient_count INT NULL,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE send_queue (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  subscriber_id INT UNSIGNED NOT NULL,
  item_key VARCHAR(191) NULL,  -- exactly one of item_key / issue_id is set
  issue_id INT UNSIGNED NULL,
  status TINYINT NOT NULL DEFAULT 0, -- 0 queued, 1 sent, 2 failed or cancelled
  attempts TINYINT NOT NULL DEFAULT 0, -- give up after 3
  created_at DATETIME NOT NULL,
  sent_at DATETIME NULL,
  PRIMARY KEY (id),
  KEY idx_drain (status, created_at),
  CONSTRAINT fk_sq_subscriber FOREIGN KEY (subscriber_id)
    REFERENCES subscribers(id) ON DELETE CASCADE,
  CONSTRAINT fk_sq_issue FOREIGN KEY (issue_id)
    REFERENCES issues(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

`ON DELETE CASCADE` on `send_queue.subscriber_id` matters: the admin subscriber delete would otherwise hit FK errors whenever the address still has queued rows.

---

### Task 1: Client subscribe logic + tests (`src/lib/subscribe.ts`)

Pure, framework-free functions shared by the component and covered by Vitest. Mirrors `src/lib/comments.ts` (which this file imports `isValidEmail` from; do not duplicate the email regex).

**Files:**
- Create: `src/lib/subscribe.ts`
- Test: `src/lib/subscribe.test.ts`

**Interfaces:**
- Consumes: `isValidEmail(email: string): boolean` from `./comments`.
- Produces:
  - `TOPICS: readonly ['blog', 'podcast', 'newsletter']` and `type Topic`
  - `interface SubscribeInput { email: string; wantsBlog: boolean; wantsPodcast: boolean; wantsNewsletter: boolean }`
  - `validateSubscribe(input: SubscribeInput): { ok: boolean; errors: string[] }` (errors contains any of `'email' | 'topics'`)
  - `subscribeApiUrl(env?: { PUBLIC_SUBSCRIBE_API?: string }): string`

- [ ] **Step 1: Write the failing test**

Create `src/lib/subscribe.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { validateSubscribe, subscribeApiUrl, TOPICS } from './subscribe';

describe('TOPICS', () => {
  it('lists the three streams', () => {
    expect(TOPICS).toEqual(['blog', 'podcast', 'newsletter']);
  });
});

describe('validateSubscribe', () => {
  const base = { email: 'a@b.co', wantsBlog: true, wantsPodcast: true, wantsNewsletter: true };

  it('accepts a valid email with all topics on', () => {
    expect(validateSubscribe(base)).toEqual({ ok: true, errors: [] });
  });

  it('accepts a single topic', () => {
    expect(validateSubscribe({ ...base, wantsBlog: false, wantsPodcast: false })).toEqual({
      ok: true,
      errors: [],
    });
  });

  it('rejects a malformed email', () => {
    expect(validateSubscribe({ ...base, email: 'not-an-email' })).toEqual({
      ok: false,
      errors: ['email'],
    });
  });

  it('rejects an email over 190 chars', () => {
    const long = `${'a'.repeat(185)}@b.co`;
    expect(validateSubscribe({ ...base, email: long }).errors).toContain('email');
  });

  it('trims whitespace before validating', () => {
    expect(validateSubscribe({ ...base, email: '  a@b.co  ' }).ok).toBe(true);
  });

  it('rejects zero topics selected', () => {
    expect(
      validateSubscribe({ ...base, wantsBlog: false, wantsPodcast: false, wantsNewsletter: false }),
    ).toEqual({ ok: false, errors: ['topics'] });
  });

  it('reports both errors at once', () => {
    expect(
      validateSubscribe({
        email: 'nope',
        wantsBlog: false,
        wantsPodcast: false,
        wantsNewsletter: false,
      }).errors,
    ).toEqual(['email', 'topics']);
  });
});

describe('subscribeApiUrl', () => {
  it('defaults to the same-origin endpoint', () => {
    expect(subscribeApiUrl({})).toBe('/api/subscribe.php');
  });

  it('honors PUBLIC_SUBSCRIBE_API for local dev', () => {
    expect(subscribeApiUrl({ PUBLIC_SUBSCRIBE_API: 'http://localhost:8080/api/subscribe.php' })).toBe(
      'http://localhost:8080/api/subscribe.php',
    );
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/lib/subscribe.test.ts`
Expected: FAIL, cannot resolve `./subscribe`.

- [ ] **Step 3: Write minimal implementation**

Create `src/lib/subscribe.ts`:

```ts
// Pure client-side subscription logic. Shared by SubscribeForm.astro and
// unit-tested here. subscribe.php re-validates everything server-side.

import { isValidEmail } from './comments';

export const TOPICS = ['blog', 'podcast', 'newsletter'] as const;
export type Topic = (typeof TOPICS)[number];

export interface SubscribeInput {
  email: string;
  wantsBlog: boolean;
  wantsPodcast: boolean;
  wantsNewsletter: boolean;
}

export function validateSubscribe(input: SubscribeInput): { ok: boolean; errors: string[] } {
  const errors: string[] = [];
  if (!isValidEmail((input.email ?? '').trim())) errors.push('email');
  if (!input.wantsBlog && !input.wantsPodcast && !input.wantsNewsletter) errors.push('topics');
  return { ok: errors.length === 0, errors };
}

// Same-origin in prod; PUBLIC_SUBSCRIBE_API lets local dev point at a php -S server.
export function subscribeApiUrl(env: { PUBLIC_SUBSCRIBE_API?: string } = import.meta.env): string {
  return env.PUBLIC_SUBSCRIBE_API || '/api/subscribe.php';
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/lib/subscribe.test.ts`
Expected: PASS (9 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/subscribe.ts src/lib/subscribe.test.ts
git commit -m "feat: client-side subscribe validation logic"
```

---

### Task 2: Feed shaping + `notify-feed.json` endpoint

The notifier diffs against this feed. Shaping is pure and tested on fixture collections; the endpoint itself is a thin `getCollection` wrapper like `rss.xml.js`. Because it filters with `isVisible`, drafts and scheduled posts are excluded until the daily cron rebuild releases them, and the next notify run picks them up automatically.

**Files:**
- Modify: `src/lib/subscribe.ts` (append)
- Modify: `src/lib/subscribe.test.ts` (append)
- Create: `src/pages/notify-feed.json.js`

**Interfaces:**
- Consumes: `getCollection` (astro:content), `isVisible` from `src/lib/publish.ts`, `SITE.url` from `src/config/site.ts`. Collection entry shapes: blog entries have `id`, `data.title`, `data.description`, `data.pubDate: Date`; podcast entries the same plus `data.version`.
- Produces:
  - `interface NotifyFeedItem { key: string; type: 'blog' | 'podcast'; title: string; description: string; link: string; pubDate: string }`
  - `toNotifyFeedItems(raw: { blog: { id: string; data: any }[]; podcast: { id: string; data: any }[] }, site: string, limit?: number): NotifyFeedItem[]` (default limit 20, sorted newest first, `pubDate` as ISO string, `link` absolute)
  - Build artifact: `dist/notify-feed.json` (a JSON array of `NotifyFeedItem`).

- [ ] **Step 1: Write the failing test**

Append to `src/lib/subscribe.test.ts`:

```ts
import { toNotifyFeedItems } from './subscribe';

describe('toNotifyFeedItems', () => {
  const site = 'https://mindiweik.com';
  const blogEntry = (id: string, iso: string) => ({
    id,
    data: { title: `post ${id}`, description: `about ${id}`, pubDate: new Date(iso) },
  });
  const podEntry = (id: string, iso: string) => ({
    id,
    data: { title: `ep ${id}`, description: `show ${id}`, pubDate: new Date(iso), version: id },
  });

  it('shapes blog and podcast entries with absolute links', () => {
    const items = toNotifyFeedItems(
      { blog: [blogEntry('my-post', '2026-07-01')], podcast: [podEntry('v1.0.4', '2026-06-01')] },
      site,
    );
    expect(items).toEqual([
      {
        key: 'blog/my-post',
        type: 'blog',
        title: 'post my-post',
        description: 'about my-post',
        link: 'https://mindiweik.com/blog/my-post/',
        pubDate: new Date('2026-07-01').toISOString(),
      },
      {
        key: 'podcast/v1.0.4',
        type: 'podcast',
        title: 'ep v1.0.4',
        description: 'show v1.0.4',
        link: 'https://mindiweik.com/podcast/v1.0.4/',
        pubDate: new Date('2026-06-01').toISOString(),
      },
    ]);
  });

  it('sorts newest first across both collections', () => {
    const items = toNotifyFeedItems(
      {
        blog: [blogEntry('old', '2026-01-01'), blogEntry('new', '2026-07-01')],
        podcast: [podEntry('mid', '2026-04-01')],
      },
      site,
    );
    expect(items.map((i) => i.key)).toEqual(['blog/new', 'podcast/mid', 'blog/old']);
  });

  it('caps at the limit (default 20)', () => {
    const blog = Array.from({ length: 25 }, (_, i) =>
      blogEntry(`p${i}`, `2026-01-${String(i + 1).padStart(2, '0')}`),
    );
    expect(toNotifyFeedItems({ blog, podcast: [] }, site)).toHaveLength(20);
    expect(toNotifyFeedItems({ blog, podcast: [] }, site, 5)).toHaveLength(5);
  });

  it('defaults a missing description to empty string', () => {
    const entry = { id: 'bare', data: { title: 'bare', pubDate: new Date('2026-07-01') } };
    expect(toNotifyFeedItems({ blog: [entry], podcast: [] }, site)[0].description).toBe('');
  });

  it('strips a trailing slash from the site url', () => {
    const items = toNotifyFeedItems({ blog: [blogEntry('x', '2026-07-01')], podcast: [] }, `${site}/`);
    expect(items[0].link).toBe('https://mindiweik.com/blog/x/');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/lib/subscribe.test.ts`
Expected: FAIL, `toNotifyFeedItems` is not exported.

- [ ] **Step 3: Write minimal implementation**

Append to `src/lib/subscribe.ts`:

```ts
// Feed shaping for /notify-feed.json. Pure so it can be tested on fixtures;
// the endpoint feeds it real collections filtered by isVisible.
export interface NotifyFeedItem {
  key: string;
  type: 'blog' | 'podcast';
  title: string;
  description: string;
  link: string;
  pubDate: string;
}

export function toNotifyFeedItems(
  raw: { blog: { id: string; data: any }[]; podcast: { id: string; data: any }[] },
  site: string,
  limit = 20,
): NotifyFeedItem[] {
  const base = site.replace(/\/+$/, '');
  const shape = (type: 'blog' | 'podcast') => (e: { id: string; data: any }): NotifyFeedItem => ({
    key: `${type}/${e.id}`,
    type,
    title: e.data.title,
    description: e.data.description ?? '',
    link: `${base}/${type}/${e.id}/`,
    pubDate: e.data.pubDate.toISOString(),
  });
  return [...raw.blog.map(shape('blog')), ...raw.podcast.map(shape('podcast'))]
    .sort((a, b) => b.pubDate.localeCompare(a.pubDate))
    .slice(0, limit);
}
```

Note: ISO 8601 strings sort lexicographically, so `localeCompare` on `pubDate` is a correct date sort.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test`
Expected: PASS, full suite green.

- [ ] **Step 5: Create the endpoint**

Create `src/pages/notify-feed.json.js`:

```js
import { getCollection } from 'astro:content';
import { SITE } from '../config/site.ts';
import { isVisible } from '../lib/publish.ts';
import { toNotifyFeedItems } from '../lib/subscribe.ts';

export async function GET() {
  const [blog, podcast] = await Promise.all([
    getCollection('blog', isVisible),
    getCollection('podcast', isVisible),
  ]);
  return new Response(JSON.stringify(toNotifyFeedItems({ blog, podcast }, SITE.url)), {
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
}
```

- [ ] **Step 6: Verify the build artifact**

Run: `npm run build && node -e "const f=require('./dist/notify-feed.json'); console.log(f.length, f[0])"`
Expected: prints a count (<= 20) and a newest-first item with `key`, `type`, `title`, `description`, `link`, `pubDate` fields.

- [ ] **Step 7: Commit**

```bash
git add src/lib/subscribe.ts src/lib/subscribe.test.ts src/pages/notify-feed.json.js
git commit -m "feat: notify-feed.json endpoint + feed shaping"
```

---

### Task 3: PHP shared lib, config key, owner setup doc

Five new PHP endpoints share db/escape/render/token helpers. Comments duplicated `db()` per file at 3 files; at 5 more, extract once. Prefixed `sub_` so nothing collides if a file ever requires both this and `comments.php` helpers.

**Files:**
- Create: `public/api/lib/subscribe-lib.php`
- Modify: `comments-config.example.php`
- Create: `docs/email-subscription-setup.md`

**Interfaces:**
- Consumes: the `$config` array shape from `comments-config.php` (keys: `db_host`, `db_name`, `db_user`, `db_pass`, `site_url`, plus new `cron_key`).
- Produces (used by Tasks 5-10):
  - `sub_db(array $config): PDO`
  - `sub_h(?string $s): string`
  - `sub_valid_token(string $t): bool` (64 lowercase hex)
  - `sub_valid_email(string $e): bool`
  - `sub_site_url(array $config): string` (no trailing slash)
  - `sub_render_page(string $title, string $message, string $link, string $linkLabel): void` (echoes a full HTML page and exits)

- [ ] **Step 1: Create the shared lib**

Create `public/api/lib/subscribe-lib.php`:

```php
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
```

- [ ] **Step 2: Lint it**

Run: `php -l public/api/lib/subscribe-lib.php`
Expected: `No syntax errors detected`.

- [ ] **Step 3: Add cron_key to the config example**

In `comments-config.example.php`, add before the closing `];`:

```php

  // Email subscriptions: secret gating the cron endpoint
  // (notify.php?key=...). Generate with: php -r "echo bin2hex(random_bytes(32));"
  'cron_key'       => 'REPLACE_WITH_LONG_RANDOM_STRING',
```

- [ ] **Step 4: Write the owner setup doc**

Create `docs/email-subscription-setup.md`:

```markdown
# Email subscription: one-time server setup

Everything below is manual, done once, in this order. The code deploys via the
normal FTP pipeline; nothing works until these steps are done, so do them
BEFORE merging to main.

## 1. Create the tables

phpMyAdmin > database `u112789821_comments` > SQL tab. Run:

[paste the full CREATE TABLE block from the "Database schema (final SQL)"
section of docs/superpowers/plans/2026-07-06-email-subscription.md, all four
tables, verbatim]

## 2. Add cron_key to the server config

Edit `/domains/mindiweik.com/comments-config.php` (above public_html) and add:

    'cron_key' => '<output of: php -r "echo bin2hex(random_bytes(32));">',

## 3. Create the cron job

hPanel > Advanced > Cron Jobs. Every 15 minutes:

    /usr/bin/curl -s "https://mindiweik.com/api/notify.php?key=<cron_key>" > /dev/null

## 4. Seed sent_items (after deploy)

Hit the notify URL once in a browser right after the first deploy:

    https://mindiweik.com/api/notify.php?key=<cron_key>

The first run marks every existing feed item as already announced. With zero
subscribers nothing is emailed, and existing content can never re-notify.
Do this before sharing the subscribe form with anyone.

## Sending capacity

The drain sends at most 40 emails per run, 4 runs per hour = 160/hour ceiling,
safely under the Hostinger mailbox cap. A newsletter to N subscribers finishes
in about ceil(N / 40) * 15 minutes.
```

- [ ] **Step 5: Commit**

```bash
git add public/api/lib/subscribe-lib.php comments-config.example.php docs/email-subscription-setup.md
git commit -m "feat: shared subscription PHP lib, cron_key config, setup doc"
```

---

### Task 4: Mailer extensions (`public/api/mailer.php`)

Extract the SMTP setup into `make_mailer()`, refactor the existing verification sender onto it, add the subscription confirm sender and the generic list sender (footer + RFC 8058 headers).

**Files:**
- Modify: `public/api/mailer.php`

**Interfaces:**
- Consumes: `$config` SMTP keys (`smtp_host`, `smtp_user`, `smtp_pass`, `smtp_port`, `smtp_secure`, `from_email`, `from_name`, `site_url`).
- Produces (used by Tasks 5, 9, 10):
  - `make_mailer(array $config): PHPMailer`
  - `send_subscribe_confirm_email(array $config, string $toEmail, array $topics, string $confirmLink): void` ($topics is a list like `['blog posts', 'podcast episodes']`)
  - `send_list_email(array $config, string $toEmail, string $subject, string $body, string $manageToken): void` (empty `$manageToken` = no footer/headers; used for admin test sends)
  - `send_verification_email` keeps its exact existing signature (comments still calls it).

- [ ] **Step 1: Rewrite mailer.php**

Replace the whole file with:

```php
<?php
declare(strict_types=1);

// SMTP senders for comment verification and email subscriptions. Uses the
// vendored PHPMailer so no Composer is needed on the Hostinger server. SMTP
// credentials come from the server-only comments-config.php (a Hostinger
// mailbox on this domain, so SPF and DKIM are already set up).

use PHPMailer\PHPMailer\PHPMailer;

require_once __DIR__ . '/lib/PHPMailer/Exception.php';
require_once __DIR__ . '/lib/PHPMailer/PHPMailer.php';
require_once __DIR__ . '/lib/PHPMailer/SMTP.php';

// Shared SMTP setup. PHPMailer is constructed with exceptions enabled, so
// every sender below throws on failure and the caller can react.
function make_mailer(array $config): PHPMailer {
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

// Comment confirmation (unchanged behavior; now built on make_mailer).
function send_verification_email(array $config, string $toEmail, string $toName, string $verifyLink): void {
  $mail = make_mailer($config);
  $mail->addAddress($toEmail, $toName);
  $mail->Subject = 'Confirm your comment on mindiweik.com';
  $mail->Body =
    'Hi ' . $toName . ",\n\n" .
    "Thanks for commenting on mindiweik.com. Confirm it with this link and your comment goes live:\n\n" .
    $verifyLink . "\n\n" .
    "If you did not write this, ignore this email and nothing is posted.\n";
  $mail->send();
}

// Subscription double-opt-in confirmation. $topics is a human-readable list,
// e.g. ['blog posts', 'podcast episodes'].
function send_subscribe_confirm_email(array $config, string $toEmail, array $topics, string $confirmLink): void {
  $mail = make_mailer($config);
  $mail->addAddress($toEmail);
  $mail->Subject = 'Confirm your subscription to mindiweik.com';
  $mail->Body =
    "Hi,\n\n" .
    'You (or someone using this address) asked for email updates from mindiweik.com: ' .
    implode(', ', $topics) . ".\n\n" .
    "Confirm with this link and you are on the list:\n\n" .
    $confirmLink . "\n\n" .
    "If this was not you, ignore this email and nothing happens.\n";
  $mail->send();
}

// Generic list email: content notifications and newsletter issues. Every list
// email carries the preferences/unsubscribe footer and RFC 8058 headers so
// Gmail/Yahoo show their native Unsubscribe button. An empty $manageToken
// skips footer and headers (admin "send test to me").
function send_list_email(array $config, string $toEmail, string $subject, string $body, string $manageToken): void {
  $mail = make_mailer($config);
  $mail->addAddress($toEmail);
  $mail->Subject = $subject;

  if ($manageToken !== '') {
    $site = rtrim((string) ($config['site_url'] ?? 'https://mindiweik.com'), '/');
    $prefsLink = $site . '/api/preferences.php?token=' . $manageToken;
    $unsubLink = $site . '/api/unsubscribe.php?token=' . $manageToken;
    $body .=
      "\n\n--\n" .
      "You get this because you subscribed at mindiweik.com.\n" .
      'Manage preferences: ' . $prefsLink . "\n" .
      'Unsubscribe: ' . $unsubLink . "\n";
    $mail->addCustomHeader(
      'List-Unsubscribe',
      sprintf('<mailto:%s>, <%s>', (string) $config['from_email'], $unsubLink)
    );
    $mail->addCustomHeader('List-Unsubscribe-Post', 'List-Unsubscribe=One-Click');
  }

  $mail->Body = $body;
  $mail->send();
}
```

- [ ] **Step 2: Lint**

Run: `php -l public/api/mailer.php`
Expected: `No syntax errors detected`.

- [ ] **Step 3: Confirm comments still builds its mail path**

Run: `php -r "require 'public/api/mailer.php'; var_dump(function_exists('send_verification_email'), function_exists('send_list_email'), function_exists('send_subscribe_confirm_email'));"`
Expected: `bool(true)` three times.

- [ ] **Step 4: Commit**

```bash
git add public/api/mailer.php
git commit -m "feat: mailer gains subscribe confirm + list email senders"
```

---

### Task 5: `subscribe.php` (POST signup)

**Files:**
- Create: `public/api/subscribe.php`

**Interfaces:**
- Consumes: `sub_db`, `sub_valid_email`, `sub_site_url` (Task 3); `send_subscribe_confirm_email` (Task 4); tables `subscribers` (schema above).
- Produces: `POST /api/subscribe.php` accepting JSON or form body `{ email, wants_blog, wants_podcast, wants_newsletter, website }`. Success is always `200 { ok: true, message: 'Almost there. Check your email to confirm your subscription.' }` regardless of membership state (anti-enumeration). Errors: `422 { error: 'invalid', fields: [...] }`, `429`, `502` (mail failure on a brand-new signup), `405`, `500`.

Behavior matrix (from the spec):
- New address: insert pending row + send confirm mail (delete the row if the send throws, then 502).
- Existing pending: refresh `verify_token`, update topic flags to the latest submission, re-send within the 3/day per-address cap (silently skip the send when capped; still return success).
- Existing active: update nothing, send nothing, return success.
- Unsubscribed: flip back to pending with a fresh `verify_token`, update flags, send confirm (same cap). `manage_token` is permanent and never regenerated.

- [ ] **Step 1: Write the endpoint**

Create `public/api/subscribe.php`:

```php
<?php
declare(strict_types=1);

// Email subscription signup.
//   POST /api/subscribe.php  { email, wants_blog, wants_podcast, wants_newsletter, website }
// Double opt-in: rows start pending (status=0); confirm.php flips them active.
// The response is deliberately identical for new / pending / active /
// unsubscribed addresses so the form cannot be used to probe list membership.

$config = require __DIR__ . '/../../comments-config.php';
require __DIR__ . '/lib/subscribe-lib.php';
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

const SUCCESS = ['ok' => true, 'message' => 'Almost there. Check your email to confirm your subscription.'];

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
  respond(405, ['error' => 'method not allowed']);
}

try {
  $ctype = $_SERVER['CONTENT_TYPE'] ?? '';
  if (str_contains($ctype, 'application/json')) {
    $data = json_decode((string) file_get_contents('php://input'), true) ?: [];
  } else {
    $data = $_POST;
  }

  // Honeypot: humans never see "website"; bots fill it. Pretend success.
  if (!empty($data['website'])) {
    respond(200, SUCCESS);
  }

  $email      = strtolower(trim((string) ($data['email'] ?? '')));
  $wantsBlog  = !empty($data['wants_blog']) ? 1 : 0;
  $wantsPod   = !empty($data['wants_podcast']) ? 1 : 0;
  $wantsNews  = !empty($data['wants_newsletter']) ? 1 : 0;

  $errors = [];
  if (!sub_valid_email($email))                    $errors[] = 'email';
  if ($wantsBlog + $wantsPod + $wantsNews === 0)   $errors[] = 'topics';
  if ($errors) respond(422, ['error' => 'invalid', 'fields' => $errors]);

  $pdo = sub_db($config);
  $ip  = $_SERVER['REMOTE_ADDR'] ?? null;

  // Rate limit new signups: at most 3 per minute and 10 per hour per IP.
  // Counts inserted rows only; re-sends to an existing address are instead
  // bounded by the per-address daily cap below.
  if ($ip !== null) {
    $rl = $pdo->prepare(
      'SELECT
         SUM(created_at >= UTC_TIMESTAMP() - INTERVAL 1 MINUTE) AS last_min,
         SUM(created_at >= UTC_TIMESTAMP() - INTERVAL 1 HOUR)   AS last_hour
       FROM subscribers WHERE ip_address = ?'
    );
    $rl->execute([$ip]);
    $c = $rl->fetch();
    if ((int) $c['last_min'] >= 3 || (int) $c['last_hour'] >= 10) {
      respond(429, ['error' => 'Too many signups. Please wait a bit.']);
    }
  }

  $sel = $pdo->prepare(
    'SELECT id, status, confirm_sends, confirm_sends_date FROM subscribers WHERE email = ? LIMIT 1'
  );
  $sel->execute([$email]);
  $row = $sel->fetch();

  // Per-address cap: at most 3 confirmation emails per day, so the form
  // cannot be used to bombard a victim's inbox. Resets when the date rolls.
  $underCap = function (array $r): bool {
    $today = gmdate('Y-m-d');
    return $r['confirm_sends_date'] !== $today || (int) $r['confirm_sends'] < 3;
  };
  $topicNames = array_filter([
    $wantsBlog  ? 'blog posts' : null,
    $wantsPod   ? 'podcast episodes' : null,
    $wantsNews  ? 'newsletter' : null,
  ]);

  if ($row === false) {
    // New address: pending row + confirmation email.
    $verify = bin2hex(random_bytes(32));
    $manage = bin2hex(random_bytes(32));
    $ins = $pdo->prepare(
      'INSERT INTO subscribers
         (email, status, verify_token, manage_token, wants_blog, wants_podcast, wants_newsletter,
          confirm_sends, confirm_sends_date, created_at, ip_address)
       VALUES (?, 0, ?, ?, ?, ?, ?, 1, UTC_DATE(), UTC_TIMESTAMP(), ?)'
    );
    $ins->execute([$email, $verify, $manage, $wantsBlog, $wantsPod, $wantsNews, $ip]);
    $id = (int) $pdo->lastInsertId();
    $confirmLink = sub_site_url($config) . '/api/confirm.php?token=' . $verify;
    try {
      send_subscribe_confirm_email($config, $email, $topicNames, $confirmLink);
    } catch (Throwable $mailError) {
      // A failed send must not leave an orphaned pending row.
      $pdo->prepare('DELETE FROM subscribers WHERE id = ?')->execute([$id]);
      respond(502, ['error' => 'We could not send the confirmation email. Please try again.']);
    }
    respond(200, SUCCESS);
  }

  if ((int) $row['status'] === 1) {
    // Already active: nothing to do, identical response.
    respond(200, SUCCESS);
  }

  // Pending or unsubscribed: back to pending with a fresh single-use token
  // and the latest topic choices. manage_token never changes.
  if ($underCap($row)) {
    $verify = bin2hex(random_bytes(32));
    $upd = $pdo->prepare(
      'UPDATE subscribers
          SET status = 0, verify_token = ?, wants_blog = ?, wants_podcast = ?, wants_newsletter = ?,
              confirm_sends = IF(confirm_sends_date = UTC_DATE(), confirm_sends + 1, 1),
              confirm_sends_date = UTC_DATE()
        WHERE id = ?'
    );
    $upd->execute([$verify, $wantsBlog, $wantsPod, $wantsNews, (int) $row['id']]);
    $confirmLink = sub_site_url($config) . '/api/confirm.php?token=' . $verify;
    try {
      send_subscribe_confirm_email($config, $email, $topicNames, $confirmLink);
    } catch (Throwable $mailError) {
      // Row already existed; keep it, just report the send failure.
      respond(502, ['error' => 'We could not send the confirmation email. Please try again.']);
    }
  }
  // Capped: silently skip the send. Same response either way.
  respond(200, SUCCESS);
} catch (Throwable $e) {
  respond(500, ['error' => 'server error']);
}
```

- [ ] **Step 2: Lint**

Run: `php -l public/api/subscribe.php`
Expected: `No syntax errors detected`.

- [ ] **Step 3: Commit**

```bash
git add public/api/subscribe.php
git commit -m "feat: subscribe endpoint with double opt-in + anti-abuse"
```

Full behavioral verification happens in Task 13's curl checklist (needs a local DB).

---

### Task 6: `confirm.php` (double-opt-in confirmation)

**Files:**
- Create: `public/api/confirm.php`

**Interfaces:**
- Consumes: `sub_db`, `sub_valid_token`, `sub_site_url`, `sub_render_page` (Task 3).
- Produces: `GET /api/confirm.php?token=<64-hex>`. Valid pending token: flips `status` to 1, sets `confirmed_at`, clears `verify_token` (single-use), renders a confirmation page. Bad shape: 400 page. Unknown/used: 410 page.

- [ ] **Step 1: Write the endpoint**

Create `public/api/confirm.php`:

```php
<?php
declare(strict_types=1);

// Subscription confirmation endpoint. The link emailed by subscribe.php
// points here:
//   GET /api/confirm.php?token=<64 hex>
// A valid token flips its subscriber from pending (status=0) to active
// (status=1) and clears the token so the link cannot be reused.

$config = require __DIR__ . '/../../comments-config.php';
require __DIR__ . '/lib/subscribe-lib.php';

header('Content-Type: text/html; charset=utf-8');
header('X-Robots-Tag: noindex, nofollow');

$siteUrl = sub_site_url($config);
$token = (string) ($_GET['token'] ?? '');

if (!sub_valid_token($token)) {
  http_response_code(400);
  sub_render_page('Invalid link', 'This confirmation link is not valid.', $siteUrl, 'Back to mindiweik.com');
}

try {
  $pdo = sub_db($config);

  $sel = $pdo->prepare('SELECT id FROM subscribers WHERE verify_token = ? AND status = 0 LIMIT 1');
  $sel->execute([$token]);
  $row = $sel->fetch();

  if (!$row) {
    http_response_code(410);
    sub_render_page(
      'Link expired or already used',
      'You may already be subscribed, or the link has expired. Subscribing again from the site sends a fresh link.',
      $siteUrl,
      'Back to mindiweik.com'
    );
  }

  $pdo->prepare(
    'UPDATE subscribers SET status = 1, confirmed_at = UTC_TIMESTAMP(), verify_token = NULL WHERE id = ?'
  )->execute([(int) $row['id']]);

  sub_render_page(
    'Subscription confirmed',
    'Thanks, you are on the list. New posts and episodes will land in your inbox.',
    $siteUrl,
    'Back to mindiweik.com'
  );
} catch (Throwable $e) {
  http_response_code(500);
  sub_render_page('Something went wrong', 'Please try the link again in a little while.', $siteUrl, 'Back to mindiweik.com');
}
```

- [ ] **Step 2: Lint**

Run: `php -l public/api/confirm.php`
Expected: `No syntax errors detected`.

- [ ] **Step 3: Commit**

```bash
git add public/api/confirm.php
git commit -m "feat: subscription confirm endpoint"
```

---

### Task 7: `preferences.php` (topic preferences page)

**Files:**
- Create: `public/api/preferences.php`

**Interfaces:**
- Consumes: `sub_db`, `sub_valid_token`, `sub_h`, `sub_site_url`, `sub_render_page` (Task 3).
- Produces: `GET /api/preferences.php?token=<manage_token>` renders a self-posting form (three checkboxes + save button + unsubscribe button). `POST` with `action=save` updates the flags (at least one required); `action=unsubscribe` sets `status=2`. The manage token is the capability: possession of the emailed secret URL authorizes changes, same model every newsletter service uses.

- [ ] **Step 1: Write the endpoint**

Create `public/api/preferences.php`:

```php
<?php
declare(strict_types=1);

// Subscriber preferences page, keyed by the permanent manage_token from the
// email footer.
//   GET  /api/preferences.php?token=<64 hex>   -> render form
//   POST action=save          -> update topic flags
//   POST action=unsubscribe   -> status=2
// The token itself is the credential (a secret URL only the subscriber's
// inbox has), so there is no separate session or CSRF token here.

$config = require __DIR__ . '/../../comments-config.php';
require __DIR__ . '/lib/subscribe-lib.php';

header('Content-Type: text/html; charset=utf-8');
header('X-Robots-Tag: noindex, nofollow');
// Never leak the token to linked pages via the Referer header.
header('Referrer-Policy: no-referrer');

$siteUrl = sub_site_url($config);
$token = (string) ($_GET['token'] ?? ($_POST['token'] ?? ''));

if (!sub_valid_token($token)) {
  http_response_code(400);
  sub_render_page('Invalid link', 'This preferences link is not valid.', $siteUrl, 'Back to mindiweik.com');
}

function render_form(array $sub, string $token, string $siteUrl, string $notice = ''): void {
  $cb = function (string $name, string $label, int $checked): string {
    return '<label style="display:block;margin:.4rem 0"><input type="checkbox" name="' . $name . '" value="1"'
      . ($checked ? ' checked' : '') . '> ' . $label . '</label>';
  };
  echo '<!doctype html><html lang="en"><head><meta charset="utf-8">'
     . '<meta name="robots" content="noindex"><meta name="viewport" content="width=device-width,initial-scale=1">'
     . '<title>Email preferences</title></head>'
     . '<body style="font-family:system-ui,sans-serif;max-width:34rem;margin:4rem auto;padding:0 1rem;line-height:1.5">'
     . '<h1 style="font-size:1.3rem">Email preferences</h1>'
     . '<p>Settings for <strong>' . sub_h($sub['email']) . '</strong>.</p>'
     . ($notice !== '' ? '<p style="border-left:3px solid #6e7bff;padding-left:.7rem">' . sub_h($notice) . '</p>' : '')
     . '<form method="post" action="/api/preferences.php">'
     . '<input type="hidden" name="token" value="' . sub_h($token) . '">'
     . $cb('wants_blog', 'blog posts', (int) $sub['wants_blog'])
     . $cb('wants_podcast', 'podcast episodes', (int) $sub['wants_podcast'])
     . $cb('wants_newsletter', 'newsletter', (int) $sub['wants_newsletter'])
     . '<p style="margin-top:1rem">'
     . '<button name="action" value="save" style="padding:.5rem 1rem">save preferences</button> '
     . '<button name="action" value="unsubscribe" style="padding:.5rem 1rem"'
     . ' onclick="return confirm(\'Unsubscribe from everything?\')">unsubscribe from everything</button>'
     . '</p></form>'
     . '<p><a href="' . sub_h($siteUrl) . '">Back to mindiweik.com</a></p>'
     . '</body></html>';
  exit;
}

try {
  $pdo = sub_db($config);
  $sel = $pdo->prepare(
    'SELECT id, email, status, wants_blog, wants_podcast, wants_newsletter
       FROM subscribers WHERE manage_token = ? LIMIT 1'
  );
  $sel->execute([$token]);
  $sub = $sel->fetch();

  if (!$sub) {
    http_response_code(404);
    sub_render_page('Not found', 'This preferences link does not match a subscription.', $siteUrl, 'Back to mindiweik.com');
  }

  if ((int) $sub['status'] === 2) {
    sub_render_page(
      'Unsubscribed',
      'This address is unsubscribed. To hear from mindiweik.com again, use the subscribe form on the site.',
      $siteUrl,
      'Back to mindiweik.com'
    );
  }

  if (($_SERVER['REQUEST_METHOD'] ?? '') === 'POST') {
    $action = (string) ($_POST['action'] ?? '');
    if ($action === 'unsubscribe') {
      $pdo->prepare('UPDATE subscribers SET status = 2 WHERE id = ?')->execute([(int) $sub['id']]);
      sub_render_page('Unsubscribed', 'You will not get any more emails from mindiweik.com.', $siteUrl, 'Back to mindiweik.com');
    }
    if ($action === 'save') {
      $blog = !empty($_POST['wants_blog']) ? 1 : 0;
      $pod  = !empty($_POST['wants_podcast']) ? 1 : 0;
      $news = !empty($_POST['wants_newsletter']) ? 1 : 0;
      if ($blog + $pod + $news === 0) {
        render_form($sub, $token, $siteUrl, 'Pick at least one topic, or use the unsubscribe button.');
      }
      $pdo->prepare(
        'UPDATE subscribers SET wants_blog = ?, wants_podcast = ?, wants_newsletter = ? WHERE id = ?'
      )->execute([$blog, $pod, $news, (int) $sub['id']]);
      $sub['wants_blog'] = $blog;
      $sub['wants_podcast'] = $pod;
      $sub['wants_newsletter'] = $news;
      render_form($sub, $token, $siteUrl, 'Saved.');
    }
  }

  render_form($sub, $token, $siteUrl);
} catch (Throwable $e) {
  http_response_code(500);
  sub_render_page('Something went wrong', 'Please try the link again in a little while.', $siteUrl, 'Back to mindiweik.com');
}
```

- [ ] **Step 2: Lint**

Run: `php -l public/api/preferences.php`
Expected: `No syntax errors detected`.

- [ ] **Step 3: Commit**

```bash
git add public/api/preferences.php
git commit -m "feat: subscriber preferences page"
```

---

### Task 8: `unsubscribe.php` (one-click unsubscribe, RFC 8058)

**Files:**
- Create: `public/api/unsubscribe.php`

**Interfaces:**
- Consumes: `sub_db`, `sub_valid_token`, `sub_h`, `sub_site_url`, `sub_render_page` (Task 3).
- Produces: `GET /api/unsubscribe.php?token=<manage_token>` renders a page with a single confirm button (so link-prefetching mail scanners cannot unsubscribe anyone). `POST` (button, or the RFC 8058 `List-Unsubscribe=One-Click` body from Gmail/Yahoo) sets `status=2` immediately. Idempotent: an already-unsubscribed token gets the same success page.

- [ ] **Step 1: Write the endpoint**

Create `public/api/unsubscribe.php`:

```php
<?php
declare(strict_types=1);

// One-click unsubscribe.
//   GET  /api/unsubscribe.php?token=<64 hex>  -> confirmation page with one button
//   POST                                       -> status=2, done
// GET never mutates: mail scanners prefetch every link in an email, and a
// GET-effective unsubscribe would let them silently drop subscribers. The
// List-Unsubscribe header advertises the POST path per RFC 8058, so mail
// clients' native Unsubscribe buttons work in one click.

$config = require __DIR__ . '/../../comments-config.php';
require __DIR__ . '/lib/subscribe-lib.php';

header('Content-Type: text/html; charset=utf-8');
header('X-Robots-Tag: noindex, nofollow');
header('Referrer-Policy: no-referrer');

$siteUrl = sub_site_url($config);
$token = (string) ($_GET['token'] ?? ($_POST['token'] ?? ''));

if (!sub_valid_token($token)) {
  http_response_code(400);
  sub_render_page('Invalid link', 'This unsubscribe link is not valid.', $siteUrl, 'Back to mindiweik.com');
}

try {
  $pdo = sub_db($config);
  $sel = $pdo->prepare('SELECT id, email FROM subscribers WHERE manage_token = ? LIMIT 1');
  $sel->execute([$token]);
  $sub = $sel->fetch();

  if (!$sub) {
    http_response_code(404);
    sub_render_page('Not found', 'This unsubscribe link does not match a subscription.', $siteUrl, 'Back to mindiweik.com');
  }

  if (($_SERVER['REQUEST_METHOD'] ?? '') === 'POST') {
    $pdo->prepare('UPDATE subscribers SET status = 2 WHERE id = ?')->execute([(int) $sub['id']]);
    sub_render_page('Unsubscribed', 'You will not get any more emails from mindiweik.com.', $siteUrl, 'Back to mindiweik.com');
  }

  // GET: confirm with a button. The form posts back to this same URL.
  echo '<!doctype html><html lang="en"><head><meta charset="utf-8">'
     . '<meta name="robots" content="noindex"><meta name="viewport" content="width=device-width,initial-scale=1">'
     . '<title>Unsubscribe</title></head>'
     . '<body style="font-family:system-ui,sans-serif;max-width:34rem;margin:4rem auto;padding:0 1rem;line-height:1.5">'
     . '<h1 style="font-size:1.3rem">Unsubscribe</h1>'
     . '<p>Stop all emails from mindiweik.com to <strong>' . sub_h($sub['email']) . '</strong>?</p>'
     . '<form method="post" action="/api/unsubscribe.php">'
     . '<input type="hidden" name="token" value="' . sub_h($token) . '">'
     . '<button type="submit" style="padding:.5rem 1rem">yes, unsubscribe me</button>'
     . '</form>'
     . '<p style="margin-top:1rem"><a href="/api/preferences.php?token=' . sub_h($token) . '">'
     . 'Or just change which topics you get</a></p>'
     . '</body></html>';
} catch (Throwable $e) {
  http_response_code(500);
  sub_render_page('Something went wrong', 'Please try the link again in a little while.', $siteUrl, 'Back to mindiweik.com');
}
```

- [ ] **Step 2: Lint**

Run: `php -l public/api/unsubscribe.php`
Expected: `No syntax errors detected`.

- [ ] **Step 3: Commit**

```bash
git add public/api/unsubscribe.php
git commit -m "feat: one-click unsubscribe endpoint (RFC 8058)"
```

---

### Task 9: `notify.php` (cron: enqueue new content + drain queue)

The single cron entry point. Order matters: `sent_items` insert happens BEFORE enqueueing (idempotency: a crash mid-enqueue can drop a notification but can never double-send after the spec's insert-first rule), and the drain runs even when the feed fetch fails so newsletter issues keep flowing.

**Files:**
- Create: `public/api/notify.php`

**Interfaces:**
- Consumes: `sub_db`, `sub_site_url` (Task 3); `send_list_email` (Task 4); `/notify-feed.json` (Task 2); tables `sent_items`, `send_queue`, `subscribers`, `issues`; config `cron_key`.
- Produces: `GET /api/notify.php?key=<cron_key>`, plain-text run report. Per run: enqueues every feed item not yet in `sent_items` (one queue row per active subscriber with the matching topic flag), cancels queued rows whose subscriber is no longer active, then sends up to 40 queued rows oldest-first (3 attempts, then failed).

- [ ] **Step 1: Write the endpoint**

Create `public/api/notify.php`:

```php
<?php
declare(strict_types=1);

// Subscription notifier + queue drain. Hit by Hostinger cron every 15 min:
//   GET /api/notify.php?key=<cron_key>
// 1. Diff /notify-feed.json against sent_items; enqueue new items for every
//    active subscriber whose topic flag matches. Insert into sent_items FIRST
//    so a redeploy or feed reorder can never re-email the list.
// 2. Drain up to 40 queued rows oldest-first through send_list_email.
// 40 per run * 4 runs/hour = 160 emails/hour, under the mailbox cap.

$config = require __DIR__ . '/../../comments-config.php';
require __DIR__ . '/lib/subscribe-lib.php';
require __DIR__ . '/mailer.php';

header('Content-Type: text/plain; charset=utf-8');
header('X-Robots-Tag: noindex, nofollow');

$cronKey = (string) ($config['cron_key'] ?? '');
if ($cronKey === '' || !hash_equals($cronKey, (string) ($_GET['key'] ?? ''))) {
  http_response_code(403);
  echo "forbidden\n";
  exit;
}

const BATCH_SIZE = 40;
const MAX_ATTEMPTS = 3;

try {
  $pdo = sub_db($config);

  // --- 1. Fetch the feed and enqueue anything new -------------------------
  $feedOk = false;
  $byKey = [];
  $raw = @file_get_contents(sub_site_url($config) . '/notify-feed.json');
  $items = $raw !== false ? json_decode($raw, true) : null;
  if (is_array($items)) {
    $feedOk = true;
    foreach ($items as $item) {
      if (!is_array($item) || !isset($item['key'], $item['type'], $item['title'], $item['link'])) continue;
      $byKey[(string) $item['key']] = $item;
    }
  } else {
    echo "feed: FETCH FAILED (enqueue skipped, drain continues)\n";
  }

  $enqueued = 0;
  if ($feedOk) {
    $mark = $pdo->prepare('INSERT IGNORE INTO sent_items (item_key, sent_at) VALUES (?, UTC_TIMESTAMP())');
    foreach ($byKey as $key => $item) {
      $mark->execute([$key]);
      if ($mark->rowCount() === 0) continue; // already announced
      $flag = $item['type'] === 'podcast' ? 'wants_podcast' : 'wants_blog';
      // $flag is one of two hardcoded column names, never user input.
      $q = $pdo->prepare(
        "INSERT INTO send_queue (subscriber_id, item_key, status, attempts, created_at)
         SELECT id, ?, 0, 0, UTC_TIMESTAMP() FROM subscribers WHERE status = 1 AND {$flag} = 1"
      );
      $q->execute([$key]);
      $enqueued += $q->rowCount();
      echo 'enqueued ' . $key . ': ' . $q->rowCount() . " recipients\n";
    }
  }

  // --- 2. Cancel queued rows for subscribers who left ---------------------
  $cancelled = $pdo->query(
    'UPDATE send_queue q JOIN subscribers s ON s.id = q.subscriber_id
        SET q.status = 2
      WHERE q.status = 0 AND s.status <> 1'
  )->rowCount();

  // --- 3. Drain ------------------------------------------------------------
  $rows = $pdo->query(
    'SELECT q.id, q.item_key, q.issue_id, q.attempts, s.email, s.manage_token
       FROM send_queue q JOIN subscribers s ON s.id = q.subscriber_id
      WHERE q.status = 0 AND s.status = 1
      ORDER BY q.created_at ASC, q.id ASC
      LIMIT ' . BATCH_SIZE
  )->fetchAll();

  $issueCache = [];
  $issueSel = $pdo->prepare('SELECT subject, body FROM issues WHERE id = ?');
  $ok = $pdo->prepare('UPDATE send_queue SET status = 1, sent_at = UTC_TIMESTAMP() WHERE id = ?');
  $fail = $pdo->prepare('UPDATE send_queue SET attempts = ?, status = ? WHERE id = ?');

  $sent = 0;
  $failed = 0;
  foreach ($rows as $r) {
    $subject = null;
    $body = null;
    if ($r['item_key'] !== null) {
      $item = $byKey[$r['item_key']] ?? null;
      if ($item === null) {
        if (!$feedOk) continue; // transient feed failure: leave untouched for next run
        // Feed parsed fine but the item fell off the 20-item window before
        // its queue row drained. Count it as an attempt so it eventually dies.
        $failed++;
        $attempts = (int) $r['attempts'] + 1;
        $fail->execute([$attempts, $attempts >= MAX_ATTEMPTS ? 2 : 0, (int) $r['id']]);
        continue;
      }
      $subject = 'New on mindiweik.com: ' . (string) $item['title'];
      $body = (string) $item['title'] . "\n\n"
            . (string) ($item['description'] ?? '') . "\n\n"
            . (string) $item['link'];
    } else {
      $iid = (int) $r['issue_id'];
      if (!isset($issueCache[$iid])) {
        $issueSel->execute([$iid]);
        $issueCache[$iid] = $issueSel->fetch();
      }
      $issue = $issueCache[$iid];
      if (!$issue) { // issue row deleted; cancel
        $fail->execute([(int) $r['attempts'], 2, (int) $r['id']]);
        continue;
      }
      $subject = (string) $issue['subject'];
      $body = (string) $issue['body'];
    }

    try {
      send_list_email($config, (string) $r['email'], $subject, $body, (string) $r['manage_token']);
      $ok->execute([(int) $r['id']]);
      $sent++;
    } catch (Throwable $mailError) {
      $attempts = (int) $r['attempts'] + 1;
      $fail->execute([$attempts, $attempts >= MAX_ATTEMPTS ? 2 : 0, (int) $r['id']]);
      $failed++;
    }
  }

  $remaining = (int) $pdo->query('SELECT COUNT(*) FROM send_queue WHERE status = 0')->fetchColumn();
  echo "enqueued: {$enqueued}, cancelled: {$cancelled}, sent: {$sent}, failed: {$failed}, still queued: {$remaining}\n";
} catch (Throwable $e) {
  http_response_code(500);
  echo "error\n";
}
```

- [ ] **Step 2: Lint**

Run: `php -l public/api/notify.php`
Expected: `No syntax errors detected`.

- [ ] **Step 3: Commit**

```bash
git add public/api/notify.php
git commit -m "feat: cron notifier - enqueue new content and drain send queue"
```

---

### Task 10: Admin newsletter section (`public/api/admin.php`)

Extends the existing session + CSRF authed page. New: counts, compose form with test-send and real send, subscriber list with delete.

**Files:**
- Modify: `public/api/admin.php`

**Interfaces:**
- Consumes: existing session auth (`$_SESSION['comments_admin']`), existing `$csrf`; `send_list_email` (Task 4); tables `subscribers`, `issues`, `send_queue`.
- Produces: POST actions `newsletter_test`, `newsletter_send`, `sub_delete` (all CSRF-checked). `newsletter_send` inserts the `issues` row (with `sent_at` and `recipient_count` filled at enqueue time) and one queue row per active `wants_newsletter` subscriber; the cron drains it.

- [ ] **Step 1: Add requires**

In `public/api/admin.php`, directly under `$config = require __DIR__ . '/../../comments-config.php';` add:

```php
require __DIR__ . '/lib/subscribe-lib.php';
require __DIR__ . '/mailer.php';
```

- [ ] **Step 2: Handle the new actions**

In `admin.php`, after the existing `if ($action === 'delete') { ... }` block, add:

```php
$notice = '';
if ($action === 'sub_delete') {
  if (!hash_equals($csrf, (string) ($_POST['csrf'] ?? ''))) {
    http_response_code(400);
    echo 'bad request';
    exit;
  }
  $id = (int) ($_POST['id'] ?? 0);
  if ($id > 0) {
    // Queue rows cascade via fk_sq_subscriber.
    $pdo->prepare('DELETE FROM subscribers WHERE id = ?')->execute([$id]);
    $notice = 'subscriber deleted.';
  }
}

if ($action === 'newsletter_test' || $action === 'newsletter_send') {
  if (!hash_equals($csrf, (string) ($_POST['csrf'] ?? ''))) {
    http_response_code(400);
    echo 'bad request';
    exit;
  }
  $subject = trim((string) ($_POST['subject'] ?? ''));
  $body    = trim((string) ($_POST['body'] ?? ''));
  if ($subject === '' || mb_strlen($subject) > 190 || $body === '') {
    $notice = 'newsletter needs a subject (max 190 chars) and a body.';
  } elseif ($action === 'newsletter_test') {
    // Sends the draft to the from address only; no rows are created. Empty
    // manage token = no footer, since the links would be fake anyway.
    try {
      send_list_email($config, (string) $config['from_email'], $subject, $body, '');
      $notice = 'test sent to ' . (string) $config['from_email'] . '.';
    } catch (Throwable $mailError) {
      $notice = 'test send FAILED: ' . $mailError->getMessage();
    }
  } else {
    // Real send: record the issue, enqueue one row per active newsletter
    // subscriber. recipient_count and sent_at are filled here, at send time;
    // the cron does the actual SMTP work in batches.
    $pdo->prepare('INSERT INTO issues (subject, body, sent_at) VALUES (?, ?, UTC_TIMESTAMP())')
        ->execute([$subject, $body]);
    $issueId = (int) $pdo->lastInsertId();
    $q = $pdo->prepare(
      'INSERT INTO send_queue (subscriber_id, issue_id, status, attempts, created_at)
       SELECT id, ?, 0, 0, UTC_TIMESTAMP() FROM subscribers WHERE status = 1 AND wants_newsletter = 1'
    );
    $q->execute([$issueId]);
    $count = $q->rowCount();
    $pdo->prepare('UPDATE issues SET recipient_count = ? WHERE id = ?')->execute([$count, $issueId]);
    $notice = "issue queued for {$count} subscribers. the cron sends it within ~" . (int) ceil($count / 40) * 15 . ' minutes.';
  }
}
```

Note: the existing `$action`/`$pdo` variables are already defined above this insertion point; `$csrf` is defined right before the action handling. Verify the insertion lands after all three exist.

- [ ] **Step 3: Render the newsletter section**

In `admin.php`, after the `echo '<h1>comments (' . count($rows) . ')</h1>';` line block ends (after the `foreach ($rows as $r) { ... }` loop), add before the closing `echo '</body></html>';`:

```php
// ---- newsletter section ----------------------------------------------------
$counts = $pdo->query(
  'SELECT
     SUM(status = 1 AND wants_blog = 1)       AS blog,
     SUM(status = 1 AND wants_podcast = 1)    AS podcast,
     SUM(status = 1 AND wants_newsletter = 1) AS newsletter,
     SUM(status = 1)                          AS active,
     SUM(status = 0)                          AS pending,
     SUM(status = 2)                          AS unsubscribed
   FROM subscribers'
)->fetch();
$queueDepth = (int) $pdo->query('SELECT COUNT(*) FROM send_queue WHERE status = 0')->fetchColumn();

echo '<hr style="margin:2rem 0"><h1>newsletter</h1>';
if ($notice !== '') {
  echo '<p style="border-left:3px solid #6e7bff;padding-left:.7rem">' . h($notice) . '</p>';
}
echo '<p style="font-size:.85rem;color:#555">active: ' . (int) $counts['active']
   . ' (blog ' . (int) $counts['blog'] . ' · podcast ' . (int) $counts['podcast']
   . ' · newsletter ' . (int) $counts['newsletter'] . ') · pending: ' . (int) $counts['pending']
   . ' · unsubscribed: ' . (int) $counts['unsubscribed']
   . ' · queue depth: ' . $queueDepth . '</p>';

echo '<form method="post" style="border:1px solid #ccc;border-radius:8px;padding:1rem;margin:1rem 0">'
   . '<input type="hidden" name="csrf" value="' . h($csrf) . '">'
   . '<p><input name="subject" placeholder="subject" maxlength="190" style="padding:.5rem;width:100%"'
   . ' value="' . h((string) ($_POST['subject'] ?? '')) . '"></p>'
   . '<p><textarea name="body" rows="10" placeholder="plain text body" style="padding:.5rem;width:100%">'
   . h((string) ($_POST['body'] ?? '')) . '</textarea></p>'
   . '<button name="action" value="newsletter_test" style="padding:.5rem 1rem">send test to me</button> '
   . '<button name="action" value="newsletter_send" style="padding:.5rem 1rem"'
   . ' onclick="return confirm(\'send to all newsletter subscribers?\')">send</button>'
   . '</form>';

// ---- subscriber list ---------------------------------------------------
$subs = $pdo->query(
  'SELECT id, email, status, wants_blog, wants_podcast, wants_newsletter, created_at, confirmed_at
     FROM subscribers ORDER BY created_at DESC'
)->fetchAll();
echo '<h2 style="font-size:1rem">subscribers (' . count($subs) . ')</h2>';
if (!$subs) {
  echo '<p>no subscribers yet.</p>';
}
$statusLabel = [0 => 'pending', 1 => 'active', 2 => 'unsubscribed'];
foreach ($subs as $s) {
  $topics = implode(' ', array_filter([
    (int) $s['wants_blog'] ? 'blog' : null,
    (int) $s['wants_podcast'] ? 'podcast' : null,
    (int) $s['wants_newsletter'] ? 'newsletter' : null,
  ]));
  echo '<div style="border:1px solid #ccc;border-radius:8px;padding:.7rem 1rem;margin:.6rem 0;font-size:.85rem">'
     . '[' . h($statusLabel[(int) $s['status']] ?? '?') . '] '
     . h($s['email']) . ' · ' . h($topics)
     . ' · joined ' . h($s['created_at'])
     . ((string) $s['confirmed_at'] !== '' ? ' · confirmed ' . h((string) $s['confirmed_at']) : '')
     . ' <form method="post" style="display:inline">'
     . '<input type="hidden" name="csrf" value="' . h($csrf) . '">'
     . '<input type="hidden" name="id" value="' . (int) $s['id'] . '">'
     . '<button name="action" value="sub_delete" onclick="return confirm(\'delete subscriber?\')">delete</button>'
     . '</form></div>';
}
```

- [ ] **Step 4: Lint**

Run: `php -l public/api/admin.php`
Expected: `No syntax errors detected`.

- [ ] **Step 5: Commit**

```bash
git add public/api/admin.php
git commit -m "feat: admin newsletter compose, counts, subscriber list"
```

---

### Task 11: `SubscribeForm.astro` component

**Files:**
- Create: `src/components/content/SubscribeForm.astro`

**Interfaces:**
- Consumes: `validateSubscribe`, `subscribeApiUrl` from `src/lib/subscribe.ts` (Task 1); design tokens.
- Produces: `<SubscribeForm variant="inline" | "footer" | "homepage" zone?="blog" | "podcast" />`. Inline and homepage show the topic checkboxes; footer collapses them behind a disclosure. Multiple instances per page work (the script wires every `[data-subscribe-root]` independently; Astro dedupes the hoisted script itself).

- [ ] **Step 1: Write the component**

Create `src/components/content/SubscribeForm.astro`:

```astro
---
interface Props {
  variant: 'inline' | 'footer' | 'homepage';
  zone?: 'blog' | 'podcast';
}
const { variant, zone } = Astro.props;
const accent =
  zone === 'podcast'
    ? 'var(--accent-podcast)'
    : zone === 'blog'
      ? 'var(--accent-blog)'
      : 'var(--accent-primary)';
const showHeading = variant !== 'footer';
---

<section class:list={['subscribe', `v-${variant}`]} style={`--c-accent:${accent}`}>
  {showHeading && <h2 class="eyebrow">// subscribe</h2>}
  {
    showHeading && (
      <p class="pitch">New posts and episodes by email. No spam, unsubscribe anytime.</p>
    )
  }

  <form data-subscribe-root class="sform" novalidate>
    <div class="row">
      <label class="field-row">
        <span class="field-label">email</span>
        <input name="email" type="email" maxlength="190" required autocomplete="email" class="field" />
      </label>
      <button type="submit" class="submit">subscribe</button>
    </div>

    {
      variant === 'footer' ? (
        <details class="topics-disclosure">
          <summary class="topics-summary">choose topics</summary>
          <div class="topics">
            <label class="topic"><input type="checkbox" name="wants_blog" checked /> blog posts</label>
            <label class="topic"><input type="checkbox" name="wants_podcast" checked /> podcast episodes</label>
            <label class="topic"><input type="checkbox" name="wants_newsletter" checked /> newsletter</label>
          </div>
        </details>
      ) : (
        <div class="topics">
          <label class="topic"><input type="checkbox" name="wants_blog" checked /> blog posts</label>
          <label class="topic"><input type="checkbox" name="wants_podcast" checked /> podcast episodes</label>
          <label class="topic"><input type="checkbox" name="wants_newsletter" checked /> newsletter</label>
        </div>
      )
    }

    <!-- honeypot: hidden from humans; bots fill it and get silently dropped -->
    <input type="text" name="website" tabindex="-1" autocomplete="off" aria-hidden="true" class="honeypot" />

    <p data-subscribe-status role="status" class="sstatus"></p>
  </form>
</section>

<style>
  .subscribe.v-inline {
    margin-top: 2.4rem;
    padding-top: 1.4rem;
    border-top: 1px solid var(--border);
  }
  .subscribe.v-homepage {
    margin-top: 2rem;
  }
  .subscribe.v-footer {
    flex-basis: 100%;
  }
  .eyebrow {
    font-family: var(--font-mono);
    font-size: 0.68rem;
    font-weight: 500;
    letter-spacing: 0.08em;
    color: var(--text-muted);
    margin: 0 0 0.5rem;
  }
  .pitch {
    font-family: var(--font-body);
    font-size: 0.85rem;
    color: var(--text-muted);
    margin: 0 0 0.9rem;
  }
  .sform {
    display: flex;
    flex-direction: column;
    gap: 0.7rem;
    max-width: 34rem;
  }
  .row {
    display: flex;
    gap: 0.6rem;
    align-items: flex-end;
    flex-wrap: wrap;
  }
  .field-row {
    display: flex;
    flex-direction: column;
    gap: 0.3rem;
    flex: 1;
    min-width: 14rem;
  }
  .field-label {
    font-family: var(--font-mono);
    font-size: 0.6rem;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: var(--text-muted);
  }
  .field {
    font-family: var(--font-body);
    font-size: 0.9rem;
    padding: 0.55rem 0.7rem;
    background: transparent;
    color: var(--text);
    border: 1px solid var(--border);
    border-radius: 6px;
    width: 100%;
  }
  .field:focus-visible {
    outline: none;
    border-color: var(--c-accent);
  }
  .submit {
    font-family: var(--font-mono);
    font-size: 0.72rem;
    padding: 0.6rem 1rem;
    border: 0;
    border-radius: 6px;
    cursor: pointer;
    background: var(--c-accent);
    color: var(--ink);
  }
  .submit:focus-visible {
    outline: 2px solid var(--c-accent);
    outline-offset: 2px;
  }
  .topics {
    display: flex;
    gap: 1rem;
    flex-wrap: wrap;
  }
  .topic {
    font-family: var(--font-mono);
    font-size: 0.68rem;
    color: var(--text-muted);
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    cursor: pointer;
  }
  .topic input {
    accent-color: var(--c-accent);
  }
  .topics-disclosure {
    margin: 0;
  }
  .topics-summary {
    font-family: var(--font-mono);
    font-size: 0.65rem;
    color: var(--text-muted);
    cursor: pointer;
    user-select: none;
  }
  .topics-disclosure[open] .topics-summary {
    margin-bottom: 0.5rem;
  }
  .honeypot {
    position: absolute;
    left: -9999px;
    width: 1px;
    height: 1px;
    opacity: 0;
  }
  .sstatus {
    font-family: var(--font-mono);
    font-size: 0.7rem;
    color: var(--text-muted);
    margin: 0;
    min-height: 1em;
  }
</style>

<script>
  import { validateSubscribe, subscribeApiUrl } from '../../lib/subscribe.ts';

  // Multiple forms can exist on one page (inline + footer); wire each one.
  // Astro hoists and dedupes this script, so it runs exactly once.
  for (const form of document.querySelectorAll('[data-subscribe-root]')) {
    if (!(form instanceof HTMLFormElement)) continue;
    const status = form.querySelector('[data-subscribe-status]') as HTMLElement;

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const fd = new FormData(form);
      const input = {
        email: String(fd.get('email') ?? ''),
        wantsBlog: fd.get('wants_blog') !== null,
        wantsPodcast: fd.get('wants_podcast') !== null,
        wantsNewsletter: fd.get('wants_newsletter') !== null,
      };
      const { ok, errors } = validateSubscribe(input);
      if (!ok) {
        status.textContent = errors.includes('email')
          ? 'Please enter a valid email address.'
          : 'Pick at least one topic.';
        return;
      }
      status.textContent = 'Sending…';
      try {
        const res = await fetch(subscribeApiUrl(), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: input.email.trim(),
            wants_blog: input.wantsBlog,
            wants_podcast: input.wantsPodcast,
            wants_newsletter: input.wantsNewsletter,
            website: String(fd.get('website') ?? ''),
          }),
        });
        const data = await res.json();
        if (res.ok) {
          form.reset();
          status.textContent =
            data.message ?? 'Almost there. Check your email to confirm your subscription.';
        } else {
          status.textContent = data.error ?? 'Something went wrong.';
        }
      } catch {
        status.textContent = 'Network error. Please try again.';
      }
    });
  }
</script>
```

- [ ] **Step 2: Verify it compiles**

Run: `npm run check && npm run lint`
Expected: no errors (warnings unrelated to this file are acceptable if pre-existing).

- [ ] **Step 3: Commit**

```bash
git add src/components/content/SubscribeForm.astro
git commit -m "feat: SubscribeForm component with inline/footer/homepage variants"
```

---

### Task 12: Mounts (layouts, footer, homepage)

**Files:**
- Modify: `src/layouts/ArticleLayout.astro`
- Modify: `src/layouts/EpisodeLayout.astro`
- Modify: `src/components/layout/Footer.astro`
- Modify: `src/pages/index.astro`

**Interfaces:**
- Consumes: `SubscribeForm.astro` (Task 11).
- Produces: the form rendered at the end of posts/episodes (after comments), in the site footer, and as a homepage section.

- [ ] **Step 1: ArticleLayout**

In `src/layouts/ArticleLayout.astro`, next to the existing Comments import (line ~8) add:

```astro
import SubscribeForm from '../components/content/SubscribeForm.astro';
```

Directly after `<Comments pageKey={`blog/${slug}`} zone="blog" />` (line ~82) add:

```astro
<SubscribeForm variant="inline" zone="blog" />
```

- [ ] **Step 2: EpisodeLayout**

Same pattern in `src/layouts/EpisodeLayout.astro`: add the import next to the Comments import (line ~8), then after `<Comments pageKey={`podcast/${id}`} zone="podcast" />` (line ~133) add:

```astro
<SubscribeForm variant="inline" zone="podcast" />
```

- [ ] **Step 3: Footer**

Replace `src/components/layout/Footer.astro` with:

```astro
---
import { SITE } from '../../config/site.ts';
import KofiLink from '../support/KofiLink.astro';
import ThemeToggle from './ThemeToggle.astro';
import SubscribeForm from '../content/SubscribeForm.astro';
const year = new Date().getFullYear();
---

<footer style="padding:2rem 1.4rem;border-top:1px solid var(--border)">
  <SubscribeForm variant="footer" />
  <div
    style="display:flex;flex-wrap:wrap;gap:1rem;align-items:center;justify-content:space-between;margin-top:1.4rem;font-family:var(--font-mono);font-size:0.75rem;color:var(--text-muted)"
  >
    <span>© {year} {SITE.author}</span>
    <nav aria-label="Social links" style="display:flex;gap:0.9rem;flex-wrap:wrap">
      {
        SITE.socials.map((s) => (
          <a
            href={s.url}
            target="_blank"
            rel="noopener noreferrer"
            class="hov-link"
            style={`color:var(--text-muted);text-decoration:underline;text-underline-offset:3px;text-decoration-thickness:2px;text-decoration-color:var(--accent-${s.accent});--hover-accent:var(--accent-${s.accent})`}
          >
            {s.label}
          </a>
        ))
      }
    </nav>
    <KofiLink />
    <ThemeToggle />
  </div>
</footer>
```

(The social row markup is unchanged; it just moves inside the new wrapper div.)

- [ ] **Step 4: Homepage**

In `src/pages/index.astro`, add to the imports:

```astro
import SubscribeForm from '../components/content/SubscribeForm.astro';
```

After the `→ full changelog` anchor (the last element before `</BaseLayout>`), add:

```astro
<SectionLabel label="// subscribe" />
<SubscribeForm variant="homepage" />
```

- [ ] **Step 5: Visual check**

Run: `npm run dev`, open `http://localhost:4321/`, a blog post, and a podcast episode.
Expected: homepage section, footer form with collapsed topics, inline form after comments with the zone accent. Note: submits will fail against the dev server (no PHP); that is Task 13's job.

- [ ] **Step 6: Full test + lint + build**

Run: `npm test && npm run lint && npm run build`
Expected: all green.

- [ ] **Step 7: Commit**

```bash
git add src/layouts/ArticleLayout.astro src/layouts/EpisodeLayout.astro src/components/layout/Footer.astro src/pages/index.astro
git commit -m "feat: mount subscribe form on posts, episodes, footer, homepage"
```

---

### Task 13: Curl verification checklist + full local run

The JS/Astro layer is Vitest-covered; PHP gets the same honest treatment comments got: a documented curl checklist executed against `php -S` + a local MySQL database. Write the checklist doc, then actually run it.

**Files:**
- Create: `docs/email-subscription-checklist.md`

**Interfaces:**
- Consumes: everything from Tasks 1-12.
- Produces: a repeatable local verification runbook, executed once with results noted.

- [ ] **Step 1: Write the checklist doc**

Create `docs/email-subscription-checklist.md`:

````markdown
# Email subscription: local verification checklist

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
````

- [ ] **Step 2: Execute the checklist**

Run through every box above locally. Fix anything that fails before checking it off (systematic-debugging skill if something misbehaves).

- [ ] **Step 3: Full suite**

Run: `npm test && npm run lint && npm run build && npm run prose:lint`
Expected: all green.

- [ ] **Step 4: Commit**

```bash
git add docs/email-subscription-checklist.md
git commit -m "docs: email subscription verification checklist"
```

---

## Rollout order (after the branch merges)

1. Owner runs `docs/email-subscription-setup.md` steps 1-2 (tables + cron_key) BEFORE merging; the endpoints 500 without them but nothing links to them yet, so this is low stakes either way.
2. Merge PR -> auto-deploy ships PHP + the forms together.
3. Owner creates the cron job (step 3) and immediately runs the seed notify (step 4) so existing content is marked already-announced before the first subscriber can confirm.
4. Prod smoke section of the checklist.

## Out of scope (per spec, YAGNI)

HTML email templates, open/click tracking, contact import, per-post send customization, issue archive pages, digest batching, transactional SMTP provider (config-only escape hatch already exists via `mailer.php`).
