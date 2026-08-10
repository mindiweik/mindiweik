// Lighthouse CI config, MOBILE run (Lighthouse's default emulation: Moto-G-class
// 412px screen, simulated slow-4G throttling). This has always been the effective
// form factor here (no preset was ever set); it is now explicit so nobody has to
// re-derive it. Desktop run lives in lighthouserc.desktop.cjs.
// Runs against the built ./dist (LHCI serves it locally, so scores are
// network-noise-free), takes the median of 3 runs per URL, and hard-fails if any
// audited page drops below the category thresholds.
// Runs in CI on pull_request (.github/workflows/lighthouse.yml) and locally
// via `npm run lhci` after `npm run build`.
// NOTE: the local simulation is pessimistic vs live PSI on LCP (font chain), so
// mobile perf sits near the 0.9 line even with live PSI at 100. That is the
// point: the gate stays tight where regressions actually show up first.
const { urls } = require('./lighthouse.urls.cjs');

module.exports = {
  ci: {
    collect: {
      staticDistDir: './dist',
      numberOfRuns: 3,
      settings: {
        chromeFlags: '--no-sandbox',
        // formFactor/screenEmulation/throttling intentionally omitted:
        // Lighthouse defaults ARE the mobile preset.
      },
      url: urls,
    },
    assert: {
      assertions: {
        'categories:performance': ['error', { minScore: 0.9 }],
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
