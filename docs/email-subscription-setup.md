# Email subscription: one-time server setup

Everything below is manual, done once, in this order. The code deploys via the
normal FTP pipeline; nothing works until these steps are done, so do them
BEFORE merging to main.

## 1. Create the tables

phpMyAdmin > database `u112789821_comments` > SQL tab. Run:

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
