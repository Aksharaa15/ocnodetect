import React, { createContext, useContext, useState } from 'react';
import { lightColors, darkColors, ColorScheme } from './colors';

interface ThemeContextValue {
  colors: ColorScheme;
  isDark: boolean;
  toggle: () => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  colors: lightColors,
  isDark: false,
  toggle: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [isDark, setIsDark] = useState(false);
  const colors = isDark ? darkColors : lightColors;
  const toggle = () => setIsDark((d) => !d);

  return (
    <ThemeContext.Provider value={{ colors, isDark, toggle }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
