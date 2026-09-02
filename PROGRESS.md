# PROGRESS.md — MuscleHub Status Board

> **آخر تحديث:** 2026-09-02 (المرحلة 93: **الدفعة الخامسة — الملفات المتوسطة غير الحساسة 385 → 244** — 14 ملف بقوا صفر، والأنواع المولّدة اكتملت بجداول المحافظ والإعلانات وسجلات EVO، وفاضل المجموعة الحساسة بس للدفعة الأخيرة)

---

## 2026-09-02 — المرحلة 93: الدفعة الخامسة — الملفات المتوسطة غير الحساسة (385 → 244) — طلب المالك «كمل»

- **طلب المالك:** «كمل» — تكملة المنهجية الموثقة: الملفات المتوسطة غير الحساسة (مكتبات + واجهات + مسار إعلانات المدربين)، والمجموعة الحساسة (مدفوعات/دخول/cron) لسه للدفعة الأخيرة بمراجعة مضاعفة.
- **النتيجة:** 385 → **244 تحذير** (−141) والملفات نزلت من 72 → **58**. 14 ملف بقوا **صفر تحذيرات** في مرحلتين متثبتين:
  - **المرحلة 1 (−93):** coach/ads 18 · ai/chat 15 · tier-limits 11 · data/tickets 11 · blog-images 8 · blog-admin 8 · coach-landing-server 8 · blog-topics 8 · ai-provider 6.
  - **المرحلة 2 (−48):** BlogEditorView 11 · CoachWalletView 11 · BlogAdminView 9 · CoachView 9 · profile/page 8.
- **التوسعة الموثقة للأنواع المولّدة (قانون المرآة — سابقة Phase 92):**
  - +جدول `coach_ads` (مرآة 0037+0038) · +`evo_chat_usage` (مرآة 0022) · +`evo_anon_usage` (مرآة 0028) · +دالة `coach_adjust_wallet` (مرآة 0035).
  - جدول `coach_pages` اكتمل بأعمدة 0037/0046/0049 الناقصة (review_status, photo_url, results_photos, السوشيال, whatsapp_phone, certificates).
  - تصديرات جديدة: CoachAd · CoachTopupRequest · CoachWalletTransaction · TicketMessage · EvoChatUsage · EvoAnonUsage.
- **أبرز النقاط:**
  - ملفات EVO الحية (ai/chat + ai-provider) بقت **صفر أي** مع الحفاظ الكامل على عقد البث SSE (delta/final/error) — نوع EvoClientContext + رد chat-completions مكتوب بالكامل + `parseJSON` الافتراضي بقى `unknown` (كل المستدعين بيحددوا النوع صراحة أصلاً).
  - عمود `source` القديم في blog_posts بيتشال بره نوع Insert بكاست واحد موثق عند الحد (نفس نمط Phase 92) — والـ payload نفسه متفحص بالكامل.
  - QR `<img>` في محفظة المدرب اتحافظ عليه مع تعليق موثق — الصور اللي بتتمسح بالكاميرا ما بتمرش على أوبتيمايزر الصور أبداً (سابقة بانر الأفلييت الموثقة).
  - حذف directive ميتين (eslint-disable فضلات بعد ما سببهم اترحل) في BlogEditorView + BlogAdminView.
- **tsc مسك ثغرات حقيقية:** سطر title كان ناقص في payload إنشاء المقال (اتمسح بالغلط واتصلح) · supabase-js الجديد بيرفض الخصائص الزيادة في insert/update → الكاستات الحدودية · status بتاع ticket الـlocalStorage كان متوسّع لنص عام.
- **الفحوص:** tsc 0 (بعد كل مرحلة) · eslint 0 على كل الملموس · vitest **191/191** ×2 · العد **244/58 ملف**.
- **اللي فاضل (244):** المجموعة الحساسة كلها تقريباً (admin/coach/paypal/auth/cron/wallet routes ≈150) + ملفات صغيرة متفرقة (≈94) — للدفعة الأخيرة بمراجعة مضاعفة حسب الخطة الموثقة.

---

## 2026-09-02 — المرحلة 92: الدفعة الرابعة — العمالقة التقنية (589 → 385) — طلب المالك «كمل اخر دفعه»

- **طلب المالك:** «كمل اخر دفعه» — الملفات التقنية الستة الكبيرة (خط الذكاء الاصطناعي بالكامل).
- **النتيجة:** 589 → **385 تحذير** (−204) والملفات نزلت من 79 → **72**. ست ملفات ضخمة بقوا **صفر**: ai-jobs (24) · referral (25) · ai-local (28) · ai-job-processors (34) · plan-generator (44) · blog-generate (45).
- **أهم الانجازات:**
  - جدول `ai_jobs` اتضاف للأنواع المولّدة → كل كاستات `as any` على العميل المميز اتشالت.
  - خط الوظائف كله متنوع: AiJobRow (payload/result كـ Record<string, unknown>) + sanitizer بيطلع Json من مدخل unknown.
  - `loose()` helper موحد (كاست واحد أمين عند كل مدخل) — مشترك بين ai-local وplan-generator.
  - blog-generate: أنواع البحث من external-search مباشرة + ArticleSeo + أنواع النتائج — ونوع ArticleBundle.research اتمدد بصراحة (مسار الذكاء الاصطناعي بيخزن ResearchResult كامل — كان الـany مخبيه).
  - وصول ميت اتشال: `research.trendingAngles` (مش موجود في النوع أصلاً — السلوك زي ما هو).
- **الفحوص:** tsc 0 ×6 · eslint 0 على كل الملموس · vitest **191/191** ×6 · العد **385/72 ملف**.
- **اللي فاضل (385):** ملفات صغيرة/متوسطة غير حساسة (~200) + المجموعة الحساسة (مدفوعات/أمان/cron ~180) للدفعة الأخيرة بمراجعة مضاعفة.

---

## 2026-09-02 — المرحلة 91: الدفعة التالتة من تقليص التحذيرات (749 → 589) — طلب المالك «نقفل باب الأخطاء القديمة»

- **طلب المالك:** «نفذ الافضل من اقتراحاتك … عايزين نقفل باب الاخطاء القديمة ونركز فى تطوير المشروع» — أعلى مردود بأقل خطر = الملفات الكبيرة غير الحساسة، بطريقة «طبقة البيانات الأول».
- **النتيجة:** 749 → **589 تحذير** (−160) والملفات اللي فيها تحذيرات نزلت من 87 → **79**. 3 ملفات ضخمة بقوا **صفر**: طبقة البيانات (4 ملفات، −42) + CoachClientView (−78، أكبر ملف في المشروع 3051 سطر) + PlansView/QuestionnairesView (−40).
- **الاستراتيجية الجديدة (موفقة):** اكتشفنا إن ملف الأنواع المولّد `src/lib/supabase/types.ts` شامل لكل الجداول والعميل مربوط بيه — يعني ردود select() كانت متنوعة أصلاً! التعريفات الجاية من الـlocalStorage fallbacks والأنوتيشن الزيادة. عرّفنا الأنواع **مرة واحدة** في طبقة البيانات والـviews استلمتها جاهزة.
- **اكتشافات مهمة:**
  - `NutritionPlanContent` كان ناقص حقول بتنتج فعلاً من المحرر (carbs_g/fat_g للصنوف، إجماليات الكارب والدهون) — اتصلحت.
  - **باج كامن اتصلح:** buildRecentPlanNames كان بيقارن `p.type === "nutrition"` — قيمة الـDB مش بتسمح بيها أبداً (meal|workout بس) → أسماء التنويع للخطط الغذائية كانت ميتة من غير حد يحس. اتصلحت + اتوثقت.
  - tsc مسك أخطاء حقيقية كانت الـ`any` مخبيها: صفوف fallback ناقصة أعمدة إلزامية، null يتسرب لرسم الوزن، undefined vs null عند حدود Insert→Row.
- **الأنواع الجديدة:** NutritionQuestionnaire / FitnessQuestionnaire / ProgressPhoto / PlanContent / PlanInsert / PlanUpdate / ProgressEntryInsert / QuestionnaireRow / SubscriptionRequestInput.
- **الفحوص:** tsc 0 · eslint 0 على كل الملفات الملموسة · vitest **191/191** ×3 مرات · العد النهائي **589/79 ملف**.
- **الباقي:** العمالقة التقنيين (blog-generate 45 · plan-generator 44 · ai-job-processors 34 · ai-local 28 · referral 25 · ai-jobs 24) + المجموعة الحساسة (مدفوعات/أمان/cron) في الآخر بمراجعة مضاعفة.

---

## 2026-09-02 — المرحلة 90: الدفعة التانية من تقليص التحذيرات (795 → 749) — طلب المالك

- **طلب المالك:** «كمل الدفعة الثانية» — حسب الترتيب الموثق: كل ملفات الـ1-2 تحذير **غير الحساسة**، والمجموعة الحساسة (أدمن/كوتش/cron/توثيق/باي بال) فاضلة للدفعة الأخيرة بمراجعة مضاعفة.
- **النتيجة:** 795 → **749 تحذير** (−46) وعدد الملفات اللي فيها تحذيرات نزل من 112 → **87**. الـ25 ملف المعدل بقوا **صفر تحذيرات**.
- **أنواع حقيقية مش إخفاء تحذيرات — أبرزها:**
  - paypal: نفس نمط الكود الموجود `getTier(planTier as TierId)` بدل `as any`.
  - blog.ts: نوع `BlogFaq` بقى معرّف في ملف الكلينت (مصدر واحد للحقيقة) وblog-server بيعيد تصديره، و`BlogPost.faq_json` بقى `BlogFaq[] | null` و`schema_json` بقى `Record<string, unknown> | null` — واشتقاق `BlogPostFull` من المرحلة 87 زي ما هو بالظبط.
  - طبقة الإشعارات اتكتبت بالكامل: نوعين مُصدَّرين `NotificationRow` + `AdminNotificationRow` والجرسنين بيستهلكهم — 9 تحذيرات اتقفلو.
  - chart.tsx (كود shadcn المستورد مع recharts v3): نوع محلي `ChartPayloadItem` بيضيّق `dataKey` و`value` (recharts بينوّع dataKey كدالة ممكنة — مينفعش تكون React key — وvalue ممكن تكون array) — وtsc نفسه كشف الفجوة دي في أول تمريرة.
  - حدود الـAPI: suggest-image بقى بيقرأ الـbody بنوع محدد + حراس runtime بدل `any`، وfood-search معاه نوع `OffProduct` لصفوف قاعدة بيانات المنتجات.
