import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { createClient } from "@supabase/supabase-js";

/**
 * POST /api/send-email — Phase 72 (owner request)
 *
 * Sends the visitor their tool results as a professional HTML email,
 * AFTER saving the lead in the `tool_leads` table (save first, send second).
 *
 * This is the emailing endpoint used by LeadCaptureCard on all six free
 * tools. The old /api/tools/lead stays alive as the save-only endpoint
 * (used by the newsletter form).
 *
 * Env vars (set on Vercel):
 *   EMAIL_SERVER_HOST / EMAIL_SERVER_PORT / EMAIL_SERVER_USER / EMAIL_SERVER_PASSWORD
 *   EMAIL_FROM (optional display name) / EMAIL_REPLY_TO (optional)
 *
 * Body:
 *   {
 *     tool_slug: "calorie-calculator" | "bmi-calculator" | "macro-calculator" | "body-fat-calculator" | "water-tracker" | "meal-planner",
 *     email: string,
 *     name?: string,
 *     result_summary?: string,
 *     result_json?: object,
 *     lang?: "ar" | "en"
 *   }
 *
 * Returns:
 *   { ok: true, id?: string, leadSaved: boolean }
 */

export const runtime = "nodejs";

/* ------------------------------------------------------------------ */
/*  Rate limits                                                        */
/*  - per IP: 5 requests / 10 minutes (same policy as /api/tools/lead) */
/*  - per email: 3 emails / hour (anti-harassment)                     */
/* ------------------------------------------------------------------ */
const IP_WINDOW = 10 * 60 * 1000;
const IP_MAX = 5;
const ipRequests = new Map<string, { count: number; resetAt: number }>();

function checkIpLimit(ip: string): boolean {
  const now = Date.now();
  const entry = ipRequests.get(ip);
  if (!entry || now > entry.resetAt) {
    ipRequests.set(ip, { count: 1, resetAt: now + IP_WINDOW });
    return true;
  }
  if (entry.count >= IP_MAX) return false;
  entry.count++;
  return true;
}

const EMAIL_WINDOW = 60 * 60 * 1000;
const EMAIL_MAX = 3;
const emailRequests = new Map<string, number[]>();

function checkEmailLimit(email: string): boolean {
  const now = Date.now();
  const recent = (emailRequests.get(email) ?? []).filter((t) => now - t < EMAIL_WINDOW);
  if (recent.length >= EMAIL_MAX) {
    emailRequests.set(email, recent);
    return false;
  }
  recent.push(now);
  emailRequests.set(email, recent);
  return true;
}

/* ------------------------------------------------------------------ */
/*  Allowed tools                                                      */
/* ------------------------------------------------------------------ */
const ALLOWED_TOOLS = [
  "calorie-calculator",
  "bmi-calculator",
  "macro-calculator",
  "body-fat-calculator",
  "water-tracker",
  "meal-planner",
] as const;

type ToolSlug = (typeof ALLOWED_TOOLS)[number];

/* ------------------------------------------------------------------ */
/*  Per-tool result labels + smart tips (ar / en)                      */
/* ------------------------------------------------------------------ */
type FieldDef = { key: string; ar: string; en: string; suffix?: string };

