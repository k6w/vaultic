import browser from 'webextension-polyfill';
import type { ThemePreference } from './types';

const THEME_KEY = 'vaultic_theme';

/** Resolve a preference to a concrete light/dark using the OS for 'system'. */
export function effectiveTheme(pref: ThemePreference): 'light' | 'dark' {
  if (pref === 'system') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  return pref;
}

/** Apply the theme to the document root (class + color-scheme). */
export function applyTheme(pref: ThemePreference): void {
  const eff = effectiveTheme(pref);
  const root = document.documentElement;
  root.classList.toggle('dark', eff === 'dark');
  root.classList.toggle('light', eff === 'light');
  root.style.colorScheme = eff;
}

/** Best-effort synchronous apply at boot (OS heuristic) to avoid a flash. */
export function applyThemeSync(): void {
  applyTheme('system');
}

export async function getStoredTheme(): Promise<ThemePreference> {
  try {
    const r = await browser.storage.local.get(THEME_KEY);
    const v = r[THEME_KEY];
    return v === 'light' || v === 'dark' || v === 'system' ? v : 'system';
  } catch {
    return 'system';
  }
}

export async function setStoredTheme(pref: ThemePreference): Promise<void> {
  try {
    await browser.storage.local.set({ [THEME_KEY]: pref });
  } catch {
    /* storage unavailable — theme still applies for this session */
  }
}
