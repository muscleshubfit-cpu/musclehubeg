import { describe, it, expect } from "vitest";
import { FOODS } from "@/lib/foods";
import { EXERCISES } from "@/lib/exercises";
import { FOODS_COUNT } from "@/lib/foods-shared";
import {
  EXERCISES_COUNT,
  EXERCISE_CATEGORY_COUNTS,
} from "@/lib/exercises-shared";

/**
 * BUNDLE LAW GUARD (audit 2026-09-05): the client-safe shared modules
 * carry count CONSTANTS (src/lib/foods-shared.ts, exercises-shared.ts)
 * so client components never import the giant arrays just to show a
 * number. These tests pin the constants to the real data — if the data
 * files grow, the tests fail until the constants are updated.
 */
describe("library count constants match the real arrays", () => {
  it("FOODS_COUNT equals FOODS.length", () => {
    expect(FOODS_COUNT).toBe(FOODS.length);
  });

  it("EXERCISES_COUNT equals EXERCISES.length", () => {
    expect(EXERCISES_COUNT).toBe(EXERCISES.length);
  });

  it("EXERCISE_CATEGORY_COUNTS match per-category totals", () => {
    for (const cat of Object.keys(EXERCISE_CATEGORY_COUNTS) as Array<
      keyof typeof EXERCISE_CATEGORY_COUNTS
    >) {
      const real = EXERCISES.filter((e) => e.category === cat).length;
      expect(EXERCISE_CATEGORY_COUNTS[cat]).toBe(real);
    }
    // The per-category counts must exhaust the whole array.
    const sum = Object.values(EXERCISE_CATEGORY_COUNTS).reduce(
      (a, b) => a + b,
      0,
    );
    expect(sum).toBe(EXERCISES.length);
  });
});
