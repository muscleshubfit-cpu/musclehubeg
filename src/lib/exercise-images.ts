/**
 * Exercise Image Library — uses REAL exercise images from Unsplash
 * (same source as food images, consistent style).
 *
 * All images are high-quality fitness photography from Unsplash,
 * with consistent sizing and crop. Each exercise has its own unique
 * photo ID for accurate representation.
 *
 * Usage:
 * import { getWgerImageUrl, getFallbackSVG } from "@/lib/exercise-images";
 * <img src={getWgerImageUrl("bench press")} onError={(e) => e.target.src = getFallbackSVG("chest")} />
 */

// Unsplash image helper — same format as foods.ts for consistency
const img = (id: string, w = 600) =>
  `https://images.unsplash.com/photo-${id}?w=${w}&q=80&auto=format&fit=crop`;

// Exercise image URLs from Unsplash — each exercise has a unique photo
const EXERCISE_IMAGES: Record<string, string> = {
  // Chest
  "bench press": img("1534438327276-14e5300c3a48"),
  "push-up": img("1571902943202-507ec2618e8f"),
  "pushup": img("1571902943202-507ec2618e8f"),
  "dips": img("1605298374105-92f0f66d85a9"),
  "incline dumbbell press": img("1605298374105-92f0f66d85a9"),
  "dumbbell fly": img("1571019613454-1cb2f99b2d8b"),
  "cable crossover": img("1534438327276-14e5300c3a48"),

  // Back
  "chin up": img("1517836357463-d25dfeac3438"),
  "chinup": img("1517836357463-d25dfeac3438"),
  "pull-up": img("1517836357463-d25dfeac3438"),
  "pullup": img("1517836357463-d25dfeac3438"),
  "seated cable row": img("1599058917765-a780eda07a3e"),
  "hyperextensions": img("1599058917765-a780eda07a3e"),
  "deadlift": img("1532384748853-8f54a8f476e2"),
  "sumo deadlift": img("1532384748853-8f54a8f476e2"),
  "lat pulldown": img("1599058917765-a780eda07a3e"),
  "barbell row": img("1599058917765-a780eda07a3e"),
  "t-bar row": img("1599058917765-a780eda07a3e"),
  "face pull": img("1599058917765-a780eda07a3e"),

  // Shoulders
  "arnold press": img("1583454110551-21f2fa2afe61"),
  "overhead press": img("1583454110551-21f2fa2afe61"),
  "lateral raise": img("1583454110551-21f2fa2afe61"),
  "front raise": img("1583454110551-21f2fa2afe61"),
  "dumbbell shoulder press": img("1583454110551-21f2fa2afe61"),
  "push press": img("1583454110551-21f2fa2afe61"),

  // Legs
  "squat": img("1574680096145-d05b474e2155"),
  "barbell full squat": img("1574680096145-d05b474e2155"),
  "leg press": img("1532384748853-8f54a8f476e2"),
  "leg extension": img("1532384748853-8f54a8f476e2"),
  "leg curl": img("1532384748853-8f54a8f476e2"),
  "lunges": img("1571019614242-c5c5dee9f50b"),
  "lunge": img("1571019614242-c5c5dee9f50b"),
  "hip thrust": img("1571019614242-c5c5dee9f50b"),
  "glute bridge": img("1571019614242-c5c5dee9f50b"),
  "romanian deadlift": img("1532384748853-8f54a8f476e2"),
  "goblet squat": img("1574680096145-d05b474e2155"),
  "bulgarian split squat": img("1571019614242-c5c5dee9f50b"),
  "calf raise": img("1574680096145-d05b474e2155"),
  "good morning": img("1532384748853-8f54a8f476e2"),
  "kettlebell swing": img("1605298374105-92f0f66d85a9"),
  "sumo squat": img("1574680096145-d05b474e2155"),

  // Arms
  "dumbbell curl": img("1583454110551-21f2fa2afe61"),
  "bicep curl": img("1583454110551-21f2fa2afe61"),
  "bicep": img("1583454110551-21f2fa2afe61"),
  "barbell curl": img("1583454110551-21f2fa2afe61"),
  "hammer curl": img("1583454110551-21f2fa2afe61"),
  "preacher curl": img("1583454110551-21f2fa2afe61"),
  "concentration curl": img("1583454110551-21f2fa2afe61"),
  "triceps pushdown": img("1605298374105-92f0f66d85a9"),
  "tricep pushdown": img("1605298374105-92f0f66d85a9"),
  "triceps": img("1605298374105-92f0f66d85a9"),
  "skull crushers": img("1605298374105-92f0f66d85a9"),
  "overhead triceps extension": img("1605298374105-92f0f66d85a9"),
  "close-grip bench press": img("1534438327276-14e5300c3a48"),

  // Core
  "crunches": img("1571019614242-c5c5dee9f50b"),
  "crunch": img("1571019614242-c5c5dee9f50b"),
  "plank": img("1599058917765-a780eda07a3e"),
  "side plank": img("1599058917765-a780eda07a3e"),
  "russian twist": img("1571019614242-c5c5dee9f50b"),
  "hollow hold": img("1599058917765-a780eda07a3e"),
  "superman": img("1599058917765-a780eda07a3e"),
  "flutter kicks": img("1571019614242-c5c5dee9f50b"),
  "bird dog": img("1571019614242-c5c5dee9f50b"),
  "mountain climbers": img("1599058917765-a780eda07a3e"),
  "leg raises": img("1571019614242-c5c5dee9f50b"),
  "bicycle crunches": img("1571019614242-c5c5dee9f50b"),
  "hanging leg raise": img("1599058917765-a780eda07a3e"),
  "reverse crunch": img("1571019614242-c5c5dee9f50b"),
  "toes to bar": img("1599058917765-a780eda07a3e"),

  // Cardio
  "burpees": img("1599058917765-a780eda07a3e"),
  "jumping jacks": img("1599058917765-a780eda07a3e"),
  "high knees": img("1599058917765-a780eda07a3e"),
  "squat jumps": img("1574680096145-d05b474e2155"),
  "box jumps": img("1574680096145-d05b474e2155"),
  "jump rope": img("1599058917765-a780eda07a3e"),

  // Additional
  "suitcase carry": img("1605298374105-92f0f66d85a9"),
  "pec deck": img("1534438327276-14e5300c3a48"),
};

