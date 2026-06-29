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

export const ZONE_ORDER: ZoneKey[] = ['blog', 'podcast', 'speaking', 'projects'];

export function zoneVar(key: ZoneKey): string {
  return `var(${ZONES[key].token})`;
}
