import { NextRequest, NextResponse } from "next/server";
import { geminiGenerate, parseJsonResponse, isGeminiConfigured } from "@/lib/ai-gemini";
import { generateWorkoutPlan, generateNutritionPlan, type ClientContext } from "@/lib/ai-local";

/**
 * Generate a workout or nutrition plan.
 * Tries Gemini AI first, falls back to local rule-based generator.
 *
 * POST /api/ai/plan
 * Body: { clientId, planType, clientContext }
 * Returns: { title, content, source: "gemini" | "local" }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { clientId, planType, clientContext } = body;

    if (!clientId || !planType || !clientContext) {
      return NextResponse.json(
        { error: "Missing required fields: clientId, planType, clientContext" },
        { status: 400 },
      );
    }

    if (planType !== "workout" && planType !== "nutrition") {
      return NextResponse.json(
        { error: "planType must be 'workout' or 'nutrition'" },
        { status: 400 },
      );
    }

    const name = clientContext.name || "العميل";

    // Try Gemini AI first
    if (isGeminiConfigured) {
      try {
        if (planType === "workout") {
          const prompt = buildWorkoutPrompt(clientContext, name);
          const raw = await geminiGenerate(prompt);
          const content = parseJsonResponse(raw);
          if (content && content.days) {
            return NextResponse.json({
              title: `برنامج تمارين - ${name}`,
              content,
              source: "gemini",
            });
          }
        } else {
          const prompt = buildNutritionPrompt(clientContext, name);
          const raw = await geminiGenerate(prompt);
          const content = parseJsonResponse(raw);
          if (content && content.meals) {
            return NextResponse.json({
              title: `خطة تغذية - ${name}`,
              content,
              source: "gemini",
            });
          }
        }
      } catch (geminiErr) {
        console.error("[api/ai/plan] Gemini failed, falling back to local:", geminiErr);
      }
    }

    // Fallback to local rule-based generation
    const ctx: ClientContext = clientContext;
    if (planType === "workout") {
      const content = generateWorkoutPlan(ctx);
      return NextResponse.json({
        title: `برنامج تمارين - ${name}`,
        content,
        source: "local",
      });
    } else {
      const content = generateNutritionPlan(ctx);
      return NextResponse.json({
        title: `خطة تغذية - ${name}`,
        content,
        source: "local",
      });
    }
  } catch (e: any) {
    console.error("[api/ai/plan] Error:", e?.message || e);
    return NextResponse.json(
      { error: e?.message || "Internal server error" },
      { status: 500 },
    );
  }
}

function buildNutritionPrompt(ctx: any, name: string): string {
  const nutrition = ctx.nutrition || {};
  const fitness = ctx.fitness || {};

  const weight = nutrition.weight || "80";
  const height = nutrition.height || "175";
  const age = nutrition.age || "25";
  const target = nutrition.target || nutrition.target_weight || weight;
  const goal = fitness.goal || "general fitness";
  const activity = fitness.activity || "moderate";
  const meals = nutrition.meals || "4";
  const diet = nutrition.diet || "balanced";
  const allergies = nutrition.allergies || "";
  const disliked = nutrition.disliked || "";

  return `أنت أخصائي تغذية محترف. صمّم خطة تغذية يومية مخصصة باللغة العربية لعميل اسمه ${name}.

بيانات العميل:
- الوزن: ${weight} كجم
- الطول: ${height} سم
- العمر: ${age} سنة
- الوزن المستهدف: ${target} كجم
- الهدف: ${goal}
- مستوى النشاط: ${activity}
- عدد الوجبات: ${meals}
- النظام الغذائي: ${diet}
- حساسية: ${allergies || "لا يوجد"}
- أطعمة غير مرغوبة: ${disliked || "لا يوجد"}

احسب السعرات اليومية باستخدام معادلة Mifflin-St Jeor واحسب الماكروز حسب الهدف.
وزّع السعرات على الوجبات بشكل مناسب (الفطار أكبر من السناك مثلاً).
لكل صنف: احسب الجرامات بالضبط لتطابق السعرات المستهدفة.
استخدم أصناف متنوعة من المطبخ العربي والمصري.
لا تكرر نفس الصنف في وجبتين مختلفتين.

أعد النتيجة بصيغة JSON فقط:
{
  "overview": "نظرة عامة تشمل BMR و TDEE والعجز/الفائض والماكروز",
  "daily_calories": 2390,
  "macros": { "protein_g": 180, "carbs_g": 200, "fat_g": 70 },
  "meals": [
    {
      "name": "الفطار",
      "items": [
        { "food": "اسم الطعام", "amount": "100 جم", "calories": 165 }
      ],
      "notes": "ملاحظة قصيرة"
    }
  ]
}`;
}

function buildWorkoutPrompt(ctx: any, name: string): string {
  const fitness = ctx.fitness || {};
  const nutrition = ctx.nutrition || {};

  const goal = fitness.goal || "general fitness";
  const days = fitness.days || "4";
  const location = fitness.location || "gym";
  const experience = fitness.experience || "intermediate";
  const injuries = fitness.injuries || "";
  const weight = nutrition.weight || "80";

  return `أنت مدرب لياقة محترف. صمّم برنامج تمارين أسبوعي مخصص باللغة العربية لعميل اسمه ${name}.

بيانات العميل:
- الهدف: ${goal}
- أيام التدريب/أسبوع: ${days}
- مكان التدريب: ${location}
- مستوى الخبرة: ${experience}
- إصابات: ${injuries || "لا يوجد"}
- الوزن: ${weight} كجم

صمّم برنامج لـ ${days} أيام تدريب مع إدراج أيام راحة بينها.
استخدم أسماء أيام الأسبوع (السبت، الأحد، الإثنين، الثلاثاء، الأربعاء، الخميس، الجمعة).
لكل يوم تدريبي: 4-6 تمارين مناسبة للعضلة المستهدفة.
اجعل البرنامج متنوعاً كل مرة — لا تستخدم نفس التمارين دائماً.

أعد النتيجة بصيغة JSON فقط:
{
  "overview": "نظرة عامة تشمل عدد الأيام والتمارين والحجم التدريبي",
  "days": [
    {
      "day": "السبت",
      "focus": "صدر وترايسبس",
      "isRest": false,
      "exercises": [
        {
          "name": "بنش بريس",
          "sets": 4,
          "reps": "6-8",
          "rest": "2-3 دقائق",
          "notes": "نصيحة قصيرة بالعربية",
          "image": "https://upload.wikimedia.org/wikipedia/commons/thumb/8/8e/Bench_press.jpg/200px-Bench_press.jpg"
        }
      ]
    },
    {
      "day": "الأحد",
      "focus": "راحة",
      "isRest": true,
      "exercises": []
    }
  ]
}`;
}
