"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";

/**
 * Lazy EVO floating widget (H5, performance audit 2026-09-05).
 *
 * The widget (544 lines + voice input + icons) used to ship in the
 * critical bundle of EVERY page via the root layout. It now loads
 * after the page is interactive — requestIdleCallback with a hard
 * timeout fallback — so first paint and hydration stop paying for a
 * chat UI the visitor hasn't opened yet.
 *
 * The EvoChatProvider context stays mounted in the layout (light) so
 * any eager useEvoChat consumer keeps working; only the widget UI is
 * deferred.
 */

const EvoFloatingWidget = dynamic(
  () =>
    import("@/components/EvoFloatingWidget").then((m) => ({
      default: m.EvoFloatingWidget,
    })),
  { ssr: false },
);

export function EvoWidgetLazy() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const load = () => setReady(true);
    if (typeof window.requestIdleCallback === "function") {
      const id = window.requestIdleCallback(load, { timeout: 3000 });
      return () => window.cancelIdleCallback(id);
    }
    const t = setTimeout(load, 1500);
    return () => clearTimeout(t);
  }, []);

  if (!ready) return null;
  return <EvoFloatingWidget />;
}