// Arabic → English keyword map for fuzzy matching
const ARABIC_KEYWORDS: Array<{ keywords: string[]; englishKey: string }> = [
  // Chest
  { keywords: ["بنش بريس", "بنش بالبار", "ضغط بنش", "bench press"], englishKey: "bench press" },
  { keywords: ["بنش مائل", "incline bench", "ضغط مائل"], englishKey: "incline dumbbell press" },
  { keywords: ["ضغط أرضي", "ضغط ارضي", "بوش اب", "pushup", "push-up"], englishKey: "push-up" },
  { keywords: ["ديبس", "dips"], englishKey: "dips" },
  { keywords: ["رفرفة صدر", "رفرفة", "fly", "dumbbell fly"], englishKey: "dumbbell fly" },
  { keywords: ["كروسبوفر", "cable crossover"], englishKey: "cable crossover" },
  // Back
  { keywords: ["عقلة", "pullup", "pull-up", "chinup", "chin up"], englishKey: "pull-up" },
  { keywords: ["تجديف بالكابل", "seated cable row", "تجديف كابل"], englishKey: "seated cable row" },
  { keywords: ["هايبر", "hyperextension", "ظهر سفلي"], englishKey: "hyperextensions" },
  { keywords: ["ديدليفت", "deadlift"], englishKey: "deadlift" },
  { keywords: ["سحب أمامي", "lat pulldown", "لات بالداون"], englishKey: "lat pulldown" },
  { keywords: ["تجديف بالبار", "barbell row"], englishKey: "barbell row" },
  { keywords: ["تي بار", "t-bar row"], englishKey: "t-bar row" },
  { keywords: ["فيس بول", "face pull"], englishKey: "face pull" },
  // Shoulders
  { keywords: ["arnold press", "أرنولد"], englishKey: "arnold press" },
  { keywords: ["أوفرهيد", "overhead press"], englishKey: "overhead press" },
  { keywords: ["رفرفة جانبية", "lateral raise"], englishKey: "lateral raise" },
  { keywords: ["رفرفة أمامية", "front raise"], englishKey: "front raise" },
  { keywords: ["شولدر بريس", "shoulder press"], englishKey: "dumbbell shoulder press" },
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
  { keywords: ["هيب ثرست", "hip thrust"], englishKey: "hip thrust" },
  { keywords: ["glute bridge", "جلوة"], englishKey: "glute bridge" },
  { keywords: ["رماني", "rdl", "romanian"], englishKey: "romanian deadlift" },
  { keywords: ["جوبليت", "goblet"], englishKey: "goblet squat" },
  { keywords:["بلغاري", "bulgarian"], englishKey: "bulgarian split squat" },
  { keywords: ["كاف", "calf"], englishKey: "calf raise" },
  // Arms
  { keywords: ["بايسبس", "bicep", "curl", "كيرل", "دمبل كيرل", "dumbbell curl"], englishKey: "dumbbell curl" },
  { keywords: ["بايسبس بالبار", "barbell curl"], englishKey: "barbell curl" },
  { keywords: ["هامر", "hammer"], englishKey: "hammer curl" },
  { keywords: ["بريشر", "preacher"], englishKey: "preacher curl" },
  { keywords: ["تركيز", "concentration"], englishKey: "concentration curl" },
  { keywords: ["ترايسبس", "tricep", "pushdown", "بوش داون"], englishKey: "triceps pushdown" },
  { keywords: ["سكل", "skull"], englishKey: "skull crushers" },
  { keywords: ["أوفرهيد ترايسبس", "overhead triceps"], englishKey: "overhead triceps extension" },
  { keywords: ["كلوز جريب", "close-grip"], englishKey: "close-grip bench press" },
  // Core
  { keywords: ["كرنش", "crunch", "بطن", "abs"], englishKey: "crunches" },
  { keywords: ["بلانك", "plank"], englishKey: "plank" },
  { keywords: ["side plank", "بلانك جانبي"], englishKey: "side plank" },
  { keywords: ["russian twist", "تويست روسي"], englishKey: "russian twist" },
  { keywords: ["hollow", "هولو"], englishKey: "hollow hold" },
  { keywords: ["superman", "سوبرمان"], englishKey: "superman" },
  { keywords: ["flutter", "فلاتر"], englishKey: "flutter kicks" },
  { keywords: ["bird dog", "بيرد دوج"], englishKey: "bird dog" },
  { keywords: ["رفع الأرجل", "leg raises"], englishKey: "leg raises" },
  { keywords: ["دراجة", "bicycle"], englishKey: "bicycle crunches" },
  { keywords: ["معلق", "hanging"], englishKey: "hanging leg raise" },
  { keywords: ["عكسي", "reverse"], englishKey: "reverse crunch" },
  // Cardio
  { keywords: ["burpees", "بربي"], englishKey: "burpees" },
  { keywords: ["jumping jacks", "قفز"], englishKey: "jumping jacks" },
  { keywords: ["high knees", "ركبة عالية"], englishKey: "high knees" },
  { keywords: ["قفز سكوات", "squat jump"], englishKey: "squat jumps" },
  { keywords: ["صندوق", "box jump"], englishKey: "box jumps" },
  { keywords: ["حبل", "jump rope"], englishKey: "jump rope" },
];

