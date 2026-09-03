# QA_CHECKLIST.md — Verification Evidence

> **Role:** Per AGENTS.md §12.8, this file is source-of-truth #3 (below code and migrations, above docs). It records what has been verified, when, and how.
> **For task history:** see `worklog.md` (append-only chronological log).
> **For current status:** `STATE.md` is the OFFICIAL live state (AGENTS.md §3.6); `PROGRESS.md` = recent phase log.

---

## Latest Verification — 2026-09-03 (Phase 110 — NEWSLETTER DEDUP: owner «النشرة البريدية المجانية مكررة فى الصفحة الرئيسية» — duplicate footer card removed, section 13 is the single newsletter surface, same dedup pattern as the 2026-08-30 footer CTA removal)

| Check | Result | How verified |
|---|---|---|
| Duplication root-caused | ✅ | LandingView.tsx rendered TWO newsletter blocks on the homepage: section 13 standalone (variant="home", headline «النشرة البريدية المجانية») + a footer card with the SAME headline (variant="footer") stacked directly below — both added by Phase 72 (section = original owner request, footer = an "also" add-on) |
| Footer duplicate removed (real implementation) | ✅ | footer `<NewsletterForm variant="footer" />` block deleted from LandingView.tsx + a removal comment citing the owner quote and date; section 13 comment updated to declare it the SINGLE newsletter surface since 2026-09-03 — same dedup pattern as the owner's own 2026-08-30 footer CTA strip removal (keep the rich standalone section, drop the footer echo) |
| Stale doc comment fixed | ✅ | NewsletterForm.tsx header no longer claims "Lives in the site footer and on the homepage" — now documents homepage-only usage; the compact variant="footer" styles kept for potential reuse (no API churn) |
| Scope discipline | ✅ | blog article page untouched (its newsletter mention is only a historical comment replacing an old block); no other surface renders NewsletterForm (grep: variant="footer" had zero remaining usages; no test references Newsletter) |
| AI-jobs CI red on e1fca38 — root-caused & fixed in-phase | ✅ | scheduled «Process AI jobs» failed at Install dependencies with npm 10 arborist «Cannot read properties of null (reading 'edgesOut')» (runner node 22 bundles npm 10 · repo has NO lockfile → npm install re-resolves fresh · last success 08:56 SAME DAY on the SAME dependency manifest — nothing dependency-related changed since Phase 72; attempt 2 same crash) · local npm 11.17 dry-run resolves the identical tree exit 0 → fix = one «Bump npm (npm install -g npm@11)» step before Install dependencies in ALL 4 exposed workflows (process-ai-jobs · blog-post-ar · blog-post-en · remediate-blog-images), each citing the incident; workflow_dispatch re-run watched green post-push |
| Docs parity §3.6 | ✅ UPDATED | STATE.md → Phase 110 · QA Latest = Phase 110 + 109 demoted Previous · PROGRESS Phase 110 section + 104 moved VERBATIM to archive/PROGRESS_ARCHIVE.md (cap 6: 110→105) · worklog Task 110 ×2 (repo + workspace) |
| Gates after edits | ✅ | tsc 0 · eslint 0 · vitest 191/191 · migration_audit --ci 0 · docs_parity 0 · docs_audit 0 · check-stale-refs 0 · check-ui-wiring 0 |

---

## Previous Verification — 2026-09-03 (Phase 109 — AR/SEO HOMEPAGE COPY: owner «تقدر تبعت الأوامر الأربعة بالترتيب من غير أي تعديل» on the full Arabic content+SEO plan — owner's verbatim Egyptian-dialect copy across every homepage surface + new primary CTA + meta/alt; الأوامر 2-3 verified live as pre-existing (homepage AR mirror 2026-08-30), not re-implemented)

