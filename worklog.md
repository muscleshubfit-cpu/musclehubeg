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

---
Task ID: PAYPAL-PHASE-4-CHECKOUT-INTEGRATION
Agent: Main (Z User)
Task: PayPal Phase 4 — Integrate PayPal into CheckoutView as PRIMARY payment method.

CHANGES:
1. src/lib/plans.ts:
   - Added 'paypal' to PaymentMethod type: "instapay" | "vodafone_cash" | "paypal"

2. src/components/views/CheckoutView.tsx (complete rewrite, ~400 lines):
   - Added PayPal as PRIMARY (default) payment method alongside InstaPay + Vodafone Cash
   - usePayPalScript() hook: lazily loads PayPal JS SDK with NEXT_PUBLIC_PAYPAL_CLIENT_ID
     (NOT client-id=test). Only loads when PayPal method is selected.
   - PayPalButtons component: renders PayPal JS SDK buttons
     * createOrder → POST /api/paypal/create-order (server-side price)
     * onApprove → POST /api/paypal/capture-order (server-side capture + activation)
     * onCancel → toast "Payment cancelled" (stays on checkout)
     * onError → toast "An error occurred" (stays on checkout)
   - PayPal success state: green checkmark + "Payment successful!" + redirect to dashboard
   - PayPal loading state: spinner "Loading PayPal..."
   - PayPal error state: "PayPal not available. Use manual payment."
   - 3-column payment method selector: PayPal (Instant) | InstaPay | Vodafone
   - Manual payment flow (InstaPay/Vodafone Cash) is UNCHANGED:
     * QR code display
     * Contact info form
     * Receipt upload
     * submitSubscriptionRequest()
     * Coach approval flow

SECURITY:
- No secrets in frontend — only NEXT_PUBLIC_PAYPAL_CLIENT_ID (public by design)
- PayPal JS SDK loaded with client-id=NEXT_PUBLIC_PAYPAL_CLIENT_ID (not 'test')
- Price comes from server (create-order endpoint resolves via resolvePlanPrice)
- Capture is server-side (capture-order endpoint verifies with PayPal API)
- Subscription activation only after verified COMPLETED capture

NOT TOUCHED:
- No Webhook route (next phase)
- No manual payment flow changes
- No DB migrations
- No create-order or capture-order API route changes

QA:
- TypeScript: PASS (0 errors)
- Lint: PASS (0 errors, 4 pre-existing warnings)
- Build: PASS (exit 0; /checkout route registered)

IMPORTANT:
- NEXT_PUBLIC_PAYPAL_CLIENT_ID must be set in Vercel for PayPal JS SDK to work
- Without it, PayPal button shows "PayPal not available" fallback
- All other payment methods work regardless

---
Task ID: PAYPAL-CAPTURE-SERVER-FIX
Agent: Main (Z User)
Task: Fix capture-order route — replace client-only imports with server-side supabaseAdmin helpers.

ROOT CAUSE:
capture-order/route.ts imported upsertSubscription(), createNotification(),
and processSubscriptionInitialPayment() from src/lib/data.ts and
src/lib/affiliate-engine.ts. Both files import the client-side Supabase
browser client (createBrowserClient), which cannot be used in a server
route. Next.js throws: "Attempted to call upsertSubscription() from the
server but upsertSubscription is on the client."

FIX:
Replaced all 3 client-only function calls with server-side equivalents
that use supabaseAdmin (service-role client):

1. serverUpsertSubscription() — replicates upsertSubscription() logic
   using supabaseAdmin.from("subscriptions").upsert()
2. serverCreateNotification() — replicates createNotification() using
   supabaseAdmin.from("notifications").insert()
3. serverProcessAffiliateCommission() — replicates the core of
   processSubscriptionInitialPayment() using supabaseAdmin for:
   - affiliate_transactions insert (idempotent via external_reference)
   - affiliate_commissions insert (idempotent via unique transaction_id)
   - referral_earnings insert (links to payout system)
   - referrals table update (status → 'completed')
   - notification to affiliate

Also: COMMISSION_RATE (0.20) defined directly in the route file instead
of importing from referral.ts (which also uses client supabase).

SECURITY:
- supabaseAdmin bypasses RLS — safe because:
  a) User identity already verified via requireUser()
  b) PayPal custom_id verified against authenticated user (IDOR check)
  c) Capture status verified as COMPLETED by PayPal API
- All idempotency protections preserved:
  - PayPal-Request-Id header
  - HTTP 422 ORDER_ALREADY_CAPTURED handling
  - Unique constraint on affiliate_commissions.transaction_id
  - Unique constraint on affiliate_transactions(external_reference, transaction_type)

NOT TOUCHED:
- No manual payment flow changes
- No DB migrations
- No create-order route changes
- No CheckoutView changes

