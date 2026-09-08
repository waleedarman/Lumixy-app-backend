export type Theme = 'light' | 'dark';

export const THEME_STORAGE_KEY = 'lumixy_admin_theme';

export function getSystemTheme(): Theme {
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function getStoredTheme(): Theme | null {
  if (typeof window === 'undefined') return null;
  const value = localStorage.getItem(THEME_STORAGE_KEY);
  return value === 'light' || value === 'dark' ? value : null;
}

export function resolveTheme(stored: Theme | null = getStoredTheme()): Theme {
  return stored ?? getSystemTheme();
}

export function applyTheme(theme: Theme, persist = false): void {
  document.documentElement.setAttribute('data-theme', theme);

  if (persist) {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  }
}

export function initThemeFromStorage(): Theme {
  const theme = resolveTheme();
  applyTheme(theme);
  return theme;
}

export function enableThemeTransitions(): void {
  document.documentElement.removeAttribute('data-theme-init');
  document.documentElement.setAttribute('data-theme-ready', '');
}