const TOOL_FIELDS: Record<ToolSlug, FieldDef[]> = {
  "calorie-calculator": [
    { key: "target", ar: "سعرات الهدف اليومية", en: "Daily target calories", suffix: " kcal" },
    { key: "tdee", ar: "سعرات الثبات (TDEE)", en: "Maintenance (TDEE)", suffix: " kcal" },
    { key: "bmr", ar: "معدل الأيض الأساسي (BMR)", en: "Basal metabolic rate (BMR)", suffix: " kcal" },
    { key: "protein", ar: "بروتين", en: "Protein", suffix: " g" },
    { key: "carbs", ar: "كارب", en: "Carbs", suffix: " g" },
    { key: "fat", ar: "دهون", en: "Fat", suffix: " g" },
  ],
  "bmi-calculator": [
    { key: "bmi", ar: "كتلة الجسم (BMI)", en: "Body Mass Index (BMI)" },
    { key: "category", ar: "التصنيف", en: "Category" },
    { key: "idealWeightMin", ar: "الوزن الصحي — أدنى حد", en: "Healthy weight — min", suffix: " kg" },
    { key: "idealWeightMax", ar: "الوزن الصحي — أقصى حد", en: "Healthy weight — max", suffix: " kg" },
  ],
  "macro-calculator": [
    { key: "calories", ar: "سعراتك اليومية", en: "Your daily calories", suffix: " kcal" },
    { key: "protein_g", ar: "بروتين", en: "Protein", suffix: " g" },
    { key: "carbs_g", ar: "كارب", en: "Carbs", suffix: " g" },
    { key: "fat_g", ar: "دهون", en: "Fat", suffix: " g" },
    { key: "protein_cal", ar: "سعرات البروتين", en: "Protein calories", suffix: " kcal" },
    { key: "carbs_cal", ar: "سعرات الكارب", en: "Carb calories", suffix: " kcal" },
    { key: "fat_cal", ar: "سعرات الدهون", en: "Fat calories", suffix: " kcal" },
  ],
  "body-fat-calculator": [
    { key: "bf", ar: "نسبة الدهون", en: "Body fat percentage", suffix: "%" },
    { key: "category", ar: "التصنيف", en: "Category" },
    { key: "fatMass", ar: "كتلة الدهون", en: "Fat mass", suffix: " kg" },
    { key: "leanMass", ar: "الكتلة الصافية (العضلية)", en: "Lean mass", suffix: " kg" },
  ],
  "water-tracker": [
    { key: "goal_ml", ar: "هدفك اليومي من الماء", en: "Daily water goal", suffix: " ml" },
    { key: "consumed_today_ml", ar: "المسجل اليوم", en: "Logged today", suffix: " ml" },
    { key: "progress_pct", ar: "نسبة الإنجاز", en: "Progress", suffix: "%" },
  ],
  "meal-planner": [
    { key: "meals", ar: "عدد الوجبات", en: "Meals" },
    { key: "calories", ar: "إجمالي السعرات", en: "Total calories", suffix: " kcal" },
    { key: "protein", ar: "إجمالي البروتين", en: "Total protein", suffix: " g" },
    { key: "carbs", ar: "إجمالي الكارب", en: "Total carbs", suffix: " g" },
    { key: "fat", ar: "إجمالي الدهون", en: "Total fat", suffix: " g" },
  ],
};

const TOOL_NAMES: Record<ToolSlug, { ar: string; en: string }> = {
  "calorie-calculator": { ar: "حاسبة السعرات", en: "Calorie Calculator" },
  "bmi-calculator": { ar: "حاسبة BMI", en: "BMI Calculator" },
  "macro-calculator": { ar: "حاسبة الماكروز", en: "Macro Calculator" },
  "body-fat-calculator": { ar: "حاسبة نسبة الدهون", en: "Body Fat Calculator" },
  "water-tracker": { ar: "متتبع الماء", en: "Water Tracker" },
  "meal-planner": { ar: "مخطط الوجبات", en: "Meal Planner" },
};

