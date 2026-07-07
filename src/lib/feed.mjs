import MarkdownIt from 'markdown-it';
import sanitizeHtml from 'sanitize-html';

// Feed HTML pipeline: html:true so raw HTML blocks in posts (embed iframes,
// styled div cards) parse as HTML instead of escaping to literal text;
// sanitize-html then strips unsafe or ugly markup (iframes, scripts, style
// attributes) while keeping images.
const parser = new MarkdownIt({ html: true });

export function renderFeedHtml(markdown) {
  return sanitizeHtml(parser.render(markdown), {
    allowedTags: sanitizeHtml.defaults.allowedTags.concat(['img']),
  });
}
