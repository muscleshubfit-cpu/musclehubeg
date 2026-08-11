import { NextRequest, NextResponse } from "next/server";

/**
 * Exercise Image Proxy — fetches real exercise images from wger.de
 * (an open-source workout manager database with 363+ exercise images,
 * CC-licensed). wger.de images are reliable and show real people
 * performing the exercises correctly.
 *
 * GET /api/exercise-image?name=bench+press
 * GET /api/exercise-image?name=سكوات
 *
 * Flow:
 *   1. Translate the exercise name (Arabic → English keyword).
 *   2. Search wger.de's exercise database for a matching exercise.
 *   3. Fetch the exercise's main image.
 *   4. Return a 302 redirect to the wger.de image URL (so the browser
 *      caches it directly).
 *
 * If no match is found, returns 404 (and the client falls back to the
 * inline SVG category icon).
 *
 * wger.de API docs: https://wger.de/api/v2/
 * wger.de is open-source (AGPL-3.0): https://github.com/wger-project/wger
 */

// Map Arabic exercise names → English search keywords for wger.de
const ARABIC_TO_ENGLISH: Array<{ ar: string[]; en: string }> = [
  // Chest
  { ar: ["بنش بريس", "بنش بالبار", "ضغط بنش"], en: "Bench press" },
  { ar: ["بنش مائل", "ضغط مائل"], en: "Incline bench press" },
  { ar: ["بنش بالدمبل", "ضغط دمبل"], en: "Dumbbell bench press" },
  { ar: ["ضغط أرضي", "ضغط ارضي", "بوش اب"], en: "Push-up" },
  { ar: ["ديبس", "dips"], en: "Dips" },
  { ar: ["رفرفة صدر", "رفرفة"], en: "Dumbbell fly" },
  // Back
  { ar: ["ديدليفت"], en: "Deadlift" },
  { ar: ["تجديف بالبار"], en: "Barbell row" },
  { ar: ["تجديف بالدمبل", "دمبل تجديف"], en: "Dumbbell row" },
  { ar: ["عقلة", "pullup"], en: "Pull-up" },
  { ar: ["سحب أمامي", "سحب امامي", "لات"], en: "Lat pulldown" },
  { ar: ["فيس بول"], en: "Face pull" },
  // Shoulders
  { ar: ["ضغط كتف", "military", "ohp"], en: "Military press" },
  { ar: ["ضغط كتف بالدمبل"], en: "Dumbbell shoulder press" },
  { ar: ["رفرفة جانبية"], en: "Lateral raise" },
  // Legs
  { ar: ["سكوات", "squat"], en: "Squat" },
  { ar: ["فرنت سكوات"], en: "Front squat" },
  { ar: ["ليج بريس"], en: "Leg press" },
  { ar: ["لانجز", "لانج"], en: "Lunges" },
  { ar: ["ليج كيرل", "هامسترنج"], en: "Leg curl" },
  { ar: ["روماني", "rdl", "رومانيان"], en: "Romanian deadlift" },
  { ar: ["هيب ثرست"], en: "Hip thrust" },
  { ar: ["كاف ريز", "كاف"], en: "Calf raise" },
  // Arms
  { ar: ["بايسبس", "bicep", "كيرل"], en: "Bicep curl" },
  { ar: ["ترايسبس", "pushdown", "بوش داون"], en: "Triceps pushdown" },
  // Core
  { ar: ["بلانك", "plank"], en: "Plank" },
  { ar: ["كرنش", "crunch"], en: "Crunches" },
  // Cardio
  { ar: ["جري", "running"], en: "Running" },
];

function translateName(name: string): string {
  const lower = name.toLowerCase().trim();
  // If already English, return as-is
  if (/^[a-z0-9\s\-_]+$/i.test(name)) return name;
  // Find Arabic match
  for (const { ar, en } of ARABIC_TO_ENGLISH) {
    for (const a of ar) {
      if (lower.includes(a.toLowerCase()) || name.includes(a)) {
        return en;
      }
    }
  }
  return name;
}