- **تحسينات سلوك ركبت مع الدفعة:** تحويل water-tracker لصفحة العضويات بقى `navigate("memberships")` (تنقل بدون إعادة تحميل الصفحة) بدل `window.location.href`.
- **استثناء موثق وحيد:** بانر الأفلييت `<img>` فضلت مقصودة (أصل SVG ثابت بيتغرز زي ما هو — next/image مضافة قيمة صفر) مع تعليق استثناء inline + السبب مكتوب.
- **حذف كود ميت:** `ui/image-stream-hero.tsx` — صفر استيرادات في كل المشروع؛ الإشارة الوحيدة تعليق في LandingView يقول «اتستبدلت بـhero ثابت» (محفوظة في git history).
- **البوابات:** tsc 0 · eslint صفر تحذيرات/صفر أخطاء على كل الـ25 ملف · vitest 191/191.
- **الجاي:** كل ملفات ≤2 تحذير الباقية حساسة (أدمن/كوتش/cron/توثيق/باي بال) — للدفعة الأخيرة بمراجعة مضاعفة، أو نكمل الملفات المتوسطة (blog-admin، SaveResultButton ×5، BlogEditorView ×11، ai-job-processors ×34…) — قرار المالك.

## 2026-09-02 — المرحلة 89: تجميعة حقيقية لـEVO (SSE) + قانون التوثيق الدائم — طلب المالك

- **طلب المالك:** «ابدأ ب ايفو الاول، ودايما عدل التوثيقات وملفات هيكل المشروع علشان ميحصلش لغبطة، خليها قاعده فى توثيق الايجنت».
- **التجميعة الحقيقية اشتغلت — الدليل الحي على الإنتاج:** بعت رسالة وشفت الأحداث واصلة كلمة كلمة: `event: delta` لكل قطعة ({"text":"Aim"} ثم {"text":" to"} ...) وبعدها `event: final` بالنص الكامل المنظف + الروابط + اسم النموذج. النص بيظهر للمستخدم **أول بأول زي ChatGPT**.
- **إزاي اتنفذت (3 طبقات):**
  1. **ai-provider:** دالة جديدة `callAIStream` — تطلب النموذج بـstream:true وتحلل أحداث SSE وتمرر كل قطعة فوراً؛ قطع "التفكير" بتتجمع بصمت (عمرك ما هتشوف كوارث التفكير). السلسلة نفسها (ترتيب سريع + تناوب المفاتيح + احتياط النماذج) زي ما هي: الاحتياط الصامت يشتغل **فقط قبل أول قطعة** — لو انقطع البث في المنتصف بيتسجل خطأ واضح والعميل يحتفظ بالنص الجزئي.
  2. **الـroute:** الرد الناجح بقى `text/event-stream` بأحداث delta/final/error — التنظيف (LaTeX/تفكير/ماركداون) لسه بيحصل على النص الكامل وبيتبعت في final (جودة الرد زي ما هي بالظبط). أخطاء 429 والحصص فضلت JSON زي ما هي.
  3. **العميل (الويدجت):** فقاعة رد فاضية بتظهر فوراً وبتكبر مع كل قطعة، وفي النهاية تتبدل بالنسخة المنظفة + الروابط + وسم «احفظ كخطة» + الحفظ للمشتركين — زي ما كان بالظبط.
- **قانون التوثيق الدائم (AGENTS.md §3.6):** أي تغيير كود لازم يتشحن مع توثيقه في **نفس المرحلة**: worklog + QA_CHECKLIST + PROGRESS كحد أدنى، وأي ملف بيوصف السلوك المتغير (README/DEVELOPER_GUIDE/AGENTS/build-info) يتحدث هو كمان. التوثيق الغلط الواثق أخطر من التوثيق الناقص — السطر اللي متحققش منه يتصلح أو يتشال. (الدليل: عبارة "streams from Vercel" القديمة اللي وثّقت حاجة مش حقيقية ولغبطت المالك).
- **التوثيقات المتحدثة في نفس المرحلة:** جدول الدوال في README (+سطر callAIStream) + ملاحظة البث · تدفق EVO وجدول الـAPI في DEVELOPER_GUIDE · عبارة build-info · QA_CHECKLIST + PROGRESS + worklog.
- **البوابات:** tsc 0 · eslint صفر تحذيرات جديدة (الـ21 القديمة معروفة) · vitest 191/191.

## 2026-09-02 — المرحلة 88: تأكيد EVO streaming على Vercel + أول دفعة تقليص التحذيرات — طلب المالك

- **طلب المالك:** «نبدأ في تقليص التحذيرات القديمة المتراكمة ملف ملف بأمان، محتاج تأكيد إن ايفو بيشتغل streaming على vercel».
- **تأكيد EVO (اختبار حي على الإنتاج):** POST على /api/ai/chat بدون تسجيل — رد **200 حقيقي** من نموذج `groq:openai/gpt-oss-20b` (أسرع نموذج في السلسلة) في **4.8 ثانية**. المحادثة شغالة ممتاز على Vercel ✅.
- **توضيح تقني مهم (بأمانة كاملة):** الرد بيوصلك **كامل دفعة واحدة** مش مجشر كلمة كلمة — الدليل: زمن أول بايت = الزمن الكلي بالضبط (4.79 = 4.79 ثانية). السبب: السيرفر بيستنى النص كامل عشان ينضفه (شيل LaTeX وأكواد التفكير) قبل ما يبعته، والواجهة بتستنى JSON كامل. عبارة "streams from Vercel" في build-info كانت توصيف خلط — اتصححت لـ"served from Vercel — full JSON reply, not token-streamed". **لو عايز تجميعة حقيقية (SSE) الكلمة بتظهر أول بأول — ممكن ننفذها في مرحلة جاية كتصميم مستقل.**
- **أول دفعة تقليص (ملف ملف بأمان): 804 → 795 تحذير:**
  - نمط `catch (e: any)` اتعوض بنمط `e instanceof Error` آمن وبنفس السلوك في 4 ملفات (send-email، tools/lead، NewsletterForm، ContactView).
  - exercise-image: نوع صريح لشكل اقتراحات wger API.
  - social-posts: `unknown[]` بدل `any` في معالجة الهاشتاجات.
  - use-membership-tier: نوع مصغر دقيق للاشتراك `{tier?: string | null}`.
  - **حذف كود ميت:** BlogView.tsx — مش مستوردة في أي مكان + بتستخدم أعمدة قديمة مش موجودة في الجدول الحالي (title_ar/cover_image) — كانت قنبلة لغبطة مستقبلية (محفوظة في git history).
- **البوابات:** tsc 0 · eslint صفر على كل ملفات الدفعة · vitest 191/191.
- **الخطة الجاية للدفعات:** ملفات 1-2 تحذير الأول (paypal lib، data layer الصغيرة، UI) ثم المتوسطة، والحساسة (auth، مدفوعات، cron) في الآخر بمراجعة مضاعفة.

## 2026-09-02 — المرحلة 87: قفل التحذيرات القديمة نهائياً + جواب أسئلة المالك — طلب المالك

- **سؤال المالك 1:** «هل llms.txt يحتاج إضافة في مكان زي ما بنعمل في جوجل سيرش كونسول للسايت ماب؟» — **لا، ومفيش حاجة نعملها.** مفيش "كونسول للذكاء الاصطناعي" موجود لحد اليوم؛ عناكب الـAI (GPTBot وClaudeBot وPerplexityBot وغيرهم — الـ14 المسموحين في robots.txt) بيكتشفوا الملف تلقائياً من مكانه الثابت `/llms.txt` — الاكتشاف بالتصميم أوتوماتيكي. اتأكدنا حياً على الإنتاج: llms.txt + llms-full.txt + rss.xml + ar/rss.xml + robots.txt كلهم 200 بأنواع محتوى صح. السايت ماب يفضل هو الوحيد اللي بيتسجل في GSC.
- **سؤال المالك 2:** «التحذيرات القديمة محتاجين نعمل فيها حاجة لمنع أي لغبطة في المستقبل؟» — **اتقفلت نهائياً.** الـ6 تحذيرات `any` المتكررة (blog-server.ts + LandingView.tsx) اتعوضوا بأنواع حقيقية: `BlogPostFull` بقى مشتق من `BlogPost` نفسه (`Omit<BlogPost,"faq_json">` + `faq_json: BlogFaq[] | null`) فمستحيل يحصل تفرق تاني بين النوعين، والكروت الأربعة في الرئيسة أخدت أنواع مخصصة. نتيجة جانبية مفيدة: الـ`any` كان بيخبي فرق حقيقي (3 حقول ناقصة في BlogPostFull) — TypeScript كشفه وهو مُصلَّح بنيوياً.
- **سياسة مضادة لللغبطة (مثبتة في QA_CHECKLIST):** فحص eslint الكامل للمستودع بيظهر ~810 تحذير `any` ميراث قديم في ملفات خارج بوابة الفحص المعتمدة — دي ضجيج معروف مش أخطاء جديدة، ومينفعش تتصلح عشوائياً (كل ملمسة = مخاطرة)؛ بتتصلح فقط عند إعادة بناء ملفها عمداً بموافقة المالك. البوابة المعتمدة: eslint على الملفات المتغيرة لازم يطبع **صفر**.
- **البوابات:** tsc 0 · eslint صفر تحذيرات/صفر أخطاء على الملفين المعدلين · vitest 191/191.

## 2026-09-02 — المرحلة 86: تدقيق السرعة والأداء + SEO/GEO + قنوات انتشار عضوية — طلب المالك

