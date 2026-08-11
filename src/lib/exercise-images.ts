/**
 * Exercise Image Library — provides reliable, exercise-specific images.
 *
 * Wikimedia Commons URLs are unreliable (often return 400, require specific
 * User-Agent headers, or have wrong hash paths). External image CDNs add
 * latency and can break. Instead, we use a curated mapping of exercise
 * name → category, and render a branded SVG icon for each category.
 *
 * The SVGs are inline data URLs — no network request needed, they always
 * render, and they match the MuscleHub dark premium theme (blue/gold on
 * dark background with a dumbbell/body icon).
 *
 * Usage:
 *   import { getExerciseImage } from "@/lib/exercise-images";
 *   const img = getExerciseImage("بنش بريس"); // → data:image/svg+xml,...
 *
 * The lookup is fuzzy: it matches Arabic or English exercise names against
 * a keyword map (chest → bench icon, back → row icon, legs → squat icon,
 * etc.). Falls back to a generic dumbbell icon if no match.
 */

// SVG icon definitions — each is a self-contained dark-themed icon
// with the MuscleHub brand colors (#00d4ff blue + #ffd700 gold on #0a0a0f).
const ICONS: Record<string, string> = {
  chest: `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 120'><rect width='200' height='120' fill='#0a0a0f'/><rect x='0' y='0' width='200' height='3' fill='#00d4ff'/><text x='100' y='70' font-size='52' text-anchor='middle' fill='#00d4ff'>🏋️</text><text x='100' y='105' font-size='12' font-weight='bold' text-anchor='middle' fill='#ffd700' font-family='sans-serif'>Chest</text></svg>`,

  back: `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 120'><rect width='200' height='120' fill='#0a0a0f'/><rect x='0' y='0' width='200' height='3' fill='#00d4ff'/><text x='100' y='70' font-size='52' text-anchor='middle' fill='#00d4ff'>🚣</text><text x='100' y='105' font-size='12' font-weight='bold' text-anchor='middle' fill='#ffd700' font-family='sans-serif'>Back</text></svg>`,

  shoulders: `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 120'><rect width='200' height='120' fill='#0a0a0f'/><rect x='0' y='0' width='200' height='3' fill='#00d4ff'/><text x='100' y='70' font-size='52' text-anchor='middle' fill='#00d4ff'>💪</text><text x='100' y='105' font-size='12' font-weight='bold' text-anchor='middle' fill='#ffd700' font-family='sans-serif'>Shoulders</text></svg>`,

  legs: `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 120'><rect width='200' height='120' fill='#0a0a0f'/><rect x='0' y='0' width='200' height='3' fill='#00d4ff'/><text x='100' y='70' font-size='52' text-anchor='middle' fill='#00d4ff'>🦵</text><text x='100' y='105' font-size='12' font-weight='bold' text-anchor='middle' fill='#ffd700' font-family='sans-serif'>Legs</text></svg>`,

  arms: `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 120'><rect width='200' height='120' fill='#0a0a0f'/><rect x='0' y='0' width='200' height='3' fill='#00d4ff'/><text x='100' y='70' font-size='52' text-anchor='middle' fill='#00d4ff'>💪</text><text x='100' y='105' font-size='12' font-weight='bold' text-anchor='middle' fill='#ffd700' font-family='sans-serif'>Arms</text></svg>`,

  biceps: `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 120'><rect width='200' height='120' fill='#0a0a0f'/><rect x='0' y='0' width='200' height='3' fill='#00d4ff'/><text x='100' y='70' font-size='52' text-anchor='middle' fill='#00d4ff'>💪</text><text x='100' y='105' font-size='12' font-weight='bold' text-anchor='middle' fill='#ffd700' font-family='sans-serif'>Biceps</text></svg>`,

  triceps: `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 120'><rect width='200' height='120' fill='#0a0a0f'/><rect x='0' y='0' width='200' height='3' fill='#00d4ff'/><text x='100' y='70' font-size='52' text-anchor='middle' fill='#00d4ff'>💪</text><text x='100' y='105' font-size='12' font-weight='bold' text-anchor='middle' fill='#ffd700' font-family='sans-serif'>Triceps</text></svg>`,

  core: `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 120'><rect width='200' height='120' fill='#0a0a0f'/><rect x='0' y='0' width='200' height='3' fill='#00d4ff'/><text x='100' y='70' font-size='52' text-anchor='middle' fill='#00d4ff'>🎯</text><text x='100' y='105' font-size='12' font-weight='bold' text-anchor='middle' fill='#ffd700' font-family='sans-serif'>Core</text></svg>`,

  cardio: `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 120'><rect width='200' height='120' fill='#0a0a0f'/><rect x='0' y='0' width='200' height='3' fill='#00d4ff'/><text x='100' y='70' font-size='52' text-anchor='middle' fill='#00d4ff'>🏃</text><text x='100' y='105' font-size='12' font-weight='bold' text-anchor='middle' fill='#ffd700' font-family='sans-serif'>Cardio</text></svg>`,

  fullbody: `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 120'><rect width='200' height='120' fill='#0a0a0f'/><rect x='0' y='0' width='200' height='3' fill='#00d4ff'/><text x='100' y='70' font-size='52' text-anchor='middle' fill='#00d4ff'>🤸</text><text x='100' y='105' font-size='12' font-weight='bold' text-anchor='middle' fill='#ffd700' font-family='sans-serif'>Full Body</text></svg>`,

  rest: `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 120'><rect width='200' height='120' fill='#0a0a0f'/><rect x='0' y='0' width='200' height='3' fill='#ffd700'/><text x='100' y='70' font-size='52' text-anchor='middle'>🛌</text><text x='100' y='105' font-size='12' font-weight='bold' text-anchor='middle' fill='#ffd700' font-family='sans-serif'>Rest Day</text></svg>`,

  default: `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 120'><rect width='200' height='120' fill='#0a0a0f'/><rect x='0' y='0' width='200' height='3' fill='#00d4ff'/><text x='100' y='70' font-size='52' text-anchor='middle' fill='#00d4ff'>🏋️</text><text x='100' y='105' font-size='12' font-weight='bold' text-anchor='middle' fill='#ffd700' font-family='sans-serif'>Exercise</text></svg>`,
};

