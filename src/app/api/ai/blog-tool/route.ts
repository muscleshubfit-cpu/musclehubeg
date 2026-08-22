import { NextRequest, NextResponse } from "next/server";
import { callGemini, getGeminiApiKey } from "@/lib/gemini-wrapper";
import { callAIWithFallback } from "@/lib/ai-provider";
import { requireCoach, isAuthConfigured } from "@/lib/auth-server";

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    if (isAuthConfigured) {
      const auth = await requireCoach(request);
      if (auth instanceof Response) return auth;
    }

    const body = await request.json().catch(() => ({}));
    const { tool, params } = body as {
      tool: string;
      params: { content?: string; title?: string; keyword?: string; lang: "en" | "ar" };
    };

    if (!tool || !params) {
      return NextResponse.json({ error: "Missing tool or params" }, { status: 400 });
    }

    const isAr = params.lang === "ar";
    const content = params.content || "";
    const title = params.title || "";
    const keyword = params.keyword || "";

    const prompts: Record<string, string> = {
      seo_title: isAr
        ? `اكتب عنوان SEO جذاب (أقل من 60 حرف) لمقال بعنوان "${title}" وكلمة مفتاحية "${keyword}". أعد العنوان فقط بدون علامات اقتباس.`
        : `Write an SEO-optimized title (under 60 chars) for an article titled "${title}" with focus keyword "${keyword}". Return title only without quotes.`,
      meta_desc: isAr
        ? `اكتب وصف ميتا (أقل من 160 حرف) لمقال بعنوان "${title}". أعد الوصف فقط بدون علامات اقتباس.`
        : `Write a meta description (under 160 chars) for an article titled "${title}". Return description only without quotes.`,
      improve: isAr
        ? `حسّن readability ووضوح هذا النص مع الحفاظ على المعنى العلمي والأسلوب المشوق:\n\n${content.slice(0, 3000)}`
        : `Improve readability and clarity of this text while maintaining scientific accuracy and engaging tone:\n\n${content.slice(0, 3000)}`,
      faq: isAr
        ? `ولّد 3 أسئلة شائعة JSON بصيغة [{"question":"...","answer":"..."}] من هذا المحتوى:\n${content.slice(0, 3000)}`
        : `Generate 3 FAQ JSON as [{"question":"...","answer":"..."}] from this content:\n${content.slice(0, 3000)}`,
      cta: isAr
        ? `اكتب نص CTA قصير ومحفز يدعو القارئ للاشتراك في عضوية التدريب في MuscleHub.`
        : `Write a short motivating CTA copy inviting readers to subscribe to MuscleHub coaching.`,
      fb: isAr
        ? `اكتب منشور فيسبوك جذاب مع إيموجيز وهاشتاجات لمقال بعنوان "${title}".`
        : `Write an engaging Facebook post with emojis and hashtags for an article titled "${title}".`,
      linkedin: isAr
        ? `اكتب منشور لينكد إن احترافي يناقش النقاط الأساسية لمقال بعنوان "${title}".`
        : `Write a professional LinkedIn post highlighting key points for an article titled "${title}".`,
      x: isAr
        ? `اكتب تغريدة احترافية وموجزة (أقل من 280 حرف) لمقال بعنوان "${title}".`
        : `Write a concise professional tweet (under 280 chars) for an article titled "${title}".`,
      instagram: isAr
        ? `اكتب كابشن إنستجرام شيق مع نقاط وهاشتاجات قوية لمقال بعنوان "${title}".`
        : `Write an engaging Instagram caption with bullet points and strong hashtags for an article titled "${title}".`,
      summary: isAr
        ? `لخّص هذا المحتوى في 3 نقاط محددة وعملية:\n${content.slice(0, 3000)}`
        : `Summarize this content in 3 actionable bullet points:\n${content.slice(0, 3000)}`,
      image_prompt: isAr
        ? `اكتب prompt احترافي لتوليد صورة تناسب مقال بعنوان "${title}" وكلمة مفتاحية "${keyword}". بالإنجليزية.`
        : `Write a professional image generation prompt for an article titled "${title}" with keyword "${keyword}".`,
    };

    const prompt = prompts[tool] || prompts.improve;

    // 1. Try Gemini first
    try {
      const { text: geminiText } = await callGemini(
        prompt,
        {
          temperature: 0.7,
          maxTokens: 1200,
          jsonMode: tool === "faq",
          timeoutMs: 25_000,
        },
        2,
      );
      if (geminiText && geminiText.trim().length > 0) {
        return NextResponse.json({ text: geminiText.trim() });
      }
    } catch (gErr: any) {
      console.warn("[api/ai/blog-tool] Gemini notice, trying OpenRouter:", gErr?.message);
    }

    // 2. Try OpenRouter fallback
    const OPENROUTER_KEY = getGeminiApiKey();
    const OPENROUTER_BASE = "https://openrouter.ai/api/v1";
    if (OPENROUTER_KEY) {
      const models = [
        "nvidia/nemotron-3.5-lightning:free",
        "nvidia/nemotron-3-ultra-550b-a55b:free",
        "poolside/laguna-s-2.1:free",
      ];
      for (const model of models) {
        try {
          const { text } = await callAIWithFallback(
            prompt,
            {
              temperature: 0.7,
              maxTokens: 1000,
              jsonMode: tool === "faq",
              timeoutMs: 30_000,
            },
            {
              provider: "openrouter" as any,
              apiKey: OPENROUTER_KEY,
              model,
              baseUrl: OPENROUTER_BASE,
            },
          );
          if (text && text.trim().length > 0) {
            return NextResponse.json({ text: text.trim() });
          }
        } catch (e: any) {
          console.error(`[api/ai/blog-tool] OpenRouter ${model} failed:`, e?.message);
        }
      }
    }

    return NextResponse.json({ text: "" });
  } catch (err: any) {
    console.error("[api/ai/blog-tool] Error:", err?.message || err);
    return NextResponse.json({ error: err?.message || "Internal server error" }, { status: 500 });
  }
}
