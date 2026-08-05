
---
Task ID: ai-content-assistant
Agent: main (super-z)
Task: Add AI Content Assistant to existing MuscleHub Blog Admin. OpenRouter default, OpenAI-compatible providers, single "Generate with AI" button in the existing Blog Editor that auto-fills all fields from a topic or focus keyword. NO rebuild of the blog system — extension only.

Work Log:
- Read existing BlogEditorView, BlogAdminView, blog-admin.ts, ai-gemini.ts, middleware, supabase client to map the integration points.
- Created src/lib/ai-provider.ts — universal OpenAI-compatible client supporting openrouter (default), openai, gemini (OpenAI-compat endpoint), anthropic, groq, deepseek. Single callAI() + testConnection() + parseJSON() helpers. Reads env vars + supports a runtime override (passed in from cookies).
- Created src/app/api/ai/settings/route.ts — GET returns current status (key never exposed, masked only) + the provider catalog. POST saves an override into HTTP-only cookies (so the admin can switch providers WITHOUT code changes or DB migrations). DELETE/clear removes the override.
- Created src/app/api/ai/test/route.ts — Tests a preview config OR the saved config; returns ok:true with a sample reply or ok:false with a friendly error.
- Created src/app/api/ai/generate-article/route.ts — The heart of the assistant. Takes a topic OR focusKeyword and produces the full bundle: research/angle/intent, SEO data (title/meta/slug/keywords), English article (markdown, optimized for SEO/GEO/AEO/AI search/E-E-A-T), Arabic article (LOCALIZED, not translated), FAQ + JSON-LD-ready array, internal + external link suggestions, image prompts (featured/facebook/OG — English, ultra-realistic, no text), social posts (Facebook/LinkedIn/Instagram/X — hook, CTA, engagement question, hashtags, "reg link in first comment" note), estimated reading time. Strict JSON output, defensive parsing.
- Created src/components/views/AISettingsView.tsx — Full admin UI: provider picker (6 cards), API key input (with show/hide toggle), model + base URL fields, Test Connection button (preview mode), Save button, Clear saved button, status banner showing current provider/model/masked key/source, security + how-it-works help cards. Bilingual EN/AR.
- Created src/app/admin/ai-settings/page.tsx — Route wrapper.
- Created src/components/blog/AIGenerateModal.tsx — Modal that opens from the Blog Editor. Inputs: topic OR focus keyword, category, default language. Calls /api/ai/generate-article, shows a rich preview (research summary, SEO data, EN+AR article tabs with markdown rendering, FAQ, link suggestions, image prompts with per-card copy buttons, social posts with per-card copy buttons). Two final action buttons: "Use English" / "Use Arabic" — fills the editor with the chosen article + SEO + FAQ, stashes the other article + extras in schema_json so they're saved with the draft.
- Modified src/components/views/BlogEditorView.tsx — Added "Generate with AI" gradient button in the header (with smart redirect to AI Settings if no key configured), AI Settings shortcut button with live provider badge, AI Generate Modal wiring, applyAIBundle() handler that fills ALL fields (title, slug, content, meta_title, meta_description, focus_keyword, keywords, tags, faq_json, schema_json) + surfaces image prompts & social posts in the existing AI results panel for easy copying.
- Modified src/components/views/BlogAdminView.tsx — Added "AI Settings" button + an "AI Content Assistant is ready" hint banner with a "Start Generating" CTA.
- Updated .env.example — Documented AI_PROVIDER, AI_MODEL, AI_BASE_URL, AI_API_KEY, OPENROUTER_API_KEY, OPENAI_API_KEY, GEMINI_API_KEY, ANTHROPIC_API_KEY, GROQ_API_KEY, DEEPSEEK_API_KEY with usage notes.

Stage Summary:
- Build passes: `npx next build` succeeds. All new routes visible: /admin/ai-settings (static), /api/ai/settings, /api/ai/test, /api/ai/generate-article (dynamic).
- TypeScript: zero new errors introduced (existing pre-existing errors in PlansView/ai-local/chart/blog-admin types are unrelated to this task).
- ESLint: clean on all new files.
- End-to-end smoke tests passed:
  * GET /api/ai/settings → returns provider list + status (isConfigured:false initially, maskedKey:null)
  * POST /api/ai/settings (save) → cookie set, status flips to isConfigured:true source:"override" maskedKey:"sk-o…2345"
  * GET /api/ai/settings (with cookie) → status persists
  * POST /api/ai/settings (clear) → cookie deleted
  * POST /api/ai/test (empty key) → returns {ok:false, error:"AI provider not configured…"} — graceful, no crash
  * POST /api/ai/generate-article (no key) → returns {error:"AI provider not configured…"} — graceful, no crash
  * /admin/ai-settings page → HTTP 200
- Security: API key never returned to the browser (only the masked version is shown). Stored in HTTP-only cookies with sameSite=lax, secure in production, 1-year maxAge. Cookies are sent automatically to /api/ai/* endpoints so the admin doesn't need to re-enter the key per request.
- Workflow respected: Generate → Preview → Edit → Save as Draft. Nothing is auto-published. The admin can freely edit any field after generation.
- Bilingual: full EN/AR UI in both AISettingsView and AIGenerateModal. Arabic articles are LOCALLY written (Egyptian/Gulf context, prayer-time scheduling, Egyptian foods, etc.), not translated from English.
