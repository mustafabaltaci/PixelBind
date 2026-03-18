import React, { createContext, useContext, useEffect, useState } from 'react';

const ThemeContext = createContext();
const getStoredTheme = () => {
  if (typeof window === 'undefined') {
    return 'light';
  }

  return window.localStorage.getItem('theme') === 'dark' ? 'dark' : 'light';
};

export const ThemeProvider = ({ children }) => {
  // Restore the previous theme before the first paint when possible.
  const [theme, setTheme] = useState(getStoredTheme);

  useEffect(() => {
    const root = window.document.documentElement;
    // Tailwind's dark variant is driven by a root class, so keep it in sync here.
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    window.localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => (prev === 'dark' ? 'light' : 'dark'));
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