const TOOL_TIPS: Record<ToolSlug, { ar: string[]; en: string[] }> = {
  "calorie-calculator": {
    ar: [
      "التزم بسعراتك المستهدفة أسبوعين كاملين قبل تقييم أي تعديل.",
      "قسّم سعراتك على 3-4 وجبات حتى تبقى شبعان طوال اليوم.",
      "ضع مصدر بروتين في كل وجبة لحماية عضلاتك.",
      "اشرب 2-3 لتر ماء يومياً — الجفاف بيوهم بالجوع.",
      "نم 7-8 ساعات؛ قلة النوم بتزيد الرغبة في الأكل.",
      "حاول تصل 8 آلاف خطوة يومياً كحد أدنى.",
    ],
    en: [
      "Stick to your target calories for two full weeks before adjusting anything.",
      "Split your calories across 3-4 meals to stay full all day.",
      "Include a protein source in every meal to protect your muscle.",
      "Drink 2-3 liters of water daily — dehydration mimics hunger.",
      "Sleep 7-8 hours; poor sleep increases cravings.",
      "Aim for at least 8,000 steps per day.",
    ],
  },
  "bmi-calculator": {
    ar: [
      "استهدف النطاق الصحي، مش رقم واحد مثالي.",
      "نزول 0.5-1 كجم أسبوعياً هو الهدف الآمن والمستدام.",
      "اجمع بين تمارين المقاومة والكارديو لأفضل نتيجة.",
      "راقب محيط الوسط مع الوزن — مؤشر صحي أهم.",
      "BMI بيتجاهل الكتلة العضلية، فقارن النتائج بقياسات جسمك.",
    ],
    en: [
      "Aim for the healthy range, not one perfect number.",
      "Losing 0.5-1 kg per week is the safe, sustainable pace.",
      "Combine resistance training with cardio for best results.",
      "Track your waist measurement too — it matters more than BMI.",
      "BMI ignores muscle mass, so always cross-check with body measurements.",
    ],
  },
  "macro-calculator": {
    ar: [
      "وزن طعامك بميزان لأول أسبوعين لتتعرف على الكميات الحقيقية.",
      "وزّع البروتين بالتساوي على وجبات اليوم.",
      "حط معظم الكارب حول وقت التمرين لأداء أفضل.",
      "اختار دهون صحية: زيت زيتون، مكسرات، سلمون.",
      "راجع أرقامك كل أسبوعين وعدّل على النتائج الفعلية.",
    ],
    en: [
      "Weigh your food for the first two weeks to learn real portions.",
      "Spread protein evenly across your daily meals.",
      "Place most of your carbs around your workout for better performance.",
      "Pick healthy fats: olive oil, nuts, salmon.",
      "Review your numbers every two weeks and adjust based on real results.",
    ],
  },
  "body-fat-calculator": {
    ar: [
      "الحفاظ على العضلة وقت التنشيف محتاج بروتين كافي وتمارين مقاومة.",
      "عجز حراري بسيط (300-500 سعرة) أفضل بكتير من العجز الشديد.",
      "قيس نسبتك بنفس الطريقة ونفس الوقت أسبوعياً للمقارنة العادلة.",
      "استهدف هبوط 0.5-1 كجم أسبوعياً كحد أقصى.",
      "ادّي نفسك 8-12 أسبوع لترى فرق واضح.",
    ],
    en: [
      "Keeping muscle while cutting needs enough protein and resistance training.",
      "A small deficit (300-500 kcal) beats an aggressive one every time.",
      "Measure with the same method at the same time weekly for fair comparisons.",
      "Aim for a maximum drop of 0.5-1 kg per week.",
      "Give yourself 8-12 weeks to see a clear difference.",
    ],
  },
  "water-tracker": {
    ar: [
      "حمل زجاجة ماء معك واشرب كوب كل ساعتين.",
      "اشرب كوب ماء قبل كل وجبة بـ 20 دقيقة.",
      "زود الماء في أيام التمرين والجو الحار.",
      "لون البول الفاتح علامة كفاية الشرب.",
    ],
    en: [
      "Carry a water bottle and drink a glass every two hours.",
      "Drink a glass of water 20 minutes before each meal.",
      "Increase intake on training days and hot days.",
      "Light-colored urine means you're drinking enough.",
    ],
  },
  "meal-planner": {
    ar: [
      "حضّر وجباتك مسبقاً ليومين أو ثلاثة لتلتزم بالخطة.",
      "خلّي 80% من طعامك كامل غير مصنّع.",
      "استخدم القائمة قبل التسوق عشان تمنع الشراء العشوائي.",
      "كرر الوصفات الناجحة — التنويع مش شرط يومي.",
    ],
    en: [
      "Prep two or three days ahead to stay on plan.",
      "Keep 80% of your food whole and unprocessed.",
      "Shop with your plan list to avoid impulse buys.",
      "Repeat winning recipes — variety isn't required daily.",
    ],
  },
};

