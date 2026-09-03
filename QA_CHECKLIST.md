# QA_CHECKLIST.md — Verification Evidence

> **Role:** Per AGENTS.md §12.8, this file is source-of-truth #3 (below code and migrations, above docs). It records what has been verified, when, and how.
> **For task history:** see `worklog.md` (append-only chronological log).
> **For current status:** `STATE.md` is the OFFICIAL live state (AGENTS.md §3.6); `PROGRESS.md` = recent phase log.

---

## Latest Verification — 2026-09-03 (Phase 112 — DOC INTERFACES SLIMMED («الأمر الثاني»): owner «اختصر شرح البوابات الآلية (CI Gates) إلى 3 سطور فقط، وضع رابطاً واضحاً لـ docs/CI_GATES.md مع عبارة للاطلاع على التفاصيل الكاملة» + «احذف أي شرح تقني عميق (RLS، المكونات) واستبدله برابط لـ docs/TECH_REFERENCE.md»)

| Check | Result | How verified |
|---|---|---|
| README 🛡️ section → 3 lines + link | ✅ | the 5-gate table + narrative replaced by EXACTLY 3 lines (audit description · gates-live-in-repo + STATE.md pointer · «**للاطلاع على التفاصيل الكاملة** — قصة كل بوابة والحادثة اللي بنتها · سجل الـworkflows · أوامر التحقق القانونية» → [`docs/CI_GATES.md`](./docs/CI_GATES.md)); intro «see the 🛡️ section below» still valid; front-matter CI Gates line + Last updated → Phase 112 |
| DEVELOPER_GUIDE deep tech removed → link | ✅ | §4 RLS deep-dive deleted (22-row per-table RLS table — partially STALE anyway: its «subscriptions: coach insert/update» row was dropped by 0041 · `is_coach()` def line was pre-0029 · ad-hoc history · storage list) + §2 ui/views stale counts («52 shadcn/ui component» · «33 page-level view») removed — replaced by TECH_REFERENCE.md pointers: header blockquote (المرجع التقني العميق) + tree comment → §3 inventory + §4 full pointer block (incl. new-table law: migration + INDEX.md + types.ts same commit, special rules → TECH_REFERENCE §1.4) |
| Pointer honesty | ✅ | TECH_REFERENCE.md §1-§4 covers everything removed (Supabase architecture · migration law · special-rules grid · full RLS §2 · Shadcn names §3 sourced from src/components/ui/ · SQL §4.1-4.13) — verified by reading the file before pointing; CI_GATES.md holds the full README gates text since Phase 111 |
| Scope discipline | ✅ | owner directive names exactly README (CI Gates) + DEVELOPER_GUIDE (RLS, المكونات) — AGENTS.md byte-identical (its §7 «update GUIDE § Database + RLS» instruction now routes through the §4 pointer, recorded in worklog) · no code/src/supabase changes · CHANGELOG.md stays EMPTY per Phase 111 order |
| Docs parity §3.6 | ✅ UPDATED | STATE.md → Phase 112 · QA Latest = Phase 112 + 111 demoted Previous + 105 table moved VERBATIM to archive/QA_CHECKLIST_ARCHIVE.md (cap 6: 112→107) · PROGRESS Phase 112 section + 106 moved VERBATIM to archive/PROGRESS_ARCHIVE.md ملحق (cap 6: 112→107) · worklog Task 112 ×2 (repo + workspace) |
| Gates after edits | ✅ | tsc 0 · eslint 0 · vitest 191/191 · migration_audit --ci 0 · docs_parity 0 · docs_audit 0 · check-stale-refs 0 · check-ui-wiring 0 |

---

## Previous Verification — 2026-09-03 (Phase 111 — OWNER-DIRECTED REFERENCE DOCS: «استخرج منه كل المعلومات التقنية التفصيلية… وانقلها مع تنظيمها» + «استخرج شرح البوابات الآلية… كاملاً» + «CHANGELOG.md فارغ الآن سنملؤه لاحقاً» — docs/TECH_REFERENCE.md + docs/CI_GATES.md + empty CHANGELOG.md)