- **طلب المالك:** «تمام نفذ المقترح واعمل اختبار سرعه واداء للموقع بالكامل، وفحص seo، geo ومل ما يلزم لاقوى درجة انتشار سريع عالمى اورجاني».
- **نتائج السرعة (الإنتاج، أفضل من محاولتين لكل صفحة):** كل الـ13 صفحة المفحوصة (رئيسة EN/AR، مدونة EN/AR، مقال، تمارين، تفصيل تمرين AR، أكلات، تفصيل أكل AR، عضويات، أداة، انضمام المدربين، برامج) — TTFB ‏0.15-0.22 ثانية (حد جوجل الجيد < 0.8) · زمن كلي ≤ 0.36 ثانية · حجم HTML ‏53-150KB — **أداء ممتاز بلا استثناء**.
- **تدقيق SEO — كل الأساسيات موجودة:** hreflang ‏(en/ar/x-default) على الرئيسة والصفحات الثابتة والمقالات باللغتين ✓ · canonical لكل صفحة ✓ · OG كامل + Twitter Card ✓ · JSON-LD: Organization + WebSite/SearchAction + FAQPage (الرئيسة) + Article + BreadcrumbList + ImageObject (المقالات) ✓ · خريطة موقع ‏19,480 رابط بروابط hreflang مزدوجة داخلية (xhtml:link) تغطي كل الأقسام باللغتين ✓ · lang/dir ديناميكي ✓ — ملاحظة: فحص grep لحالة حروف hrefLang (بصيغة React) قد يخدع؛ الفحص الصحيح يؤكد وجودها.
- **تدقيق GEO — جاهز أصلاً بامتياز:** robots.txt يسمح صراحة لكل محركات الذكاء الاصطناعي (GPTBot · ChatGPT-User · OAI-SearchBot · ClaudeBot/Claude-Web/anthropic-ai · PerplexityBot · Google-Extended · Applebot/Extended · Meta-ExternalAgent · Amazonbot · YouBot) ✓ · llms.txt موجودة ومكتوبة بعناية ✓.
- **الفجوتان المكتشفتان — تنفذتاهما:** (1) **لا RSS** → أضيف `/rss.xml` (إنجليزي) + `/ar/rss.xml` (عربي) — RSS 2.0 بأحدث 50 مقالاً لكل لغة، تحديث ساعة ISR، آمن بدون DB (قائمة فاضية لا انهيار)، مع روابط اكتشاف تلقائي في head كل الصفحات؛ (2) **لا llms-full.txt** → أضيف مسار ديناميكي يوسع الدليل بآخر 30 مقالاً لكل لغة بمقتطفاتها ليستشهد بها محركات AI مباشرة.
- **مرافقات:** robots.txt (السماح للمسارات الثلاثة الجديدة) + llms.txt (إشارتا الفيدز والدليل الموسع) + دالة سيرفر جديدة `listPublishedPostsForFeed` في blog-server.ts بنمط fetchBlogForOG الآمن.
- **بوابات الفحص:** tsc 0 · eslint 0 أخطاء (4+2 تحذيرات `any` قديمة غير ملموسة) · vitest 191/191 · اختبار محلي للمسارات الثلاثة: 200 بنوع المحتوى الصحيح.

---

## 2026-09-02 — المرحلة 85: توثيق وتيرة المقالات + تصحيح التدفق الآلي + أداء صور الهبوط — طلب المالك

- **طلب المالك:** «تمام نفذ ملاحظاتك + اقتراحك فى الرد الى قبلة» — أي: (1) الرقم الصريح «6 مقالات/يوم» في ملفات التوثيق، (2) تصحيح وصف الخط القديم في دليل المطور، (3) إصلاح تحذير الأداء `sizes` لصورة الهيرو.
- **وتيرة المقالات صريحة الآن في كل ملف:** README (سطر Blog cadence: 6/يوم = 3 EN 12/16/22 UTC + 3 AR 05/11/18 UTC — كل تشغيل = مقال واحد بلغة واحدة، والموزّع 21:00 يكمل الفوائت فقط بلا تجاوز 3+3) + هذا الملف (سطر Blog CMS) + QA_CHECKLIST (قسم المرحلة 85) — AGENTS.md وworklog والأرشيف كانت صحيحة من قبل (3/لكل لغة = 6/يوم)، ولا يوجد أي رقم مخالف في أي ملف.
- **DEVELOPER_GUIDE — تصحيح التدفق الآلي:** قسم «التدفق الآلي (Cron)» كان بيوصف الخط المُلغى step1-pick/step2-generate/step3-publish — اتصحح للتدفق الحالي: ورك فلو لكل لغة يقود صف الطابور عبر p0-research → p1-outline → p2-content → p3-images → p4-review → p5-publish (بمصادقة CRON_SECRET، حالة الصف researched→published) + جدول الأداء أعيد تسميته من أسماء step2b/2c/2d القديمة لأسماء الخط الحالي.
- **أداء صفحة الهبوط (الاقتراح المنفذ):** صورة الهيرو (hero-athlete.jpg) وصورة EVO (evo-1.jpg) كانتا `fill` بدون `sizes` — تحذير Next.js ظهر في الفحص الحي (Phase 83). أُضيفت `sizes="(max-width: 768px) 100vw, 50vw"` للهيرو (عمود نصفي في grid) و`sizes="(max-width: 1024px) 100vw, 1024px"` لـEVO (عمود أوسط max-w-5xl) — بيتولد لها srcset صحيح وتحميل أصغر للجوال.
- **بوابات الفحص:** tsc 0 · eslint 0 أخطاء على المعدّل · vitest 191/191.

---

> 🗄️ **الأرشفة (Phase 82):** إدخالات المراحل 76 وما قبلها نُقلت إلى `archive/PROGRESS_ARCHIVE.md` (ملحق 2026-09-02) — التاريخ كامل ومحفوظ، وهذا الملف أصبح لوحة الحالة الحالية + آخر المراحل فقط.

---

## 2026-09-02 — المرحلة 81: قانون الحدود الجديد (١+١ أسبوعيًا / ٤+٤ شهريًا) + تدقيق نظام المدربين — طلب المالك

- **طلب المالك:** «بالنسبة الى المهام المؤجلة تاكد انها لم تتم تنفيذها اولا ثم نفذ ما لم يتم بعد، تاكد من نظام المدربين b2b و b2c وحدود العميل / المدرب لتوليد الخطط الاستبدال انها صحيحه وتعمل بدون مشاكل + عدل حدود توليد الخطط الى ١+١ أسبوعية اجمالى ٤+٤ شهريا بدلا من ٣+٣ شهريا، ثم عدل الوصف فى الصفحات و ملفات التوثيق وهيكل المشروع، اعمل خطة تنفيذ وابداء».
- **المهام المؤجلة — تحقق بالكود والسجل: كلها منفّذة سابقًا (لا عكس بعد):** نظام البريد (4 مهام — Phases 72/73)، مهام الـSEO الثلاثة (Phase 74)، الأفيليت 7 خطوات + عمولة 20% + الإشعارات الخمسة (Phase 75)، إلغاء Starter/Elite وأدمن بلا حدود وحذف 4 أقسام من صفحة الأرباح وcron 21:00 (Phase 75)، الاسترداد 7 أيام مشروط بعدم استخدام المميزات + حجب عمولات الأفيليت 7 أيام مع اعتبار الاسترجاعات (Phase 76)، أتمتة PayPal (capture-order/webhook + شحن محفظة المدرب) — لا يوجد أي بند متبقٍ في الطابور.
- **تدقيق b2b/b2c:** المساران سليمان — (B2C) ايفو يخصم من رصيد العميل الموحد (checkEvoPlanQuota) والاستبدال الأسبوعي على سجل plan_swaps؛ (B2B) الملكية (coach_assignments) + شرط التفعيل (اشتراك كوتشينج نشط وإلا 402) + نفس الرصيد الموحد (checkClientPlanQuota) — **وعولج التعارض الوحيد المكتشف:** سقف المدرب القديم 4/4 (0034 COACH_AI_PLAN_LIMIT) كان يسقّف سطح المدرب عند 4 حتى لعميل برو (الذي رصيده أعلى) — **أُلغي** ليحكم «الرصيد الواحد» من كل الأسطح.
- **القانون الجديد (مرسوم 2026-09-02):** بريميوم ١+١ أسبوعيًا بإجمالي ٤+٤ شهريًا · كوتشينج ١+١ / ٤+٤ · **برو ٢+٢ / ٨+٨** (الحفاظ على سلّم «ضعف بريميوم» المعلن — نافذة أسبوعية بتوقيت UTC مثبتة يوم الاثنين نفس اصطلاح تصفير الاستبدالات، والشهري أول الشهر) · مجاني 0.
- **التنفيذ:** memberships.ts (حقلان جديدان evoNutrition/WorkoutPlanWeeklyLimit + الأرقام + نصوص الباقات وجدول المقارنة)؛ tier-limits.ts (weekStartUtc الاثنين UTC + عدّادات أسبوعية موحدة المصدر + enforcePlanQuota بنافذتين مع blockedBy week|month)؛ /api/ai/chat (رسالة 429 تميز الحد الأسبوعي عن الشهري)؛ /api/ai/jobs (رسالة المدرب بالنسختين + إزالة السقف القديم)؛ /api/ai/quota (+weeklyUsed/weeklyLimit)؛ /api/coach/ai-usage (clientBalance هو المرجع الوحيد + coachOwn إرشادي)؛ CoachClientView (atCap/usageLine بالنافذتين)؛ EvoFloatingWidget (سطر «هذا الأسبوع» في العداد)؛ COACH_AI_PLAN_LIMIT حُذفت من coach-limits.ts.
- **الأوصاف:** صفحة الباقات والمقارنة (من memberships مباشرة) + LandingView (FAQ + كرتا بريميوم/برو عربي/إنجليزي) + صفحة انضمام المدربين (content.ts FAQ + page.tsx كرت «رصيد واضح أسبوعي + شهري») — كلها تعرض الحد الأسبوعي والشهري معًا.
- **الاختبارات:** client-plan-quota.test.ts أعيد كتابته بمحاكي واعٍ بالنافذة (شهر/أسبوع) — سيناريوهات: إجمالي شهري ممتلئ (blockedBy month)، سقف أسبوعي ممتلئ والشهر فيه متاح (blockedBy week)، برو 8+8/2+2، كوتشينج متاح، تجاوز الموظفين، مجاني 0، وhelper الأسبوع المثبت بالاثنين — **vitest 191/191 · tsc 0 · eslint 0 أخطاء**.
- **التوثيق:** AGENTS.md (بند d أصبح PLAN-BALANCE QUOTA بالنافذتين) + هذا الملف + QA_CHECKLIST (جدول المرحلة 81) + DEVELOPER_GUIDE/worklog — مطابقة للكود.

---

## 2026-09-01 — المرحلة 80: فحص حي شامل على الإنتاج (حسابات تجريبية) للمراحل 77-79 — طلب المالك

