/**
 * URL-state helpers for the public exercises list (client + server safe).
 *
 * Same pattern as the foods list (performance audit 2026-09-05): the
 * grid renders server-side; filters live in the URL
 * (?cat=chest&eq=barbell&lv=beginner&q=…&page=2).
 */

export type ExercisesQuery = {
  cat: string;
  eq: string;
  lv: string;
  q: string;
  page: number;
};

export const EMPTY_EXERCISES_QUERY: ExercisesQuery = {
  cat: "all",
  eq: "all",
  lv: "all",
  q: "",
  page: 1,
};

const EX_CATEGORIES = new Set([
  "chest",
  "back",
  "shoulders",
  "legs",
  "biceps",
  "triceps",
  "core",
  "cardio",
]);

const EX_EQUIPMENT = new Set([
  "barbell",
  "dumbbell",
  "bodyweight",
  "cable",
  "machine",
  "kettlebell",
  "band",
  "none",
]);

const EX_LEVELS = new Set(["beginner", "intermediate", "advanced"]);

export function parseExercisesQuery(
  sp: Record<string, string | string[] | undefined>,
): ExercisesQuery {
  const one = (k: string): string => {
    const v = sp[k];
    if (Array.isArray(v)) return v[0] ?? "";
    return v ?? "";
  };
  const cat = one("cat");
  const eq = one("eq");
  const lv = one("lv");
  const pageRaw = parseInt(one("page"), 10);
  return {
    cat: EX_CATEGORIES.has(cat) ? cat : "all",
    eq: EX_EQUIPMENT.has(eq) ? eq : "all",
    lv: EX_LEVELS.has(lv) ? lv : "all",
    q: one("q").slice(0, 60),
    page: Number.isFinite(pageRaw) && pageRaw > 0 ? pageRaw : 1,
  };
}

export function buildExercisesHref(
  base: string,
  q: ExercisesQuery,
  over: Partial<ExercisesQuery> = {},
): string {
  const merged = { ...q, ...over };
  const params = new URLSearchParams();
  if (merged.cat !== "all") params.set("cat", merged.cat);
  if (merged.eq !== "all") params.set("eq", merged.eq);
  if (merged.lv !== "all") params.set("lv", merged.lv);
  if (merged.q) params.set("q", merged.q);
  if (merged.page > 1) params.set("page", String(merged.page));
  const qs = params.toString();
  return qs ? `${base}?${qs}` : base;
}