| Check | Result | How verified |
|---|---|---|
| Command 1 — i18n copy (real implementation) | ✅ | LandingView.tsx (the homepage's actual i18n surface): hero H1 «رحلتك الرياضية الكاملة.. في منصة واحدة» · ecosystem «مش مجرد موقع تمارين..» · EVO «مش شات بوت عادي، ده محرك أداء ذكي» · tools title + 4 cards verbatim names/descs · exercises/programs/foods/coaching/for-coaches/memberships/affiliate titles+bodies · FAQ 5 pairs verbatim (Vodafone Cash/InstaPay/PayPal · «كل الجمهور العربي مش لبلد معينة») — EN strings byte-identical, only AR sides + comments changed |
| Command 1 — meta | ✅ | ar/layout.tsx title/description/OG/Twitter = owner's Meta Title «Musclehubeg \| منصة رياضية شاملة: تمارين وتغذية وكوتشينج اونلاين» + description verbatim ([EVO] notation → plain EVO) |
| Command 1 — primary CTA | ✅ | New section 11.5 between affiliate & FAQ: heading «ابدأ رحلتك دلوقتي مجانًا.. مالكش عذر تأجل بعد اليوم» + button «جرّب المنصة مجانًا» → /ar/memberships (Free-tier home) — designed around the 2026-08-30 removal objection (no duplication, no EVO push) |
| Command 2 — locale routing (live-verified, pre-existing) | ✅ | live curl /ar → 308→/ar 200 · <html lang="ar" dir="rtl"> · Arabic strings present in server HTML (SSR without JS) · reciprocal hreflang en/ar/x-default on both ((home)/layout.tsx + ar/page.tsx) · LanguageToggle MIRROR_ROUTES navigates /ar mirrors · EN paths unchanged |
| Command 3 — JSON-LD (pre-existing, auto-extended) | ✅ | root layout Organization+WebSite (both routes) + LandingView FAQPage built from the same faqs array → updated automatically with owner's copy in both languages; live: 5 ld+json scripts on / and /ar |
| Command 4 — alt text (real implementation) | ✅ | hero alt (ar) «منصة رياضية شاملة - تمارين وتغذية» · EVO alt (ar) «EVO مساعد اللياقة الذكي» — owner's suggested strings verbatim (main keyword inside alt); EN alts unchanged |
| Docs parity §3.6 | ✅ UPDATED | STATE.md → Phase 109 / 28377db (post-push will advance it) · QA + PROGRESS Phase 109 sections · PROGRESS slimmed to cap (Phase 103b → archive/PROGRESS_ARCHIVE.md ملحق 2026-09-03 Phase 109, verbatim) · QA slimmed to cap (Phase 99-run → archive/QA_CHECKLIST_ARCHIVE.md, verbatim) · worklog Task 109 ×2 (repo + workspace) |
| Gates after edits | ✅ | tsc 0 · eslint 0 · vitest 191/191 · migration_audit --ci 0 · docs_parity 0 · docs_audit 0 · check-stale-refs 0 · check-ui-wiring 0 |

---

## Previous Verification — 2026-09-03 (Phase 108 — QUALITY-GATES SHOWCASE: owner «ضيف وصف البوابة الآلية فى وصف المشروع اعتقد دى ميذة قوية لازم تتعرض ، كذلك لو فى اى امور قوية زيها اعرضها برده» — README 🛡️ gates section + GitHub About/topics rewritten via API + Known Issues de-rotted)

| Check | Result | How verified |
|---|---|---|
| README 🛡️ Automated Quality Gates section | ✅ | 5 gates documented with incident lineage (migration_audit · docs_parity · docs_audit · check-stale-refs + check-ui-wiring · Supabase Preview) — every referenced script verified present in `scripts/` on disk; «CI Gates» line added to README front matter + intro sentence |
| Single-source number law | ✅ | docs_audit D-check 0 hits on the edited README — gate names are stable file identifiers, zero variable counts introduced |
| Known Issues de-rotted | ✅ | stale «Types mirror drift (Phase 105 candidate)» removed from the open list (closed in Phase 105: live-shape mirror + 0069 + 8/8 production probes) and moved to the fixed list; H5 re-verified still true (src/lib/blog-pipeline.ts:411) |
| GitHub About + topics via API | ✅ | PATCH /repos + PUT /topics → HTTP 200 — description now leads with the engineering discipline; topics gained github-actions · quality-gates · ci-cd · typescript |
| CI state entering the phase | ✅ | live check-runs on fbb27f4: Supabase Preview success · guard success · parity success |
| Docs parity §3.6 | ✅ UPDATED | STATE.md → Phase 108 / fbb27f4 · QA + PROGRESS Phase 108 sections · PROGRESS slimmed back to cap (Phase 99-run → archive/PROGRESS_ARCHIVE.md ملحق 2026-09-03 Phase 108, verbatim) · worklog Task 108 ×2 (repo + workspace) |
| Gates after edits | ✅ | tsc 0 · eslint 0 · vitest 191/191 · migration_audit --ci 0 · docs_parity 0 · docs_audit 0 · check-stale-refs 0 · check-ui-wiring 0 |

---

## Previous Verification — 2026-09-03 (Phase 107 — KNOWLEDGE OPERATING SYSTEM: owner «go» on the approved study after the earlier go-mixup — STATE.md + single-source number law + docs_audit gate + archive ritual; the law file itself carried a real duplicated §3.6 which this phase made impossible)

| Check | Result | How verified |
|---|---|---|
| STATE.md created (the entry point) | ✅ | ≤100 lines (55 actual), required sections present (المرحلة/المفتوح/بانتظار المالك/الممنوعات/خريطة المصادر) · recorded commit 8b48ce7 is an ancestor of HEAD · linked from README front-door list |
| AGENTS.md §3.6 duplicate (lines 134 + 191) FIXED | ✅ | §3.6 = Session Protocol (STATE first · last-3-worklog+5-commits · trust no number · GitHub-First survival law) · old §3.6 merged into §3.8 Parity Law (+docs: marker + archive/deprecation rules) · §3.1→§3.8 monotonic · docs_audit duplicate-guard live forever |
| Single-source number law enforced as code | ✅ | SENSITIVITY PROOF both directions: docs_audit pre-strip caught 19 variable counts across README/GUIDE (incl. a hidden «66 endpoint» tree comment) → post-strip 0; README Database/Structure/Tech sections rephrased number-free (INDEX.md stays the documented range home) |
| GUIDE stale-fact fixes beyond counts | ✅ | §4 tables section rewritten (the «22 جدول»/«3 ad-hoc» claim was YEARS stale; ad-hoc sub-section marked RESOLVED by 0063 with live shapes pointed to types.ts) · §8 blockquote + Total line now declare code-is-truth |
| docs_audit.py gate (7 check families) | ✅ | A STATE size/sections · B state-commit ancestor-of-HEAD · C phase equality STATE=PROGRESS=QA · D number-free docs · E AGENTS duplicate sections · F slim living docs + archive pointers + exactly-one Latest · G STATE discoverability — wired as 3rd step in docs-parity-gate.yml |
| docs_parity.py scope narrowed honestly | ✅ | README/GUIDE claims removed (number-free now), INDEX.md registry heading check retained; docstring documents the evolution |
| Archive ritual executed | ✅ | PROGRESS 741→~110 lines (5 newest phases kept) · QA 414→~120 (Latest+4 Previous + protocol) · everything older moved VERBATIM to archive/* dated ملحق · archive headers amended to append-only ritual |
| No migration / INDEX untouched | ✅ | docs-only phase — INDEX.md registry heading still matches newest NNNN (docs_parity 0) |
| Code gates (run anyway) | ✅ | tsc 0 · eslint 0 · vitest 191/191 · migration_audit --ci 0 · check-stale-refs 0 |
| Docs parity §3.6 | ✅ UPDATED | STATE.md new · QA/PROGRESS slimmed + Phase 107 sections · worklog Task 107 ×2 (repo + workspace) · AGENTS §3.6/§3.8/§4/§12.5 updated |

---

## Previous Verification — 2026-09-03 (Phase 105 — MIRROR TRUTH FIX: owner approved «go» on the 105 candidate recorded in Phase 104 — types.ts mirror + app paths corrected to the LIVE columns proven in 99-run + 0069 convergence migration + audit tool learns drop-column)

| Check | Result | How verified |
|---|---|---|
| Mirror corrected to LIVE truth | ✅ | types.ts coach_presence = id · coach_id · last_seen · updated_at and progress_photos = id · user_id · photo_url · taken_at · created_at — the exact shapes proven column-by-column on production in Phase 99-run; inline comments cite the incident lineage (0066 v1 42703 · 0064 v1 pipeline halt) |
| App paths un-silenced (the real user-facing fix) | ✅ | data/progress.ts: listPhotos orders by taken_at (was phantom taken_on → empty list live) + signed URLs from photo_url (was file_path); uploadPhoto inserts {user_id, photo_url, taken_at} (was file_path/taken_on/note → silent insert failure); data/coach.ts presence rewritten on coach_id/last_seen — online = last_seen ≤ 2min, offline = row delete (no status column exists); helpers currently UNCALLED (dormant legacy) so zero live-behavior risk |
| UI honesty (ProgressView) | ✅ | photo note input REMOVED — it wrote to a phantom column and never persisted on production (lying UI); photo cards show taken_at date; delete passes photo_url as storage path; alt fixed; i18n key prog.photoNote left harmless-unused |
| 0069 auto-migration (audit-honest convergence) | ✅ | `20260903173000_0069_legacy_tables_live_convergence.sql`: top-level SINGLE-LINE ALTERs (add if not exists ×4 + drop if exists ×5) so the line-oriented audit sees the effective shape + DO-block data copies gated on information_schema (the 0064 v1 lesson — never reference a column unconditionally) + drops AFTER copy; PRODUCTION = pure no-op (every guard false); FRESH = converges 0063's mirror-shaped tables to live truth; HONEST LIMITATION documented: fresh pipelines halt at 0064 v2 BEFORE reaching 0069 (indexes reference taken_at/coach_id which only exist from 0069) — clean installs need the bootstrap pre-step (clean-copy kit presented to owner, NOT executed yet per owner's «اعرض حلول قبل التنفيذ») |
| Audit tool evolution (Phase 96 script) | ✅ | migration_audit.py now parses `alter table … drop column` (a later migration legitimately retires earlier columns — effective shape is what remains); rigorous full-output diff vs git-stashed BASELINE: **ONLY difference = files scanned 80→81** — zero new drift, coach_presence/progress_photos clean in BOTH states |
| Gates | ✅ PASS | tsc 0 · eslint 0 · vitest 191/191 · migration_audit identical-to-baseline (81 files) · check-stale-refs exit 0 · zero phantom refs in src (remaining mentions are historical comments only) |
| Live verification path | ✅ | member Progress photos page is the owner's visual proof (was silently empty/broken live, renders real rows now); presence helpers stay dormant (no callers); 0069 on production = VERIFY grid all no-op (probes match BEFORE/AFTER) |
| Post-push live verification (0069 no-op) | ✅ 8/8 | read-only PostgREST probes on production ~2min after push (anon key re-extracted from the deployed bundle): coach_presence coach_id 200 · updated_at 200 · user_id 42703 ABSENT · status 42703 ABSENT — progress_photos photo_url 200 · taken_at 200 · file_path 42703 · note 42703 = production schema EXACTLY matches the corrected types.ts and 0069 touched nothing (owner can additionally see 0069 recorded in Dashboard → Database → Migrations) |
| Docs parity §3.6 | ✅ UPDATED | INDEX.md 0069 row + heading 0001→0069 + counter + audit-log row · QA_CHECKLIST Phase 105 · PROGRESS Phase 105 + «آخر تحديث» · worklog Task 105 ×2 |

## Previous Verification — 2026-09-03 (Phase 104 — DOCS PARITY SYNC: owner asked «عايز اتاكد ان كل خصائص ومميزات المشروع مكتوبة فى وصف وهيكل المشروع بالظبط ، وصف الريبو مكتوب قديم محتاج يتعدل» — full audit of every doc-facing description/structure against the CODE, then the stale GitHub repo About rewritten via API)

| Check | Result | How verified |
|---|---|---|
| Docs-vs-code audit (counts from files, not memory) | ✅ | direct filesystem counts: 82 page.tsx (README said 76) · 69 API routes (said 67) · 80 SQL files (said 73, "dated up to 0062" — real map now 0001→0068) · 31 views (said 33) · 51 ui components (said 52) · 13 data modules ✓ · 5 workflows ✓ · admin/ = 19 sections + AdminShell + admin/ui.tsx |
| README.md resynced through Phase 103b | ✅ | header parity line 81→103b; intro adds programs library / coach directory / site-coach B2C / Admin Panel 2.0 / SSE streaming; NEW «For Site Coaches (B2C)» section; Platform & Admin rewritten for AdminShell + unified clients + finances + coaches roster + site-assignments; Database Setup = 4 naming families per INDEX.md + 0063 drift RESOLVED note + pipeline-halts-on-failure lesson; DB tables add coach_kind / site_coach_assignments / get_admin_clients_paged(stats); yearly prices $119/$239/$359 verified against src/lib/memberships.ts |
| Resolved known-issue removed + honest open one added | ✅ | «Phase-5 back-fill pending» deleted (closed by 0063 backfill + 0064/0065 RLS — Phase 99-run) and moved to the FIXED list; open candidate documented as Phase 105: types.ts mirror drift (coach_presence user_id/status · progress.ts taken_on/file_path/note — live-proven in 99-run) |
| GitHub repo About (the owner's «وصف الريبو») | ✅ HTTP 200 | PATCH /repos/muscleshubfit-cpu/musclehubeg via API: old 'MuscleHubEG — Ahmed Zake Online Nutrition & Fitness Coaching Platform (Next.js 16 + Supabase + Vercel)' → full platform description (EVO AI coach, 868 exercises, 8.8k foods, tools, programs, memberships, B2B wallets/activations, B2C site-coach follow-ups, 20% affiliate, AI blog CMS, stack); + 10 topics (fitness, nutrition, workout, nextjs, react, supabase, vercel, ai-coach, arabic, bilingual); re-read after PATCH confirms stored values |
| metadata.json stale AI capability flag | ✅ | MAJOR_CAPABILITY_SERVER_SIDE_GEMINI_API removed (direct Gemini integration was REMOVED by owner directive 2026-08-27 — OpenRouter + Groq ONLY); description expanded to the platform's real feature set |
| DEVELOPER_GUIDE §8 | ✅ | 67 → **69 endpoints** + 2 new rows /api/admin/coach-kind + /api/admin/site-assignments (Phase 103); total line re-verified 2026-09-03 |
| Docs-only scope | ✅ N/A code gates | zero src/supabase changes → tsc/eslint/vitest not applicable; the doc-relevant guard `scripts/check-stale-refs.sh` → exit 0 clean; every README relative link target verified to exist on disk |
| Docs parity §3.6 | ✅ UPDATED | README.md · DEVELOPER_GUIDE §8 · metadata.json · GitHub About+topics · QA_CHECKLIST Phase 104 · PROGRESS Phase 104 + «آخر تحديث» · worklog Task 104 · INDEX.md untouched (no migration) |

---

> 🗄️ **الأرشفة (Phase 82 + ملحق 2026-09-02):** الجداول الأقدم نُقلت إلى `archive/QA_CHECKLIST_ARCHIVE.md`. **ملحق 2026-09-03 (Phase 107):** كل ما قبل آخر 5 مراحل (102-run → 80) انضم للملحق — الملف ده سقفه 6 جداول بوابةً. **ملحق 2026-09-03 (Phase 109):** جدول Phase 99-run انضم للملحق (السقف 6 اتمسّ بأقسام 109→103b). **ملحق 2026-09-03 (Phase 110):** جدول Phase 103b انضم للملحق (السقف 6 اتمسّ بأقسام 110→104).


## Verification Protocol

> **Single source of truth:** the canonical verification command set is
> defined in `AGENTS.md` §3.5. The block below is kept for backwards
> reference — when in doubt, use `AGENTS.md` §3.5 as the authoritative
> command set.

When pushing changes, follow `AGENTS.md` §3.5 (Verification command set).
The same six-step flow applies:

```bash
# See AGENTS.md §3.5 for the canonical, current command set.
# (Historical reference — kept for context only.)
npx tsc --noEmit     # 1. TypeScript — 0 errors
npx eslint .         # 2. ESLint — 0 errors
npx next build       # 3. Next.js build — exit 0 (if rendering touched)
git push origin main # 4. Forward-only push
git fetch origin --quiet && git rev-parse HEAD && git rev-parse origin/main
                     # 5. Sync verification — both must be identical
git status --short   # 6. Working tree clean check
```

If any step fails: STOP, preserve state, report the issue.

---
