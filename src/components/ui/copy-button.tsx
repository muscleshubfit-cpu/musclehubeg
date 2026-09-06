"use client";

/**
 * Reusable, accessible CopyButton.
 *
 * Features:
 *   - 3 states: default / success / error
 *   - Uses the Clipboard API (navigator.clipboard.writeText)
 *   - Falls back to a hidden <textarea> + execCommand("copy") for older
 *     browsers and for HTTP origins where navigator.clipboard is undefined
 *     (e.g. local dev without HTTPS). This is the standard robust pattern.
 *   - Accessible feedback: aria-live region announces success/error.
 *   - Visible focus ring (focus-visible).
 *   - Large enough tap target on mobile (min 44px).
 *   - Resets to default after a short timeout (2s by default).
 *
 * Usage:
 *   <CopyButton value="https://..." label="Copy link" successLabel="Copied ✓" />
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { Check, Copy, AlertCircle } from "lucide-react";

type CopyState = "default" | "success" | "error";

export type CopyButtonProps = {
  /** The text to write to the clipboard. */
  value: string;
  /** Default button label (default state). */
  label?: string;
  /** Label shown after a successful copy. */
  successLabel?: string;
  /** Label shown if the copy fails. */
  errorLabel?: string;
  /** Optional analytics event name to fire on copy. */
  analyticsEvent?: string;
  /** Optional analytics payload (must be JSON-serialisable, no PII). */
  analyticsPayload?: Record<string, unknown>;
  /** Visual variant. */
  variant?: "primary" | "secondary" | "ghost";
  /** Whether to show the leading icon. Default true. */
  showIcon?: boolean;
  /** Reset timeout in ms. Default 2000. Set to 0 to disable reset. */
  resetTimeoutMs?: number;
  /** Disable the button (e.g. when value is empty). */
  disabled?: boolean;
  /** Optional className override. */
  className?: string;
  /** Accessible label for screen readers (defaults to `label`). */
  ariaLabel?: string;
};

const DEFAULT_VARIANT_STYLES: Record<NonNullable<CopyButtonProps["variant"]>, string> = {
  // Phase 132 identity: chrome primary / inverted monochrome secondary /
  // neutral ghost (the old Apple-blue variants are retired)
  primary:
    "btn-chrome",
  secondary:
    "bg-[var(--text)] text-[var(--bg)] hover:opacity-90 disabled:opacity-40",
  ghost:
    "bg-transparent text-[var(--muted-2)] hover:bg-[var(--tint)] disabled:opacity-40",
};

const STATE_OVERRIDES: Record<CopyState, string> = {
  default: "",
  // Tailwind v4 important suffix syntax (the v3 "!bg-" prefix no longer
  // compiles — the overrides were silently dead); semantic status colors
  success: "bg-[var(--success)]! text-white! hover:opacity-90!",
  error: "bg-[var(--destructive)]! text-white! hover:opacity-90!",
};

export function CopyButton({
  value,
  label = "Copy",
  successLabel = "Copied ✓",
  errorLabel = "Unable to copy",
  analyticsEvent,
  analyticsPayload,
  variant = "secondary",
  showIcon = true,
  resetTimeoutMs = 2000,
  disabled = false,
  className = "",
  ariaLabel,
}: CopyButtonProps) {
  const [state, setState] = useState<CopyState>("default");
  const resetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  // Cleanup any pending reset timer on unmount.
  useEffect(() => {
    return () => {
      if (resetTimer.current) clearTimeout(resetTimer.current);
    };
  }, []);

  const fireAnalytics = useCallback(() => {
    if (!analyticsEvent) return;
    try {
      // Lightweight, dependency-free event tracking. Safe in SSR + on mobile.
      // Hooks into window.dataLayer if a GTM-style provider is later added,
      // otherwise logs to console in dev. NEVER includes PII.
      const w = window as unknown as {
        dataLayer?: unknown[];
        __mheAnalytics?: (event: string, payload?: Record<string, unknown>) => void;
      };
      const payload = analyticsPayload || {};
      if (typeof w.__mheAnalytics === "function") {
        w.__mheAnalytics(analyticsEvent, payload);
      } else if (Array.isArray(w.dataLayer)) {
        w.dataLayer.push({ event: analyticsEvent, ...payload });
      } else if (process.env.NODE_ENV !== "production") {
        console.debug("[analytics]", analyticsEvent, payload);
      }
    } catch {
      /* analytics must NEVER break UX */
    }
  }, [analyticsEvent, analyticsPayload]);

  const writeClipboardModern = useCallback(
    async (text: string): Promise<boolean> => {
      try {
        if (
          typeof navigator !== "undefined" &&
          navigator.clipboard &&
          typeof navigator.clipboard.writeText === "function" &&
          typeof window !== "undefined" &&
          window.isSecureContext !== false // requires HTTPS or localhost
        ) {
          await navigator.clipboard.writeText(text);
          return true;
        }
      } catch {
        // Fall through to legacy path.
      }
      return false;
    },
    [],
  );

  const writeClipboardLegacy = useCallback((text: string): boolean => {
    if (typeof document === "undefined") return false;
    try {
      const ta = document.createElement("textarea");
      ta.value = text;
      // Prevent scroll jump + avoid visual flash.
      ta.setAttribute("readonly", "");
      ta.style.position = "fixed";
      ta.style.top = "-1000px";
      ta.style.left = "0";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand("copy");
      document.body.removeChild(ta);
      return ok;
    } catch {
      return false;
    }
  }, []);

  const handleCopy = useCallback(async () => {
    if (disabled || !value) return;

    // Reset any pending reset timer so the success state stays visible
    // if the user spams the button.
    if (resetTimer.current) {
      clearTimeout(resetTimer.current);
      resetTimer.current = null;
    }

    let ok = await writeClipboardModern(value);
    if (!ok) {
      ok = writeClipboardLegacy(value);
    }

    if (ok) {
      setState("success");
      fireAnalytics();
    } else {
      setState("error");
    }

    if (resetTimeoutMs > 0) {
      resetTimer.current = setTimeout(() => setState("default"), resetTimeoutMs);
    }
  }, [
    disabled,
    value,
    resetTimeoutMs,
    writeClipboardModern,
    writeClipboardLegacy,
    fireAnalytics,
  ]);

  const displayLabel =
    state === "success" ? successLabel : state === "error" ? errorLabel : label;

  const Icon = state === "success" ? Check : state === "error" ? AlertCircle : Copy;

  return (
    <>
      <button
        type="button"
        onClick={handleCopy}
        disabled={disabled || !value}
        aria-label={ariaLabel || label}
        aria-live="polite"
        className={[
          "inline-flex items-center justify-center gap-2 rounded-full px-5 py-2.5",
          "text-sm font-medium transition-all duration-150",
          "min-h-[44px] select-none",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--chrome-edge)] focus-visible:ring-offset-2",
          DEFAULT_VARIANT_STYLES[variant],
          STATE_OVERRIDES[state],
          className,
        ].join(" ")}
      >
        {showIcon && <Icon className="h-4 w-4" aria-hidden="true" />}
        <span>{displayLabel}</span>
      </button>
      {/* Hidden textarea kept around for legacy clipboard fallback (in case the
          runtime DOM version is needed for some old browsers). Currently unused
          by the implementation but available for accessibility tools. */}
      <textarea
        ref={textareaRef}
        aria-hidden="true"
        tabIndex={-1}
        defaultValue={value}
        className="sr-only"
        readOnly
      />
    </>
  );
}
