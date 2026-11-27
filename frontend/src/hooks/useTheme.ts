/**
 * useTheme — Red-E Now is dark-only for now.
 *
 * Light and red themes are parked. The hook still exists so older call sites
 * compile, but every path forces <html class="dark"> and never theme-red.
 */

import { useCallback, useSyncExternalStore } from "react";

export type Theme = "dark";
export const THEMES: readonly Theme[] = ["dark"] as const;

const STORAGE_KEY = "rede-now-theme";
const listeners = new Set<() => void>();

function applyDark() {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.classList.add("dark");
  root.classList.remove("theme-red");
}

let current: Theme = "dark";

if (typeof window !== "undefined") {
  applyDark();
  try {
    localStorage.setItem(STORAGE_KEY, "dark");
  } catch {
    /* storage unavailable */
  }
}

function setThemeGlobal(_next: Theme) {
  current = "dark";
  applyDark();
  try {
    localStorage.setItem(STORAGE_KEY, "dark");
  } catch {
    /* storage unavailable */
  }
  listeners.forEach((fn) => fn());
}

function subscribe(fn: () => void) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/** Inline pre-paint script for <head> — always dark. */
export const themeInitScript = `(function(){try{var c=document.documentElement.classList;c.add('dark');c.remove('theme-red');localStorage.setItem('${STORAGE_KEY}','dark');}catch(e){}})();`;

export function useTheme() {
  const theme = useSyncExternalStore(subscribe, () => current, () => "dark" as Theme);
  const setTheme = useCallback((next: Theme) => setThemeGlobal(next), []);
  const toggle = useCallback(() => setThemeGlobal("dark"), []);

  return { theme, resolved: theme, setTheme, toggle, isDark: true } as const;
}
