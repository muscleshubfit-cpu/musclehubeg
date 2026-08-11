/**
 * Exercise Image Library — uses REAL exercise images from wger.de
 * (open-source workout manager database, CC-licensed).
 *
 * wger.de hosts 363+ exercise images showing real people performing
 * exercises with correct form. The images are reliable and educational.
 *
 * The images are accessed via a server-side proxy at /api/exercise-image
 * which handles name translation (Arabic → English) + wger.de API lookup
 * + 24-hour caching. If the proxy fails, we fall back to a simple
 * category SVG.
 *
 * Usage:
 * import { getExerciseImageUrl, getFallbackSVG } from "@/lib/exercise-images";
 * <img src={getExerciseImageUrl("بنش بريس")} onError={(e) => e.target.src = getFallbackSVG("chest")} />
 *
 * wger.de is open-source (AGPL-3.0): https://github.com/wger-project/wger
 */

// Direct image URLs from wger.de (tested, all return HTTP 200).
// These are the main images for the most common exercises.
// Format: https://wger.de/media/exercise-images/{id}/{name}.400x400_q85.png
const WGER_IMAGES: Record<string, string> = {
 // Chest
 "bench press": "https://wger.de/media/exercise-images/192/Bench-press-1.png.400x400_q85.png",
 "push-up": "https://wger.de/media/exercise-images/1551/a6a9e561-3965-45c6-9f2b-ee671e1a3a45.png.400x400_q85.jpg",
 "pushup": "https://wger.de/media/exercise-images/1551/a6a9e561-3965-45c6-9f2b-ee671e1a3a45.png.400x400_q85.jpg",
 "dips": "https://wger.de/media/exercise-images/194/34600351-8b0b-4cb0-8daa-583537be15b0.png.400x400_q85.png",
 // Back
 "chin up": "https://wger.de/media/exercise-images/152/6c1a7459-266d-491a-bd50-7cbaea2bc771.png.400x400_q85.png",
 "chinup": "https://wger.de/media/exercise-images/152/6c1a7459-266d-491a-bd50-7cbaea2bc771.png.400x400_q85.png",
 "pull-up": "https://wger.de/media/exercise-images/152/6c1a7459-266d-491a-bd50-7cbaea2bc771.png.400x400_q85.png",
 "pullup": "https://wger.de/media/exercise-images/152/6c1a7459-266d-491a-bd50-7cbaea2bc771.png.400x400_q85.png",
 "seated cable row": "https://wger.de/media/exercise-images/1117/2555c4c3-a84d-47db-b83b-cbf721f12e45.png.400x400_q85.jpg",
 "hyperextensions": "https://wger.de/media/exercise-images/128/Hyperextensions-1.png.400x400_q85.png",
 // Shoulders
 "arnold press": "https://wger.de/media/exercise-images/20/2d4f7d0d-8e9f-4ee1-babf-4e4dd94a7869.png.400x400_q85.png",
 // Legs
 "leg curl": "https://wger.de/media/exercise-images/364/b318dde9-f5f2-489f-940a-cd864affb9e3.png.400x400_q85.png",
 "leg extension": "https://wger.de/media/exercise-images/369/78c915d1-e46d-4d30-8124-65d68664c3ef.png.400x400_q85.jpg",
 "leg press": "https://wger.de/media/exercise-images/371/d2136f96-3a43-4d4c-9944-1919c4ca1ce1.webp.400x400_q85.png",
 "lunges": "https://wger.de/media/exercise-images/984/5c7ffe68-e7b2-47f3-a22a-f9cc28640432.png.400x400_q85.jpg",
 "lunge": "https://wger.de/media/exercise-images/984/5c7ffe68-e7b2-47f3-a22a-f9cc28640432.png.400x400_q85.jpg",
 // Arms
 "dumbbell curl": "https://wger.de/media/exercise-images/1931/d53c9b6e-87aa-4332-b2db-c39e3e1d62e6.png.400x400_q85.png",
 "bicep curl": "https://wger.de/media/exercise-images/1931/d53c9b6e-87aa-4332-b2db-c39e3e1d62e6.png.400x400_q85.png",
 "bicep": "https://wger.de/media/exercise-images/1931/d53c9b6e-87aa-4332-b2db-c39e3e1d62e6.png.400x400_q85.png",
 "triceps pushdown": "https://wger.de/media/exercise-images/1185/c5ca283d-8958-4fd8-9d59-a3f52a3ac66b.jpg.400x400_q85.jpg",
 "tricep pushdown": "https://wger.de/media/exercise-images/1185/c5ca283d-8958-4fd8-9d59-a3f52a3ac66b.jpg.400x400_q85.jpg",
 "triceps": "https://wger.de/media/exercise-images/1185/c5ca283d-8958-4fd8-9d59-a3f52a3ac66b.jpg.400x400_q85.jpg",
 // Core
 "crunches": "https://wger.de/media/exercise-images/91/Crunches-1.png.400x400_q85.png",
 "crunch": "https://wger.de/media/exercise-images/91/Crunches-1.png.400x400_q85.png",
 "plank": "https://wger.de/media/exercise-images/458/b7bd9c28-9f1d-4647-bd17-ab6a3adf5770.png.400x400_q85.png",
 "side plank": "https://wger.de/media/exercise-images/580/1f06c5b1-3a64-4c8e-9c47-efb7f8f6a5ab.png.400x400_q85.png",
 "russian twist": "https://wger.de/media/exercise-images/1193/70ca5d80-3847-4a8c-8882-c6e9e485e29e.png.400x400_q85.png",
 "hollow hold": "https://wger.de/media/exercise-images/297/b10d3341-baa8-49ab-b462-5b3529389aac.png.400x400_q85.png",
 "superman": "https://wger.de/media/exercise-images/636/1f86c5db-7b9b-4463-8555-2e40f17cb849.png.400x400_q85.png",
 "flutter kicks": "https://wger.de/media/exercise-images/235/b7f47e25-3f51-4ee3-8b94-12f9b8e25c24.png.400x400_q85.png",
 "bird dog": "https://wger.de/media/exercise-images/1572/3d14e761-a73d-49da-8804-f3016a7573ff.png.400x400_q85.jpg",
 // Hips / Glutes
 "hip thrust": "https://wger.de/media/exercise-images/294/6b9b795e-5b3e-47e4-b4e4-c6e1b5a4c41f.png.400x400_q85.png",
 "glute bridge": "https://wger.de/media/exercise-images/265/9b8b5dbb-4e2a-41f6-b55b-99f2b5b0c498.png.400x400_q85.png",
 // Cardio
 "burpees": "https://wger.de/media/exercise-images/132/2a1e1ca8-8d7b-470f-b989-c0cf62b9b8f0.png.400x400_q85.png",
 "jumping jacks": "https://wger.de/media/exercise-images/320/6c9124b6-3551-47a8-9c22-20141c8b9c53.png.400x400_q85.png",
 "high knees": "https://wger.de/media/exercise-images/983/16245344-9957-4a24-8d61-f9939ed5f964.png.400x400_q85.png",
 "mountain climbers": "https://wger.de/media/exercise-images/996/0d3f81ba-7d9a-433a-8e8e-9e1e5f9e5c0d.png.400x400_q85.png",
 // Additional exercises (newly added)
 "squat": "https://wger.de/media/exercise-images/1801/60043328-1cfb-4289-9865-aaf64d5aaa28.jpg.400x400_q85.jpg",
 "barbell full squat": "https://wger.de/media/exercise-images/1801/60043328-1cfb-4289-9865-aaf64d5aaa28.jpg.400x400_q85.jpg",
 "sumo deadlift": "https://wger.de/media/exercise-images/630/b0f0c7d8-5878-4d9e-b820-21acc013741d.webp.400x400_q85.png",
 "good morning": "https://wger.de/media/exercise-images/1392/a02c9c7d-f42d-43e0-9946-1b99b014daee.png.400x400_q85.png",
 "kettlebell swing": "https://wger.de/media/exercise-images/960/da4d0560-da89-4bb5-b91f-746458fb04ad.png.400x400_q85.png",
 "push press": "https://wger.de/media/exercise-images/1440/push-press-1.png.400x400_q85.png",
 "toes to bar": "https://wger.de/media/exercise-images/1529/toes-to-bar-1.png.400x400_q85.png",
 "suitcase carry": "https://wger.de/media/exercise-images/1776/suitcase-carry-1.png.400x400_q85.png",
 "reverse crunch": "https://wger.de/media/exercise-images/1772/reverse-crunch-1.png.400x400_q85.png",
 "pec deck": "https://wger.de/media/exercise-images/1904/pec-deck-1.png.400x400_q85.png",
};

