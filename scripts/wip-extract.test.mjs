import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { parseMeta, parseBody, parseYoutube } from './wip-extract.mjs';

const sample = `<html><head><script type="application/ld+json">
{"@type":"Article","headline":"Exploring TypeScript Primitive Types","description":"TS 7 primitive types.","datePublished":"2025-01-14T00:00:00.000Z","timeRequired":"PT6M","articleSection":["TypeScript"]}
</script></head><body>hi</body></html>`;

const fixturesDir = new URL('./fixtures/', import.meta.url).pathname;
const joramHtml    = readFileSync(fixturesDir + 'episode-joram.html',        'utf8');
const primHtml     = readFileSync(fixturesDir + 'blog-primitives.html',      'utf8');
const curiousHtml  = readFileSync(fixturesDir + 'talk-curious-engineer.html','utf8');
const adhdHtml     = readFileSync(fixturesDir + 'guest-adhd.html',           'utf8');

describe('parseMeta', () => {
  it('extracts JSON-LD fields', () => {
    const m = parseMeta(sample);
    expect(m.title).toBe('Exploring TypeScript Primitive Types');
    expect(m.description).toBe('TS 7 primitive types.');
    expect(m.datePublished).toBe('2025-01-14');
    expect(m.readingTimeMin).toBe(6);
    expect(m.sections).toEqual(['TypeScript']);
    expect(m.type).toBe('Article');
  });
});

// ── parseYoutube ─────────────────────────────────────────────────────────────

describe('parseYoutube', () => {
  it('extracts 11-char video id from episode-joram', () => {
    expect(parseYoutube(joramHtml)).toBe('hGBZSAHoAxE');
  });

  it('returns null when no video is present (blog post)', () => {
    expect(parseYoutube(primHtml)).toBeNull();
  });

  it('returns null for guest-adhd (no video embed)', () => {
    // guest-adhd is a LinkedIn live recap — no YouTube video
    expect(parseYoutube(adhdHtml)).toBeNull();
  });
});

// ── parseBody — episode-joram ─────────────────────────────────────────────────

describe('parseBody — episode-joram', () => {
  let body;
  it('runs without error', () => {
    body = parseBody(joramHtml);
    expect(typeof body).toBe('string');
    expect(body.length).toBeGreaterThan(200);
  });

  it('preserves the goodreads URL', () => {
    body = parseBody(joramHtml);
    expect(body).toContain('goodreads.com/book/show/13525945');
  });

  it('preserves all 7 data-tool links', () => {
    body = parseBody(joramHtml);
    expect(body).toContain('d3js.org');
    expect(body).toContain('echarts.apache.org');
    expect(body).toContain('matplotlib.org');
    expect(body).toContain('plotly.com');
    expect(body).toContain('hvplot.holoviz.org');
    expect(body).toContain('pandas.pydata.org');
    expect(body).toContain('pola.rs');
  });

  it('preserves guest links', () => {
    body = parseBody(joramHtml);
    expect(body).toContain('linkedin.com/in/jorammutenge');
    expect(body).toContain('conterval.com/blog');
  });

  it('preserves all 7 chapter titles', () => {
    body = parseBody(joramHtml);
    expect(body).toContain('Journey into Data Engineering');
    expect(body).toContain('The Importance of Data Cleaning');
    expect(body).toContain('The Trifecta of Data Roles');
    expect(body).toContain('Thinking in Tables');
    expect(body).toContain('Learning Paths and Curated Education');
    expect(body).toContain('Embracing Rust in Data Engineering');
    expect(body).toContain('Final Thoughts on Effort and Utility');
  });

  it('preserves call-to-action text', () => {
    body = parseBody(joramHtml);
    expect(body).toContain('Your call to action?');
    expect(body).toContain('Useless things take just as much effort');
  });

  it('strips ko-fi furniture', () => {
    body = parseBody(joramHtml);
    expect(body).not.toContain('ko-fi.com');
  });

  it('strips "Start over" furniture', () => {
    body = parseBody(joramHtml);
    expect(body).not.toContain('Start over');
  });

  it('strips guest-CTA furniture', () => {
    body = parseBody(joramHtml);
    expect(body).not.toContain('Want to be - or recommend - a guest');
  });

  it('renders links as markdown [text](url)', () => {
    body = parseBody(joramHtml);
    // At minimum a markdown link appears somewhere
    expect(body).toMatch(/\[.+\]\(https?:\/\//);
  });

  it('renders chapters section heading', () => {
    body = parseBody(joramHtml);
    // h1 "Chapters" becomes ## Chapters
    expect(body).toMatch(/##\s+[Cc]hapters/);
  });
});

// ── parseBody — blog-primitives ───────────────────────────────────────────────

describe('parseBody — blog-primitives', () => {
  let body;
  it('runs without error', () => {
    body = parseBody(primHtml);
    expect(typeof body).toBe('string');
    expect(body.length).toBeGreaterThan(200);
  });

  it('contains a fenced code block with let dog', () => {
    body = parseBody(primHtml);
    expect(body).toContain('```');
    expect(body).toContain('let dog');
  });

  it('preserves Resources for further reading links (typescriptlang.org)', () => {
    body = parseBody(primHtml);
    expect(body).toContain('typescriptlang.org');
  });

  it('strips ko-fi furniture', () => {
    body = parseBody(primHtml);
    expect(body).not.toContain('ko-fi.com');
  });

  it('strips "Start over" furniture', () => {
    body = parseBody(primHtml);
    expect(body).not.toContain('Start over');
  });
});

// ── parseBody — talk-curious-engineer ────────────────────────────────────────

describe('parseBody — talk-curious-engineer', () => {
  let body;
  it('returns non-trivial body text', () => {
    body = parseBody(curiousHtml);
    expect(typeof body).toBe('string');
    expect(body.length).toBeGreaterThan(100);
  });

  it('preserves at least one external link', () => {
    body = parseBody(curiousHtml);
    expect(body).toMatch(/\]\(https?:\/\//);
  });

  it('strips furniture', () => {
    body = parseBody(curiousHtml);
    expect(body).not.toContain('ko-fi.com');
    expect(body).not.toContain('Start over');
  });
});

// ── parseBody — guest-adhd ────────────────────────────────────────────────────

describe('parseBody — guest-adhd', () => {
  let body;
  it('returns non-trivial body text', () => {
    body = parseBody(adhdHtml);
    expect(typeof body).toBe('string');
    expect(body.length).toBeGreaterThan(100);
  });

  it('preserves at least one external link', () => {
    body = parseBody(adhdHtml);
    expect(body).toMatch(/\]\(https?:\/\//);
  });

  it('strips furniture', () => {
    body = parseBody(adhdHtml);
    expect(body).not.toContain('ko-fi.com');
    expect(body).not.toContain('Start over');
  });
});