QA:
- TypeScript: PASS (0 errors)
- Lint: PASS (0 errors, 4 pre-existing warnings)
- Build: PASS (exit 0; /api/paypal/capture-order registered)

---
Task ID: PAYPAL-ADMIN-NOTIFICATION-COACHING-FIX
Agent: Main (Z User)
Task: Fix missing admin notifications + PayPal payment record + coaching page buttons.

FIXES:

1. ADMIN NOTIFICATIONS (capture-order route):
   - Added serverCreateAdminNotification() — inserts into admin_notifications
     table so the coach sees a notification in their bell: "دفع PayPal جديد ✅"
   - Added serverCreatePayPalPaymentRecord() — inserts into subscription_requests
     with status='approved' + payment_method='paypal' so the coach sees it
     in the payments dashboard alongside manual payments.
   - Both are called after successful capture + subscription activation.
   - Both are non-blocking (errors are logged but don't fail the capture).

2. DB MIGRATION (0016_add_paypal_to_payment_method.sql):
   - The subscription_requests table had a CHECK constraint:
     payment_method in ('instapay', 'vodafone_cash')
   - This would reject 'paypal' at the DB level.
   - Migration 0016 drops the old constraint and adds:
     payment_method in ('instapay', 'vodafone_cash', 'paypal')
   - Also appended to RUN_ON_SUPABASE.sql for manual execution.

3. TYPES (src/lib/supabase/types.ts):
   - Updated payment_method type to include 'paypal' in all 3 places
     (Row, Insert, Update) to match the new DB constraint.

4. COACHING PAGE BUTTONS (src/app/coaching/page.tsx):
   - 3 buttons were navigating to /memberships instead of /checkout
   - Changed to: window.location.href = "/checkout?tier=coaching&months=1"
   - Affected buttons:
     * "Start your transformation" (hero CTA)
     * "Get Started" (pricing card)
     * "Start my transformation" (final CTA)
   - "See all details" link kept as /memberships (for comparison view)

QA:
- TypeScript: PASS (0 errors)
- Lint: PASS (0 errors, 7 warnings — 3 new from coaching page window.location)
- Build: PASS (exit 0)

IMPORTANT:
- Migration 0016 must be applied to production Supabase before the code
  works correctly. Run the SQL in Supabase SQL Editor.

---
Task ID: PAYPAL-WEBHOOK
Agent: Main (Z User)
Task: Create PayPal Webhook route with server-side signature verification.

NEW FILE:
- src/app/api/paypal/webhook/route.ts (~160 lines)

FEATURES:
1. Server-side signature verification:
   - Reads PayPal transmission headers (PAYPAL-TRANSMISSION-ID, -TIME,
     -SIG, PAYPAL-CERT-URL, PAYPAL-AUTH-ALGO)
   - Calls PayPal's /v1/notifications/verify-webhook-signature API
   - Uses PAYPAL_WEBHOOK_ID env var
   - Rejects unsigned/invalid webhooks with 401

2. Event logging (audit trail):
   - PAYMENT.CAPTURE.COMPLETED → logs success
   - PAYMENT.CAPTURE.DENIED → logs denial
   - PAYMENT.CAPTURE.REFUNDED → logs refund (future: reverseCommission)
   - CHECKOUT.ORDER.APPROVED → logs approval
   - * → logs unknown events

3. NO subscription activation:
   - The webhook does NOT activate subscriptions or commissions
   - The capture-order endpoint is the authoritative source for activation
   - This prevents double-activation if both webhook and capture fire

4. No user auth required:
   - PayPal sends the webhook, not a user
   - Security is via signature verification only

QA:
- TypeScript: PASS (0 errors)
- Lint: PASS (0 errors, 7 pre-existing warnings)
- Build: PASS (exit 0; /api/paypal/webhook route registered)

IMPORTANT:
- PAYPAL_WEBHOOK_ID must be set in Vercel env vars
- The webhook URL must be registered in PayPal Developer Dashboard:
  https://developer.paypal.com/dashboard/applications/sandbox
  → Select the app → "Add Webhook" → URL:
  https://musclehubeg.vercel.app/api/paypal/webhook

---
Task ID: PAYPAL-SETUP-PHASE-1 (retroactive)
Agent: Main (Z User)
Task: PayPal Phase 1 — Install package + add env vars to .env.example.

- Installed @paypal/react-paypal-js v10.3.0 via bun add
- Added PayPal env vars to .env.example (no secrets):
  PAYPAL_CLIENT_ID, PAYPAL_CLIENT_SECRET, PAYPAL_WEBHOOK_ID,
  PAYPAL_MODE=sandbox, NEXT_PUBLIC_PAYPAL_CLIENT_ID
- Commit: 412056a

---
Task ID: PAYPAL-PHASE-2-CREATE-ORDER (retroactive)
Agent: Main (Z User)
Task: PayPal Phase 2 — Create src/lib/paypal.ts + create-order route.

- Created src/lib/paypal.ts: getPayPalAccessToken() (OAuth2 cached),
  createPayPalOrder() (Orders API v2), resolvePlanPrice() (server-side).
- Created POST /api/paypal/create-order: auth + plan validation + price.
- Commit: ea464f3

---
Task ID: PAYPAL-PHASE-3-CAPTURE (retroactive)
Agent: Main (Z User)
Task: PayPal Phase 3 — Capture Order + subscription activation.

- Added capturePayPalOrder() to paypal.ts (POST /v2/checkout/orders/{id}/capture)
- Handles HTTP 422 ORDER_ALREADY_CAPTURED via fetchPayPalOrderDetails()
- Created POST /api/paypal/capture-order: auth + IDOR check + status=COMPLETED
  verification + subscription activation + affiliate commission (idempotent)
- Commit: 115953f

---
Task ID: PAYPAL-PHASE-4-CHECKOUT-INTEGRATION
Agent: Main (Z User)
Task: PayPal Phase 4 — Integrate PayPal into CheckoutView.

- Added 'paypal' to PaymentMethod type
- Rewrote CheckoutView.tsx: PayPal as PRIMARY payment method
- usePayPalScript() hook: lazy-loads SDK with NEXT_PUBLIC_PAYPAL_CLIENT_ID
- PayPalButtons component: createOrder → /api/paypal/create-order,
  onApprove → /api/paypal/capture-order
- Success: redirect to dashboard. Cancel/Error: stay on checkout.
- Manual payment (InstaPay/Vodafone Cash) unchanged.
- Commit: 17fa894

---
Task ID: PAYPAL-CAPTURE-SERVER-FIX
Agent: Main (Z User)
Task: Fix capture-order route — replace client-only imports with server-side supabaseAdmin.

- upsertSubscription() + createNotification() + processSubscriptionInitialPayment()
  were imported from client-only modules (data.ts, affiliate-engine.ts)
- Replaced with: serverUpsertSubscription(), serverCreateNotification(),
  serverProcessAffiliateCommission() — all using supabaseAdmin
- COMMISSION_RATE defined directly in route file (avoids importing referral.ts)
- Commit: ba3d399

---
Task ID: PAYPAL-ADMIN-NOTIFICATION-COACHING-FIX
Agent: Main (Z User)
Task: Add admin notifications + PayPal payment records + fix coaching buttons.

- Added serverCreateAdminNotification() — coach gets bell notification
- Added serverCreatePayPalPaymentRecord() — record in subscription_requests
- Migration 0016: added 'paypal' to payment_method CHECK constraint
- Updated types.ts: payment_method includes 'paypal'
- Fixed 3 coaching page buttons: /memberships → /checkout?tier=coaching&months=1
- Commit: 5ef6cc6

---
Task ID: PAYPAL-WEBHOOK
Agent: Main (Z User)
Task: Create PayPal Webhook route with signature verification.

- Created src/app/api/paypal/webhook/route.ts (~160 lines)
- Verifies signature via PayPal's /v1/notifications/verify-webhook-signature
- Uses PAYPAL_WEBHOOK_ID env var
- Logs events (CAPTURE.COMPLETED, DENIED, REFUNDED, ORDER.APPROVED)
- Does NOT activate subscriptions (capture-order is authoritative)
- Rejects unsigned webhooks with 401
- Commit: 6489da0

---
Task ID: PAYPAL-FAWRY-FIX
Agent: Main (Z User)
Task: Replace 'فوري/Instant' label with neutral text to avoid Fawry confusion.

- 'فوري' → 'دفع سريع وآمن'
- 'Instant' → 'Fast & secure'
- Subtitle: 'فوري' → 'سريع وآمن'
- Commit: 8bf6cc4

---
Task ID: PAYPAL-LIVE-READINESS-CHECK
Agent: Main (Z User)
Task: Read-only Live readiness check (no code changes).

Results:
1. PAYPAL_MODE=live — ⚠️ CANNOT VERIFY (Vercel env var)
2. Client ID matching — ⚠️ CANNOT VERIFY (Vercel env vars)
3. PAYPAL_WEBHOOK_ID — ⚠️ CANNOT VERIFY (Vercel env var)
4. Webhook route + signature verification — ✅ PASS
5. Create Order + Capture use Live API — ✅ PASS
6. No sandbox URLs/credentials in code — ✅ PASS
7. Manual Payment unchanged — ✅ PASS
8. TS + Lint + Build — ✅ PASS

3 items require manual Vercel env var configuration before going Live.
