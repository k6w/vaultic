import { useCallback, useEffect, useState } from 'react';
import type { ThemePreference } from '@shared/types';
import { applyTheme, getStoredTheme, setStoredTheme } from '@shared/theme';

/**
 * Reads the persisted theme preference, applies it to the document root, and
 * keeps `system` in sync with the OS. `setTheme` persists + applies immediately.
 * The preference is stored outside the encrypted vault so the lock screen
 * themes correctly before unlock.
 */
export function useTheme() {
  const [theme, setThemeState] = useState<ThemePreference>('system');

  useEffect(() => {
    let active = true;
    getStoredTheme().then((p) => {
      if (!active) return;
      setThemeState(p);
      applyTheme(p);
    });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (theme !== 'system') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => applyTheme('system');
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [theme]);

  const setTheme = useCallback((p: ThemePreference) => {
    setThemeState(p);
    applyTheme(p);
    void setStoredTheme(p);
  }, []);

  return { theme, setTheme };
}
