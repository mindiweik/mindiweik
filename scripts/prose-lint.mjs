// Prose lint for published content under src/content.
//
// Hard rules (exit 1):
//   - no emdashes (U+2014) in prose
//   - hashtags must be all-lowercase (Mindi's writing rule)
// Advisory (warn, exit 0):
//   - headings below H1 should be sentence-cased, not Title Cased
//
// Fenced code blocks are skipped for every rule so code samples never trip it.
// The heading check is deliberately warn-only: Title-Case detection is
// false-positive prone (proper nouns, brands, acronyms), and CI must not block
// a merge on a judgement call. It flags likely offenders for a human to review.
//
// Usage: node scripts/prose-lint.mjs   (exits 1 on any hard violation)
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = new URL('..', import.meta.url).pathname;
const CONTENT_DIR = join(ROOT, 'src/content');
const EMDASH = '—';

// Simple-capitalized proper nouns that legitimately appear mid-heading. Brands
// with internal caps (TypeScript, GitLab) and pure acronyms (CLI, API) are
// excluded structurally, so this list only holds sentence-word-shaped names.
const PROPER_NOUNS = new Set(['docker', 'kubernetes', 'postman', 'gardyn', 'colorado', 'denver']);

/** Yield [line, index] for every line that sits outside a fenced code block. */
function* proseLines(text) {
  const lines = text.split('\n');
  let inFence = false;
  for (let i = 0; i < lines.length; i++) {
    if (/^\s*```/.test(lines[i])) {
      inFence = !inFence;
      continue;
    }
    if (!inFence) yield [lines[i], i];
  }
}

/** Find emdashes in prose (skips fenced code). */
export function findEmdashes(text) {
  const hits = [];
  for (const [line, i] of proseLines(text)) {
    const col = line.indexOf(EMDASH);
    if (col !== -1) hits.push({ line: i + 1, col: col + 1, text: line.trim() });
  }
  return hits;
}

/**
 * Find hashtags that contain uppercase letters (skips fenced code).
 * A hashtag is a `#` at line start, after whitespace, or after `(`, immediately
 * followed by a letter. That excludes markdown headings (`## `, space after #)
 * and URL anchor fragments (`page.html#Frag`, `#` preceded by a word char).
 */
export function findUppercaseHashtags(text) {
  const hits = [];
  const re = /(^|[\s(])#([A-Za-z][\w-]*)/g;
  for (const [line, i] of proseLines(text)) {
    let m;
    re.lastIndex = 0;
    while ((m = re.exec(line)) !== null) {
      if (/[A-Z]/.test(m[2])) {
        const col = m.index + m[1].length + 1;
        hits.push({ line: i + 1, col, tag: `#${m[2]}`, text: line.trim() });
      }
    }
  }
  return hits;
}

/** Strip markdown link/emphasis wrappers so we judge the visible heading text. */
function cleanHeading(raw) {
  return raw
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1') // [text](url) -> text
    .replace(/[*_`]/g, ''); // bold / italic / inline-code markers
}

/** A word capitalized like a normal sentence word: "Docker", not "TypeScript" or "CLI". */
function isSimpleCapitalized(token) {
  const word = token.replace(/^[^A-Za-z]+/, '').replace(/[^A-Za-z]+$/, '');
  return /^[A-Z][a-z]+$/.test(word) && !PROPER_NOUNS.has(word.toLowerCase());
}

/**
 * Warn on headings (below H1) that look Title Cased.
 * Heuristic: 2+ non-first words are simple-capitalized and not proper nouns.
 * The threshold lets a lone proper noun through ("a post about Docker") while
 * catching real Title Case ("Getting Started With Docker").
 */
export function findTitleCaseHeadings(text) {
  const warns = [];
  for (const [line, i] of proseLines(text)) {
    const m = /^(#{2,6})\s+(.+?)\s*$/.exec(line);
    if (!m) continue;
    const words = cleanHeading(m[2])
      .split(/\s+/)
      .filter((t) => /[A-Za-z]/.test(t)); // drop emoji / number / symbol tokens
    const [, ...rest] = words; // first word may always be capitalized
    const offenders = rest.filter(isSimpleCapitalized);
    if (offenders.length >= 2) warns.push({ line: i + 1, text: line.trim(), offenders });
  }
  return warns;
}

/** Recursively collect .md / .mdx files under a directory. */
function collect(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...collect(full));
    else if (/\.mdx?$/.test(entry)) out.push(full);
  }
  return out;
}

export function main() {
  const emdashes = [];
  const hashtags = [];
  const headings = [];
  for (const file of collect(CONTENT_DIR)) {
    const text = readFileSync(file, 'utf8');
    const rel = relative(ROOT, file);
    for (const v of findEmdashes(text)) emdashes.push({ ...v, file: rel });
    for (const v of findUppercaseHashtags(text)) hashtags.push({ ...v, file: rel });
    for (const v of findTitleCaseHeadings(text)) headings.push({ ...v, file: rel });
  }

  if (headings.length > 0) {
    console.warn(`\nProse lint: ${headings.length} heading(s) may not be sentence-cased (review):`);
    for (const h of headings) console.warn(`  ⚠ ${h.file}:${h.line}  ${h.text}`);
  }

  if (emdashes.length + hashtags.length > 0) {
    if (emdashes.length > 0) {
      console.error(
        `\nProse lint: found ${emdashes.length} emdash(es). Use a comma, colon, or parentheses instead.`,
      );
      for (const v of emdashes) console.error(`  ✗ ${v.file}:${v.line}:${v.col}  ${v.text}`);
    }
    if (hashtags.length > 0) {
      console.error(
        `\nProse lint: found ${hashtags.length} uppercase hashtag(s). Hashtags should be lowercase.`,
      );
      for (const v of hashtags) console.error(`  ✗ ${v.file}:${v.line}:${v.col}  ${v.tag}`);
    }
    process.exit(1);
  }

  const suffix = headings.length ? ` (${headings.length} casing warning(s) above)` : '';
  console.log(`Prose lint: no emdashes or uppercase hashtags found. ✓${suffix}`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}
