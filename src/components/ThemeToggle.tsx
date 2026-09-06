"use client";

import { Moon, Sun, Monitor } from "lucide-react";
import { useThemeMode } from "@/hooks/use-theme-mode";
import { useI18n } from "@/lib/i18n";

/**
 * ThemeToggle — Phase 126 «Marble & Chrome».
 * Cycles light → dark → system (auto). The icon shows the NEXT mode's
 * glyph; the aria-label names it. Renders a neutral placeholder until
 * mounted (SSR has no theme knowledge — the inline script owns first paint).
 */
export function ThemeToggle() {
  const { lang } = useI18n();
  const { mode, setTheme, mounted } = useThemeMode();
  const isAr = lang === "ar";

  const order = ["light", "dark", "system"] as const;
  const next = order[(order.indexOf(mode === "system" ? "system" : (mode as "light" | "dark")) + 1) % 3];
  const label = mounted
    ? next === "light"
      ? isAr
        ? "الوضع الفاتح"
        : "Light mode"
      : next === "dark"
        ? isAr
          ? "الوضع الداكن"
          : "Dark mode"
        : isAr
          ? "الوضع التلقائي (نظام الجهاز)"
          : "Auto (device theme)"
    : isAr
      ? "تبديل المظهر"
      : "Toggle theme";

  const Icon = mounted ? (next === "light" ? Sun : next === "dark" ? Moon : Monitor) : Monitor;

  return (
    <button
      onClick={() => mounted && setTheme(next)}
      className="flex h-9 w-9 items-center justify-center rounded-lg text-[var(--text)] transition-colors hover:bg-[var(--tint)]"
      aria-label={label}
      title={label}
      type="button"
    >
      <Icon className="h-[18px] w-[18px]" aria-hidden="true" />
    </button>
  );
}
