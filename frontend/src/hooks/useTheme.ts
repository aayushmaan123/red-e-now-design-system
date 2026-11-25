/**
 * useTheme — shared theme state for Red-E Now.
 *
 * Three themes: "dark" (default), "light", and "red".
 * One module-level store backs every useTheme() call, so a switcher in the
 * header and one in a settings card always agree.
 *
 * DOM contract (styles.css):
 *   dark  → <html class="dark">
 *   light → <html>
 *   red   → <html class="dark theme-red">   (red is a dark-family theme)
 * The same logic runs as an inline script in __root.tsx before first paint.
 */

import { useCallback, useSyncExternalStore } from "react";

export type Theme = "dark" | "light" | "red";
export const THEMES: readonly Theme[] = ["dark", "light", "red"] as const;

const STORAGE_KEY = "rede-now-theme";
const listeners = new Set<() => void>();

function readStored(): Theme {
  if (typeof window === "undefined") return "dark";
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === "light" || raw === "dark" || raw === "red") return raw;
    // Legacy "system" value from the old two-theme toggle.
    if (raw === "system") {
      return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    }
  } catch { /* storage unavailable */ }
  return "dark";
}

let current: Theme = readStored();

function applyTheme(theme: Theme) {
  const root = document.documentElement;
  root.classList.toggle("dark", theme !== "light");
  root.classList.toggle("theme-red", theme === "red");
}

if (typeof window !== "undefined") applyTheme(current);

function setThemeGlobal(next: Theme) {
  current = next;
  applyTheme(next);
  try { localStorage.setItem(STORAGE_KEY, next); } catch { /* storage unavailable */ }
  listeners.forEach((fn) => fn());
}

function subscribe(fn: () => void) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/** Inline pre-paint script for <head>; keep in sync with applyTheme(). */
export const themeInitScript = `(function(){try{var t=localStorage.getItem('${STORAGE_KEY}');if(t==='system')t=matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';var c=document.documentElement.classList;c.toggle('dark',t!=='light');c.toggle('theme-red',t==='red');}catch(e){}})();`;

export function useTheme() {
  const theme = useSyncExternalStore(subscribe, () => current, () => "dark" as Theme);
  const setTheme = useCallback((next: Theme) => setThemeGlobal(next), []);
  // Cycles dark → light → red. Kept for older call sites.
  const toggle = useCallback(() => {
    setThemeGlobal(THEMES[(THEMES.indexOf(current) + 1) % THEMES.length] ?? "dark");
  }, []);

  return { theme, resolved: theme, setTheme, toggle, isDark: theme !== "light" } as const;
}