- **طلب المالك:** «اقتراحك الاخير تم بالفعل (تاكد منه)، اعمل فحص حى لكل التعديلات الاخيرة والاضافات بحسابات تجريبية، تاكد ان خاصية توليد الخطط الخاص بالادمن لا تظهر للمدربين، تاكد من ملفات التوثيق وهيكل المشروع متطابقين مع الكود الفعلي، تاكد من وصف توليد الخطط للمدربين فى صفحة انضمام المدربين».
- **التحقق من التنفيذ:** Phase 79 منفّذة فعلاً (commit a5e98f3) — 5 ملفات: route.ts (سجل النسخ + restore_version)، AdminExternalPlansView (واجهة النسخ المحفوظة)، CoachClientView (استبدال الأصناف/الأيام للمدربين)، ai-jobs.ts (نوعا مهمة food_item_regenerate + day_regenerate، staff-gated)، ai-job-processors.ts (المعالجان + تجسيد المسودات).
- **الإنتاج محدّث:** /api/build-info يرجّع commit a5e98f3 (نفس آخر كوميت) ✓.
- **فحص حي — شاشة الأدمن لخطط غير الأعضاء (حساب الأدمن التجريبي 0050):** توليد خطة تغذية بالذكاء الاصطناعي (2200 سعر، 5 وجبات، كات — مطابق للبريف، المخزن في content.ai.params ✓)؛ توليد خطة تمارين (التزم بـ«لا باربال» ✓)؛ **إعادة توليد الخطة كاملة** (34 ثانية عبر Groq الحقيقي gpt-oss-120b — نفس البريف محفوظ)؛ **إعادة توليد وجبة كاملة** ×2؛ **استبدال صنف واحد** ×3 (التزام ±15% سعرات)؛ **إعادة توليد يوم تدريبي** (التزم بقيود البريف)؛ **استبدال تمرين واحد**؛ **سجل النسخ المحفوظة** (snapshot قبل كل عملية، سقف 5، عداد regenerations)؛ **استرجاع نسخة** من الواجهة (والاسترجاع نفسه قابل للعكس — restore_backup يُسجّل) ✓ — كلها على musclehubeg.vercel.app مباشرة.
- **فحص حي — شاشة المدرب (Phase 79 «الكوتشينج يستفيدوا من نفس الخصائص»):** عارض خطط العميل يعرض زر «إعادة توليد» + «إعادة توليد الوجبة» لكل وجبة + «استبدال الصنف ببديل مكافئ بالذكاء الاصطناعي» لكل صنف ✓؛ مهمة food_item_regenerate انفذت end-to-end على الإنتاج (enqueue → GHA runner → done في ~60-90 ثانية → بديل صالح بنفس السعرات) ✓.
- **حجب الميزة عن المدربين (مطلوب صراحة):** مدرب يحاول فتح /admin/external-plans → **تحويل فوري إلى /coach** ✓؛ نداء POST/GET مباشر على /api/admin/external-plans بكوكيز المدرب → **403 «Forbidden — admin only»** ✓؛ قائمة المدرب الجانبية خالية تماماً من عناصر الأدمن ✓؛ بوابة JOB_GATE تمنع العملاء من مهام الموظفين (requireCoach → 403) ✓.
- **ملاحظات بيئية (ليست عيوب كود):** (1) رفّات 502 متقطعة من Vercel على طلبات التوليد الطويلة — الواجهة تعرض توست خطأ وإعادة المحاولة تنجح (3 فشل / 4 نجح أثناء الفحص)؛ (2) عواصف تعطل مزودات AI بين حين وآخر (Groq json_validate 400 بتوليد فارغ + نماذج OpenRouter المجانية 429 من المستوى الأعلى) — مهام الطابير تعيد المحاولة 3 مرات وتفشل بأمان برسالة مفصلة دون حرق حصص، ونفس التدفق نجح كاملاً عند استقرار المزودات.
- **توثيق صفحة انضمام المدربين — تصحيح (ملفان):** نصوص «4 خطط تغذية + 4 خطط تمارين لكل عميل» القديمة (نظام 0034 الملغي) اتحوّلت للنموذج الحالي: توليد الخطط يخصم من **رصيد العميل الشهري حسب باقته** (بريميوم 3/3 · برو 6/6 · كوتشينج 3/3 — نفس مجمع إيفو، تصفير أول الشهر)، مع إبراز أن التعديل اليدوي ورفع الخطط **وإعادة توليد الوجبة/الصنف/اليوم/التمرين بالذكاء الاصطناعي** غير محدودة (src/app/for-coaches/content.ts + page.tsx — عربي وإنجليزي).
- **توثيق المشروع:** PROGRESS (هذا القسم) + QA_CHECKLIST (جدول تحقق) + worklog (مهام 77-80) + DEVELOPER_GUIDE (تصحيح هيكلية الملفات: بوابة الأدمن admin-only، 13 قسماً في /admin — 15 ملف page.tsx، 66 مسار API، lib الحديثة) — كلها أصبحت مطابقة للكود الفعلي.
- **تنظيف بيانات الفحص:** خطتا QA التجريبيتان حُذفتا (DELETE 200×2) + حساب المدرب التجريبي المسجل أثناء الفحص حُذف بشاشة /admin/accounts (مسح متسلسل كامل) — الإنتاج رجع نضيف.

---

## 2026-09-01 — المراحل 77 + 78 + 78b + 79: العمولات الحقيقية + توليد غير الأعضاء بالـAI + منظومة إعادة التوليد (طلب المالك)

- **المرحلة 77 (e67de60):** أمثلة «عمولة على الاشتراك» في صفحة /affiliate صارت منتجات حقيقية — بريميوم 14.99$ → 3.00$ / برو 29.99$ → 6.00$ / كوتشينج بشري 39.99$ → 8.00$ (شهري 20%) بدل أمثلة 6$/16$ العامة، عربي + إنجليزي + شبكة 3 أعمدة متجاوبة.
- **المرحلة 78 (2f456e5):** مولّد خطط غير الأعضاء عند الأدمن أصبح **بالذكاء الاصطناعي بالكامل** بنفس محرك خطط العملاء (plan-generator: OpenRouter+Groq + fallback محلي) — تغذية: عدد وجبات 3-6، سعرات مستهدفة (أو حساب تلقائي BMR/TDEE)، 8 أنظمة غذائية، بيانات شخصية اختيارية لدقة الماكروز، تفاصيل إضافية؛ تمارين: أيام/أسبوع، هدف، مستوى، مكان. النتيجة المهيكلة في content.plan + نص عربي في content.text، maxDuration 60s، الأدمن بلا حدود.
- **المرحلة 78b (571c0d6):** منظومة إعادة التوليد لخطط غير الأعضاء — الخطة كاملة (نفس البريف المخزن في content.ai.params، توزيعة جديدة) + وجبة واحدة (regenerateMeal مع قائمة تجنّب أكلات باقي الوجبات + بديلان كاملان) + صنف واحد (regenerateFoodItem — نفس الدور، سعرات ±15%) + يوم تدريبي (regenerateWorkoutDay — نفس التركيز، تجنّب باقي الأيام) + تمرين واحد (substituteExercise — مرتب من المكتبة). العرض المهيكل في الكروت مع أزرار إعادة توليد لكل عنصر + شارة AI بعدّاد.
- **المرحلة 79 (a5e98f3):** «الكوتشينج يستفيدوا من نفس الخصائص» — المدربين صار عندهم منظومة الأدمن كاملة: نوعا مهمة **food_item_regenerate + day_regenerate** (staff-gated، بلا حصص، نفس طابور GHA) موصولة بـ CoachClientView PlanViewerModal (استبدال صنف بـ Wand2 في جداول التغذية + زر إعادة توليد اليوم في رؤوس الأيام + استبدال التمرين ظاهر في وضع العرض أيضاً). **قانون تجسيد مسودات الخطط:** GHA runner يدرج صف الخطة المسودة بنفسه (materialized:true + plan_id في النتيجة، والمتصفح يتخطى إدراجه — بلا تكرار) فخطط العملاء المولدة تنجو من تابات/أجهزة ميتة (نفس القانون الذي طبق على article_generate). **سجل نسخ خطط غير الأعضاء:** كل عملية إعادة توليد تلتقط snapshot للنص+الخطة السابقة في content.history (سقف 5) مع action=restore_version وواجهة نسخ محفوظة (قائمة موسّعة، استرجاع بضغطة، والاسترجاع نفسه قابل للعكس).
- **التحقق:** فحص حي كامل على الإنتاج في المرحلة 80 أعلاه.

---

## 1. الحالة الحالية (Current Status)

### ملخص سريع — الميزات الشغالة فعلاً (مبنية على الكود)

النظام يعمل في الإنتاج على `https://musclehubeg.vercel.app`:

- **الموقع العام (Public Site)**: صفحات EN/AR + 15 صفحة عربية mirror + RTL/LTR ديناميكي عبر `resolveLocale()` في `src/app/layout.tsx`
- **المصادقة**: Email/password + Google OAuth (PKCE) + middleware + auto-bootstrap للكوتش
- **العضويات**: 4 tiers (Free / Premium / Pro / Coaching) + `useMembershipTier` hook + multi-subscription
- **الأدوات**: 6 أدوات (5 calculators + meal planner) + حفظ النتائج + PDF/JSON export
- **EVO AI Chat**: floating widget + `callFreeOpenRouterRace` (3-model parallel) + local fallback
- **Blog CMS**: كامل (قائمة + محرر) + cron pipeline (P0 → P5 + ورك فلو لكل لغة — **الإنتاج 6 مقالات/يوم: 3 EN عند 12/16/22 UTC + 3 AR عند 05/11/18 UTC، كل تشغيل = مقال واحد، والموزّع اليومي 21:00 UTC يكمل الفوائت فقط**) + manual coach generation + cleanup endpoint
- **Coach Dashboard**: قائمة العملاء + إدارة العميل + مراجعة الدفعات + صندوق الدعم
- **الإشعارات**: polling 30s + إشعارات الكوتش + weekly cron (Vercel)
- **أنظمة أخرى**: Referral (20% commission) + progress tracking + questionnaires + PayPal checkout
- **PayPal Integration**: ✅ مكتملاً (`src/lib/paypal.ts` + 3 API routes + migration `0016`)
- **انضم كمدرب (For-Coaches)**: ✅ صفحة هبوط ثنائية اللغة `/for-coaches` + تسجيل مدرب فوري `/for-coaches/register` + API عام `/api/coach/register` (rate limit + honeypot) + SEO كامل (metadata عربية، hreflang، JSON-LD، sitemap، robots) + مشاركة نصية بدون أيقونات + migration 0036 لتقوية `handle_new_user`
- **SEO + AdSense**: ads.txt + noindex على الصفحات الخاصة + hreflang مصحح + 404 noindex
- **Blog EN/AR Separation**: ✅ EN/AR مستقلان بالكامل (كل لغة لها SEO + FAQ + image + social + reading time مستقلة)

