// Prose lint: enforce the no-emdash writing rule across published content.
// Emdashes (U+2014) must never appear in prose. Fenced code blocks are skipped
// so code samples that legitimately print a "—" don't trip the check.
//
// Usage: node scripts/prose-lint.mjs   (exits 1 if any violation is found)
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname;
const CONTENT_DIR = join(ROOT, 'src/content');
const EMDASH = '—';

/** Recursively collect .md / .mdx files under a directory. */
function collect(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      out.push(...collect(full));
    } else if (/\.mdx?$/.test(entry)) {
      out.push(full);
    }
  }
  return out;
}

const violations = [];

for (const file of collect(CONTENT_DIR)) {
  const lines = readFileSync(file, 'utf8').split('\n');
  let inFence = false;
  lines.forEach((line, i) => {
    if (/^\s*```/.test(line)) {
      inFence = !inFence;
      return;
    }
    if (inFence) return;
    const col = line.indexOf(EMDASH);
    if (col !== -1) {
      violations.push({ file: relative(ROOT, file), line: i + 1, col: col + 1, text: line.trim() });
    }
  });
}

if (violations.length > 0) {
  console.error(
    `Prose lint: found ${violations.length} emdash(es). Use a comma, colon, or parentheses instead.\n`,
  );
  for (const v of violations) {
    console.error(`  ${v.file}:${v.line}:${v.col}  ${v.text}`);
  }
  process.exit(1);
}

console.log('Prose lint: no emdashes found. ✓');
