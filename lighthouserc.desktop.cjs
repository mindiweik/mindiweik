// Lighthouse CI config, DESKTOP run (preset: desktop = 1350px viewport, faster
// simulated network, no device emulation). Complements the mobile run in
// lighthouserc.cjs, which is the primary gate; this one exists because desktop
// was previously untested (the old single config was mobile-by-default).
// Desktop perf threshold is higher (0.95) since desktop has historically scored
// 97-98 and has more headroom.
// Run locally via `npm run lhci:desktop` after `npm run build`.
const { urls } = require('./lighthouse.urls.cjs');

module.exports = {
  ci: {
    collect: {
      staticDistDir: './dist',
      numberOfRuns: 3,
      settings: {
        chromeFlags: '--no-sandbox',
        preset: 'desktop',
      },
      url: urls,
    },
    assert: {
      assertions: {
        'categories:performance': ['error', { minScore: 0.95 }],
        'categories:accessibility': ['error', { minScore: 0.95 }],
        'categories:best-practices': ['error', { minScore: 0.95 }],
        'categories:seo': ['error', { minScore: 0.95 }],
      },
    },
    upload: {
      target: 'temporary-public-storage',
    },
  },
};