### الـ Bugs المفتوحة الفعلية

| ID | الوصف | الملف | الأولوية |
|---|---|---|---|
| — | لا توجد bugs حرجة أو عالية الأولوية مفتوحة في الكود الحالي — تم إصلاح 124 مشكلة في 2026-08-26 (انظر القسم أدناه) | — | — |

### إصلاحات 2026-08-26 (124 مشكلة عبر 78 commit)

| الفئة | المشاكل | Commits |
|---|---|---|
| 🔒 أمني حرج | C1 (profiles RLS), C2 (earnings RLS), C3-subs (subscriptions RLS), C4 (cron fail-open), C3-notif (admin notif allowlist), C7 (demo mode guard), C9 (PII log), C17 (open-redirect), C6 (listAllSubscriptions client-side) | dcd82c6, 0dcb385 |
| 💰 فقدان أموال | C10 (subscription renewal overwrites), C11 (payout split bug), C12 (double-approval) | 9f4053e, 71f713f |
| ⚙️ ميزات مكسورة | C13 (/chat response field), C14 (coach support sender_id) | 4ffd217 |
| ⏱️ حدود server-side | C15 (EVO chat limit), C16 (swap limit) | 8a065c0 |
| 🔍 SEO | C22 (9,705 pages metadata), C23 (skip-to-content), C24 (hreflang), M29 (blog 404), M30 (metadata i18n) | f502b68, 0778277, d0d2cbf, e0b2b63, 4aaa68a |
| 🎨 UI | C19 (affiliate share), C20 (memberships comparison), C21 (/ar/coaching), M25-M27 (invisible text), M35 (French word), M37 (cookie flash), M38 (duplicated muscles) | b48e669, a526826 |
| 🛡️ Coach/Admin | M3 (expired subs), M8 (PayPal amount), M10 (review status), M18 (client validation), M20 (support polling), M19 (close-ticket), M7 (upload validation), M9 (subreq dedupe), M15 (slug validation), M17 (auto-save), M24 (leads DELETE), M16 (cron retry) | 39c8cf5, 75a55bb, 7277ce6, 8ab78fb, 00afb31, ba3cb0c, 178457b |
| 📝 محتوى | M32-M34 (FAQ PayPal + tiers) | 8ab78fb |
| 🔧 Minor/Polish | dead code, brand name, RTL, ShareButtons aria, OtherTools, referral cookie Secure, package.json name, NotificationBell polling, landing dead code, food card links, exercise counts, PricingView/hreflang/exercises dead code | e2ae247, ba3cb0c, f1d14ea, acf57cb |
| 👤 Auth | M6 (email confirmation redirect bug), M2 (swap race condition) | dbc81e8 |
| 📊 UX | M4 (profile stats dynamic), M14 (plans empty state guidance), M40 (Arabic detection), M39 (404 bilingual), M43 (meal planner persistence), M41 (blog header nav), M42 (link tags in body), M48 (meal planner grams), M46 (progress date picker), M45 (progress validation), M44 (profile SPA links), M49 (weight color), M50 (chart single-entry), M52 (EVO backdrop) | 702340d, ce8199d, 267fde0, 3d6708b, 3023099 |
| 🔒 XSS | M53 (print modal escapeHtml) | fa78120 |

**Migrations المطلوبة على Supabase الإنتاج:**
- `0017_security_rls_hardening.sql` — RLS + trigger + 2 SECURITY DEFINER functions
- `0018_extend_subscription.sql` — extend_subscription() RPC
- ملف موحد للتشغيل: `supabase/migrations/RUN_ON_SUPABASE_SECURITY_0017_0018.sql`
- بعد التشغيل: `NOTIFY pgrst, 'reload schema';`

| ESLint debt | 4 errors + 5 warnings في 7 ملفات `src/` لم تُلمَس (CookieConsent, SaveResultButton, BlogAdminView, checkout/page, foods/[slug], water-tracker, AdSenseAd) — لا تؤثر على production build (Next.js 16 dropped ESLint from build config) | (7 ملفات) | Low (tech-debt) |
| Tests | 0 ملفات اختبار (unit/integration/E2E) — لا يوجد إطار اختبار | — | Low (tech-debt) |
| Z.ai token | `ZAI_TOKEN` غير مهيأ على Vercel Production — Blog Step 2a external research يفشل بـ HTTP 401 (التفاصيل في `archive/PROGRESS_ARCHIVE.md` § MH-ZAI-PROD-008) | `src/lib/external-search.ts` | High (يؤثر على Blog pipeline) |
| Topic picker intermittent | "Topic picker returned an invalid response" أحياناً — يحتاج `parseJSON` robustness أو model-rotation retry | `src/lib/blog-topics.ts` | Medium |
| Step 2a empty research | يكتب `research_done` حتى مع 0 articles — quality gate في Step 2b يجب أن يلتقطها لكنه لم يُختبر runtime | `src/app/api/cron/blog/step2a-research/route.ts` | Medium |
| M28 deferred | Blog article body is client-rendered only — requires larger refactor of BlogArticlePage from "use client" to server component | `src/components/blog/BlogArticlePage.tsx` | Medium |
| M31 deferred | LanguageToggle doesn't navigate to /ar/ mirror — requires creating Arabic mirror routes for all public pages | `src/components/LanguageToggle.tsx` | Medium |

### إصلاحات وتوجيهات 2026-08-27 (AI Provider Consolidation + Critical Fixes)

| # | التوجيه/الإصلاح | الحالة |
|---|---|---|
| 1 | قصر المزودين على OpenRouter + Groq فقط — حذف Gemini SDK المباشر وOpenAI/Anthropic/DeepSeek من `ai-provider.ts` | ✅ |
| 2 | كل استدعاءات Gemini الآن عبر OpenRouter (`google/*` slugs) أو Groq — حذف `gemini-wrapper.ts` والكود الميت (`ai.ts`, `openrouter-flash.ts`) وإزالة `@google/genai` من package.json | ✅ |
| 3 | توليد المقالات منفصل لكل لغة (step2b EN / step2c AR موجودان أصلاً) + إصلاح جوهري: step2c كان يقرأ `bundle.topic_ar` غير الموجود → كان يستلم الموضوع الإنجليزياً دائماً؛ الآن يقرأ أعمدة الصف `topic_ar/focus_keyword_ar` | ✅ |
| 4 | migration `0021_blog_queue_topic_ar.sql` للأعمدة الناقصة (كانت ستكسر Step 1 في بيئة نظيفة) | ⏳ المالك يشغّلها على Supabase |
| 5 | حساب السعرات/Macros حتمي في السيرفر: `computeNutritionTargets()` (Mifflin-St Jeor صحيح للأنثى −161، مضاعفات النشاط AR/EN، عجز −20%/فائض +10%، بروتين 2g/kg، US Navy body fat) + حقن إلزامي في prompt + إنفاذ في normalizer — الـ AI لم يعد يحسب الأرقام بنفسه | ✅ |
| 6 | إلغاء زر مسح محادثة EVO نهائياً (widget + صفحة /chat) | ✅ |
| 7 | حرج G1/G2: دفتر استخدام غير قابل للعبث `evo_chat_usage` (migration 0022 — RLS بدون سياسات كتابة للمستخدم) يُسجَّل من السيرفر قبل استدعاء الـ AI | ✅ كود + ⏳ migration |
| 8 | حرج G3/G4: resolveTier الآن يستخدم tier الجلسة الموثقة (active + expiry filtered) مع fallback عبر admin client بدلاً من browser client داخل route | ✅ |
| 9 | حرج G5: بوابة ميزات المشتركين تطبق على الجميع بدون paid tier فعلي (حتى المسجلين Free) + system prompt لن يصف المستخدم بمشترك إلا فعلاً | ✅ |
| 10 | حرج regenerate-meal: بلا quota سابقاً → الآن يستهلك نفس كوتا meal-swap الأسبوعية | ✅ |
| 11 | حد Vercel 60s: السلسلة تضمن maxModels×timeoutMs≤52s داخلياً + clamping لكل maxDuration=300/180→60 + GHA retry loops (3 attempts، backoff 120s) لكل خطوات البايبلاين | ✅ |
| 12 | HIGH: pollinations.ai/pixabay أُضيفت لـ next/image remotePatterns (الأغلفة كانت تفشل في العرض) | ✅ |
| 13 | HIGH: توحيد اسم متغير OpenRouter — الكود يقرأ OPENROUTER_API ويقبل OPENROUTER_API_KEY alias؛ التوثيق موحّد | ✅ |
| 14 | إصلاحات إضافية: escape فلتر ilike في بحث المدونة (injection)، clamp طول الرسالة/التاريخ، response.ok في العميل (لم تعد رسائل 429 تُخزن كردود)، step2d لم يعد يطمس imagePrompts/social الخاصة بكل لغة، إصلاح BMR الأنثى في ai-local، تمرير notes الاستبيانات للـ prompts، GHA صحّحت مزاعم z-ai القديمة | ✅ |

**معروف ومقبول (Trade-off موثق بتوجيه المالك):** Step 2a research أصبح معرفياً
بالنموذج (بدون Google Search grounding الحقيقي) لأن الـ grounding يتطلب SDK
مباشر ممنوع بالتوجيه #6. hosts الموثوقة فقط ولا URLs مصطنعة تُخزن.

### إحصائيات المشروع المُتحقَّق منها (مهمة #3 + #4)

كل الأرقام تم التحقق منها فعلياً في `origin/main` HEAD `9a890e0`:

