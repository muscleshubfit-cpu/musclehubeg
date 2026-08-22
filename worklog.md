# Worklog

- 2026-08-21: Replaced Z.ai web search and image generation with Gemini APIs. Fixed corrupted blog-generate.ts file. Tested compilation. Removed all Z.ai references from codebase. Added `allowedDevOrigins` to next.config.ts to resolve preview cross-origin dev resource warnings. Enhanced blog topic picker with anti-semantic duplication and multi-archetype variety. Handled client Supabase blog fetch errors gracefully with silent fallback handlers.
- 2026-08-21: Fixed blog generation issues: 1) Generated photorealistic fitness prompts in English for clean AI images; 2) Enforced high-quality Arabic text while preserving scientific abbreviations (e.g. Creatine HCL, ATP, BCAA); 3) Strengthened anti-duplication topic rotation. Restored `.env.example`.
- 2026-08-21: Re-engineered `src/lib/blog-admin.ts` and `/api/ai/blog-tool` to route all blog editor AI tools directly to `callGemini` (Gemini 3.7 Flash) and `/api/ai/blog-tool` endpoint. Removed all dummy/static placeholder fallback strings. Passed full `compile_applet` verification.


---
Task ID: EN-AR-SEPARATION-v2
Agent: Main (Z User)
Task: Full EN/AR separation in blog article generation — applied on top of remote commits 24657bb + cc8e510 + f92b850 (which already had stage-aware model selection + external-search Gemini Flash fallback).

Work Log:
- Created `src/lib/openrouter-flash.ts` — new helper for Gemini Flash via OpenRouter.
  Used by Topic stage (Stage 1) per AI model policy. Key source: OPENROUTER_API only.
  Fallback: gemini-3.7-flash → 3.6-flash → 3.5-flash. NO Gemini API key, NO AI_MODEL, NO Pro.
- Modified `src/lib/blog-topics.ts` — swapped callFreeOpenRouterLimited →
  callGeminiFlashViaOpenRouter for Topic stage. Minimal change: only the AI call
  function swapped, all rotation/anti-repetition/curated fallback logic preserved.
- Modified `src/lib/blog-generate.ts` — major restructure:
  • Updated chunk1Prompt: now produces EN article + EN SEO + EN FAQ + EN image
    prompts + EN social posts + EN reading time. NO Arabic content (no more
    ar.seoTitle/ar.metaTitle/ar.metaDescription/ar.slug generation in EN call).
  • Updated chunk2Prompt: now produces AR article + AR SEO + AR FAQ + AR image
    prompts + AR social posts + AR reading time. NO English FAQ generation.
  • Updated SeoBlock type: added optional focusKeyword + secondaryKeywords
    (per-language).
  • Updated ArticleBundle type: added optional imagePromptsAr, socialPostsAr,
    estimatedReadingTimeAr, internalLinksAr, externalLinksAr (backward compat
    with old bundles).
  • Updated generateEnglishArticle: returns full EN data (seo + englishArticle
    + faq + imagePrompts + socialPosts + estimatedReadingTime).
  • Updated generateArabicArticle: removed englishArticle input parameter.
    Signature: (input, seo, research?) — no longer takes English article.
    Returns full AR data (seo + arabicArticle + faqAr + imagePromptsAr +
    socialPostsAr + estimatedReadingTimeAr).
  • Updated generateArticleBundle: accepts optional `language` param.
    language="en" → EN only. language="ar" → AR only. undefined → both.
    Uses new separated generateEnglishArticle + generateArabicArticle + links.
  • Updated buildFinalBundle: supports both old (combined) and new (separated)
    bundle formats. AR reading time falls back to EN for old bundles.
- Updated `src/app/api/cron/blog/step2b-en-article/route.ts` — saves full EN
  data (SEO + article + FAQ + image prompts + social posts + reading time).
- Updated `src/app/api/cron/blog/step2c-ar-article/route.ts` — REMOVED
  englishArticle input. Calls generateArabicArticle(topic, seo, research).
  Saves AR SEO + AR article + AR FAQ + AR image + AR social + AR reading time.
