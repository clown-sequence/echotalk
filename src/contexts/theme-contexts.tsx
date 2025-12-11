import React, { createContext, useContext, useEffect, useState, type ReactNode, useMemo } from 'react';

type Theme = 'light' | 'dark' | 'system';
type ResolvedTheme = 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  resolvedTheme: ResolvedTheme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

interface ThemeProviderProps {
  children: ReactNode;
  defaultTheme?: Theme;
}

// ===========================
// CONTEXT CREATION
// ===========================

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

// ===========================
// CUSTOM HOOK
// ===========================

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

// ===========================
// HELPER FUNCTIONS
// ===========================

/**
 * Get the system's preferred color scheme
 */
const getSystemTheme = (): ResolvedTheme => {
  if (typeof window === 'undefined') return 'light';
  
  return window.matchMedia('(prefers-color-scheme: dark)').matches 
    ? 'dark' 
    : 'light';
};

/**
 * Get saved theme from localStorage
 */
const getSavedTheme = (defaultTheme: Theme): Theme => {
  if (typeof window === 'undefined') return defaultTheme;
  
  const saved = localStorage.getItem('theme') as Theme | null;
  return saved || defaultTheme;
};

// ===========================
// THEME PROVIDER COMPONENT
// ===========================

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ 
  children, 
  defaultTheme = 'system' 
}) => {
  // Initialize theme from localStorage
  const [theme, setThemeState] = useState<Theme>(() => getSavedTheme(defaultTheme));

  // Calculate resolved theme based on current theme preference
  // This is a derived state, so we use useMemo instead of useState
  const resolvedTheme = useMemo<ResolvedTheme>(() => {
    if (theme === 'system') {
      return getSystemTheme();
    }
    return theme;
  }, [theme]);

  // Set theme and save to localStorage
  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
    localStorage.setItem('theme', newTheme);
  };

  // Toggle between light → dark → system → light
  const toggleTheme = () => {
    if (theme === 'light') {
      setTheme('dark');
    } else if (theme === 'dark') {
      setTheme('system');
    } else {
      setTheme('light');
    }
  };

  // Apply theme to document (side effect, not state update)
  useEffect(() => {
    // Update document classes
    document.documentElement.classList.remove('light', 'dark');
    document.documentElement.classList.add(resolvedTheme);
    document.documentElement.setAttribute('data-theme', resolvedTheme);
  }, [resolvedTheme]);

  // Listen for system theme changes when in 'system' mode
  useEffect(() => {
    if (theme !== 'system') return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    const handleChange = () => {
      // Force re-render by updating theme state
      // This triggers the useMemo to recalculate resolvedTheme
      setThemeState('system');
    };

    // Modern browsers
    mediaQuery.addEventListener('change', handleChange);
    
    return () => {
      mediaQuery.removeEventListener('change', handleChange);
    };
  }, [theme]);

  const value: ThemeContextType = {
    theme,
    resolvedTheme,
    setTheme,
    toggleTheme,
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};
