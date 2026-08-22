import { NextRequest, NextResponse } from "next/server";
import { callGemini, getGeminiApiKey } from "@/lib/gemini-wrapper";
import { callAIWithFallback } from "@/lib/ai-provider";
import { requireCoach, isAuthConfigured } from "@/lib/auth-server";

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    // Coach auth check if auth is configured
    if (isAuthConfigured) {
      const auth = await requireCoach(request);
      if (auth instanceof Response) return auth;
    }

    const body = await request.json().catch(() => ({}));

    // Support both flat payload ({ tool, content, language, title, category, focusKeyword })
    // and nested payload ({ tool, params: { content, title, keyword, lang } })
    const toolKeyRaw = body.tool || "";
    const params = body.params || {};

    const content = (body.content || params.content || "").trim();
    const title = (body.title || params.title || "").trim();
    const keyword = (body.focusKeyword || body.keyword || params.keyword || params.focusKeyword || "").trim();
    const category = (body.category || params.category || "").trim();
    const lang = body.language || params.lang || "ar";

    if (!toolKeyRaw) {
      return NextResponse.json({ error: "اسم الأداة مطلوب (tool is required)" }, { status: 400 });
    }

    // Normalize tool key aliases
    const toolKeyMap: Record<string, string> = {
      seo_title: "seo_title",
      meta_desc: "meta_desc",
      enhance: "enhance",
      improve: "enhance",
      faq: "faq",
      cta: "cta",
      fb_post: "fb_post",
      fb: "fb_post",
      linkedin: "linkedin",
      tweet: "tweet",
      x: "tweet",
      instagram: "instagram",
      summary: "summary",
      image_prompt: "image_prompt",
    };

    const tool = toolKeyMap[toolKeyRaw] || toolKeyRaw;
    const isAr = lang === "ar";

    const articleContext = `
عنوان المقال: ${title || "بدون عنوان"}
التصنيف: ${category || "عام"}
الكلمة المفتاحية: ${keyword || "غير محددة"}

محتوى المقال الحالي:
${content || title || "مقال عن اللياقة والتغذية"}
`.trim();

    const systemPromptAr =
      "أنت خبير تسويق رقمي وكوتش لياقة بدنية وتغذية محترف لـ MuscleHub. تعيد صياغة المحتوى وإخراجه بأسلوب ذكي وسلس ومؤثر باللغة العربية الفصحى البسيطة الموجهة للرياضيين والممارسين.";
    const systemPromptEn =
      "You are an expert digital marketer and master fitness coach for MuscleHub. You generate highly intelligent, engaging, and authoritative fitness content.";

    const systemPrompt = isAr ? systemPromptAr : systemPromptEn;

    let prompt = "";

    switch (tool) {
      case "seo_title":
        prompt = isAr
          ? `بناءً على المقال التالي، اقترح عنوان SEO جذاب ومناسب محفز للنقر (أقل من 60 حرفاً) يتضمن الكلمة المفتاحية "${keyword || title}" بشكل طبيعي ودقيق.\n\n${articleContext}\n\nاكتب العنوان فقط بدون مقدمات أو علامات تنصيص.`
          : `Based on the following article, generate a compelling, SEO-optimized title (under 60 characters) incorporating the focus keyword "${keyword || title}" naturally. Output ONLY the title text without quotes or intro.\n\n${articleContext}`;
        break;

      case "meta_desc":
        prompt = isAr
          ? `اكتب وصف ميتا (Meta Description) محفز للنقر لمحركات البحث يستعرض الفائدة الرئيسية للمقال في 120 إلى 155 حرفاً متضمناً الكلمة المفتاحية "${keyword || title}".\n\n${articleContext}\n\nاكتب الوصف فقط بدون مقدمات أو علامات تنصيص.`
          : `Write an engaging meta description (120-155 characters) summarizing the core value of the article with a subtle call to action. Output ONLY the meta description text.\n\n${articleContext}`;
        break;

      case "enhance":
        prompt = isAr
          ? `قم بإعادة صياغة وتحسين نص المقال التالي ليكون أكثر احترافية، سلاسة، وتنظيماً بأسلوب كوتش لياقة خبير. حسّن صياغة الجمل واستخدم العناوين الفرعية والنقاط المنظمة عند الحاجة.\n\n${articleContext}\n\nاكتب النص المحسّن كاملاً بتنسيق Markdown بدون أي مقدمات خارج النص.`
          : `Rewrite and enhance the following article text to improve clarity, engagement, formatting, and professional fitness coach tone. Use clean Markdown formatting.\n\n${articleContext}`;
        break;

      case "faq":
        prompt = isAr
          ? `استخرج وولّد 3 إلى 5 أسئلة وأجوبة شائعة (FAQ) هامة ومباشرة بناءً على محتوى المقال التالي.\n\nقواعد صارمة:\n- جميع الأسئلة والأجوبة MUST تكون بالعربية الفصحى فقط.\n- لا تستخدم أي كلمات إنجليزية إلا المصطلحات العلمية المختصرة بين قوسين (مثل: BMR, DNA).\n- الأسئلة يجب أن تكون مرتبطة مباشرة بمحتوى هذا المقال تحديدًا.\n- الأجوبة يجب أن تكون عملية ومفيدة للقارئ العربي.\n- التزم بتنسيق Markdown.\n\n${articleContext}`
          : `Generate 3 to 5 high-value Frequently Asked Questions and detailed answers based directly on this article's specific content. Format in clean Markdown.\n\n${articleContext}`;
        break;

      case "cta":
        prompt = isAr
          ? `اكتب 3 خيارات مختلفة ومقنعة لدعوة القارئ للاشتراك أو اتخاذ إجراء (CTA) لـ MuscleHub (مثل: حجز استشارة مع كوتش، الاشتراك في برنامج تدريب وتغذية مخصص، أو تحميل التطبيق).\n\n${articleContext}`
          : `Generate 3 persuasive Call-to-Action (CTA) options for MuscleHub based on this article context. Output in clean Markdown.\n\n${articleContext}`;
        break;

      case "fb_post":
        prompt = isAr
          ? `صمّم منشور فيسبوك تفاعلي وجذاب مستوحى من المقال التالي. استخدم جملة افتتاحية قوية (Hook)، 3-4 نقاط رئيسية مع إيموجي مناسبة، سؤالاً لإثارة التفاعل في التعليقات، ودعوة للانضمام لـ MuscleHub مع 3-5 هاشتاجات شائعة.\n\n${articleContext}`
          : `Create an engaging Facebook post based on this article with a strong hook, bullet points with emojis, a question to prompt comments, and relevant hashtags.\n\n${articleContext}`;
        break;

      case "linkedin":
        prompt = isAr
          ? `اكتب منشور لينكدإن مهني واحترافي مستوحى من المقال التالي. ركّز على القيمة العلمية والنصائح العملية بأسلوب القيادة الفكرية (Thought Leadership) مع تنسيق مريح للقراءة وهاشتاجات احترافية.\n\n${articleContext}`
          : `Write a professional, thought-leadership style LinkedIn post based on this article focusing on evidence-based insights and practical takeaways.\n\n${articleContext}`;
        break;

      case "tweet":
        prompt = isAr
          ? `اكتب تغريدة أو سلسلة تغريدات (Thread من 2-3 تغريدات) لـ X (تويتر) تلخص الفكرة الرئيسية للمقال في حدود 280 حرفاً للتغريدة الواحدة مع الهاشتاجات المناسبة.\n\n${articleContext}`
          : `Write a punchy tweet or short Twitter thread summarizing the key insight of this article with relevant hashtags.\n\n${articleContext}`;
        break;

      case "instagram":
        prompt = isAr
          ? `اكتب كابشن إنستجرام جذاب للمقال التالي. ابدأ بجملة خطافة (Hook)، ثم النقاط الرئيسية مع إيموجيز، وسؤال تفاعلي للمتابعين، بالإضافة إلى 8-12 هاشتاج رياضي شائع.\n\n${articleContext}`
          : `Write a creative Instagram caption for this article with a strong hook, bulleted key points, emojis, engagement question, and 8-12 fitness hashtags.\n\n${articleContext}`;
        break;

      case "summary":
        prompt = isAr
          ? `لخّص المقال التالي في 4 إلى 6 نقاط رئيسية مركزة بتنسيق Markdown تعرض أهم الاستنتاجات والنصائح العملية.\n\n${articleContext}`
          : `Provide a concise executive summary of this article in 4-6 bullet points highlighting the main takeaways.\n\n${articleContext}`;
        break;

      case "image_prompt":
        prompt = `Write a detailed, high-quality AI image generation prompt in English (suitable for Midjourney / Imagen 3 / Flux / DALL-E) to create a professional cover image DIRECTLY RELATED to this specific article:
Title: ${title || "Fitness & Nutrition"}
Category: ${category || "Fitness"}
Key Focus: ${keyword || content.slice(0, 150)}

CRITICAL: The image MUST visually represent the SPECIFIC subject matter of this article — NOT a generic gym or fitness scene.
- Example: If the article is about "creatine loading", show supplement containers and scoops.
- Example: If the article is about "sleep recovery", show a person sleeping with athletic recovery imagery.
- The image description MUST include the article's main topic in the prompt.

Requirements:
- Cinematic composition, 8k fitness photography, realistic lighting
- Authentic atmosphere matching the article topic
- NO text overlay, NO words, NO letters
- Output ONLY the raw prompt string in English.`;
        break;

      default:
        prompt = isAr
          ? `قم بمعالجة النص التالي وإخراجه بشكل احترافي:\n\n${articleContext}`
          : `Process and enhance the following content:\n\n${articleContext}`;
    }

    let resultText = "";

    // 1. Try Gemini first (gemini-3.7-flash -> 3.6-flash -> flash-latest)
    try {
      const { text: geminiText } = await callGemini(
        prompt,
        {
          systemPrompt,
          temperature: 0.7,
          maxTokens: 1500,
          timeoutMs: 25_000,
        },
        2
      );
      if (geminiText && geminiText.trim().length > 0) {
        resultText = geminiText.trim();
      }
    } catch (gErr: any) {
      console.warn("[api/ai/blog-tool] Gemini failed, attempting OpenRouter fallback:", gErr?.message || gErr);
    }

    // 2. Try OpenRouter fallback
    if (!resultText) {
      const OPENROUTER_KEY = getGeminiApiKey();
      const OPENROUTER_BASE = "https://openrouter.ai/api/v1";
      if (OPENROUTER_KEY) {
        const models = [
          "nvidia/nemotron-3.5-lightning:free",
          "nvidia/nemotron-3-super-120b-a12b:free",
        ];
        for (const model of models) {
          try {
            const { text } = await callAIWithFallback(
              prompt,
              {
                temperature: 0.7,
                maxTokens: 1200,
                timeoutMs: 25_000,
              },
              {
                provider: "openrouter" as any,
                apiKey: OPENROUTER_KEY,
                model,
                baseUrl: OPENROUTER_BASE,
              }
            );
            if (text && text.trim().length > 0) {
              resultText = text.trim();
              break;
            }
          } catch (e: any) {
            console.error(`[api/ai/blog-tool] OpenRouter ${model} failed:`, e?.message || e);
          }
        }
      }
    }

    if (!resultText) {
      return NextResponse.json(
        { error: "تعذر توليد المحتوى بالذكاء الاصطناعي حالياً. يرجى المحاولة مرة أخرى." },
        { status: 500 }
      );
    }

    // Clean up surrounding quotes for titles / meta descriptions
    if (tool === "seo_title" || tool === "meta_desc") {
      resultText = resultText.replace(/^["'«»]+|["'«»]+$/g, "").trim();
    }

    // Return both `result` and `text` for 100% frontend compatibility
    return NextResponse.json({ result: resultText, text: resultText, tool: toolKeyRaw });
  } catch (err: any) {
    console.error("[api/ai/blog-tool] Unexpected Error:", err?.message || err);
    return NextResponse.json({ error: err?.message || "حدث خطأ أثناء معالجة الطلب" }, { status: 500 });
  }
}