// In-memory cache: exercise name → image URL (avoids re-fetching from wger)
const cache = new Map<string, string | null>();
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours
const cacheTimestamps = new Map<string, number>();

async function fetchExerciseImage(name: string): Promise<string | null> {
  const englishName = translateName(name);
  const cacheKey = englishName.toLowerCase();

  // Check cache
  const cachedAt = cacheTimestamps.get(cacheKey);
  if (cachedAt && Date.now() - cachedAt < CACHE_TTL) {
    return cache.get(cacheKey) || null;
  }

  try {
    // Step 1: Search for the exercise by name
    const searchUrl = `https://wger.de/api/v2/exercise-search/?format=json&term=${encodeURIComponent(englishName)}`;
    const searchRes = await fetch(searchUrl, {
      headers: {
        Accept: "application/json",
        "User-Agent": "MuscleHub/1.0 (fitness coaching platform)",
      },
      signal: AbortSignal.timeout(8000),
    });

    if (!searchRes.ok) {
      cache.set(cacheKey, null);
      cacheTimestamps.set(cacheKey, Date.now());
      return null;
    }

    const searchData = await searchRes.json();
    const suggestions = searchData?.suggestions || [];
    if (suggestions.length === 0) {
      cache.set(cacheKey, null);
      cacheTimestamps.set(cacheKey, Date.now());
      return null;
    }

    // Find the best match (exact or starts-with name match)
    const exact = suggestions.find((s: any) => {
      const n = (s.value || s.name || "").toLowerCase();
      return n === englishName.toLowerCase() || n.startsWith(englishName.toLowerCase());
    });
    const match = exact || suggestions[0];
    const exerciseUuid = match?.data?.uuid || match?.uuid;
    if (!exerciseUuid) {
      cache.set(cacheKey, null);
      cacheTimestamps.set(cacheKey, Date.now());
      return null;
    }

    // Step 2: Fetch the exercise's main image
    const imgUrl = `https://wger.de/api/v2/exerciseimage/?format=json&exercise_uuid=${exerciseUuid}&is_main=True&limit=1`;
    const imgRes = await fetch(imgUrl, {
      headers: {
        Accept: "application/json",
        "User-Agent": "MuscleHub/1.0 (fitness coaching platform)",
      },
      signal: AbortSignal.timeout(8000),
    });

    if (!imgRes.ok) {
      cache.set(cacheKey, null);
      cacheTimestamps.set(cacheKey, Date.now());
      return null;
    }

    const imgData = await imgRes.json();
    const image = imgData?.results?.[0];
    if (!image) {
      cache.set(cacheKey, null);
      cacheTimestamps.set(cacheKey, Date.now());
      return null;
    }

    // Use the medium thumbnail (400x400) for good quality + reasonable size
    const imageUrl = image.thumbnails?.medium || image.image;
    if (!imageUrl) {
      cache.set(cacheKey, null);
      cacheTimestamps.set(cacheKey, Date.now());
      return null;
    }

    cache.set(cacheKey, imageUrl);
    cacheTimestamps.set(cacheKey, Date.now());
    return imageUrl;
  } catch (e) {
    console.error("[exercise-image] Error fetching from wger.de:", e);
    cache.set(cacheKey, null);
    cacheTimestamps.set(cacheKey, Date.now());
    return null;
  }
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const name = url.searchParams.get("name");

  if (!name) {
    return NextResponse.json({ error: "Missing 'name' parameter" }, { status: 400 });
  }

  const imageUrl = await fetchExerciseImage(name);

  if (!imageUrl) {
    return NextResponse.json({ error: "No image found", fallback: true }, { status: 404 });
  }

  // Redirect to the wger.de image URL (browser caches it directly)
  return NextResponse.redirect(imageUrl, {
    status: 302,
    headers: {
      "Cache-Control": "public, max-age=86400", // cache for 24h
    },
  });
}