| Check | Result | How verified |
|---|---|---|
| docs/TECH_REFERENCE.md | ✅ | Supabase architecture (anon vs service-role, types.ts mirror, INDEX.md registry, migration_audit gate) · migration law §6 (naming YYYYMMDDHHMMSS_NNNN, idempotency, RAW-SQL-LINK, RUN_ON_SUPABASE pattern, NOTIFY pgrst) · special-rules tables grid (ai_jobs · evo_chat_usage · evo_anon_usage · coach_* · subscriptions hardening) · full RLS section (predicates is_coach/is_admin/is_coach_over/coach_of · role model v2 · money-world separation · coach addition flows) · Shadcn inventory with names · all SQL snippets/forms from AGENTS.md (13 organized items) — provenance headers cite owner directive + sources |
| Extraction discipline (AGENTS.md untouched) | ✅ | copy-organized, NOT carved out: AGENTS.md byte-identical (docs_audit E-check requires its §structure; §12.5 «no new doc files» satisfied by explicit owner directive recorded in the files' provenance headers + worklog); Shadcn list sourced from src/components/ui/ per the source-of-truth map (AGENTS.md names no components — stated honestly in the file) |
| docs/CI_GATES.md | ✅ | README «🛡️ Automated Quality Gates» transferred in full (the 5-gate table with incident lineage + narrative + «why this matters») + workflows registry (6) + §3.5 canonical commands + AGENTS gate-health laws (anti-regression · honest run color · schedule health) + Phase 110 npm-arborist incident documented |
| CHANGELOG.md (repo root) | ✅ | created EMPTY exactly as ordered («اتركه فارغاً الآن، سنملؤه لاحقاً») — 0 bytes |
| Docs parity §3.6 | ✅ UPDATED | STATE.md → Phase 111 · QA Latest = Phase 111 + 110 demoted Previous + 104 table moved VERBATIM to archive/QA_CHECKLIST_ARCHIVE.md (cap 6: 111→105) · PROGRESS Phase 111 section + 105 moved VERBATIM to archive/PROGRESS_ARCHIVE.md ملحق (cap 6: 111→106) · worklog Task 111 ×2 (repo + workspace) |
| Gates after edits | ✅ | tsc 0 · eslint 0 · vitest 191/191 · migration_audit --ci 0 · docs_parity 0 · docs_audit 0 · check-stale-refs 0 · check-ui-wiring 0 |

---

## Previous Verification — 2026-09-03 (Phase 110 — NEWSLETTER DEDUP: owner «النشرة البريدية المجانية مكررة فى الصفحة الرئيسية» — duplicate footer card removed, section 13 is the single newsletter surface, same dedup pattern as the 2026-08-30 footer CTA removal)

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

> 🗄️ **الأرشفة (Phase 82 + ملحق 2026-09-02):** الجداول الأقدم نُقلت إلى `archive/QA_CHECKLIST_ARCHIVE.md`. **ملحق 2026-09-03 (Phase 107):** كل ما قبل آخر 5 مراحل (102-run → 80) انضم للملحق — الملف ده سقفه 6 جداول بوابةً. **ملحق 2026-09-03 (Phase 109):** جدول Phase 99-run انضم للملحق (السقف 6 اتمسّ بأقسام 109→103b). **ملحق 2026-09-03 (Phase 110):** جدول Phase 103b انضم للملحق (السقف 6 اتمسّ بأقسام 110→104). **ملحق 2026-09-03 (Phase 111):** جدول Phase 104 انضم للملحق (السقف 6 اتمسّ بأقسام 111→105). **ملحق 2026-09-03 (Phase 112):** جدول Phase 105 انضم للملحق (السقف 6 اتمسّ بأقسام 112→107).


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
