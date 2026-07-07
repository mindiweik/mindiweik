import { describe, it, expect } from 'vitest';
import { renderFeedHtml } from './feed.mjs';

describe('renderFeedHtml', () => {
  it('renders markdown paragraphs', () => {
    expect(renderFeedHtml('Hello **world**.')).toContain('<p>Hello <strong>world</strong>.</p>');
  });

  it('parses raw HTML blocks instead of escaping them to literal text', () => {
    const out = renderFeedHtml('<div style="color:red">card</div>');
    expect(out).toContain('card');
    expect(out).not.toContain('&lt;div');
    expect(out).not.toContain('style=');
  });

  it('strips iframes and scripts entirely', () => {
    const out = renderFeedHtml(
      'before\n\n<iframe src="https://example.com/embed"></iframe>\n\n<script>alert(1)</script>\n\nafter',
    );
    expect(out).not.toContain('<iframe');
    expect(out).not.toContain('<script');
    expect(out).not.toContain('alert(1)');
    expect(out).toContain('after');
  });

  it('keeps images', () => {
    expect(renderFeedHtml('![alt](https://example.com/a.png)')).toContain('<img');
  });
});
