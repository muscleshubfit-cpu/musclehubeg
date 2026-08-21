# QA_CHECKLIST.md

- [x] Compilation works (`tsc --noEmit` passes 0 errors)
- [x] All Z.ai strings removed from src/
- [x] `src/lib/blog-generate.ts` repaired and functional
- [x] Metadata `metadataBase` added to app/metadata.ts
- [x] `allowedDevOrigins` configured in next.config.ts for preview environment cross-origin requests
- [x] Topic picker diversity and anti-semantic duplication enhanced in `src/lib/blog-topics.ts`
- [x] Wrapped client blog & admin queries in safe try/catch handlers to handle network/offline states gracefully

