// @ts-check
import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';
import { buildLastmodMap } from './src/lib/sitemap-lastmod.mjs';

const lastmodMap = buildLastmodMap();

export default defineConfig({
  // DEPLOY_SITE lets the dev.mindiweik.com preview build point canonical
  // URLs, sitemap, and RSS self-links at the subdomain.
  site: process.env.DEPLOY_SITE ?? 'https://mindiweik.com',
  output: 'static',
  // Inline all CSS into the HTML. The whole bundle is ~3 KB compressed, and an
  // external stylesheet is render-blocking AND hides the @font-face URLs behind
  // an extra round trip (mobile LCP was 3.5s because Space Grotesk could not
  // start downloading until the CSS arrived).
  build: { inlineStylesheets: 'always' },
  integrations: [
    mdx(),
    sitemap({
      serialize(item) {
        const pathname = new URL(item.url).pathname.replace(/\/+$/, '') || '/';
        const lastmod = lastmodMap.get(pathname);
        return lastmod ? { ...item, lastmod } : item;
      },
    }),
  ],
  vite: { plugins: [tailwindcss()] },
});
