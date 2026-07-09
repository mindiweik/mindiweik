import { describe, it, expect } from 'vitest';
import { relatedPostClickEvent } from './analytics';

describe('relatedPostClickEvent', () => {
  it('shapes a GA4 event for a related-post card click', () => {
    const ev = relatedPostClickEvent({
      source: 'why-i-rebuilt-my-site',
      target: 'the-job-search-honestly',
      title: 'The job search, honestly',
      position: 2,
    });
    expect(ev).toEqual({
      name: 'related_post_click',
      params: {
        source_post: 'why-i-rebuilt-my-site',
        target_post: 'the-job-search-honestly',
        link_text: 'The job search, honestly',
        position: 2,
      },
    });
  });

  it('serializes to JSON safely for a data attribute', () => {
    const ev = relatedPostClickEvent({ source: 'a', target: 'b', title: 'C', position: 1 });
    expect(() => JSON.parse(JSON.stringify(ev))).not.toThrow();
  });
});
