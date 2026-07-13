import { Monitor, Moon, Sun } from 'lucide-react';
import { useTheme } from '@hooks/useTheme';
import type { ThemePreference } from '@shared/types';
import { IconButton } from './Button';

const order: ThemePreference[] = ['system', 'light', 'dark'];
const meta: Record<ThemePreference, { icon: React.ReactNode; label: string }> = {
  system: { icon: <Monitor size={16} />, label: 'Theme: system' },
  light: { icon: <Sun size={16} />, label: 'Theme: light' },
  dark: { icon: <Moon size={16} />, label: 'Theme: dark' },
};

/** Compact button that cycles system → light → dark. */
export function ThemeToggle({ size = 'md' }: { size?: 'sm' | 'md' }) {
  const { theme, setTheme } = useTheme();
  const next = () => setTheme(order[(order.indexOf(theme) + 1) % order.length]);
  return (
    <IconButton label={meta[theme].label} size={size} onClick={next}>
      {meta[theme].icon}
    </IconButton>
  );
}
