// @ts-check
import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  // DEPLOY_SITE lets the dev.mindiweik.com preview build point canonical
  // URLs, sitemap, and RSS self-links at the subdomain.
  site: process.env.DEPLOY_SITE ?? 'https://mindiweik.com',
  output: 'static',
  integrations: [mdx(), sitemap()],
  vite: { plugins: [tailwindcss()] },
});