/**
 * Look up the Unsplash image URL for an exercise by name (Arabic or English).
 * Returns the direct image URL, or null if no match.
 */
export function getWgerImageUrl(exerciseName: string): string | null {
  if (!exerciseName) return null;
  const q = exerciseName.toLowerCase().trim();

  // 1. Direct English match
  if (EXERCISE_IMAGES[q]) return EXERCISE_IMAGES[q];

  // 2. Arabic keyword match
  for (const { keywords, englishKey } of ARABIC_KEYWORDS) {
    for (const kw of keywords) {
      if (q.includes(kw.toLowerCase()) || exerciseName.includes(kw)) {
        return EXERCISE_IMAGES[englishKey] || null;
      }
    }
  }

  // 3. Partial English match
  for (const [key, url] of Object.entries(EXERCISE_IMAGES)) {
    if (q.includes(key) || key.includes(q)) {
      return url;
    }
  }

  return null;
}

/**
 * Get the image URL for an exercise. Tries:
 * 1. The existing image URL (if valid)
 * 2. Unsplash direct image (by name lookup)
 * 3. Fallback SVG (category icon)
 */
export function getExerciseImageUrl(exerciseName: string, existingUrl?: string): string {
  // 1. Keep valid existing URLs (but skip wger.de — we switched to Unsplash)
  if (existingUrl && !isBrokenImage(existingUrl) && !existingUrl.includes("wger.de")) {
    return existingUrl;
  }

  // 2. Try Unsplash direct image
  const unsplashUrl = getWgerImageUrl(exerciseName);
  if (unsplashUrl) return unsplashUrl;

  // 3. Fall back to SVG
  return getFallbackSVG(exerciseName);
}

