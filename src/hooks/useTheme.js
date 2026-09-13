import { useState, useEffect } from 'react';

const THEME_STORAGE_KEY = 'aurum_theme_mode';

export function useTheme() {
  const [theme, setTheme] = useState(() => {
    try {
      const saved = localStorage.getItem(THEME_STORAGE_KEY);
      if (saved === 'dark' || saved === 'light') {
        return saved;
      }
      return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
    } catch {
      return 'dark';
    }
  });

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
      document.body.style.backgroundColor = '#0b0b0e';
    } else {
      root.classList.remove('dark');
      document.body.style.backgroundColor = '#faf7f2';
    }

    try {
      localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch {}

    // Actualizar meta theme-color para navegadores móviles
    let metaTheme = document.querySelector('meta[name="theme-color"]');
    if (!metaTheme) {
      metaTheme = document.createElement('meta');
      metaTheme.name = 'theme-color';
      document.head.appendChild(metaTheme);
    }
    metaTheme.content = theme === 'dark' ? '#0b0b0e' : '#faf7f2';
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => (prev === 'dark' ? 'light' : 'dark'));
  };

  return {
    theme,
    isDark: theme === 'dark',
    toggleTheme,
    setTheme,
  };
}
