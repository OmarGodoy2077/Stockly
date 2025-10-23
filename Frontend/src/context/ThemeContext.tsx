import { createContext, useContext, useEffect, useState } from 'react';

type Theme = 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setTheme] = useState<Theme>(() => {
    // First, check localStorage
    const stored = localStorage.getItem('theme') as Theme | null;
    if (stored) {
      return stored;
    }
    
    // Then, check system preference
    if (typeof window !== 'undefined' && window.matchMedia) {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    
    return 'light';
  });

  useEffect(() => {
    // Update localStorage when theme changes
    localStorage.setItem('theme', theme);

    // Update document and html class for Tailwind dark mode
    const root = document.documentElement;
    const html = document.querySelector('html');
    
    if (theme === 'dark') {
      root.classList.add('dark');
      if (html) html.classList.add('dark');
    } else {
      root.classList.remove('dark');
      if (html) html.classList.remove('dark');
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
