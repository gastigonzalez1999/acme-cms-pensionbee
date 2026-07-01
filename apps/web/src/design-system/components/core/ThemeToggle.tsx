import { useEffect, useState } from 'react';
import { Icon } from './Icon';
import { IconButton } from './IconButton';

/**
 * ThemeToggle — the sun/moon dark-mode switch. Toggles the `.dark` class on
 * <html> and persists the choice to localStorage (key "theme"), matching the
 * inline anti-flash script in index.html. Also syncs to the OS preference
 * if the user hasn't made an explicit choice yet.
 */
export interface ThemeToggleProps {
  size?: 'sm' | 'md' | 'lg';
}

export function ThemeToggle({ size = 'md' }: ThemeToggleProps) {
  const [dark, setDark] = useState(() => document.documentElement.classList.contains('dark'));

  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e: MediaQueryListEvent) => {
      if (!localStorage.getItem('theme')) {
        document.documentElement.classList.toggle('dark', e.matches);
        setDark(e.matches);
      }
    };
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  const toggle = () => {
    const isDark = document.documentElement.classList.toggle('dark');
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
    setDark(isDark);
  };

  return (
    <IconButton size={size} label={dark ? 'Switch to light mode' : 'Switch to dark mode'} onClick={toggle}>
      <Icon name={dark ? 'sun' : 'moon'} size={size === 'sm' ? 17 : 20} />
    </IconButton>
  );
}
