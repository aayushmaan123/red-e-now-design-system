/**
 * useTheme -- Hook for managing light/dark theme toggling.
 *
 * Supports three modes: "light", "dark", and "system" (follows OS preference).
 * The chosen mode is persisted in localStorage so it survives page reloads.
 * When set to "system", an OS media-query listener keeps the theme in sync
 * if the user changes their OS appearance while the app is open.
 *
 * Theme application works by adding or removing the "dark" CSS class on
 * the <html> element, which Tailwind's `darkMode: "class"` strategy uses.
 */

import { useCallback, useEffect, useState } from "react";

type Theme = "light" | "dark" | "system";

/** localStorage key used to persist the user's theme preference. */
const STORAGE_KEY = "rede-now-theme";

/**
 * Reads the operating system's current color-scheme preference via
 * the `prefers-color-scheme` media query. Falls back to "light" during
 * server-side rendering where `window` is unavailable.
 */
function getSystemTheme(): "light" | "dark" {
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

/**
 * Applies the resolved theme by toggling the "dark" class on the
 * document's root <html> element. Tailwind uses this class to switch
 * between light and dark utility styles.
 */
function applyTheme(resolved: "light" | "dark") {
  const root = document.documentElement;
  if (resolved === "dark") {
    root.classList.add("dark");
  } else {
    root.classList.remove("dark");
  }
}

export function useTheme() {
  // Initialize theme from localStorage; default to "system" if nothing is
  // stored or if localStorage is unavailable (e.g. incognito restrictions).
  const [theme, setThemeState] = useState<Theme>(() => {
    if (typeof window === "undefined") return "system";
    try {
      return (localStorage.getItem(STORAGE_KEY) as Theme) || "system";
    } catch {
      return "system";
    }
  });

  // Resolve "system" to the actual OS preference; "light" and "dark" pass through.
  const resolved = theme === "system" ? getSystemTheme() : theme;

  // Whenever the resolved theme changes, apply it to the DOM immediately.
  useEffect(() => {
    applyTheme(resolved);
  }, [resolved]);

  // When the theme is set to "system", listen for OS-level color-scheme
  // changes (e.g. the user toggles macOS/Windows dark mode) and re-apply
  // the theme in real time. The listener is cleaned up if the user switches
  // away from "system" or on unmount.
  useEffect(() => {
    if (theme !== "system") return;
    const mql = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => applyTheme(getSystemTheme());
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, [theme]);

  // Persist the chosen theme to localStorage and update React state.
  const setTheme = useCallback((next: Theme) => {
    setThemeState(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch { /* storage unavailable */ }
  }, []);

  // Convenience toggle: flips between light and dark based on the current
  // resolved value (so toggling from "system" picks the opposite of the OS theme).
  const toggle = useCallback(() => {
    setTheme(resolved === "dark" ? "light" : "dark");
  }, [resolved, setTheme]);

  return { theme, resolved, setTheme, toggle, isDark: resolved === "dark" } as const;
}
