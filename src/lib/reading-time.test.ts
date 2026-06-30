import { describe, it, expect } from 'vitest';
import { readingTime } from './reading-time';

describe('readingTime', () => {
  it('returns at least 1 minute for short text', () => {
    expect(readingTime('hello world')).toBe(1);
  });
  it('computes minutes at 200 wpm, rounded up', () => {
    const text = Array(401).fill('word').join(' '); // 401 words -> 3 min
    expect(readingTime(text)).toBe(3);
  });
});
