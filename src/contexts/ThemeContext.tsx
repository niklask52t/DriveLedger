import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

type Theme = 'dark' | 'light';

interface ThemeContextValue {
  theme: Theme;
  resolvedTheme: Theme;
  useSystemTheme: boolean;
  setTheme: (theme: Theme) => void;
  setUseSystemTheme: (use: boolean) => void;
}

const STORAGE_KEY = 'driveledger-theme';
const STORAGE_SYSTEM_KEY = 'driveledger-use-system-theme';

function loadFromStorage(): { theme: Theme; useSystem: boolean } {
  try {
    const storedTheme = localStorage.getItem(STORAGE_KEY) as Theme | null;
    const storedSystem = localStorage.getItem(STORAGE_SYSTEM_KEY);
    return {
      theme: storedTheme === 'light' ? 'light' : 'dark',
      useSystem: storedSystem === 'true',
    };
  } catch {
    return { theme: 'dark', useSystem: false };
  }
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const stored = loadFromStorage();
  const [theme, setThemeState] = useState<Theme>(stored.theme);
  const [useSystemTheme, setUseSystemState] = useState(stored.useSystem);
  const [systemTheme, setSystemTheme] = useState<Theme>(() =>
    window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  );

  // Listen for OS theme changes
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e: MediaQueryListEvent) => setSystemTheme(e.matches ? 'dark' : 'light');
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  const resolvedTheme = useSystemTheme ? systemTheme : theme;

  // Apply theme to DOM
  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute('data-theme', resolvedTheme);
    root.classList.remove('light', 'dark');
    root.classList.add(resolvedTheme);
  }, [resolvedTheme]);

  // Persist to localStorage
  const setTheme = (t: Theme) => {
    setThemeState(t);
    try { localStorage.setItem(STORAGE_KEY, t); } catch { /* noop */ }
  };

  const setUseSystemTheme = (use: boolean) => {
    setUseSystemState(use);
    try { localStorage.setItem(STORAGE_SYSTEM_KEY, String(use)); } catch { /* noop */ }
  };

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme, useSystemTheme, setTheme, setUseSystemTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
