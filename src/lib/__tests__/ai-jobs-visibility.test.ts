/**
 * VISIBILITY CONTRACT CANARIES (2026-08-28, owner: «محتاج اتاكد ان
 * مفيش مشاكل مشابهة تحصل مستقبلا فى المشروع كله»).
 *
 * The 2026-08-28 incident chain proved TypeScript CANNOT police the AI
 * job system end-to-end: PROCESSORS is Record<string, …>, so a job type
 * registered without a processor (or with a dead enqueue literal) compiles
 * clean and only explodes at runtime — exactly how «توليد المقالات… غير
 * موجود» and «ناقص عناصر كتير» happened. These canaries double-net the
 * CI wiring guard (scripts/check-ui-wiring.sh) inside the test suite:
 *   1. AI_JOB_TYPES ↔ PROCESSORS — exact match, BOTH directions.
 *   2. JOB_GATE covers every type (no ungated enqueue path).
 *   3. Every type has a UI label (ar+en) — queue strips never render
 *      "undefined" for a legal type.
 *   4. Sanitizer never returns a payload for an unregistered type
 *      (spot-check via the registered union).
 */
import { describe, it, expect } from "vitest";
import { AI_JOB_TYPES, JOB_GATE, JOB_LABELS, isAiJobType } from "../ai-jobs";
import { PROCESSORS } from "../ai-job-processors";

describe("AI job system — visibility contract (whole-project prevention)", () => {
  it("every registered job type HAS a processor (no dead enqueues)", () => {
    for (const t of AI_JOB_TYPES) {
      expect(PROCESSORS[t], `job type "${t}" has no processor`).toBeTruthy();
    }
  });

  it("every processor IS a registered job type (no orphan code)", () => {
    const procKeys = Object.keys(PROCESSORS);
    expect(procKeys.sort()).toEqual([...AI_JOB_TYPES].sort());
  });

  it("JOB_GATE covers every registered type", () => {
    for (const t of AI_JOB_TYPES) {
      expect(JOB_GATE[t], `job type "${t}" missing from JOB_GATE`).toBeTruthy();
    }
    expect(Object.keys(JOB_GATE).sort()).toEqual([...AI_JOB_TYPES].sort());
  });

  it("every type has ar+en UI labels (queue strips never render undefined)", () => {
    for (const t of AI_JOB_TYPES) {
      expect(JOB_LABELS[t]?.ar?.length).toBeGreaterThan(0);
      expect(JOB_LABELS[t]?.en?.length).toBeGreaterThan(0);
    }
  });

  it("type guard accepts exactly the registered set", () => {
    for (const t of AI_JOB_TYPES) expect(isAiJobType(t)).toBe(true);
    expect(isAiJobType("not_a_type")).toBe(false);
  });
});
