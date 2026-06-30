import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: { environment: 'node' },
  resolve: {
    alias: {
      'astro:content': path.resolve('./src/__mocks__/astro-content.ts'),
    },
  },
});
