import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

// Frontmatter-only date scan. A YAML parser would be overkill: collection
// schemas already enforce these fields, we just need the YYYY-MM-DD prefix.
const FRONTMATTER_RE = /^---\r?\n([\s\S]*?)\r?\n---/;
const dateRe = (field) => new RegExp(`^${field}:\\s*['"]?(\\d{4}-\\d{2}-\\d{2})`, 'm');

export function extractLastmod(source) {
  const frontmatter = source.match(FRONTMATTER_RE)?.[1];
  if (!frontmatter) return null;
  for (const field of ['updatedDate', 'pubDate', 'date']) {
    const m = frontmatter.match(dateRe(field));
    if (m) return m[1];
  }
  return null;
}

// Maps URL pathnames (no trailing slash) to lastmod dates for the sitemap.
export function buildLastmodMap(contentBase = './src/content') {
  const map = new Map();
  for (const dir of ['blog', 'podcast', 'speaking']) {
    let files;
    try {
      files = readdirSync(join(contentBase, dir));
    } catch {
      continue;
    }
    for (const file of files) {
      if (!/\.(md|mdx)$/.test(file)) continue;
      const date = extractLastmod(readFileSync(join(contentBase, dir, file), 'utf8'));
      if (date) map.set(`/${dir}/${file.replace(/\.(md|mdx)$/, '')}`, date);
    }
  }
  return map;
}
