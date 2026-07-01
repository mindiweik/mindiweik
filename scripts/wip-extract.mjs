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

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Unescape HTML entities in a string. */
function unescapeHtml(str) {
  return str
    .replace(/&amp;/g,  '&')
    .replace(/&lt;/g,   '<')
    .replace(/&gt;/g,   '>')
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&#39;/g,  "'")
    .replace(/&#x2F;/g, '/')
    .replace(/&nbsp;/g, ' ')
    .replace(/&#(\d+);/g,          (_, n) => String.fromCharCode(parseInt(n, 10)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, h) => String.fromCharCode(parseInt(h, 16)));
}

/**
 * Detect furniture blocks that should be stripped.
 * Returns true if the content block is navigation / branding / sidebar
 * and must NOT appear in the article body.
 */
function isFurniture(decoded) {
  return (
    decoded.includes('ko-fi.com') ||
    decoded.includes('[WIP] community free') ||
    decoded.includes('Support the [WIP]') ||
    decoded.includes('Support [WIP]') ||
    decoded.includes('Start over') ||
    decoded.includes('Want to be - or recommend - a guest') ||
    decoded.includes('mindi@wip-podcast.com') ||
    decoded.includes('Let me know!') ||
    decoded.includes('Did I miss anything') ||
    decoded.includes('© 2026') ||           // © 2026
    decoded.includes('&copy;') ||
    decoded.includes('You can find Mindi Weik on these platforms') ||
    decoded.includes('Do you want more straight to your inbox') ||
    decoded.includes('Do you want more straight to your inbox?') ||
    // lone "Connect" heading
    /^<h[2-6][^>]*>\s*Connect\s*<\/h[2-6]>\s*$/.test(decoded.trim())
  );
}

/**
 * Extract all content-bearing GridTextBox and GridEmbed blocks from the
 * Builder.io serialized-state blob embedded in the HTML, sorted by their
 * desktop top-position so they appear in reading order.
 *
 * The blob is HTML-entity-escaped, and the content strings inside it are
 * additionally backslash-escaped.  We unescape both layers.
 */
function extractBlocks(html) {
  // Layer 1: unescape the outer HTML-entity escaping so the blob becomes
  // readable JSON-like text with \" inside strings.
  const unescaped = unescapeHtml(html);

  // The content value is a JSON string (double-quoted, backslash-escaped).
  // Regex: match opening "content":[0," then capture until unescaped closing ".
  const contentRe = /"content":\[0,"((?:[^"\\]|\\.)*)"\]/g;

  const blocks = [];

  // Match every GridTextBox / GridEmbed occurrence that owns a content field
  // within 200 characters (so we don't bleed across element boundaries).
  const typeRe = /GridTextBox|GridEmbed/g;
  let typeMatch;

  while ((typeMatch = typeRe.exec(unescaped)) !== null) {
    const blockStart = typeMatch.index;
    // The "content" key must be within ~200 chars of the type declaration.
    const nearSnippet = unescaped.slice(blockStart, blockStart + 200);
    const nearContentIdx = nearSnippet.indexOf('"content"');
    if (nearContentIdx === -1) continue;

    // Run the content regex from that offset.
    contentRe.lastIndex = blockStart + nearContentIdx;
    const cm = contentRe.exec(unescaped);
    if (!cm || cm.index > blockStart + 200) continue;

    // Layer 2: unescape the backslash-escaped quotes inside the JSON string.
    const raw = cm[1];
    const decoded = raw
      .replace(/\\"/g,  '"')
      .replace(/\\n/g,  '\n')
      .replace(/\\t/g,  '\t')
      .replace(/\\\\/g, '\\');

    if (isFurniture(decoded)) continue;

    // Determine desktop position for reading-order sort.
    // The desktop key can be up to ~5 000 chars after the type declaration.
    const wideSnippet = unescaped.slice(blockStart, blockStart + 6000);
    const deskMatch = wideSnippet.match(/"desktop":\[0,\{"top":\[0,(\d+)\],"left":\[0,(\d+)\]/);
    const top  = deskMatch ? parseInt(deskMatch[1], 10) : 99999;
    const left = deskMatch ? parseInt(deskMatch[2], 10) : 0;

    blocks.push({ top, left, srcIdx: blockStart, decoded });
  }

  // Sort by desktop top, then left (handles 2-column layouts: text left, code right).
  blocks.sort((a, b) => a.top - b.top || a.left - b.left);

  return blocks;
}

// ── HTML → Markdown ──────────────────────────────────────────────────────────

/** Convert a nested <ul>/<ol> block (already stripped of script/link/style)
 *  into markdown list lines.  Handles one level of nesting per call; we
 *  iterate until stable to handle arbitrary depth. */
function convertLists(html) {
  let prev;
  let depth = 0;
  do {
    prev = html;
    // Replace innermost <ul> (non-greedy so inner lists go first).
    html = html.replace(/<ul[^>]*>([\s\S]*?)<\/ul>/gi, (_, content) => {
      return '\n' + processListItems(content, 'ul', depth) + '\n';
    });
    html = html.replace(/<ol[^>]*>([\s\S]*?)<\/ol>/gi, (_, content) => {
      return '\n' + processListItems(content, 'ol', depth) + '\n';
    });
    depth++;
  } while (prev !== html && depth < 10);
  return html;
}

function processListItems(content, type, depth) {
  const indent = '  '.repeat(depth);
  // Strip <p> wrappers inside <li> (they add no structure in a list context).
  content = content.replace(/<\/?p[^>]*>/gi, '');
  let num = 0;
  return content.replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, (_, inner) => {
    num++;
    const bullet = type === 'ul' ? '-' : `${num}.`;
    // Multi-paragraph list items (source uses <br><br>): indent continuation
    // paragraphs so the list numbering/structure stays intact.
    const contIndent = indent + ' '.repeat(bullet.length + 1);
    const body = inner.trim().replace(/\n{2,}/g, '\n\n' + contIndent);
    return `${indent}${bullet} ${body}\n`;
  }).trim();
}

/** Convert a single decoded HTML chunk to Markdown. */
function htmlToMarkdown(decoded) {
  let md = unescapeHtml(decoded);

  // 1. Strip prism loader boilerplate from GridEmbed blocks (link/script/style).
  md = md.replace(/<link[^>]*>/gi, '');
  md = md.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
  md = md.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');

  // 2. Fenced code blocks (<pre><code class="language-X">).
  md = md.replace(
    /<pre[^>]*>\s*<code[^>]*(?:class="language-(\w+)")?[^>]*>([\s\S]*?)<\/code>\s*<\/pre>/gi,
    (_, lang, code) => {
      const fence = lang || 'js';
      const clean = unescapeHtml(code).trim();
      return `\n\`\`\`${fence}\n${clean}\n\`\`\`\n\n`;
    }
  );

  // 3. Inline: strong, em, links, underline, span — process before block elements.
  md = md.replace(/<strong[^>]*>([\s\S]*?)<\/strong>/gi, '**$1**');
  md = md.replace(/<b[^>]*>([\s\S]*?)<\/b>/gi, '**$1**');
  md = md.replace(/<em[^>]*>([\s\S]*?)<\/em>/gi, '*$1*');
  md = md.replace(/<i[^>]*>([\s\S]*?)<\/i>/gi, '*$1*');
  // Links — preserve the href.
  md = md.replace(/<a\s[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi, (_, href, text) => {
    const cleanHref = unescapeHtml(href);
    const cleanText = text.replace(/<[^>]+>/g, '').trim();
    return `[${cleanText}](${cleanHref})`;
  });
  md = md.replace(/<u[^>]*>([\s\S]*?)<\/u>/gi, '$1');
  md = md.replace(/<span[^>]*>([\s\S]*?)<\/span>/gi, '$1');
  md = md.replace(/<br\s*\/?>/gi, '\n');

  // 3b. Blockquotes (may carry a <footer> attribution). Render as markdown
  // blockquote lines; put the attribution on its own quoted line (no dash,
  // per the no-emdash writing rule).
  md = md.replace(/<blockquote[^>]*>([\s\S]*?)<\/blockquote>/gi, (_, inner) => {
    let attribution = '';
    inner = inner.replace(/<footer[^>]*>([\s\S]*?)<\/footer>/gi, (_, a) => {
      attribution = a.replace(/<[^>]+>/g, '').replace(/^[\s―—–-]+/, '').trim();
      return '';
    });
    const text = inner.replace(/<[^>]+>/g, '').replace(/\n{2,}/g, '\n').trim();
    const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
    if (attribution) lines.push('', attribution);
    const quoted = lines.map((l) => (l ? `> ${l}` : '>')).join('\n');
    return `\n\n${quoted}\n\n`;
  });

  // 4. Headings — source overuses <h1> for in-body sections; render as ##.
  md = md.replace(/<h1[^>]*>([\s\S]*?)<\/h1>/gi, (_, t) => `\n## ${t.trim()}\n\n`);
  md = md.replace(/<h2[^>]*>([\s\S]*?)<\/h2>/gi, (_, t) => `\n## ${t.trim()}\n\n`);
  md = md.replace(/<h3[^>]*>([\s\S]*?)<\/h3>/gi, (_, t) => `\n### ${t.trim()}\n\n`);
  md = md.replace(/<h4[^>]*>([\s\S]*?)<\/h4>/gi, (_, t) => `\n#### ${t.trim()}\n\n`);
  md = md.replace(/<h5[^>]*>([\s\S]*?)<\/h5>/gi, (_, t) => `\n##### ${t.trim()}\n\n`);
  md = md.replace(/<h6[^>]*>([\s\S]*?)<\/h6>/gi, (_, t) => `\n###### ${t.trim()}\n\n`);

  // 5. Lists (recursive, handles nesting).
  md = convertLists(md);

  // 6. Paragraphs.
  md = md.replace(/<p[^>]*>([\s\S]*?)<\/p>/gi, '$1\n\n');

  // 7. Strip any remaining HTML tags.
  md = md.replace(/<[^>]+>/g, '');

  // 8. Emdash cleanup — convert em-dash to comma (per writing rules).
  md = md.replace(/—/g, ',');
  md = md.replace(/&mdash;/g, ',');

  // 9. Normalize whitespace.
  md = md.replace(/\n{3,}/g, '\n\n').trim();

  return md;
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Extract the article body from a wip-podcast.com HTML page and return it
 * as a clean Markdown string, with furniture removed and all links preserved.
 */
export function parseBody(html) {
  const blocks = extractBlocks(html);
  if (blocks.length === 0) return '';

  const parts = blocks.map(b => htmlToMarkdown(b.decoded)).filter(Boolean);
  let joined = parts.join('\n\n');

  // Drop furniture-tail headings whose links were stripped as furniture,
  // leaving a dangling header (e.g. "For more, check out:", "Connect").
  joined = joined.replace(
    /#{1,6}\s*\**\s*(?:for more,?\s*check out|connect|share this(?: post)?|subscribe|follow me)\s*:?\s*\**\s*(?=\n|$)/gi,
    ''
  );

  // Drop the email-subscribe furniture lines (no subscription wired up yet).
  joined = joined.replace(/^.*Subscribe to receive occassional blog posts.*$/gim, '');
  joined = joined.replace(/^.*Your contact information will never be sold.*$/gim, '');

  // Final whitespace normalisation.
  return joined.replace(/\n{3,}/g, '\n\n').trim();
}

/**
 * Extract the YouTube video ID (11 chars) from a wip-podcast.com HTML page,
 * or return null if none is present.
 */
export function parseYoutube(html) {
  const unescaped = unescapeHtml(html);
  // GridVideo block stores the URL in "initialSrc":[0,"https://youtu.be/ID"]
  const m = unescaped.match(/"initialSrc":\[0,"https:\/\/youtu\.be\/([A-Za-z0-9_-]{11})"/);
  if (m) return m[1];
  // Fallback: youtube.com/embed/ID
  const m2 = unescaped.match(/youtube\.com\/embed\/([A-Za-z0-9_-]{11})/);
  return m2 ? m2[1] : null;
}

// CLI: `node scripts/wip-extract.mjs <url>` prints parsed meta + raw HTML length.
if (import.meta.url === `file://${process.argv[1]}`) {
  const url = process.argv[2];
  const html = await (await fetch(url)).text();
  console.log(JSON.stringify(parseMeta(html), null, 2));
}
