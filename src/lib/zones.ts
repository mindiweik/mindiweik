export type ZoneKey = 'blog' | 'podcast' | 'speaking' | 'projects';

export interface Zone {
  key: ZoneKey;
  label: string;
  route: string;
  token: string; // CSS custom property name
}

export const ZONES: Record<ZoneKey, Zone> = {
  blog: { key: 'blog', label: 'blog', route: '/blog', token: '--accent-blog' },
  podcast: { key: 'podcast', label: 'podcast', route: '/podcast', token: '--accent-podcast' },
  speaking: { key: 'speaking', label: 'speaking', route: '/speaking', token: '--accent-speaking' },
  projects: { key: 'projects', label: 'projects', route: '/projects', token: '--accent-projects' },
};

export function zoneVar(key: ZoneKey): string {
  return `var(${ZONES[key].token})`;
}

/* Canvas-safe accent for accent-colored TEXT/hover (e.g. --hover-accent).
   Mirrors --accent-<zone>-text, which is the bright fill on dark and a darker
   AA-passing value on the light canvas. Use this instead of zoneVar() anywhere
   the accent tints text rather than filling a shape. */
export function zoneTextVar(key: ZoneKey): string {
  return `var(${ZONES[key].token}-text)`;
}