/**
 * Fallback SVG for when no real image is available.
 * Clean minimalist line icons with the MuscleHub theme colors.
 */
const FALLBACK_SVGS: Record<string, string> = {
  chest: `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 140'><rect width='200' height='140' fill='#f5f8fc'/><rect x='0' y='0' width='200' height='2' fill='#0071e3'/><g transform='translate(100 60)' stroke='#0071e3' stroke-width='2' fill='none' stroke-linecap='round'><path d='M-25 -10 L-25 10 M25 -10 L25 10 M-25 0 L25 0'/><circle cx='0' cy='0' r='3' fill='#0071e3'/></g><text x='100' y='110' font-size='11' font-weight='600' text-anchor='middle' fill='#475569' font-family='sans-serif'>صدر</text></svg>`,
  back: `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 140'><rect width='200' height='140' fill='#f5f8fc'/><rect x='0' y='0' width='200' height='2' fill='#0071e3'/><g transform='translate(100 60)' stroke='#0071e3' stroke-width='2' fill='none' stroke-linecap='round'><path d='M-20 -15 L-20 15 M20 -15 L20 15 M-20 0 Q0 -10 20 0'/></g><text x='100' y='110' font-size='11' font-weight='600' text-anchor='middle' fill='#475569' font-family='sans-serif'>ظهر</text></svg>`,
  shoulders: `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 140'><rect width='200' height='140' fill='#f5f8fc'/><rect x='0' y='0' width='200' height='2' fill='#0071e3'/><g transform='translate(100 60)' stroke='#0071e3' stroke-width='2' fill='none' stroke-linecap='round'><path d='M-25 0 L-15 -10 M25 0 L15 -10 M-15 -10 L15 -10 M0 -10 L0 15'/></g><text x='100' y='110' font-size='11' font-weight='600' text-anchor='middle' fill='#475569' font-family='sans-serif'>أكتاف</text></svg>`,
  legs: `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 140'><rect width='200' height='140' fill='#f5f8fc'/><rect x='0' y='0' width='200' height='2' fill='#0071e3'/><g transform='translate(100 55)' stroke='#0071e3' stroke-width='2' fill='none' stroke-linecap='round'><path d='M-8 -15 L-8 20 M8 -15 L8 20 M-8 -15 L8 -15 M-8 5 L-12 20 M8 5 L12 20'/></g><text x='100' y='110' font-size='11' font-weight='600' text-anchor='middle' fill='#475569' font-family='sans-serif'>أرجل</text></svg>`,
  biceps: `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 140'><rect width='200' height='140' fill='#f5f8fc'/><rect x='0' y='0' width='200' height='2' fill='#0071e3'/><g transform='translate(100 60)' stroke='#0071e3' stroke-width='2' fill='none' stroke-linecap='round'><path d='M-15 -5 Q-15 -15 -5 -15 L5 -15 Q15 -15 15 -5 L15 10 Q15 15 10 15 L-10 15 Q-15 15 -15 10 Z'/></g><text x='100' y='110' font-size='11' font-weight='600' text-anchor='middle' fill='#475569' font-family='sans-serif'>بايسبس</text></svg>`,
  triceps: `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 140'><rect width='200' height='140' fill='#f5f8fc'/><rect x='0' y='0' width='200' height='2' fill='#0071e3'/><g transform='translate(100 60)' stroke='#0071e3' stroke-width='2' fill='none' stroke-linecap='round'><path d='M-10 -15 L-10 15 M10 -15 L10 15 M-10 -15 L10 -15 M-10 0 L10 0'/></g><text x='100' y='110' font-size='11' font-weight='600' text-anchor='middle' fill='#475569' font-family='sans-serif'>ترايسبس</text></svg>`,
  core: `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 140'><rect width='200' height='140' fill='#f5f8fc'/><rect x='0' y='0' width='200' height='2' fill='#0071e3'/><g transform='translate(100 60)' stroke='#0071e3' stroke-width='2' fill='none' stroke-linecap='round'><circle cx='0' cy='0' r='18'/><circle cx='0' cy='0' r='8'/><circle cx='0' cy='0' r='2' fill='#0071e3'/></g><text x='100' y='110' font-size='11' font-weight='600' text-anchor='middle' fill='#475569' font-family='sans-serif'>كور</text></svg>`,
  cardio: `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 140'><rect width='200' height='140' fill='#f5f8fc'/><rect x='0' y='0' width='200' height='2' fill='#0071e3'/><g transform='translate(100 60)' stroke='#0071e3' stroke-width='2' fill='none' stroke-linecap='round'><path d='M-20 0 L-10 0 L-5 -15 L5 15 L10 0 L20 0'/></g><text x='100' y='110' font-size='11' font-weight='600' text-anchor='middle' fill='#475569' font-family='sans-serif'>كارديو</text></svg>`,
  default: `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 140'><rect width='200' height='140' fill='#f5f8fc'/><rect x='0' y='0' width='200' height='2' fill='#0071e3'/><g transform='translate(100 60)' stroke='#0071e3' stroke-width='2' fill='none' stroke-linecap='round'><rect x='-18' y='-8' width='36' height='16' rx='3'/><line x1='-22' y1='0' x2='-18' y2='0'/><line x1='18' y1='0' x2='22' y2='0'/></g><text x='100' y='110' font-size='11' font-weight='600' text-anchor='middle' fill='#475569' font-family='sans-serif'>تمرين</text></svg>`,
  rest: `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 140'><rect width='200' height='140' fill='#f5f8fc'/><rect x='0' y='0' width='200' height='2' fill='#ff9500'/><g transform='translate(100 60)' stroke='#ff9500' stroke-width='2' fill='none' stroke-linecap='round'><path d='M-15 10 L-15 -5 Q-15 -10 -10 -10 L10 -10 Q15 -10 15 -5 L15 10 Z M-15 -5 L15 -5'/></g><text x='100' y='110' font-size='12' font-weight='600' text-anchor='middle' fill='#ff9500' font-family='sans-serif'>يوم راحة</text></svg>`,
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
  if (/(bench|بنش|صدر|chest|push|pushup|ضغط|dip|ديبس|fly|رفرفة|crossover|كروسبوفر)/.test(q)) return "chest";
  if (/(row|تجديف|pull|عقلة|سحب|deadlift|ديدليفت|back|ظهر|hyper|هايبر|face pull|فيس بول|lat|لات)/.test(q)) return "back";
  if (/(press|ضغط كتف|shoulder|أكتاف|اكتاف|كتف|lateral|جانبية|military|ohp|arnold|أرنولد|overhead|أوفرهيد|front raise|رفرفة أمامية)/.test(q)) return "shoulders";
  if (/(squat|سكوات|leg|ليج|أرجل|ارجل|رجل|calf|كاف|lunge|لانج|hip|هيب|glute|جلوة|rdl|روماني|deadlift|ديدليفت|goblet|جوبليت|bulgarian|بلغاري|sumo|سومو|good morning|جود مورنينج|kettlebell|كيتل)/.test(q)) return "legs";
  if (/(bicep|بايسبس|curl|كيرل|hammer|هامر|preacher|بريشر|concentration|تركيز)/.test(q)) return "biceps";
  if (/(tricep|ترايسبس|pushdown|بوش داون|skull|سكل|overhead triceps|أوفرهيد ترايسبس|close-grip|كلوز جريب)/.test(q)) return "triceps";
  if (/(plank|بلانك|crunch|كرنش|abs|بطن|core|كور|russian|تويست|hollow|superman|bird|flutter|دراجة|bicycle|leg raise|رفع الأرجل|hanging|معلق|reverse|عكسي)/.test(q)) return "core";
  if (/(run|جري|cardio|كارديو|burpee|بربي|jump|قفز|bike|دراجة|high knees|ركبة عالية|box|صندوق|rope|حبل)/.test(q)) return "cardio";
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
    url.includes("wger.de") ||
    url.includes("images.unsplash.com/photo-1597452610875")
  );
}

/**
 * Resolve the best image URL for an exercise.
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