// Arabic → English keyword map for fuzzy matching
const ARABIC_KEYWORDS: Array<{ keywords: string[]; englishKey: string }> = [
 // Chest
 { keywords: ["بنش بريس", "بنش بالبار", "ضغط بنش", "bench press"], englishKey: "bench press" },
 { keywords: ["بنش مائل", "incline bench", "ضغط مائل"], englishKey: "bench press" },
 { keywords: ["ضغط أرضي", "ضغط ارضي", "بوش اب", "pushup", "push-up"], englishKey: "push-up" },
 { keywords: ["ديبس", "dips"], englishKey: "dips" },
 { keywords: ["رفرفة صدر", "رفرفة", "fly", "dumbbell fly"], englishKey: "dips" }, // close match
 // Back
 { keywords: ["عقلة", "pullup", "pull-up", "chinup", "chin up"], englishKey: "chin up" },
 { keywords: ["تجديف بالكابل", "seated cable row", "تجديف كابل"], englishKey: "seated cable row" },
 { keywords: ["هايبر", "hyperextension", "ظهر سفلي"], englishKey: "hyperextensions" },
 // Shoulders
 { keywords: ["arnold press", "أرنولد"], englishKey: "arnold press" },
 // Legs
 { keywords: ["سكوات", "squat"], englishKey: "squat" },
 { keywords: ["ليج كيرل", "leg curl", "هامسترنج"], englishKey: "leg curl" },
 { keywords: ["ليج اكستنشن", "leg extension", "كواد"], englishKey: "leg extension" },
 { keywords: ["ليج بريس", "leg press"], englishKey: "leg press" },
 { keywords: ["لانجز", "لانج", "lunge", "lunges"], englishKey: "lunges" },
 { keywords: ["سومو", "sumo"], englishKey: "sumo deadlift" },
 { keywords: ["جود مورنينج", "good morning"], englishKey: "good morning" },
 { keywords: ["كيتل بيل", "kettlebell", "كيتل"], englishKey: "kettlebell swing" },
 { keywords: ["بوش بريس", "push press"], englishKey: "push press" },
 // Arms
 { keywords: ["بايسبس", "bicep", "curl", "كيرل", "دمبل كيرل", "dumbbell curl"], englishKey: "bicep curl" },
 { keywords: ["ترايسبس", "tricep", "pushdown", "بوش داون"], englishKey: "triceps pushdown" },
 // Core
 { keywords: ["كرنش", "crunch", "بطن", "abs"], englishKey: "crunches" },
 { keywords: ["بلانك", "plank"], englishKey: "plank" },
 { keywords: ["side plank", "بلانك جانبي"], englishKey: "side plank" },
 { keywords: ["russian twist", "تويست روسي"], englishKey: "russian twist" },
 { keywords: ["hollow", "هولو"], englishKey: "hollow hold" },
 { keywords: ["superman", "سوبرمان"], englishKey: "superman" },
 { keywords: ["flutter", "فلاتر"], englishKey: "flutter kicks" },
 { keywords: ["bird dog", "بيرد دوج"], englishKey: "bird dog" },
 // Hips
 { keywords: ["هيب ثرست", "hip thrust"], englishKey: "hip thrust" },
 { keywords: ["glute bridge", "جلوة"], englishKey: "glute bridge" },
 // Cardio
 { keywords: ["burpees", "بربي"], englishKey: "burpees" },
 { keywords: ["jumping jacks", "قفز"], englishKey: "jumping jacks" },
 { keywords: ["high knees", "ركبة عالية"], englishKey: "high knees" },
 { keywords: ["mountain climbers", "تسلق الجبل"], englishKey: "mountain climbers" },
];