| المقياس | القيمة المُتحقَّق منها | كيف التحقق |
|---|---|---|
| ملفات TypeScript / TSX في `src/` | **255** | `find src -name "*.ts" -o -name "*.tsx" \| wc -l` |
| صفحات `page.tsx` | **51** | `find src/app -name "page.tsx" \| wc -l` |
| API routes | **36** | `find src/app/api -name "route.ts*" \| wc -l` |
| مكونات shadcn UI | **51** | `find src/components/ui -name "*.tsx" \| wc -l` |
| Views (`src/components/views/`) | **25** | `find src/components/views -name "*.tsx" \| wc -l` |
| Migrations | **18** (`0001` → `0018`) | `ls supabase/migrations/` |
| Tables مُعرّفة في migrations | **22** | `grep -hE "^create table" supabase/migrations/*.sql \| wc -l` |
| Routes عربية `/ar/*` | **6** | `/ar`, `/ar/blog`, `/ar/blog/[slug]`, `/ar/exercises`, `/ar/foods`, `/ar/memberships` |
| Blog cron routes | **7** | step1-pick + step2-generate (legacy) + step2a-research + step2b-en-article + step2c-ar-article + step2d-links + step3-publish |
| PayPal API routes | **3** | create-order + capture-order + webhook |
| Exercises dataset | **868** ✅ | `grep -cE 'slug: "[^"]+"' src/lib/exercises.ts` — restored from `6c48ca2` (commit `b760dbf`, 2026-08-25) after loss in `a776aa8` ("تصدير") |
| Foods dataset | **8,830** ✅ | `grep -cE 'slug: "[^"]+"' src/lib/foods.ts` — restored from `6c48ca2` (commit `b760dbf`, 2026-08-25) after loss in `a776aa8` ("تصدير") |
| Workout programs | **7 slugs** | `grep -cE 'slug: "[^"]+"' src/lib/workout-programs.ts` |
| Test files | **0** | `find . -name "*.test.ts" -o -name "*.spec.ts" -not -path "./node_modules/*"` |
| `@ts-nocheck` في `src/` | **0** ✅ | `grep -r "@ts-nocheck" src/` |
| `ignoreBuildErrors` في `next.config.ts` | **Not present** ✅ | grep على `next.config.ts` |
| `scripts/` directory | **Not in repo** ✅ | `ls scripts/` → 404 |
| Build script في `package.json` | `"next build"` ✅ | grep على `package.json` |

> **ملاحظة تاريخية:** أعداد Exercises + Foods اتنقصت لـ 33/29 في commit `a776aa8` ("تصدير" — 2026-08-21) عن طريق الخطأ، ثم اتعادت في commit `b760dbf` (2026-08-25) باسترجاع النسخة من `6c48ca2`. التحقيق الكامل في `worklog.md` Task ID `DATA-RESTORE-2026-08-25`.

---

## 2. سجل الميزات (Feature Log)

جدول واحد لكل الميزات — الحالة + تاريخ آخر تحديث:

### الميزات المكتملة (تمت)

| # | الميزة | الحالة | آخر تحديث |
|---|---|---|---|
| F1 | الصفحة الرئيسية (Apple-style sticky + Liquid Glass + 14-section dark premium) | تمت | 2026-08-10 |
| F2 | المدونة (EN + AR + CMS + AI generation + cleanup) | تمت | 2026-08-22 |
| F3 | مكتبة التمارين (868 تمرين — مسترجَعة في `b760dbf`) | تمت | 2026-08-25 |
| F4 | مكتبة الأكلات (8,830 أكلة — مسترجَعة في `b760dbf`) | تمت | 2026-08-25 |
| F5 | برامج التدريب (7 slugs) | تمت | 2026-08-10 |
| F6 | صفحة الكوتشينج | تمت | 2026-08-10 |
| F7 | صفحة EVO | تمت | 2026-08-10 |
| F8 | صفحة العضويات (4 tiers + مقارنة) | تمت | 2026-08-19 |
| F9 | FAQ + About + Contact + Privacy + Terms | تمت | 2026-08-10 |
| F10 | دعم العربية (RTL) — 6 صفحات `/ar/*` | تمت | 2026-08-19 |
| F11 | تسجيل بالبريد + كلمة المرور | تمت | 2026-08-06 |
| F12 | Google OAuth (PKCE) | تمت | 2026-08-06 |
| F13 | إدارة الجلسات (middleware + `@supabase/ssr`) | تمت | 2026-08-06 |
| F14 | Auto-bootstrap للكوتش | تمت | 2026-08-06 |
| F15 | 4 مستويات (Free / Premium / Pro / Coaching) | تمت | 2026-08-10 |
| F16 | أسعار USD ($14.99 / $29.99 / $39.99) | تمت | 2026-08-19 |
| F17 | حدود لكل مستوى (EVO, خطط, حفظ, PDF) | تمت | 2026-08-10 |
| F18 | اشتراكات متعددة (Coaching + Premium معاً — migration 0011) | تمت | 2026-08-10 |
| F19 | `useMembershipTier` hook | تمت | 2026-08-10 |
| F20 | حاسبة السعرات + BMI + Macro + Body-fat + Water tracker | تمت | 2026-08-10 |
| F21 | مخطط الوجبات (meal planner) | تمت | 2026-08-10 |
| F22 | حفظ النتائج (3/50/200/∞ حسب tier) | تمت | 2026-08-10 |
| F23 | تصدير PDF (Canvas → JPEG → PDF 1.4 — بدون مكتبة خارجية) | تمت | 2026-08-10 |
| F24 | تصدير JSON (client-side blob) | تمت | 2026-08-10 |
| F25 | EVO floating widget على كل الصفحات | تمت | 2026-08-10 |
| F26 | Anonymous: 10 رسائل/يوم + Subscriber gating | تمت | 2026-08-10 |
| F27 | Platform search (تمارين + أكلات + برامج + مدونة) | تمت | 2026-08-10 |
| F28 | `callFreeOpenRouterRace` (3-model parallel Promise.any) | تمت | 2026-08-19 |
| F29 | `callFreeOpenRouterLimited` (maxModels=2 للـ Vercel 60s cap) | تمت | 2026-08-20 |
| F30 | داشبورد الكوتش (10 فلاتر + 6 tabs + payments + support) | تمت | 2026-08-10 |
| F31 | إشعارات المستخدمين (polling 30s) | تمت | 2026-08-17 |
| F32 | إشعارات الكوتش (server-side bypass) | تمت | 2026-08-17 |
| F33 | إشعار تذكير التقدم الأسبوعي (Vercel Cron — كل أحد 9am Cairo) | تمت | 2026-08-17 |
| F34 | نظام الإحالات (20% عمولة + payouts + admin) | تمت | 2026-08-10 |
| F35 | تتبع التقدم (weight chart lazy-loaded + photos) | تمت | 2026-08-10 |
| F36 | الاستبيانات (تغذية + لياقة) — تعديل في أي وقت + تنقل + إرسال | تمت | 2026-08-17 |
| F37 | الدفع اليدوي (InstaPay/Vodafone Cash + receipt review) | تمت | 2026-08-19 |
| F38 | **PayPal Integration** (PRIMARY payment method — sandbox tested, Live-ready) | تمت | 2026-08-24 |
| F39 | SEO (sitemap + robots + JSON-LD + hreflang + noindex على private routes) | تمت | 2026-08-22 |
| F40 | ads.txt + AdSense tier-gating | تمت | 2026-08-22 |
| F41 | Vercel Analytics + Speed Insights | تمت | 2026-08-10 |
| F42 | GA4 + AdSense (auto-suppressed على auth routes) | تمت | 2026-08-10 |
| F43 | PWA (manifest + service worker) | تمت | 2026-08-10 |
| F44 | Blog Cron Pipeline (Step 1 → 2a → 2b → 2c → 2d → 3 + controlled retry + queueId threading) | تمت | 2026-08-21 |
| F45 | Blog EN/AR Separation (مستقلان بالكامل — لا inheritance من EN إلى AR) | تمت | 2026-08-22 |
| F46 | Blog Admin UI (compact + searchable + responsive) | تمت | 2026-08-21 |
| F47 | Blog Editor AI Tools (SEO Title + Meta + Improve + FAQ + CTA + Social + Image prompts — all live Gemini) | تمت | 2026-08-21 |
| F48 | Affiliate Engine (migration 0015 + commission tracking) | تمت | 2026-08-24 |
| F49 | Unified `PALETTE` const (Gemini-card palette extended site-wide — WCAG AAA contrast on all landing text) + Premium Memberships cards redesign | تمت | 2026-08-26 |

### الميزات المؤجلة (BACKLOG)

| # | الميزة | الحالة | سبب التأجيل |
|---|---|---|---|
| D1 | BLOG-MULTILANG-ENGINE-001 — محرك محتوى مستقل لكل لغة (EN + AR engines منفصلان). Future implementation Task ID candidate: `BLOG-MULTILANG-ENGINE-002` or `MULTILANG-IMPL-001` | مؤجل | مهمة مستقبلية — تحتاج task ID منفصل + design approval من المالك. التفاصيل الكاملة في `archive/PROGRESS_ARCHIVE.md` |
| D2 | MH-AI-ARCH-002 — Render Backend migration (18 مهمة فرعية) | مؤجل | يحتاج Render Backend repo جديد + API contract design + owner approval لكل مهمة. القرارات الـ 8 في القسم 4 |
| D3 | Terminology Audit stage | مؤجل | سيُصمَّم عند فتح BLOG-MULTILANG-ENGINE-001 |
| D4 | Unit tests / Integration tests / E2E tests | مؤجل | tech-debt منفصل |
| D5 | Stuck-state recovery script للـ blog queue | مؤجل | Future enhancement |
| D6 | Expose queue table في Blog Admin UI | مؤجل | Feature request — out of scope |
| D7 | Remove dead code (`src/lib/ai.ts`) | مؤجل | Low priority — not broken, just unused |

---

## 3. سجل الـ Bugs (Bug Log)

كل bug اتحل → سطر واحد. التفاصيل الكاملة للحل في `archive/PROGRESS_ARCHIVE.md`.

### الـ Bugs المُ stapled محلولة (مُتحقَّق منها في الكود)

