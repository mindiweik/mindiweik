// @ts-check
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import astro from 'eslint-plugin-astro';
import eslintConfigPrettier from 'eslint-config-prettier/flat';
import globals from 'globals';

export default tseslint.config(
  // Paths ESLint should never look at (build output, archived WIP, generated types).
  {
    ignores: ['dist/', 'wip-dist/', 'wip-landing/', 'wip-archive/', '.astro/', 'public/'],
  },

  // Baseline JS + TypeScript quality rules (non-type-checked = fast, low-noise).
  js.configs.recommended,
  tseslint.configs.recommended,

  // Astro component + template linting (parser, globals, a11y-adjacent rules).
  astro.configs.recommended,

  // TypeScript already resolves ambient Astro globals (e.g. ImageMetadata) in
  // .astro frontmatter far more accurately than ESLint's scope analysis, so
  // let it own undefined-name checking there.
  {
    files: ['**/*.astro'],
    rules: { 'no-undef': 'off' },
  },

  // Plain Node scripts and config files run in Node, not the browser.
  {
    files: ['scripts/**/*.mjs', '*.config.{js,mjs,ts}', 'vitest.config.ts'],
    languageOptions: { globals: { ...globals.node } },
  },

  // Project tweaks.
  {
    rules: {
      // Allow intentionally-unused names when prefixed with `_`.
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      // `any` is used deliberately in a few spots (test mocks, types that
      // mirror Astro's getCollection shape). Surface it, don't fail on it.
      '@typescript-eslint/no-explicit-any': 'warn',
    },
  },

  // Disable stylistic rules that conflict with Prettier. MUST stay last.
  eslintConfigPrettier,
);
