// Post-deploy IndexNow ping: fetch the live sitemap and submit every URL to
// the IndexNow API (Bing, Yandex, and friends; Bing feeds ChatGPT search).
// Run by the deploy job in deploy.yml after the production FTP upload; the
// daily cron rebuild also pings, which auto-submits newly released scheduled
// posts. Zero dependencies (native fetch, Node 22).
import { fileURLToPath } from 'node:url';

const SITE = 'https://mindiweik.com';
// Public by design: IndexNow verifies ownership by fetching /<key>.txt from
// the site root, so the key is intentionally world-readable.
const KEY = '56b4a82d9c928f9bb9c23b01eb79c63b';

// Hostinger's WAF blocks Node's default `User-Agent: node` (see smoke-test.mjs).
const BROWSER_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
  Accept: 'text/xml,application/xml;q=0.9,*/*;q=0.8',
};

export function extractLocs(xml) {
  return [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
}

export function buildPayload(urls) {
  return {
    host: 'mindiweik.com',
    key: KEY,
    keyLocation: `${SITE}/${KEY}.txt`,
    urlList: urls,
  };
}

export async function main() {
  const res = await fetch(`${SITE}/sitemap-0.xml`, { headers: BROWSER_HEADERS });
  if (!res.ok) throw new Error(`sitemap fetch failed: HTTP ${res.status}`);
  const urls = extractLocs(await res.text());
  if (urls.length === 0) throw new Error('no URLs found in sitemap');

  const ping = await fetch('https://api.indexnow.org/indexnow', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify(buildPayload(urls)),
  });
  // 200 = submitted, 202 = accepted pending key validation; both are success.
  if (ping.status !== 200 && ping.status !== 202) {
    throw new Error(`IndexNow ping failed: HTTP ${ping.status}`);
  }
  console.log(`IndexNow: submitted ${urls.length} URLs (HTTP ${ping.status})`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  await main();
}
