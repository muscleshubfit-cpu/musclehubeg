"use client";

import { useCallback, useEffect, useState } from "react";

/**
 * useThemeMode — Phase 126 «Marble & Chrome».
 *
 * Theme model (mission: auto-switch with system + manual toggle):
 *   mode: "system" (default — follows the OS live) | "light" | "dark"
 *   resolved: what is actually stamped on <html data-theme> — the CSS vars
 *   (globals.css) do ALL the visual work; this hook only manages the
 *   attribute + persistence (localStorage "alkemos-theme").
 *
 * The pre-paint script in layout.tsx sets data-theme before React hydrates,
 * so we never read a stale value into the first render — the hook re-syncs
 * from the DOM after mount (safe with SSR markup).
 */
export type ThemeMode = "system" | "light" | "dark";
export type ResolvedTheme = "light" | "dark";

const STORAGE_KEY = "alkemos-theme";

function systemPrefersDark(): boolean {
  return typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches;
}

function resolve(mode: ThemeMode): ResolvedTheme {
  if (mode === "light" || mode === "dark") return mode;
  return systemPrefersDark() ? "dark" : "light";
}

function apply(theme: ResolvedTheme) {
  document.documentElement.setAttribute("data-theme", theme);
}

export function useThemeMode() {
  const [mode, setMode] = useState<ThemeMode>("system");
  const [resolved, setResolved] = useState<ResolvedTheme>("light");
  const [mounted, setMounted] = useState(false);

  // Sync after mount — the inline script already applied the right theme
  // pre-paint; we just adopt its decision so the UI reflects reality.
  useEffect(() => {
    const stored = (localStorage.getItem(STORAGE_KEY) as ThemeMode | null) ?? "system";
    const current = (document.documentElement.getAttribute("data-theme") as ResolvedTheme | null) ?? "light";
    setMode(stored);
    setResolved(current);
    setMounted(true);
  }, []);

  // Live system tracking while in "system" mode (mission: auto-switch).
  useEffect(() => {
    if (mode !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => {
      const next = mq.matches ? "dark" : "light";
      setResolved(next);
      apply(next);
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [mode]);

  const setTheme = useCallback((next: ThemeMode) => {
    setMode(next);
    if (next === "system") {
      localStorage.removeItem(STORAGE_KEY);
    } else {
      localStorage.setItem(STORAGE_KEY, next);
    }
    const r = resolve(next);
    setResolved(r);
    apply(r);
  }, []);

  return { mode, resolved, setTheme, mounted };
}
