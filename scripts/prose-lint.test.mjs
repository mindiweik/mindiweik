import { describe, it, expect } from 'vitest';
import { findEmdashes, findUppercaseHashtags, findTitleCaseHeadings } from './prose-lint.mjs';

describe('findEmdashes', () => {
  it('flags an emdash in prose', () => {
    const hits = findEmdashes('This is prose — with an emdash.');
    expect(hits).toHaveLength(1);
    expect(hits[0].line).toBe(1);
  });

  it('ignores emdashes inside fenced code blocks', () => {
    const text = ['before', '```', 'const s = "a — b";', '```', 'after'].join('\n');
    expect(findEmdashes(text)).toEqual([]);
  });

  it('reports nothing for clean prose', () => {
    expect(findEmdashes('A clean sentence, no emdash here.')).toEqual([]);
  });
});

describe('findUppercaseHashtags', () => {
  it('flags a hashtag containing uppercase letters', () => {
    const hits = findUppercaseHashtags('loving the #DevLife lately');
    expect(hits).toHaveLength(1);
    expect(hits[0].tag).toBe('#DevLife');
  });

  it('allows an all-lowercase hashtag', () => {
    expect(findUppercaseHashtags('working in #tech, still learning')).toEqual([]);
  });

  it('does NOT treat markdown headings as hashtags', () => {
    expect(findUppercaseHashtags('## The Story\n### Where It Is At')).toEqual([]);
  });

  it('does NOT flag a "#" inside a URL anchor fragment', () => {
    const line = 'see [the docs](https://example.com/page.html#Types-Of-Testing) for more';
    expect(findUppercaseHashtags(line)).toEqual([]);
  });

  it('ignores hashtags inside fenced code blocks', () => {
    const text = ['```', 'const tag = "#NotAHashtagForLint";', '```'].join('\n');
    expect(findUppercaseHashtags(text)).toEqual([]);
  });
});

describe('findTitleCaseHeadings', () => {
  it('warns on an obviously Title Cased heading', () => {
    const hits = findTitleCaseHeadings('## Getting Started With Docker');
    expect(hits).toHaveLength(1);
    expect(hits[0].line).toBe(1);
  });

  it('does NOT warn on a sentence-cased heading', () => {
    expect(findTitleCaseHeadings('## the story so far')).toEqual([]);
  });

  it('does NOT warn on sentence case with a single proper noun', () => {
    expect(findTitleCaseHeadings('## a post about Docker')).toEqual([]);
  });

  it('does NOT warn when capitals are known proper nouns / acronyms', () => {
    expect(findTitleCaseHeadings('## setting up TypeScript with the GitLab CLI')).toEqual([]);
  });

  it('skips H1 entirely (only H1 may be Title Case)', () => {
    expect(findTitleCaseHeadings('# My Big Title Case Page')).toEqual([]);
  });

  it('handles an emoji prefix before the first word', () => {
    expect(findTitleCaseHeadings('## 🔗 a link from someone who cares')).toEqual([]);
  });

  it('strips markdown link + bold wrappers before judging', () => {
    expect(findTitleCaseHeadings('#### **load testing** basics')).toEqual([]);
  });

  it('still catches Title Case even with an emoji prefix', () => {
    const hits = findTitleCaseHeadings('## 🚀 Shipping Fast And Often');
    expect(hits).toHaveLength(1);
  });

  it('ignores non-heading lines', () => {
    expect(findTitleCaseHeadings('This Is A Normal Sentence In A Paragraph.')).toEqual([]);
  });
});