// Convert each SVG to a data URL (URL-encoded for use in <img src>)
function svgToDataUrl(svg: string): string {
  // encodeURIComponent + minimal encoding for # and other special chars
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

// Pre-compute the data URLs
const ICON_URLS: Record<string, string> = Object.fromEntries(
  Object.entries(ICONS).map(([k, v]) => [k, svgToDataUrl(v)]),
);

// Keyword map — maps exercise name keywords (Arabic + English) to categories.
// The first matching keyword wins, so put more specific keywords first.
const KEYWORD_MAP: Array<{ keywords: string[]; category: string }> = [
  // Chest
  { keywords: ["bench", "بنش", "ضغط صدر", "chest", "صدر", "pushup", "ضغط أرضي", "push up", "push-up", "ديبس", "dips", "fly", "رفرفة صدر"], category: "chest" },
  // Back
  { keywords: ["row", "تجديف", "pull", "سحب", "pullup", "عقلة", "pulldown", "lat", "ظهر", "back", "deadlift", "ديدليفت", "face pull", "فيس بول"], category: "back" },
  // Shoulders
  { keywords: ["press", "ضغط كتف", "shoulder", "أكتاف", "اكتاف", "كتف", "lateral", "جانبية", "military", "ohp", "رأس خلفي", "رأس امامي"], category: "shoulders" },
  // Legs — squat family
  { keywords: ["squat", "سكوات", "leg press", "ليج بريس", "leg", "أرجل", "ارجل", "رجل", "calf", "كاف", "ثبات", "quad", "كواد", "front squat", "فرنت"], category: "legs" },
  // Legs — hinge family
  { keywords: ["deadlift", "ديدليفت", "rdl", "روماني", "hamstring", "هامسترنج", "هامست", "hip thrust", "هيب ثرست", "glute", "أرداف", "ارداف", "جلوة"], category: "legs" },
  // Legs — lunge/single leg
  { keywords: ["lunge", "لانجز", "لانج", "split", "سبليت", "step up", "ستيب"], category: "legs" },
  // Biceps
  { keywords: ["bicep", "بايسبس", "curl", "كيرل", "hammer", "هامر", "باي"], category: "biceps" },
  // Triceps
  { keywords: ["tricep", "ترايسبس", "pushdown", "بوش داون", "extension", "تمديد", "كيك باك", "kickback"], category: "triceps" },
  // Core / Abs
  { keywords: ["plank", "بلانك", "crunch", "كرنش", "abs", "بطن", "abic", "situp", "سيتب", "leg raise", "رفع الأرجل", "core", "كور"], category: "core" },
  // Cardio
  { keywords: ["run", "جري", "cardio", "كارديو", "jump", "قفز", "burpee", "بربي", "bike", "دراجة", "row", "تجديف كارديو"], category: "cardio" },
  // Full body
  { keywords: ["full body", "كامل الجسم", "complex", "كومبلكس", "olympic", "أولمبي", "clean", "كلين", "snatch", "سناتش", "thruster"], category: "fullbody" },
];

/**
 * Look up the best image for an exercise by name (Arabic or English).
 * Returns a data URL (inline SVG) — always works, no network needed.
 */
export function getExerciseImage(exerciseName: string): string {
  if (!exerciseName) return ICON_URLS.default;
  const q = exerciseName.toLowerCase().trim();

  for (const { keywords, category } of KEYWORD_MAP) {
    for (const kw of keywords) {
      if (q.includes(kw.toLowerCase())) {
        return ICON_URLS[category] || ICON_URLS.default;
      }
    }
  }

  return ICON_URLS.default;
}

/**
 * Get the image URL for a rest day.
 */
export function getRestDayImage(): string {
  return ICON_URLS.rest;
}

/**
 * Check if an image URL is a broken Wikimedia link (so we can replace it).
 * Used during plan rendering to swap old URLs with the new SVG system.
 */
export function isBrokenImage(url: string): boolean {
  if (!url) return false;
  return (
    url.includes("upload.wikimedia.org") ||
    url.includes("wikipedia/commons") ||
    url.includes("images.unsplash.com/photo-1597452610875")
  );
}

/**
 * Given an exercise's existing image URL + name, return the best image.
 * If the existing URL is valid (not broken), keep it. Otherwise, look up
 * the name and return the SVG data URL.
 */
export function resolveExerciseImage(existingUrl: string | undefined, exerciseName: string): string {
  if (existingUrl && !isBrokenImage(existingUrl)) {
    return existingUrl;
  }
  return getExerciseImage(exerciseName);
}

/**
 * Get all available categories (for the editor dropdown).
 */
export const EXERCISE_CATEGORIES = [
  { id: "chest", label: "صدر", label_en: "Chest", icon: "🏋️" },
  { id: "back", label: "ظهر", label_en: "Back", icon: "🚣" },
  { id: "shoulders", label: "أكتاف", label_en: "Shoulders", icon: "💪" },
  { id: "legs", label: "أرجل", label_en: "Legs", icon: "🦵" },
  { id: "biceps", label: "بايسبس", label_en: "Biceps", icon: "💪" },
  { id: "triceps", label: "ترايسبس", label_en: "Triceps", icon: "💪" },
  { id: "core", label: "بطن/كور", label_en: "Core", icon: "🎯" },
  { id: "cardio", label: "كارديو", label_en: "Cardio", icon: "🏃" },
  { id: "fullbody", label: "كامل الجسم", label_en: "Full Body", icon: "🤸" },
];
