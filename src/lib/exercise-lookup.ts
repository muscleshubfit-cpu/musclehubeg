"use client";

/**
 * Lazy exercise-library lookup for authenticated client views.
 *
 * BUNDLE LAW (performance audit 2026-09-05): PlansView and
 * CoachClientView used to import the 1.6MB exercises.ts array at
 * module scope — every plan/coach page shipped it in the critical
 * bundle. This hook lazy-fetches /api/exercise-mini (mini records,
 * ~30KB gzipped) ONCE per session and caches it in module scope +
 * sessionStorage; renderers keep their synchronous
 * `lookup.find(...)` logic and simply see an empty list until the
 * fetch lands (rows render with fallback SVGs, then images pop in).
 */

import { useEffect, useState } from "react";
import type { ExerciseMini } from "@/lib/exercises-shared";

const STORAGE_KEY = "mhe:exercise-mini:v1";

let cache: ExerciseMini[] | null = null;
let inflight: Promise<ExerciseMini[]> | null = null;

function loadFromSession(): ExerciseMini[] | null {
  if (cache) return cache;
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as { exercises?: ExerciseMini[] };
      if (Array.isArray(parsed.exercises)) {
        cache = parsed.exercises;
        return cache;
      }
    }
  } catch {
    // sessionStorage unavailable (private mode quirks) — just refetch.
  }
  return null;
}

function fetchMinis(): Promise<ExerciseMini[]> {
  inflight ??= fetch("/api/exercise-mini")
    .then((res) => (res.ok ? res.json() : { exercises: [] }))
    .then((data: { exercises?: ExerciseMini[] }) => {
      const list = Array.isArray(data.exercises) ? data.exercises : [];
      cache = list;
      try {
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ exercises: list }));
      } catch {
        // Non-fatal: memory cache still works for this session.
      }
      return list;
    })
    .catch(() => {
      inflight = null; // allow retry on next mount
      return [];
    });
  return inflight;
}

/**
 * Returns the mini exercise library (empty array until loaded).
 * Triggers the one-per-session fetch on first mount.
 */
export function useExerciseLookup(): ExerciseMini[] {
  const [lib, setLib] = useState<ExerciseMini[]>(() => loadFromSession() ?? []);

  useEffect(() => {
    if (cache) return;
    let alive = true;
    fetchMinis().then((list) => {
      if (alive) setLib(list);
    });
    return () => {
      alive = false;
    };
  }, []);

  return lib;
}
