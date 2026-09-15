"use client";

import type React from "react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useSyncExternalStore,
} from "react";

type ThemeMode = "light" | "dark" | "auto";
type ResolvedTheme = "light" | "dark";

type ThemeContextType = {
  theme: ResolvedTheme; // Resolved theme actually active ("light" or "dark")
  themeMode: ThemeMode; // The configured preference ("light", "dark", or "auto")
  setThemeMode: (mode: ThemeMode) => void;
  toggleTheme: () => void;
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const MODE_KEY = "theme-mode";
/** Key from before `theme-mode` existed; still read so old choices survive. */
const LEGACY_THEME_KEY = "theme";
/** Fired after a write so every subscriber re-reads, including this tab. */
const MODE_CHANGE_EVENT = "lifeos:theme-mode";
const DARK_MEDIA_QUERY = "(prefers-color-scheme: dark)";

function isThemeMode(value: string | null): value is ThemeMode {
  return value === "light" || value === "dark" || value === "auto";
}

function readStoredMode(): ThemeMode {
  const saved =
    localStorage.getItem(MODE_KEY) ?? localStorage.getItem(LEGACY_THEME_KEY);

  return isThemeMode(saved) ? saved : "light";
}

/**
 * `localStorage` is an external store, so the preference is read through
 * `useSyncExternalStore` rather than copied into state inside an effect —
 * that keeps the first client render identical to the server render (no
 * hydration mismatch) while still picking up the stored value right after.
 */
function subscribeToStoredMode(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener(MODE_CHANGE_EVENT, onChange);

  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(MODE_CHANGE_EVENT, onChange);
  };
}

function writeStoredMode(mode: ThemeMode) {
  localStorage.setItem(MODE_KEY, mode);
  window.dispatchEvent(new Event(MODE_CHANGE_EVENT));
}

function subscribeToSystemTheme(onChange: () => void) {
  const mediaQuery = window.matchMedia(DARK_MEDIA_QUERY);
  mediaQuery.addEventListener("change", onChange);

  return () => mediaQuery.removeEventListener("change", onChange);
}

/** Primitives, so `useSyncExternalStore` can compare snapshots by value. */
function getServerMode(): ThemeMode {
  return "light";
}

function getPrefersDark(): boolean {
  return window.matchMedia(DARK_MEDIA_QUERY).matches;
}

function getServerPrefersDark(): boolean {
  return false;
}

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const themeMode = useSyncExternalStore(
    subscribeToStoredMode,
    readStoredMode,
    getServerMode,
  );
  const prefersDark = useSyncExternalStore(
    subscribeToSystemTheme,
    getPrefersDark,
    getServerPrefersDark,
  );

  // Derived, not stored: "auto" follows the OS, a fixed mode is itself.
  const theme: ResolvedTheme =
    themeMode === "auto" ? (prefersDark ? "dark" : "light") : themeMode;

  useEffect(() => {
    // The resolved theme is mirrored to the legacy key for backwards
    // compatibility and applied to the document (an external system, which is
    // what an effect is for).
    localStorage.setItem(LEGACY_THEME_KEY, theme);

    const root = document.documentElement;
    root.classList.toggle("dark", theme === "dark");
    root.setAttribute("data-color-scheme", theme);
  }, [theme]);

  const setThemeMode = useCallback((mode: ThemeMode) => {
    writeStoredMode(mode);
  }, []);

  const toggleTheme = useCallback(() => {
    writeStoredMode(theme === "light" ? "dark" : "light");
  }, [theme]);

  return (
    <ThemeContext.Provider
      value={{ theme, themeMode, setThemeMode, toggleTheme }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
};