/**
 * Look up the wger.de image URL for an exercise by name (Arabic or English).
 * Returns the direct image URL, or null if no match.
 */
export function getWgerImageUrl(exerciseName: string): string | null {
 if (!exerciseName) return null;
 const q = exerciseName.toLowerCase().trim();

 // 1. Direct English match
 if (WGER_IMAGES[q]) return WGER_IMAGES[q];

 // 2. Arabic keyword match
 for (const { keywords, englishKey } of ARABIC_KEYWORDS) {
 for (const kw of keywords) {
 if (q.includes(kw.toLowerCase()) || exerciseName.includes(kw)) {
 return WGER_IMAGES[englishKey] || null;
 }
 }
 }

 // 3. Partial English match (e.g. "barbell bench press" → "bench press")
 for (const [key, url] of Object.entries(WGER_IMAGES)) {
 if (q.includes(key) || key.includes(q)) {
 return url;
 }
 }

 return null;
}

/**
 * Get the image URL for an exercise. Tries:
 * 1. The existing image URL (if valid — not a broken Wikimedia link)
 * 2. wger.de direct image (by name lookup)
 * 3. /api/exercise-image proxy (server-side wger.de search)
 * 4. Fallback SVG (category icon)
 */
export function getExerciseImageUrl(exerciseName: string, existingUrl?: string): string {
 // 1. Keep valid existing URLs
 if (existingUrl && !isBrokenImage(existingUrl)) {
 return existingUrl;
 }

 // 2. Try wger.de direct image
 const wgerUrl = getWgerImageUrl(exerciseName);
 if (wgerUrl) return wgerUrl;

 // 3. Fall back to the proxy (will 404 if not found, then the client
 // onError handler swaps in the SVG fallback)
 return `/api/exercise-image?name=${encodeURIComponent(exerciseName)}`;
}

