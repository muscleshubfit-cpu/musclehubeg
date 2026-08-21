# Worklog

- 2026-08-21: Replaced Z.ai web search and image generation with Gemini APIs. Fixed corrupted blog-generate.ts file. Tested compilation. Removed all Z.ai references from codebase. Added `allowedDevOrigins` to next.config.ts to resolve preview cross-origin dev resource warnings. Enhanced blog topic picker with anti-semantic duplication and multi-archetype variety. Handled client Supabase blog fetch errors gracefully with silent fallback handlers.
- 2026-08-21: Switched blog image generation strategy to Pollinations AI CDN URLs (1024x576) for instant, lightweight (<1s, <100b DB size) image generation. Standardized AI key resolution across the entire AI ecosystem using `getGeminiApiKey()` (`GEMINI_API_KEY` -> `GOOGLE_API_KEY` -> `GOOGLE_GENAI_API_KEY` -> `AI_API_KEY` -> `OPENROUTER_API_KEY`). Verified clean build with `npx tsc --noEmit` and `bun run lint`.

