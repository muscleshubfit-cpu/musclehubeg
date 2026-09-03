# QA_CHECKLIST.md — Verification Evidence

> **Role:** Per AGENTS.md §12.8, this file is source-of-truth #3 (below code and migrations, above docs). It records what has been verified, when, and how.
> **For task history:** see `worklog.md` (append-only chronological log).
> **For current status:** `STATE.md` is the OFFICIAL live state (AGENTS.md §3.6); `PROGRESS.md` = recent phase log.

---

## Latest Verification — 2026-09-03 (Phase 108 — QUALITY-GATES SHOWCASE: owner «ضيف وصف البوابة الآلية فى وصف المشروع اعتقد دى ميذة قوية لازم تتعرض ، كذلك لو فى اى امور قوية زيها اعرضها برده» — README 🛡️ gates section + GitHub About/topics rewritten via API + Known Issues de-rotted)

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

## Previous Verification — 2026-09-03 (Phase 103b — ADMIN CLIENT TYPE FIX: owner reported right after using the unified page — «فى خطاء ، جميع العملاء مكتوب عملاء b2b وده خطاء». Root cause proven in data + SQL, fixed by 0068 auto-migration + UI truth labels)

| Check | Result | How verified |
|---|---|---|
| Owner's report root-caused (not guessed) | ✅ | `auto_assign_client_to_admin()` (0030A, read from the migration) + its backfill put EVERY client into coach_assignments with coach_id = THE ADMIN («followed by the general coach (admin)» — the mechanism behind the old /coach admin-mode listing); 0067 classified client_of_coach as `assigned_coach_id is not null` → true for every member → everyone «عميل مدرب B2B», member_site button ≈ 0 — exactly the owner's report |
| 0068 auto-migration | ✅ | `20260903153000_0068_admin_client_type_fix.sql`: rebuilds get_admin_clients_paged (SAME 7-arg signature, returns + assigned_coach_role) and get_admin_clients_stats with `_has_b2b_coach = ca.coach_id is not null AND cp.role = 'coach'` — admin auto-assignment counts as member_site («متابعة الإدارة»), only assignments onto a real coach count as B2B clients; lifecycle math / search / sort / security-definer is_admin() boundary / grants unchanged; VERIFY grid expects \|1\|1\|1\|1\|1\| |
| coach_assignments untouched (B2B money law) | ✅ | only the CLASSIFICATION reads the relation differently — wallet billing (fee_per_client × assigned rows) + affiliate attribution untouched; /admin/coaches roster unaffected (its p_type keys are role-based); 0047 RPCs untouched |
| UI truth labels | ✅ | clients page: Row type + assigned_coach_role · typeOf() = B2B client only when assigned_coach_role==='coach' · the coach cell now shows «متابعة الإدارة: <name>» for admin-followed members instead of the false «كوتش B2B: <owner's own name>»; types.ts mirror updated (Function Returns + local Row) |
| Gates | ✅ PASS | tsc 0 · eslint 0 · vitest 191/191 · migration_audit no NEW drift |
| Live verification path | ✅ | RPC existence + callable probed live earlier (200); classification needs an admin session (test admin deleted — by design), so the owner's own /admin/clients view is the visual proof: أعضاء الموقع counter > 0, only truly-B2B clients under «عملاء مدربي B2B» |
| Docs parity §3.6 | ✅ UPDATED | INDEX.md 0068 row + audit-count line · QA_CHECKLIST Phase 103b · PROGRESS Phase 103b + «آخر تحديث» · worklog Task 103b · AGENTS.md law text unchanged |

## Previous Verification — 2026-09-03 (Phase 99-run — PIPELINE UNBLOCK: owner reported the last applied migration on Supabase was 0063 — «افحص ايه المشكلة وليه متعملش ميجريشن من جيتهب ل ٠٠٦٤ الى ٠٠٦٧ واصلح المشكلة». Root cause: 0064's first deploy failed 42703 on TWO phantom mirror columns and halted the whole pipeline — 0065/0067 never attempted. Fixed with live-verified columns and re-pushed)

