export const THEMES = ['dark', 'light'] as const;
export type Theme = (typeof THEMES)[number];

export const STORAGE_KEY = 'theme';
export const DEFAULT_THEME: Theme = 'dark';

export function isTheme(value: unknown): value is Theme {
  return value === 'dark' || value === 'light';
}

export function resolveTheme(stored: unknown): Theme {
  return isTheme(stored) ? stored : DEFAULT_THEME;
}

export function nextTheme(current: Theme): Theme {
  return current === 'dark' ? 'light' : 'dark';
}
