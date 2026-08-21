/**
 * Exercise Image Library — uses images from free-exercise-db on GitHub.
 * https://github.com/yuhonas/free-exercise-db
 *
 * Each exercise has 2 images (0.jpg = start, 1.jpg = end).
 * Images are served from GitHub raw URLs.
 *
 * Usage:
 * import { getExerciseImageUrl } from "@/lib/exercises";
 * <img src={getExerciseImageUrl("Bench_Press/0.jpg")} />
 */

const IMAGE_BASE = "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises";

/**
 * Get the full GitHub URL for an exercise image path.
 * imagePath format: "Folder_Name/0.jpg" or "Folder_Name/1.jpg"
 */
export function getExerciseImageUrl(imagePath: string): string {
  if (!imagePath) return "";
  if (imagePath.startsWith("http")) return imagePath;
  return `${IMAGE_BASE}/${imagePath}`;
}

/**
 * Get multiple image URLs for an exercise (comma-separated imageKey).
 * Returns array of URLs.
 */
export function getExerciseImages(imageKey: string): string[] {
  if (!imageKey) return [];
  return imageKey.split(",").map((path) => getExerciseImageUrl(path.trim()));
}

// Keep old function names for backward compatibility with existing code
export function getWgerImageUrl(exerciseName: string): string | null {
  // This function is no longer used — images come from the exercise's imageKey field
  return null;
}

export function getFallbackSVG(category: string): string {
  // Simple SVG fallback for when no image is available
  const svgs: Record<string, string> = {
    chest: `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 140'><rect width='200' height='140' fill='#f5f8fc'/><rect x='0' y='0' width='200' height='2' fill='#0071e3'/><text x='100' y='70' font-size='14' font-weight='600' text-anchor='middle' fill='#475569' font-family='sans-serif'>💪</text></svg>`,
    back: `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 140'><rect width='200' height='140' fill='#f5f8fc'/><rect x='0' y='0' width='200' height='2' fill='#0071e3'/><text x='100' y='70' font-size='14' font-weight='600' text-anchor='middle' fill='#475569' font-family='sans-serif'>🔙</text></svg>`,
    shoulders: `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 140'><rect width='200' height='140' fill='#f5f8fc'/><rect x='0' y='0' width='200' height='2' fill='#0071e3'/><text x='100' y='70' font-size='14' font-weight='600' text-anchor='middle' fill='#475569' font-family='sans-serif'>🏆</text></svg>`,
    legs: `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 140'><rect width='200' height='140' fill='#f5f8fc'/><rect x='0' y='0' width='200' height='2' fill='#0071e3'/><text x='100' y='70' font-size='14' font-weight='600' text-anchor='middle' fill='#475569' font-family='sans-serif'>🦵</text></svg>`,
    biceps: `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 140'><rect width='200' height='140' fill='#f5f8fc'/><rect x='0' y='0' width='200' height='2' fill='#0071e3'/><text x='100' y='70' font-size='14' font-weight='600' text-anchor='middle' fill='#475569' font-family='sans-serif'>💪</text></svg>`,
    triceps: `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 140'><rect width='200' height='140' fill='#f5f8fc'/><rect x='0' y='0' width='200' height='2' fill='#0071e3'/><text x='100' y='70' font-size='14' font-weight='600' text-anchor='middle' fill='#475569' font-family='sans-serif'>💪</text></svg>`,
    core: `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 140'><rect width='200' height='140' fill='#f5f8fc'/><rect x='0' y='0' width='200' height='2' fill='#0071e3'/><text x='100' y='70' font-size='14' font-weight='600' text-anchor='middle' fill='#475569' font-family='sans-serif'>🎯</text></svg>`,
    cardio: `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 140'><rect width='200' height='140' fill='#f5f8fc'/><rect x='0' y='0' width='200' height='2' fill='#0071e3'/><text x='100' y='70' font-size='14' font-weight='600' text-anchor='middle' fill='#475569' font-family='sans-serif'>❤️</text></svg>`,
    default: `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 140'><rect width='200' height='140' fill='#f5f8fc'/><rect x='0' y='0' width='200' height='2' fill='#0071e3'/><text x='100' y='70' font-size='14' font-weight='600' text-anchor='middle' fill='#475569' font-family='sans-serif'>🏋️</text></svg>`,
  };
  return svgs[category] || svgs.default;
}

export function getRestDayImage(): string {
  return getFallbackSVG("default");
}

export function isBrokenImage(url: string): boolean {
  if (!url) return false;
  return url.includes("upload.wikimedia.org") || url.includes("wger.de");
}

export function resolveExerciseImage(existingUrl: string | undefined, exerciseName: string): string {
  if (existingUrl && !isBrokenImage(existingUrl)) return existingUrl;
  return getFallbackSVG("default");
}

export function getExerciseImage(exerciseName: string): string {
  return getFallbackSVG("default");
}

export const EXERCISE_CATEGORIES = [
  { id: "chest", label: "صدر", label_en: "Chest" },
  { id: "back", label: "ظهر", label_en: "Back" },
  { id: "shoulders", label: "أكتاف", label_en: "Shoulders" },
  { id: "legs", label: "أرجل", label_en: "Legs" },
  { id: "biceps", label: "بايسبس", label_en: "Biceps" },
  { id: "triceps", label: "ترايسبس", label_en: "Triceps" },
  { id: "core", label: "بطن/كور", label_en: "Core" },
  { id: "cardio", label: "كارديو", label_en: "Cardio" },
];