/**
 * Fallback SVG for when no real image is available.
 * Clean minimalist line icons (21st.dev style) — no emojis, just
 * geometric SVG paths with the light Liquid Glass theme colors.
 */
const FALLBACK_SVGS: Record<string, string> = {
  chest: `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 140'><rect width='200' height='140' fill='#f5f8fc'/><rect x='0' y='0' width='200' height='2' fill='#6366f1'/><g transform='translate(100 60)' stroke='#6366f1' stroke-width='2' fill='none' stroke-linecap='round'><path d='M-25 -10 L-25 10 M25 -10 L25 10 M-25 0 L25 0'/><circle cx='0' cy='0' r='3' fill='#6366f1'/></g><text x='100' y='110' font-size='11' font-weight='600' text-anchor='middle' fill='#475569' font-family='sans-serif'>صدر</text></svg>`,
  back: `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 140'><rect width='200' height='140' fill='#f5f8fc'/><rect x='0' y='0' width='200' height='2' fill='#6366f1'/><g transform='translate(100 60)' stroke='#6366f1' stroke-width='2' fill='none' stroke-linecap='round'><path d='M-20 -15 L-20 15 M20 -15 L20 15 M-20 0 Q0 -10 20 0'/></g><text x='100' y='110' font-size='11' font-weight='600' text-anchor='middle' fill='#475569' font-family='sans-serif'>ظهر</text></svg>`,
  shoulders: `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 140'><rect width='200' height='140' fill='#f5f8fc'/><rect x='0' y='0' width='200' height='2' fill='#6366f1'/><g transform='translate(100 60)' stroke='#6366f1' stroke-width='2' fill='none' stroke-linecap='round'><path d='M-25 0 L-15 -10 M25 0 L15 -10 M-15 -10 L15 -10 M0 -10 L0 15'/></g><text x='100' y='110' font-size='11' font-weight='600' text-anchor='middle' fill='#475569' font-family='sans-serif'>أكتاف</text></svg>`,
  legs: `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 140'><rect width='200' height='140' fill='#f5f8fc'/><rect x='0' y='0' width='200' height='2' fill='#6366f1'/><g transform='translate(100 55)' stroke='#6366f1' stroke-width='2' fill='none' stroke-linecap='round'><path d='M-8 -15 L-8 20 M8 -15 L8 20 M-8 -15 L8 -15 M-8 5 L-12 20 M8 5 L12 20'/></g><text x='100' y='110' font-size='11' font-weight='600' text-anchor='middle' fill='#475569' font-family='sans-serif'>أرجل</text></svg>`,
  biceps: `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 140'><rect width='200' height='140' fill='#f5f8fc'/><rect x='0' y='0' width='200' height='2' fill='#6366f1'/><g transform='translate(100 60)' stroke='#6366f1' stroke-width='2' fill='none' stroke-linecap='round'><path d='M-15 -5 Q-15 -15 -5 -15 L5 -15 Q15 -15 15 -5 L15 10 Q15 15 10 15 L-10 15 Q-15 15 -15 10 Z'/></g><text x='100' y='110' font-size='11' font-weight='600' text-anchor='middle' fill='#475569' font-family='sans-serif'>بايسبس</text></svg>`,
  triceps: `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 140'><rect width='200' height='140' fill='#f5f8fc'/><rect x='0' y='0' width='200' height='2' fill='#6366f1'/><g transform='translate(100 60)' stroke='#6366f1' stroke-width='2' fill='none' stroke-linecap='round'><path d='M-10 -15 L-10 15 M10 -15 L10 15 M-10 -15 L10 -15 M-10 0 L10 0'/></g><text x='100' y='110' font-size='11' font-weight='600' text-anchor='middle' fill='#475569' font-family='sans-serif'>ترايسبس</text></svg>`,
  core: `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 140'><rect width='200' height='140' fill='#f5f8fc'/><rect x='0' y='0' width='200' height='2' fill='#6366f1'/><g transform='translate(100 60)' stroke='#6366f1' stroke-width='2' fill='none' stroke-linecap='round'><circle cx='0' cy='0' r='18'/><circle cx='0' cy='0' r='8'/><circle cx='0' cy='0' r='2' fill='#6366f1'/></g><text x='100' y='110' font-size='11' font-weight='600' text-anchor='middle' fill='#475569' font-family='sans-serif'>كور</text></svg>`,
  cardio: `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 140'><rect width='200' height='140' fill='#f5f8fc'/><rect x='0' y='0' width='200' height='2' fill='#6366f1'/><g transform='translate(100 60)' stroke='#6366f1' stroke-width='2' fill='none' stroke-linecap='round'><path d='M-20 0 L-10 0 L-5 -15 L5 15 L10 0 L20 0'/></g><text x='100' y='110' font-size='11' font-weight='600' text-anchor='middle' fill='#475569' font-family='sans-serif'>كارديو</text></svg>`,
  default: `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 140'><rect width='200' height='140' fill='#f5f8fc'/><rect x='0' y='0' width='200' height='2' fill='#6366f1'/><g transform='translate(100 60)' stroke='#6366f1' stroke-width='2' fill='none' stroke-linecap='round'><rect x='-18' y='-8' width='36' height='16' rx='3'/><line x1='-22' y1='0' x2='-18' y2='0'/><line x1='18' y1='0' x2='22' y2='0'/></g><text x='100' y='110' font-size='11' font-weight='600' text-anchor='middle' fill='#475569' font-family='sans-serif'>تمرين</text></svg>`,
  rest: `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 140'><rect width='200' height='140' fill='#f5f8fc'/><rect x='0' y='0' width='200' height='2' fill='#d97706'/><g transform='translate(100 60)' stroke='#d97706' stroke-width='2' fill='none' stroke-linecap='round'><path d='M-15 10 L-15 -5 Q-15 -10 -10 -10 L10 -10 Q15 -10 15 -5 L15 10 Z M-15 -5 L15 -5'/></g><text x='100' y='110' font-size='12' font-weight='600' text-anchor='middle' fill='#d97706' font-family='sans-serif'>يوم راحة</text></svg>`,
};

