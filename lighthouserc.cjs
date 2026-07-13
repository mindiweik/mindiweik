// Lighthouse CI config. Runs against the built ./dist (LHCI serves it locally,
// so scores are network-noise-free), takes the median of 3 runs per URL, and
// hard-fails if any audited page drops below the category thresholds.
// Runs in CI on pull_request (.github/workflows/lighthouse.yml) and locally
// via `npm run lhci` after `npm run build`.
module.exports = {
  ci: {
    collect: {
      staticDistDir: './dist',
      numberOfRuns: 3,
      settings: {
        chromeFlags: '--no-sandbox',
      },
      url: [
        'http://localhost/',
        'http://localhost/about/',
        'http://localhost/blog/',
        'http://localhost/podcast/',
        'http://localhost/projects/',
        'http://localhost/blog/how-to-start-working-with-ai/',
        'http://localhost/blog/3-big-scary-software-engineering-words-explained/',
        'http://localhost/podcast/v0-0-10-joram-mutenge/',
        'http://localhost/podcast/v0-0-0-the-first-commit/',
        'http://localhost/projects/audition-cat/',
      ],
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
