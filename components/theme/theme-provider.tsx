"use client";

import React, { createContext, useContext, useEffect, useState, useMemo, useCallback } from "react";

export type ThemeMode = "light" | "dark";

export interface ThemeContextValue {
  readonly theme: ThemeMode;
  readonly isDark: boolean;
  readonly setTheme: (theme: ThemeMode) => void;
  readonly toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export const THEME_STORAGE_KEY = "aeris_theme_v1";
export const LEGACY_THEME_STORAGE_KEY = "aeris-theme";

function applyThemeToDocument(mode: ThemeMode): void {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  if (mode === "dark") {
    root.classList.add("dark");
  } else {
    root.classList.remove("dark");
  }
}

export function ThemeProvider({
  children,
}: {
  readonly children: React.ReactNode;
}): React.JSX.Element {
  const [theme, setThemeState] = useState<ThemeMode>(() => {
    if (typeof window === "undefined") return "light";
    try {
      const stored = (localStorage.getItem(THEME_STORAGE_KEY) ||
        localStorage.getItem(LEGACY_THEME_STORAGE_KEY)) as ThemeMode | null;
      if (stored === "dark" || stored === "light") {
        return stored;
      }
    } catch {
      // storage unavailable
    }
    return "light";
  });

  // On client mount, ensure DOM class is synchronized with initial state
  useEffect(() => {
    applyThemeToDocument(theme);

    // Sync across tabs
    const handleStorage = (e: StorageEvent): void => {
      if (e.key === THEME_STORAGE_KEY || e.key === LEGACY_THEME_STORAGE_KEY) {
        const next = e.newValue as ThemeMode | null;
        if (next === "dark" || next === "light") {
          setThemeState(next);
          applyThemeToDocument(next);
        }
      }
    };

    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, [theme]);

  const setTheme = useCallback((nextTheme: ThemeMode): void => {
    setThemeState(nextTheme);
    applyThemeToDocument(nextTheme);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
      localStorage.setItem(LEGACY_THEME_STORAGE_KEY, nextTheme);
    } catch {
      // ignore storage errors
    }
  }, []);

  const toggleTheme = useCallback((): void => {
    setTheme(theme === "dark" ? "light" : "dark");
  }, [theme, setTheme]);

  const value = useMemo<ThemeContextValue>(
    () => ({
      theme,
      isDark: theme === "dark",
      setTheme,
      toggleTheme,
    }),
    [theme, setTheme, toggleTheme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) {
    return {
      theme: "light",
      isDark: false,
      setTheme: () => {},
      toggleTheme: () => {},
    };
  }
  return context;
}
