// Shared audit page set for both Lighthouse configs (mobile + desktop).
// A representative page per zone + the heaviest content pages.
module.exports = {
  urls: [
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
};
