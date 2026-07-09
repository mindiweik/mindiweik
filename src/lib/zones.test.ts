import { describe, it, expect } from 'vitest';
import { ZONES, zoneVar, zoneTextVar, type ZoneKey } from './zones';

describe('ZONES', () => {
  it('has all four zones with matching keys', () => {
    const keys: ZoneKey[] = ['blog', 'podcast', 'speaking', 'projects'];
    for (const k of keys) {
      expect(ZONES[k].key).toBe(k);
      expect(ZONES[k].route).toBe(`/${k}`);
      expect(ZONES[k].token).toMatch(/^--accent-/);
    }
  });

  it('zoneVar wraps the token in var()', () => {
    expect(zoneVar('podcast')).toBe('var(--accent-podcast)');
  });

  it('zoneTextVar wraps the canvas-safe -text token in var()', () => {
    expect(zoneTextVar('podcast')).toBe('var(--accent-podcast-text)');
  });
});
