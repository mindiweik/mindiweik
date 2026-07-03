import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

// PNG IHDR: width at byte offset 16, height at 20 (big-endian u32)
const CARDS = ['default', 'blog', 'podcast', 'speaking', 'projects'];

describe('og cards', () => {
  it.each(CARDS)('public/og/%s.png exists and is 2400x1260 (1200x630 @2x)', (name) => {
    const buf = readFileSync(new URL(`../public/og/${name}.png`, import.meta.url));
    expect(buf.readUInt32BE(16)).toBe(2400);
    expect(buf.readUInt32BE(20)).toBe(1260);
  });
});