- Updated `src/app/api/cron/blog/step3-publish/route.ts` — EN/AR SEPARATION:
  • enRow built from EN-specific fields (seo.en.focusKeyword, seo.en.secondaryKeywords,
    estimatedReadingTime, faq).
  • arRow built INDEPENDENTLY from AR-specific fields (seo.ar.focusKeyword,
    seo.ar.secondaryKeywords, estimatedReadingTimeAr, faqAr). NO spread from enRow.
  • NO fallback to EN faq for AR — AR uses faqAr only (empty array if absent).
  • AR has its own reading_time, cover_alt, focus_keyword, keywords, tags.
  • Only shared field: featured_image URL (one image per article pair — OK per requirements).
  • linked_post_id preserved for DB linking (not a generation dependency).
  • Backward compat: buildFinalBundle handles both old and new bundle formats.
- Updated `src/app/api/ai/generate-article/route.ts` — passes `language` param
  to generateArticleBundle. language=en → EN only. language=ar → AR only.
  undefined → both.
- Updated `src/components/views/BlogEditorView.tsx` — applyAIBundle now uses
  per-language FAQ (faqAr for Arabic, NO fallback to EN), per-language
  focusKeyword, imagePrompts, socialPosts, reading_time.
- Updated `src/components/blog/AIGenerateModal.tsx` — GeneratedBundle type
  updated with optional AR fields (faqAr, imagePromptsAr, socialPostsAr,
  estimatedReadingTimeAr, internalLinksAr, externalLinksAr, per-language
  SeoBlock focusKeyword/secondaryKeywords).

Stage Summary:
- Full EN/AR separation implemented across: blog-generate.ts, all cron step
  routes (2b, 2c, 2d), step3-publish, /api/ai/generate-article, BlogEditorView,
  AIGenerateModal.
- Stage 1 (Topic): Gemini Flash via OpenRouter (OPENROUTER_API key only,
  3.7→3.6→3.5 fallback).
- Stage 2 (Research): UNCHANGED — external-search.ts already uses Gemini Flash
  via Google API with Google Search grounding (commit f92b850).
- Stage 3 (Article): OpenRouter free models (callFreeOpenRouterLimited) —
  per language, separate calls, no cross-language input.
- Stage 4 (EVO): UNCHANGED — still uses callFreeOpenRouterRace.
- Image generation: UNCHANGED — commit 24657bb fix preserved.
- Backward compat: old queue bundles still work with step3-publish (falls back
  to shared seo.focusKeyword / seo.secondaryKeywords / estimatedReadingTime).
- Old ArticleBundle shape still accepted by buildFinalBundle.
- Legacy routes (cron/generate-blog-post, cron/blog/step2-generate) —
  UNCHANGED. They call generateArticleBundle which now uses the new separated
  pipeline internally.