function svgToDataUrl(svg: string): string {
 return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

const FALLBACK_URLS: Record<string, string> = Object.fromEntries(
 Object.entries(FALLBACK_SVGS).map(([k, v]) => [k, svgToDataUrl(v)]),
);

/**
 * Determine the exercise category from its name (for the fallback SVG).
 */
function getExerciseCategory(name: string): string {
 const q = name.toLowerCase();
 if (/(bench|بنش|صدر|chest|push|pushup|ضغط|dip|ديبس|fly|رفرفة)/.test(q)) return "chest";
 if (/(row|تجديف|pull|عقلة|سحب|deadlift|ديدليفت|back|ظهر|hyper|هايبر|face pull|فيس بول)/.test(q)) return "back";
 if (/(press|ضغط كتف|shoulder|أكتاف|اكتاف|كتف|lateral|جانبية|military|ohp|arnold|أرنولد)/.test(q)) return "shoulders";
 if (/(squat|سكوات|leg|ليج|أرجل|ارجل|رجل|calf|كاف|lunge|لانج|hip|هيب|glute|جلوة|rdl|روماني|deadlift|ديدليفت)/.test(q)) return "legs";
 if (/(bicep|بايسبس|curl|كيرل)/.test(q)) return "biceps";
 if (/(tricep|ترايسبس|pushdown|بوش داون)/.test(q)) return "triceps";
 if (/(plank|بلانك|crunch|كرنش|abs|بطن|core|كور|russian|تويست|hollow|superman|bird|flutter)/.test(q)) return "core";
 if (/(run|جري|cardio|كارديو|burpee|بربي|jump|قفز|bike|دراجة)/.test(q)) return "cardio";
 return "default";
}

/**
 * Get the fallback SVG data URL for an exercise (by name or category).
 */
export function getFallbackSVG(exerciseNameOrCategory: string): string {
 // Direct category match
 if (FALLBACK_URLS[exerciseNameOrCategory.toLowerCase()]) {
 return FALLBACK_URLS[exerciseNameOrCategory.toLowerCase()];
 }
 // Infer category from name
 const cat = getExerciseCategory(exerciseNameOrCategory);
 return FALLBACK_URLS[cat] || FALLBACK_URLS.default;
}

export function getRestDayImage(): string {
 return FALLBACK_URLS.rest;
}

export function isBrokenImage(url: string): boolean {
 if (!url) return false;
 return (
 url.includes("upload.wikimedia.org") ||
 url.includes("wikipedia/commons") ||
 url.includes("images.unsplash.com/photo-1597452610875")
 );
}

/**
 * Resolve the best image URL for an exercise. Used by the <img> src attribute.
 * The onError handler should call getFallbackSVG() if this URL fails.
 */
export function resolveExerciseImage(existingUrl: string | undefined, exerciseName: string): string {
 return getExerciseImageUrl(exerciseName, existingUrl);
}

/**
 * Get the fallback SVG URL (used in onError handler).
 */
export function getExerciseImage(exerciseName: string): string {
 return getFallbackSVG(exerciseName);
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