/* ------------------------------------------------------------------ */
/*  HTML escaping + email builders                                     */
/* ------------------------------------------------------------------ */
function esc(v: unknown): string {
  return String(v ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

type ToolResults = Record<string, unknown>;

function resultsRows(tool: ToolSlug, results: ToolResults, isAr: boolean): string {
  const fields = TOOL_FIELDS[tool];
  const rows: string[] = [];

  for (const f of fields) {
    const raw = results[f.key];
    if (raw === undefined || raw === null || String(raw).trim() === "") continue;
    const label = isAr ? f.ar : f.en;
    const value = `${esc(raw)}${f.suffix ?? ""}`;
    rows.push(
      `<tr style="background:${rows.length % 2 === 0 ? "#ffffff" : "#f5f5f7"};">
        <td style="padding:12px 16px;font-weight:600;color:#1d1d1f;border-bottom:1px solid #e5e5ea;">${esc(label)}</td>
        <td style="padding:12px 16px;color:#1d1d1f;border-bottom:1px solid #e5e5ea;font-size:16px;" dir="ltr" align="start">${value}</td>
      </tr>`,
    );
  }

  // Fallback: any extra fields we didn't map (future-proof)
  if (rows.length === 0) {
    for (const [k, v] of Object.entries(results)) {
      if (v === null || v === undefined || String(v).trim() === "") continue;
      if (typeof v === "object") continue;
      rows.push(
        `<tr style="background:${rows.length % 2 === 0 ? "#ffffff" : "#f5f5f7"};">
          <td style="padding:12px 16px;font-weight:600;color:#1d1d1f;border-bottom:1px solid #e5e5ea;">${esc(k)}</td>
          <td style="padding:12px 16px;color:#1d1d1f;border-bottom:1px solid #e5e5ea;font-size:16px;" dir="ltr" align="start">${esc(v)}</td>
        </tr>`,
      );
    }
  }

  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0"
    style="border:1px solid #e5e5ea;border-radius:16px;overflow:hidden;border-collapse:separate;">${rows.join("")}</table>`;
}

function tipsHtml(tool: ToolSlug, isAr: boolean): string {
  const tips = isAr ? TOOL_TIPS[tool].ar : TOOL_TIPS[tool].en;
  return tips
    .map((t) => `<li style="margin:0 0 10px;padding:0;color:#424245;line-height:1.9;">${esc(t)}</li>`)
    .join("");
}

function buildEmailHtml(
  tool: ToolSlug,
  name: string,
  results: ToolResults,
  isAr: boolean,
): string {
  const toolName = isAr ? TOOL_NAMES[tool].ar : TOOL_NAMES[tool].en;
  const greeting = name
    ? isAr
      ? `أهلاً ${esc(name)}،`
      : `Hi ${esc(name)},`
    : isAr
      ? "أهلاً بك،"
      : "Hi there,";
  const dir = isAr ? "rtl" : "ltr";
  const align = isAr ? "right" : "left";

  return `<!DOCTYPE html>
<html lang="${isAr ? "ar" : "en"}" dir="${dir}">
<head><meta charset="utf-8" /><meta name="viewport" content="width=device-width,initial-scale=1" /></head>
<body style="margin:0;padding:0;background:#f5f5f7;font-family:-apple-system,'Segoe UI',Tahoma,Arial,sans-serif;">
  <div style="max-width:600px;margin:0 auto;padding:24px 16px;" dir="${dir}">

    <div style="background:#1d1d1f;border-radius:18px 18px 0 0;padding:28px 24px;text-align:center;">
      <div style="color:#ffffff;font-size:22px;font-weight:700;letter-spacing:0.3px;">Musclehubeg</div>
      <div style="color:#a1a1a6;font-size:14px;margin-top:6px;">${esc(toolName)}</div>
    </div>

    <div style="background:#ffffff;padding:32px 28px;text-align:${align};">
      <p style="margin:0 0 8px;font-size:18px;font-weight:700;color:#1d1d1f;">${greeting}</p>
      <p style="margin:0 0 24px;color:#6e6e73;line-height:1.9;">
        ${isAr
          ? `نتائجك من ${esc(toolName)} جاهزة أدناه، ومعها نصائح ذكية مختارة تساعدك تحوّل الأرقام لنتائج حقيقية.`
          : `Your ${esc(toolName)} results are below, along with smart tips to turn the numbers into real progress.`}
      </p>

      <p style="margin:0 0 12px;font-size:16px;font-weight:700;color:#1d1d1f;">${isAr ? "نتائجك" : "Your results"}</p>
      ${resultsRows(tool, results, isAr)}

      <p style="margin:28px 0 12px;font-size:16px;font-weight:700;color:#34c759;">${isAr ? "نصائح ذكية لك" : "Smart tips for you"}</p>
      <ul style="margin:0;padding:0 20px 0 0;list-style:disc;" dir="${dir}">${tipsHtml(tool, isAr)}</ul>

      <div style="text-align:center;margin:32px 0 8px;">
        <a href="https://musclehubeg.com"
          style="display:inline-block;background:#0071e3;color:#ffffff;text-decoration:none;
          padding:14px 36px;border-radius:999px;font-weight:600;font-size:15px;">
          ${isAr ? "ابدأ رحلتك مع Musclehubeg" : "Start your journey at Musclehubeg"}
        </a>
      </div>
    </div>

    <div style="background:#1d1d1f;border-radius:0 0 18px 18px;padding:20px 24px;text-align:center;">
      <p style="margin:0;color:#8e8e93;font-size:12px;line-height:1.8;">
        ${isAr
          ? `وصلتك هذه الرسالة لأنك طلبت نتائجك من ${esc(toolName)} على موقع Musclehubeg.`
          : `You received this email because you requested your ${esc(toolName)} results on Musclehubeg.`}<br />
        © 2026 Musclehubeg — ${isAr ? "كل الحقوق محفوظة" : "All rights reserved"}
      </p>
    </div>

  </div>
</body>
</html>`;
}

function buildEmailText(
  tool: ToolSlug,
  name: string,
  results: ToolResults,
  isAr: boolean,
): string {
  const lines: string[] = [];
  for (const f of TOOL_FIELDS[tool]) {
    const raw = results[f.key];
    if (raw === undefined || raw === null || String(raw).trim() === "") continue;
    lines.push(`- ${isAr ? f.ar : f.en}: ${raw}${f.suffix ?? ""}`);
  }
  return [
    isAr ? (name ? `أهلاً ${name}،` : "أهلاً بك،") : name ? `Hi ${name},` : "Hi there,",
    "",
    isAr ? `نتائجك من ${TOOL_NAMES[tool].ar}:` : `Your ${TOOL_NAMES[tool].en} results:`,
    ...lines,
    "",
    "https://musclehubeg.com",
  ].join("\n");
}

/* ------------------------------------------------------------------ */
/*  Handler                                                            */
/* ------------------------------------------------------------------ */
export async function POST(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (!checkIpLimit(ip)) {
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      { status: 429, headers: { "Retry-After": "600" } },
    );
  }

  try {
    const body = await request.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: "Invalid body" }, { status: 400 });
    }

    const tool_slug = String(body.tool_slug ?? "");
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const name = typeof body.name === "string" ? body.name.trim().slice(0, 80) : "";
    const result_summary = typeof body.result_summary === "string" ? body.result_summary.slice(0, 500) : null;
    const result_json = (body.result_json ?? null) as ToolResults | null;
    const lang = body.lang === "en" ? "en" : "ar";

    if (!ALLOWED_TOOLS.includes(tool_slug as ToolSlug)) {
      return NextResponse.json({ error: "Invalid tool_slug" }, { status: 400 });
    }
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "Valid email is required" }, { status: 400 });
    }
    if (!result_json || typeof result_json !== "object") {
      return NextResponse.json({ error: "Missing results" }, { status: 400 });
    }
    if (!checkEmailLimit(email)) {
      return NextResponse.json({ error: "Too many emails for this address. Try later." }, { status: 429 });
    }

    /* ---- 1) Save the lead FIRST (owner directive: save before send) ---- */
    let leadSaved = false;
    let leadId: string | null = null;

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (supabaseUrl && supabaseAnonKey) {
      const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
      const supabase = serviceKey
        ? createClient(supabaseUrl, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } })
        : createClient(supabaseUrl, supabaseAnonKey, { auth: { persistSession: false, autoRefreshToken: false } });

      const { data, error } = await supabase
        .from("tool_leads")
        .insert({
          tool_slug,
          email,
          name: name || null,
          result_summary,
          result_json,
          lang,
          consent: true,
          type: "tool",
        })
        .select("id")
        .single();

      if (error) {
        // Never block the email on a DB hiccup — but log it loudly.
        console.error("[api/send-email] lead insert failed:", error.message);
      } else {
        leadSaved = true;
        leadId = data?.id ?? null;
      }
    } else {
      console.warn("[api/send-email] Supabase env missing — lead not saved (demo mode)");
    }

    /* ---- 2) Send the email ---- */
    const host = process.env.EMAIL_SERVER_HOST;
    const port = Number(process.env.EMAIL_SERVER_PORT ?? "587");
    const user = process.env.EMAIL_SERVER_USER;
    const pass = process.env.EMAIL_SERVER_PASSWORD;

    if (!host || !user || !pass) {
      console.error("[api/send-email] EMAIL_SERVER_* env vars are not configured");
      return NextResponse.json(
        { error: "Email service is not configured", leadSaved },
        { status: 500 },
      );
    }

    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
    });

    const isAr = lang === "ar";
    const toolName = isAr ? TOOL_NAMES[tool_slug as ToolSlug].ar : TOOL_NAMES[tool_slug as ToolSlug].en;
    const from = process.env.EMAIL_FROM ?? `Musclehubeg <${user}>`;
    const replyTo = process.env.EMAIL_REPLY_TO || undefined;

    await transporter.sendMail({
      from,
      to: email,
      replyTo,
      subject: isAr
        ? `نتائجك من ${toolName} — Musclehubeg`
        : `Your ${toolName} results — Musclehubeg`,
      html: buildEmailHtml(tool_slug as ToolSlug, name, result_json, isAr),
      text: buildEmailText(tool_slug as ToolSlug, name, result_json, isAr),
    });

    return NextResponse.json({ ok: true, id: leadId, leadSaved });
  } catch (e: any) {
    console.error("[api/send-email] Exception:", e?.message || e);
    return NextResponse.json(
      { error: "Failed to send the email. Please try again." },
      { status: 500 },
    );
  }
}