- linked_post_id preserved as DB linking only (not a generation dependency).
- No local/hardcoded article fallback re-introduced (generateLocalArticleBundle
  was pre-existing on remote — not modified, not removed, per "don't touch
  historical data" requirement).

Verified:
- tsc --noEmit: PASS (0 errors)
- bun run lint: 0 errors in modified files (4 pre-existing warnings in
  unrelated files)
- bun run build: PASS (79/79 static pages, 0 errors)
- git diff --check: clean

Architecture Decision Record — EN/AR separation:
- Decision: Split EN and AR generation into fully independent AI calls. Each
  language has its own prompt builder and produces its own complete data
  (SEO + article + FAQ + image + social + reading time).
- Rationale: Prior architecture had EN and AR SEO generated in one call
  (chunk1Prompt), AR article received EN article as input (for "coherence"),
  and links/image/social were generated in a single combined call. This
  created tight coupling: AR quality depended on EN quality, AR couldn't be
  generated independently, and AR inherited EN metadata at publish time.
- New architecture: each language is a self-contained generation pipeline.
  EN produces EN SEO + EN article + EN FAQ + EN image + EN social + EN
  reading time. AR produces AR SEO + AR article + AR FAQ + AR image + AR
  social + AR reading time. Links generated separately per language.
- Backward compatibility: ArticleBundle type extended with optional AR-specific
  fields. Old bundles without these fields are handled by buildFinalBundle with
  fallback to shared fields. step3-publish reads per-language fields when
  present, falls back to shared fields for old bundles.
- Trade-off: AR generation no longer matches EN article structure (was the P1-6
  "fix"). This is intentional — the user's requirement is full separation, even
  at the cost of structural coherence. Each language now produces a genuinely
  independent article.

---
Task ID: SEO-ADSENSE-FIX
Agent: Main (Z User)
Task: Implement SEO + AdSense fixes per TRACE/AUDIT report — add ads.txt, add noindex to private pages, fix 404 page, fix hreflang.

Work Log:
- Created `public/ads.txt` with content:
    google.com, pub-8658364692422583, DIRECT, f08c47fec0942fa0
  (publisher ID extracted from production AdSense script tag — confirmed
  present in NEXT_PUBLIC_ADSENSE_CLIENT env var on Vercel + as fallback in
  src/components/AdSenseAd.tsx:75).

- Updated `next.config.ts` headers() to include `ads.txt` in the same
  Cache-Control group as `robots.txt` and `sitemap.xml`.

- Refactored `src/app/(app)/layout.tsx` (was client component):
  • Renamed to `src/app/(app)/auth-gate.tsx` — named export `AuthGate`
    (no metadata export — client component).
  • Created new `src/app/(app)/layout.tsx` — server component that exports
    `metadata: { robots: { index: false, follow: false } }` and renders
    <AuthGate> as body.
  • Covers: /dashboard, /plans, /progress, /chat, /support, /referral,
    /coach/*, /questionnaires.

- Refactored `src/app/admin/layout.tsx` (was client component):
  • Renamed to `src/app/admin/admin-gate.tsx` — named export `AdminGate`.
  • Created new `src/app/admin/layout.tsx` — server component with noindex
    metadata + renders <AdminGate>.
  • Covers: /admin/blog, /admin/referrals, /admin/leads, /admin/saved-results.

- Updated `src/app/profile/layout.tsx`: added `robots: { index: false, follow: false }`
  to existing metadata.

- Created `src/app/checkout/layout.tsx`: server component with noindex
  (page.tsx is a client component, so layout owns the metadata).

- Created `src/app/auth/layout.tsx`: server component with noindex
  (covers /auth + /auth/callback).

- Created `src/app/not-found.tsx`:
  • `metadata.robots: { index: false, follow: false }`
  • `metadata.alternates.canonical: ""` — suppresses the inherited root
    canonical (so 404 URL is not treated as a duplicate of homepage).
  • Visual style matches Next.js default 404 (centered numeric 404 + divider
    + caption + "Go back home" link).

- Updated `src/app/metadata.ts` alternates.languages.ar-EG:
  • From: "https://musclehubeg.vercel.app" (same as en-US — bug)
  • To:   "https://musclehubeg.vercel.app/ar" (correct Arabic URL)

Production verification (after push + 90s Vercel deploy):
- /ads.txt → HTTP 200, content-type: text/plain, content matches exactly.
- /robots.txt → HTTP 200 (unchanged, content matches).
- /sitemap.xml → HTTP 200 (unchanged, 155 URLs).
- /dashboard → <meta name="robots" content="noindex, nofollow"/>
- /admin/blog → <meta name="robots" content="noindex, nofollow"/>
- /profile → <meta name="robots" content="noindex, nofollow"/>
- /checkout → <meta name="robots" content="noindex, nofollow"/>
- /auth → <meta name="robots" content="noindex, nofollow"/>
- 404 page → <meta name="robots" content="noindex, nofollow"/> + NO canonical tag.
- Homepage hreflang → ar-EG now points to "https://musclehubeg.vercel.app/ar".

Stage Summary:
- ads.txt file is now present and accessible on production (HTTP 200, correct content-type, exact content match). AdSense crawler can fetch it.
- All private authenticated pages (/dashboard, /plans, /progress, /chat, /support, /referral, /coach/*, /questionnaires, /admin/*, /profile, /checkout, /auth/*) now emit noindex, nofollow.
- 404 page emits noindex, nofollow, and no canonical (does not point to homepage).
- Hreflang ar-EG correctly points to /ar (was previously pointing to the English homepage URL — bug fixed).
- public/robots.txt, src/app/sitemap.ts, src/middleware.ts, src/components/AdSenseAd.tsx, src/app/layout.tsx (AdSense script loading), vercel.json — all untouched per task constraints.
- No database changes, no blog generation changes, no AI system changes.

Verified:
- tsc --noEmit: PASS (0 errors)
- bun run lint: PASS (0 errors, 4 pre-existing warnings in unrelated files)
- bun run build: PASS (79/79 static pages, 0 errors)
- git diff --check: clean
- Production verification: all 9 endpoints tested OK.
