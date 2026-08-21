# Worklog

- 2026-08-21: Replaced Z.ai web search and image generation with Gemini APIs. Fixed corrupted blog-generate.ts file. Tested compilation. Removed all Z.ai references from codebase. Added `allowedDevOrigins` to next.config.ts to resolve preview cross-origin dev resource warnings. Enhanced blog topic picker with anti-semantic duplication and multi-archetype variety. Handled client Supabase blog fetch errors gracefully with silent fallback handlers.
- 2026-08-21: Fixed blog generation issues: 1) Generated photorealistic fitness prompts in English for clean AI images; 2) Enforced high-quality Arabic text while preserving scientific abbreviations (e.g. Creatine HCL, ATP, BCAA); 3) Strengthened anti-duplication topic rotation. Restored `.env.example`.