| ID | الوصف | حُلّ في | التحقق |
|---|---|---|---|
| B1 | Profile page تعرض Tier="free" دائماً | `776d2fb` (Phase 2) | ✅ `useMembershipTier` hook موجود في `src/app/profile/page.tsx:6,45` |
| B2 | تناقض البراند (MuscleHubFit → MuscleHub) | `776d2fb` (Phase 2) | ✅ verified in code |
| B3 | `start` script لا يعمل محلياً | `776d2fb` (Phase 2) | ✅ `package.json` scripts: `next start` |
| B4 | Migration 0011 + 0012 لم يُطبّق على الإنتاج | `01c17ed` (Phase 2) | ✅ Applied on Supabase SQL Editor |
| B5 | `@ts-nocheck` على 12 ملف | `c024f78` / `4fbab5f` (Phase 4) | ✅ `grep -r "@ts-nocheck" src/` → 0 |
| B6 | `ignoreBuildErrors: true` | `4fbab5f` (Phase 4) | ✅ not present in `next.config.ts` |
| B7 | `supabase/types.ts` قديم | `c024f78` (Phase 4) | ✅ `subscription_type` + `price_usd` موجودة في types.ts (6 matches) |
| B8 | `adsEnabled` limit غير مستخدم | `4fbab5f` (Phase 4) | ✅ `AdSenseAd.tsx` يتحقق من `limits.adsEnabled` |
| B9 | `chat_messages` table غير مستخدم | `4fbab5f` (Phase 4) | ✅ Supabase sync + localStorage fallback |
| B10 | كود `speerr@gmail.com` hardcoded | `4fbab5f` (Phase 4) | ✅ `process.env.COACH_EMAILS` مع fallback في `src/lib/data.ts:190,213` |
| B11 | `/api/og/[slug]` legacy route | `4fbab5f` (Phase 4) | ✅ `src/app/api/og/` غير موجود |
| B12 | `/pricing` page | `4fbab5f` (Phase 4) | ✅ `src/app/pricing/` غير موجود |
| B13 | `/api/admin/run-migration` endpoint | `4fbab5f` (Phase 4) | ✅ `src/app/api/admin/run-migration/` غير موجود |
| B14 | `reactStrictMode: false` | `4fbab5f` (Phase 4) | ✅ `reactStrictMode: true` في `next.config.ts` |
| B15 | `price_egp` field name | `c329f51` (Phase 5, migration 0012) | ✅ `price_usd` في migration 0012 (2 matches) |
| B16 | Recharts (~600KB) lazy-loaded | مقبول كقرار تصميمي | ✅ `dynamic(() => import("@/components/WeightChart"), { ssr: false })` في `ProgressView.tsx` |
| B17 | Framer Motion animations مُعطّلة | مقبول كقرار تصميمي | ✅ `Reveal` + `StaggerGroup` + `StaggerItem` render مباشر في `src/components/motion.tsx` |
| B18 | `scripts/compress-images.js` referenced but dir missing | `f0f3a41` (Phase 7 Master Repair Batch 001) | ✅ `scripts/` غير موجود + `package.json` build هو `"next build"` فقط |
| B002 | `/ar/memberships` 404 | `ce42795` (Phase 7 Master Verification Batch 002) | ✅ `src/app/ar/memberships/page.tsx` موجود |
| C1 | Checkout فاشل: `price_usd` معرّف كـ INTEGER | `c329f51` (Phase 5, migration 0012) | ✅ `numeric(10,2)` في migration 0012 |
| C2 | `meal_plans` table غير موجودة في الإنتاج | `c329f51` (Phase 5, migration 0008) | ✅ migration 0008 يخلق `meal_plans` |
| C3 | `support_tickets` ناقصة الأعمدة | `c329f51` (Phase 5) | ✅ verified in migration 0010 |
| C4 | 3 جداول مفقودة من migrations (`plan_swaps`, `progress_photos`, `coach_presence`) | `c329f51` (Phase 5) | ✅ في migration 0008 / 0010 |
| C5 | EVO AI يستخدم local fallback فقط | `a831f73` (Phase 6) + Production Verified (2026-08-19) | ✅ `OPENROUTER_API_KEY` موجود في Vercel Production (Ready) |
| C6 | Vercel project غير مربوط بـ GitHub | Production Verified (2026-08-19) | ✅ `ce42795` deployment reached Ready status |
| H1 | Root `<html lang="en" dir="ltr">` hardcoded | `78a0e36` (Phase 7) + Production Verified | ✅ async `resolveLocale()` في `src/app/layout.tsx:51` |
| H2 | Membership `features` arrays عربية فقط | `f0f3a41` (Phase 7 Master Repair Batch 001) | ✅ `featuresEn` موجود في `src/lib/memberships.ts:50,87,132` |
| H3 | Hardcoded Arabic في `PlansView` English mode | `f0f3a41` (Phase 7 Master Repair Batch 001) | ✅ i18n keys تحت `plans.swaps.*` |
| H4 | مفاتيح i18n مفقودة | `f0f3a41` (Phase 7 Master Repair Batch 001) | ✅ `prog.uploadPhoto`, `prog.photos`, `prog.noPhotos` موجودة في `src/lib/i18n.tsx` |
| H5 | اسم الكاتب "Ahmed Zake" في `blog_posts.author` | `ce42795` (Phase 7, migration 0013) + Production Verified | ✅ migration 0013 يغير default إلى `'MuscleHub'` + 46 rows تم تحديثها |
| H6 | `/ar/exercises` و `/ar/foods` 404 | `f0f3a41` (Phase 7 Master Repair Batch 001) | ✅ `src/app/ar/exercises/page.tsx` + `src/app/ar/foods/page.tsx` موجودان |
| M1 | نشرة بريدية في صفحات الأدوات | FALSE POSITIVE (Phase 7) | ✅ `LeadCaptureCard` ميزة lead-capture مقصودة، مش bug |
| M2 | /coach لا يُعيد توجيه المستخدم العادي | `f0f3a41` (Phase 7 Master Repair Batch 001) | ✅ `useEffect` redirect موجود في `src/app/(app)/coach/page.tsx` |
| M3 | URL مكرر في sitemap | Production Verified (2026-08-19) | ✅ `(slug, language)` unique index سليم + 0 duplicate rows في الإنتاج |
| M4 | عدّاد "4 Tools" في البروفايل خاطئ | `f0f3a41` (Phase 7 Master Repair Batch 001) | ✅ `value: "6"` في `src/app/profile/page.tsx:153` |
| M5 | "Pricing" tab في navigation | ⚠️ **DISCREPANCY** — التوثيق القديم قال "تمت" لكن الكود الحالي فيه "Pricing" entry في `src/components/SiteHeader.tsx:159-164` (comment يقول "kept as a separate label per nav spec") | يحتاج توضيح من المالك: هل هو bug أم feature؟ |
| BLOG-PIPELINE-REPAIR-001 | Blog article generation repair (invalid Gemini/OpenRouter model names) | (2026-08-21) | ✅ Fixed — `gemini-3.7-flash` + `nvidia/nemotron-3.5-lightning:free` + resilient fallback loop. Details in archive |
| BLOG-PIPELINE-REDESIGN-001 | Blog step2 vercel-safe fallback (`callFreeOpenRouterLimited` maxModels=2) | `3994aeb` (2026-08-20) | ✅ Production verified |
| BLOG-EXTERNAL-RESEARCH-001 | Blog Step 2a real external search | `9c163a7` (2026-08-21) | ✅ Production verified |
| BLOG-PIPELINE-RESILIENCE-002 | Step 1 retry + 10-min handoff | `9a092ab` (2026-08-21) | ✅ Production verified |
| AI-RESEARCH-EXTERNAL-001 | `/api/ai/research-topic` external search | `5ac079e` (2026-08-21) | ✅ Production verified |
| MH-AI-BLOG-003 | AI + Blog audit + fixes | `cf50052` (2026-08-21) | ✅ Production verified — RESOLVED OpenRouter 429 |
| MH-AI-NEXT-004 | Step 2b quality gate + slug Latin-only | `c897d65` (2026-08-21) | ✅ Production verified |
| MH-BLOG-NEXT-005 | Failure handlers + input gates + partial-publish | `9caadcc` (2026-08-21) | ✅ Production verified |
| MH-AI-OPENROUTER-006 | OpenRouter 429 diagnosis | `a36ed26` (2026-08-21) | ✅ Diagnosed — already resolved by `cf50052` |
| MH-QUEUE-HANDOFF-007 | queueId threading across pipeline | `086a432` (2026-08-21) | ✅ Production verified |
| MH-ZAI-PROD-008 | Z.ai production web_search failure diagnosis | `2ef8394` (2026-08-21) | ⚠️ Diagnosed — observability fix applied, but `ZAI_TOKEN` still needs owner action (راجع القسم 1) |
| MH-ZAI-FETCH-009 | Z.ai `fetch failed` ConnectTimeoutError | documented (2026-08-21) | ✅ Root cause proven — Z.ai internal-IP unreachable from Vercel |
| EN-AR-SEPARATION-v2 | Blog EN/AR full separation | `5c35b46` (2026-08-22) | ✅ Production verified |
| SEO-ADSENSE-FIX | ads.txt + noindex + hreflang + 404 noindex | `35e5b20` (2026-08-22) | ✅ Production verified |
| PAYPAL-INTEGRATION | PayPal checkout + webhook + idempotency | `a079375` (2026-08-24) | ✅ Sandbox tested, Live-ready |
| MH-DOC-001 | Documentation hardening + governance (AGENTS.md, SECURITY.md, LICENSE, 14 doc discrepancies fixed) | `a6259e1` (Phase 7a, 2026-08-19) | ✅ All governance files present + reconciled |

### الـ bugs المفتوحة الفعلية

(مُدرَجة في القسم 1 — لا يوجد bugs حرجة. tech-debt فقط + Z.ai token config.)

---

## 4. القرارات المتخذة (Decisions)

كل قرار معماري/تقني مهم — القرار | السبب | التاريخ | المصدر | ساري؟

### القرارات العامة للمشروع

