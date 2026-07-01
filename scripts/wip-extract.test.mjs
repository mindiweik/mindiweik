import { describe, it, expect } from 'vitest';
import { parseMeta } from './wip-extract.mjs';

const sample = `<html><head><script type="application/ld+json">
{"@type":"Article","headline":"Exploring TypeScript Primitive Types","description":"TS 7 primitive types.","datePublished":"2025-01-14T00:00:00.000Z","timeRequired":"PT6M","articleSection":["TypeScript"]}
</script></head><body>hi</body></html>`;

describe('parseMeta', () => {
  it('extracts JSON-LD fields', () => {
    const m = parseMeta(sample);
    expect(m.title).toBe('Exploring TypeScript Primitive Types');
    expect(m.description).toBe('TS 7 primitive types.');
    expect(m.datePublished).toBe('2025-01-14');
    expect(m.readingTimeMin).toBe(6);
    expect(m.sections).toEqual(['TypeScript']);
    expect(m.type).toBe('Article');
  });
});
