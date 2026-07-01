// One-off migration helper: pull frontmatter fields from a wip-podcast.com page's JSON-LD.
// Safe to delete after the migration is complete.
export function parseMeta(html) {
  const blocks = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)];
  let ld = {};
  for (const b of blocks) {
    try {
      const obj = JSON.parse(b[1].trim());
      if (obj['@type'] && obj['@type'] !== 'WebSite') { ld = obj; break; }
      if (!ld['@type']) ld = obj;
    } catch {}
  }
  const iso = ld.datePublished ? String(ld.datePublished).slice(0, 10) : null;
  const tr = typeof ld.timeRequired === 'string' ? ld.timeRequired.match(/PT(\d+)M/) : null;
  return {
    title: ld.headline || ld.name || null,
    description: ld.description || null,
    datePublished: iso,
    readingTimeMin: tr ? Number(tr[1]) : null,
    sections: Array.isArray(ld.articleSection) ? ld.articleSection : (ld.articleSection ? [ld.articleSection] : []),
    type: ld['@type'] || null,
  };
}

// CLI: `node scripts/wip-extract.mjs <url>` prints parsed meta + raw HTML length.
if (import.meta.url === `file://${process.argv[1]}`) {
  const url = process.argv[2];
  const html = await (await fetch(url)).text();
  console.log(JSON.stringify(parseMeta(html), null, 2));
}