| # | القرار | السبب | التاريخ | المصدر | ساري؟ |
|---|---|---|---|---|---|
| AD1 | Next.js 16 (App Router) + Turbopack | Modern stack, Vercel-native, SSR + ISR | 2026-08-02 | Phase 0 initial scaffolding | ✅ نعم |
| AD2 | Supabase (Postgres + Auth + Storage + RLS) | Free tier, integrated auth, RLS for security | 2026-08-02 | Phase 0 initial scaffolding | ✅ نعم |
| AD3 | Cookie-based auth via `@supabase/ssr` middleware | PKCE flow needs server-side cookie sync for OAuth callback | 2026-08-06 | Phase 0 (`618f764`, `d35dfbd`) | ✅ نعم |
| AD4 | Dual-mode data layer (Supabase + localStorage "demo mode") | UI can be exercised without backend | 2026-08-06 | Phase 0 | ✅ نعم |
| AD5 | 4 membership tiers (Free / Premium / Pro / Coaching) + tier priority `pro(3) > premium(2) > free(0)` + coaching treated separately | Clear pricing tiers, no "elite" tier (corrected from earlier doc claim) | 2026-08-10 | Phase 1 | ✅ نعم |
| AD6 | Multi-subscription (Coaching + Premium can coexist) | Flexibility for serious clients | 2026-08-10 | Phase 1 (`e9a572e`, `d10b44a`, migration 0011) | ✅ نعم |
| AD7 | AI provider abstraction (`src/lib/ai-provider.ts` is SINGLE source of truth) | Switching providers = config change, not code change | 2026-08-10 | Phase 1 | ✅ نعم |
| AD8 | Two AI call paths: `callFreeOpenRouter` (sequential, best-quality) + `callFreeOpenRouterRace` (parallel, fastest-wins) | Intentional trade-off — race for chat/swap, sequential for plans/articles | 2026-08-19 | Phase 6 (`a831f73`) — documented in `DEVELOPER_GUIDE.md` §14 | ✅ نعم — لا تُدمجهما |
| AD9 | No external PDF library — Canvas 2D → JPEG → minimal PDF 1.4 | Keeps the bundle lean | 2026-08-10 | Phase 1 (`src/lib/result-png-export.ts`) | ✅ نعم |
| AD10 | i18n without a framework (custom `src/lib/i18n.tsx` context provider) | No `next-intl` / `react-i18next` dependency | 2026-08-10 | Phase 1 | ✅ نعم |
| AD11 | B16: Recharts (~600KB) lazy-loaded via `dynamic(() => import("@/components/WeightChart"), { ssr: false })` | Code-split out of initial bundle | 2026-08-10 | Phase 1 | ✅ نعم — مقبول كقرار تصميمي |
| AD12 | B17: Framer Motion animations disabled (`Reveal` / `StaggerGroup` / `StaggerItem` render directly) | Owner decision to avoid layout jank | 2026-08-10 | Phase 1 (`src/components/motion.tsx`) | ✅ نعم — مقبول كقرار تصميمي |
| AD13 | M1: `LeadCaptureCard` is intentional lead-capture feature, not a bug | Collects visitor emails as `tool_leads` | 2026-08-19 | Phase 7 Master Repair Batch 001 | ✅ نعم |
| AD14 | Server-side locale detection (Option B — cookies + headers) for `<html lang dir>` | Pathname > cookie > default precedence; defensive RTL wrapper retained | 2026-08-19 | H1 Closure (`78a0e36`) — `src/app/layout.tsx` async Server Component | ✅ نعم |
| AD15 | PayPal = PRIMARY payment method; Manual (InstaPay/Vodafone Cash) = SECONDARY; Currency = USD | Modern checkout + reliability + multiple options | 2026-08-24 | PayPal Integration (`a079375`) | ✅ نعم |
| AD16 | Blog EN/AR full separation — independent engines per language (no EN→AR inheritance in Step 3) | AR is first-class content, not translation of EN | 2026-08-22 | EN-AR-SEPARATION-v2 (`5c35b46`) | ✅ نعم |
| AD17 | External research via Gemini Flash (3.7 → 3.6 → 3.5) with Google Search Grounding | Replaced broken Z.ai private-IP path + LLM pseudo-research | 2026-08-21 | Phase 8 — `src/lib/external-search.ts` | ✅ نعم |
| AD18 | Image generation via Pollinations / Imagen 3 (replaced Z.ai) | Stability + reliability | 2026-08-21 | Phase 8 — `src/app/api/ai/generate-image/route.ts` | ✅ نعم |
| AD19 | Unified `PALETTE` const in `LandingView.tsx` — single source of truth for landing-page surface colors (cards, hover shadows, badges, price pills). Complementary to `globals.css` Primary Palette (§2.1 in DESIGN.md) — used for inline `style={{}}` where Tailwind can't express dynamic opacity. All text tokens meet WCAG AAA (≥7:1) on intended backgrounds. `textMuted` (`#6E6E73`) is the **only** AA token — reserved for footer/legal text only. | Site-wide visual consistency + WCAG AAA compliance. Memberships cards were broken (`bg-white/5` on light bg = invisible + `text-gray-400/300` designed for dark bg). | 2026-08-26 | Phase 12 — commits `8aff772` → `1447a0b` → `2a449d5` | ✅ نعم |

### قرارات AI Architecture Direction (الـ 8 — مُعاد بناؤها)

> **المصدر الأصلي:** القرارات الـ 8 كانت مُدرَجة في `PROJECT_CONTEXT.md` §11 (ملف تم حذفه في consolidation commit `f32d9a` — 2026-08-24). التفاصيل الكاملة الآن في `archive/PROGRESS_ARCHIVE.md` § MH-AI-ARCH-002.

| # | القرار | السبب | التاريخ | المصدر في الأرشيف | ساري؟ |
|---|---|---|---|---|---|
| AAD1 | **EVO stays fast, chat-only** — EVO does NOT generate plans or heavy AI output, does NOT wait on long AI operations, is NOT the execution surface for long-running ops | EVO must remain responsive for chat UX | 2026-08-21 | `archive/PROGRESS_ARCHIVE.md` § MH-AI-ARCH-002 decision #1 | ✅ نعم — الكود الحالي يتوافق (EVO يستخدم `callFreeOpenRouterRace` 15s timeout، لا plan generation) |
| AAD2 | **Dedicated plan-generation surface** — separate page/interface for client plans (Nutrition + Training + Regeneration). Records + persists results. Usable by client + admin with permissions. Does NOT depend on EVO being open | Plan generation needs dedicated UX, not buried in chat | 2026-08-21 | `archive/PROGRESS_ARCHIVE.md` § MH-AI-ARCH-002 decision #2 | ✅ ساري — Direction approved, **NOT implemented** (future task) |
| AAD3 | **Render Backend for heavy operations** — dedicated Render Backend (separate repo) hosts all heavy/long-running AI ops that don't fit Vercel's 60s Hobby cap: full Blog AI generation, Blog external research, nutrition plan generation, training plan generation, plan regeneration/modification, future heavy AI features | Vercel Hobby 60s cap is too restrictive for long AI jobs | 2026-08-21 | `archive/PROGRESS_ARCHIVE.md` § MH-AI-ARCH-002 decision #3 | ✅ ساري — Direction approved, **NOT implemented** (Render repo skeleton exists at `muscleshubfit-cpu/Render` commit `14e87fa`, no migration started) |
| AAD4 | **Vercel stays the fast layer** — Vercel continues to host Next.js frontend, EVO chat, fast operations, light API orchestration, receiving/persisting Render results | Vercel is optimized for fast serverless | 2026-08-21 | `archive/PROGRESS_ARCHIVE.md` § MH-AI-ARCH-002 decision #4 | ✅ نعم — الكود الحالي يتوافق (Vercel role unchanged) |
| AAD5 | **Future AI features classified before placement** — `fast/interactive → Vercel`, `heavy/long-running → Render`, `hybrid → Vercel orchestrator + Render heavy execution` | Clear routing rule prevents architecture drift | 2026-08-21 | `archive/PROGRESS_ARCHIVE.md` § MH-AI-ARCH-002 decision #5 | ✅ ساري — Process rule for all future AI features |
| AAD6 | **Blog stays separate from EVO** — Blog AI remains separate subsystem. Target Blog pipeline shape (on Render): `Topic → Research → Generation → Translation → Smart terminology/content audit → Enrichment → Save/Publish` | Blog = content production; EVO = conversation — different concerns | 2026-08-21 | `archive/PROGRESS_ARCHIVE.md` § MH-AI-ARCH-002 decision #6 | ✅ ساري — Partial implementation exists on Vercel (BLOG-EXTERNAL-RESEARCH-001 + BLOG-PIPELINE-RESILIENCE-002). Future: migrate to Render |
| AAD7 | **Architecture Principle (binding one-liner):** `EVO = conversational experience. Vercel = fast application layer. Render = heavy AI execution layer.` | Concise routing rule | 2026-08-21 | `archive/PROGRESS_ARCHIVE.md` § MH-AI-ARCH-002 decision #7 | ✅ نعم — Binding policy from 2026-08-21 |
| AAD8 | **Current Blog pipeline is NOT removed** — Vercel-based Blog pipeline (Step 1 → 2a → 2b → 2c → 2d → 3) preserved and continues to run until Render Backend replacement is built, tested, and verified | No breaking changes until replacement is proven | 2026-08-21 | `archive/PROGRESS_ARCHIVE.md` § MH-AI-ARCH-002 decision #8 | ✅ نعم — الكود الحالي يتوافق (pipeline شغّال) |

---

## 5. التاريخ المضغوط (Condensed History)

> 🗄️ **الأرشفة (Phase 82):** التاريخ المضغوط الكامل (كل المراحل حتى 77) نُقل إلى `archive/PROGRESS_ARCHIVE.md` — ملحق 2026-09-02. آخر المراحل مفصّلة أعلى الملف، وقسم الأرشيف أدناه فيه المؤشرات.
## 6. الأرشيف (Archive)

المحتوى التاريخي التفصيلي الكامل منقول إلى:

**`archive/PROGRESS_ARCHIVE.md`** (2826 سطر — was the original PROGRESS.md)

يتضمن:
- تفاصيل Phases 0–10 التنفيذية الكاملة
- سجلات تنفيذ كاملة لكل task (BLOG-PIPELINE-REDESIGN-001, BLOG-EXTERNAL-RESEARCH-001, BLOG-MULTILANG-ENGINE-001, BLOG-PIPELINE-RESILIENCE-002, AI-RESEARCH-EXTERNAL-001, MH-AI-ARCH-002, MH-AI-BLOG-003, MH-AI-NEXT-004, MH-BLOG-NEXT-005, MH-AI-OPENROUTER-006, MH-QUEUE-HANDOFF-007, MH-ZAI-PROD-008, MH-ZAI-FETCH-009, EN-AR-SEPARATION-v2, SEO-ADSENSE-FIX, PAYPAL-INTEGRATION)
- تفاصيل Post-Push Production Verification (2026-08-19)
- Documentation accuracy fixes (Phase 7)
- سرد Phase 5 + Phase 6 الكامل
- `archive/PROGRESS_ARCHIVE.md` § MH-AI-ARCH-002 (AI Architecture Direction) — المحتوى الأصلي الكامل للقرارات الـ 8

---

> **ملاحظة:** هذا الملف يتم تحديثه مع كل تغيير في المشروع. آخر نسخة موجودة دائماً على GitHub: `https://github.com/muscleshubfit-cpu/musclehubeg/blob/main/PROGRESS.md`


> 🗄️ **ملحق 2026-09-02:** إدخالات المراحل 58-71 المُلحقة أسفل الملف نُقلت أيضاً إلى الملحق نفسه في `archive/PROGRESS_ARCHIVE.md`.
