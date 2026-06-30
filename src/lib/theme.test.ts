import { describe, it, expect } from 'vitest';
import { resolveTheme, nextTheme, isTheme, DEFAULT_THEME, STORAGE_KEY } from './theme.ts';

describe('resolveTheme', () => {
  it('returns the stored theme when valid', () => {
    expect(resolveTheme('light')).toBe('light');
    expect(resolveTheme('dark')).toBe('dark');
  });
  it('falls back to dark for missing or garbage values', () => {
    expect(resolveTheme(null)).toBe('dark');
    expect(resolveTheme('')).toBe('dark');
    expect(resolveTheme('blue')).toBe('dark');
    expect(resolveTheme(undefined)).toBe('dark');
  });
});

describe('nextTheme', () => {
  it('toggles between dark and light', () => {
    expect(nextTheme('dark')).toBe('light');
    expect(nextTheme('light')).toBe('dark');
  });
});

describe('isTheme', () => {
  it('guards valid theme strings only', () => {
    expect(isTheme('dark')).toBe(true);
    expect(isTheme('light')).toBe(true);
    expect(isTheme('x')).toBe(false);
    expect(isTheme(null)).toBe(false);
  });
});

describe('constants', () => {
  it('default is dark and storage key is "theme"', () => {
    expect(DEFAULT_THEME).toBe('dark');
    expect(STORAGE_KEY).toBe('theme');
  });
});