| Check | Result | How verified |
|---|---|---|
| Owner's report reproduced live | ✅ | live probes at diagnosis time: profiles.coach_kind → 42703 MISSING · site_coach_assignments → PGRST205 table not found · rpc get_admin_clients_paged → PGRST202 not found = 0067 (and 0064/0065 with it) had NEVER applied — exactly matching the owner's «آخر ميجريشن 0063» |
| Root cause (two phantom columns in 0064) | ✅ | `create index … on public.coach_presence (user_id)` + `on public.progress_photos (user_id, taken_on desc)` — live probe (select=<col> → 42703): coach_presence has NO user_id (real: id · coach_id · last_seen · updated_at) and progress_photos has NO taken_on (real: id · user_id · photo_url · taken_at · created_at). The mirror types.ts is wrong for both ad-hoc tables (0063's IF-NOT-EXISTS backfill was a deliberate no-op on production, so its mirror-derived definitions never matched the live tables) — the same drift that hit 0066 v1 (owner's 42703) hit 0064 first and silently blocked EVERYTHING since Phase 99 |
| Production impact of the block (documented) | ✅ | Phase 99 progress_photos RLS + 3 hot indexes: not live · Phase 100 plan_swaps strict RLS: not live · Phase 103 coach_kind + site_coach_assignments + get_admin_clients_paged/stats: not live → /admin/clients + /admin/site-assignments + coach-kind toggle were failing in production since the 2034648 deploy |
| 0064 v2 fix | ✅ | index columns corrected to LIVE-verified ones: progress_photos (user_id, taken_at desc) · coach_presence (coach_id) — plan_swaps index unchanged (all 3 columns live-verified); RLS/policy parts untouched (progress_photos.user_id exists live — policies are valid); header v2 note documents the whole incident |
| 0065 + 0067 audited against the LIVE schema before re-push | ✅ | every referenced column probed 200: plan_swaps.user_id/swap_type/created_at · coach_assignments.coach_id/client_id · subscriptions.client_id/tier/status/end_date/months/created_at · subscription_requests.status · profiles.id/email/full_name/phone/avatar_url/role/is_test_account · is_admin() RPC → 200 `true` live (0067's RLS boundary will work) — ZERO changes needed to either file |
| Mirror drift recorded (NOT fixed here — Phase 104 candidates) | ℹ️ | app code written against the wrong mirror: data/progress.ts queries taken_on/file_path/note (live: taken_at/photo_url) and data/coach.ts queries user_id/status (live: coach_id) → the in-app photos list and presence indicator fail silently on production TODAY regardless of this fix; fixing them = separate owner-approved phase (they change app behavior, not just pipeline plumbing) |
| Docs parity §3.6 | ✅ UPDATED | INDEX.md 0064 row (v2 note) · QA_CHECKLIST Phase 99-run · PROGRESS Phase 99-run + «آخر تحديث» · worklog Task 99-run · AGENTS.md law text unchanged |
| Post-push live verification | ✅ APPLIED | ~100s after push: profiles.coach_kind → EXISTS · site_coach_assignments → table FOUND (401/42501 anon = the designed revoke-all-from-anon loud failure, NOT PGRST205 anymore) · rpc get_admin_clients_paged → EXISTS (200; callable) — one deployment applied 0064 v2 → 0065 → 0067 in order, so Phase 99/100 RLS + all Phase 103 surfaces are LIVE; /admin pages read via service-role API so the dormant authenticated SELECT grant on the roster table affects nothing today (Phase 104 will pair its browser consumer with a grant) |
| 0066 v2 (manual, parallel) | ✅ DONE by owner | fresh login probe → HTTP 400 invalid-credentials = auth.users row GONE; the DO block is atomic so profiles + data cascades committed with it — the 0050 test admin is fully wiped (this also explains the transient is_admin=false/[RPC empty] readings during the same minute: probed with a token whose account was deleted mid-verification) |

---

> 🗄️ **الأرشفة (Phase 82 + ملحق 2026-09-02):** الجداول الأقدم نُقلت إلى `archive/QA_CHECKLIST_ARCHIVE.md`. **ملحق 2026-09-03 (Phase 107):** كل ما قبل آخر 5 مراحل (102-run → 80) انضم للملحق — الملف ده سقفه 6 جداول بوابةً.


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
