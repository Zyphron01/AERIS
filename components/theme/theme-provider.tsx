"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useCallback,
  useSyncExternalStore,
} from "react";

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

function getThemeSnapshot(): ThemeMode {
  if (typeof window === "undefined") return "light";
  try {
    const stored = (localStorage.getItem(THEME_STORAGE_KEY) ||
      localStorage.getItem(LEGACY_THEME_STORAGE_KEY)) as ThemeMode | null;
    if (stored === "dark" || stored === "light") {
      return stored;
    }
    if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
      return "dark";
    }
  } catch {
    // storage unavailable
  }
  return "light";
}

function getThemeServerSnapshot(): ThemeMode {
  return "light";
}

function subscribeToTheme(callback: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  window.addEventListener("storage", callback);
  window.addEventListener("aeris_theme_updated", callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener("aeris_theme_updated", callback);
  };
}

export function ThemeProvider({
  children,
}: {
  readonly children: React.ReactNode;
}): React.JSX.Element {
  // useSyncExternalStore ensures:
  // 1. Server snapshot returns "light"
  // 2. Client first render uses server snapshot ("light") to guarantee 100% hydration match
  // 3. Client immediately synchronizes with stored preference cleanly without cascading setState in effects
  const theme = useSyncExternalStore(
    subscribeToTheme,
    getThemeSnapshot,
    getThemeServerSnapshot
  );

  // Synchronize DOM class whenever theme updates
  useEffect(() => {
    applyThemeToDocument(theme);
  }, [theme]);

  const setTheme = useCallback((nextTheme: ThemeMode): void => {
    applyThemeToDocument(nextTheme);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
      localStorage.setItem(LEGACY_THEME_STORAGE_KEY, nextTheme);
      window.dispatchEvent(new Event("aeris_theme_updated"));
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
