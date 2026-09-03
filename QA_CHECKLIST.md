# QA_CHECKLIST.md — Verification Evidence

> **Role:** Per AGENTS.md §12.8, this file is source-of-truth #3 (below code and migrations, above docs). It records what has been verified, when, and how.
> **For task history:** see `worklog.md` (append-only chronological log).
> **For current status:** `STATE.md` is the OFFICIAL live state (AGENTS.md §3.6); `PROGRESS.md` = recent phase log.

---

## Latest Verification — 2026-09-03 (Phase 114 — FIRST-PASS CLEANUP («الأمر الرابع»): owner «قم بالتنظيف الأولي المتبقي مع الحفاظ على ما أنجزته في المراحل السابقة» — STATE ≤ 100 audit · backup/duplicate sweep · core-docs integrity after 111-113 · §3.6 ritual for 114)

| Check | Result | How verified |
|---|---|---|
| STATE.md ≤ 100 lines (owner item 1) | ✅ | wc -l = 48 (cap 100 — docs_audit A green by design) — already carries the owner's required trio verbatim: المرحلة الحالية · المفتوح الآن · ممنوعات نشطة (+ بانتظار المالك · خريطة المصادر · بروتوكول الجلسة — operational, not historical) — zero bytes needed moving to archive |
| Backup/duplicate sweep (owner item 2) | ✅ | find across the repo (pruning node_modules/.git/.next) for *.bak *.backup *.old *.orig *~ *.tmp *.swp *copy* نسخة + AGENTS*/STATE*/README* name collisions → ONLY the lawful originals themselves (plus src/components/ui/copy-button.tsx — a real component, and public/images/README.md); archive/ holds exactly its 4 lawful files — NOTHING existed to move |
| Core docs intact after الأوامر 111-113 (owner item 3) | ✅ | AGENTS.md 275 lines · diff of grep '^#' HEAD vs worktree = EMPTY (every heading byte-identical, all 12 ## sections) · README 🛡️ 3-line block + «للاطلاع على التفاصيل الكاملة» → docs/CI_GATES.md present · DEVELOPER_GUIDE docs/TECH_REFERENCE.md pointer block present · docs/TECH_REFERENCE.md + docs/CI_GATES.md resolve on disk · working tree clean = byte-identical to CI-green HEAD |
| Gates policy (owner: «لا حاجة لإعادة تشغيلها الآن») | ✅ | full local 8-gate re-run skipped per owner directive — zero code/src/supabase bytes changed since 113's green run; the two parity gates guarding THESE edited files ran locally: docs_parity 0 · docs_audit 0 (STATE=PROGRESS=QA=114); CI re-runs the full set on push and is watched live |
| Docs parity §3.6 | ✅ UPDATED | STATE.md → Phase 114 · QA Latest = Phase 114 + 113 demoted Previous + 108 table moved VERBATIM to archive/QA_CHECKLIST_ARCHIVE.md (cap 6: 114→109) · PROGRESS Phase 114 section + 108 moved VERBATIM to archive/PROGRESS_ARCHIVE.md ملحق (cap 6: 114→109) · worklog Task 114 ×2 (repo + workspace) · CHANGELOG.md stays EMPTY per Phase 111 order |
| Gates after edits | ✅ | docs_parity 0 · docs_audit 0 — docs-only phase; tsc/eslint/vitest/migration_audit/check-stale-refs/check-ui-wiring unchanged since 113 (zero code bytes touched), CI re-runs all on push |

---

## Previous Verification — 2026-09-03 (Phase 113 — LAW FILE SLIMMED («الأمر الثالث»): owner «قم بتحرير ملف AGENTS.md لتقليص حجمه بشكل كبير … لا تحذف أي عنوان رئيسي لأن CI يفحص وجودها … الفقرات الطويلة بملخص سطر أو سطرين ورابط docs/TECH_REFERENCE.md … الهدف أقل من 350 سطر»)

| Check | Result | How verified |
|---|---|---|
| AGENTS.md 1698 → 275 lines (< 350 target) | ✅ | wc -l = 275 (-85%); file rewritten with one-to-two-line law summaries per the owner's «سطر أو سطرين» rule; §8 (the 1124-line monster) → ~60 lines keeping EVERY law name + date + binding core |
| Every heading kept VERBATIM (CI structure 100%) | ✅ | diff of `grep '^#'` HEAD vs new = EMPTY (all 32 headings ##/###/#### byte-identical incl. §3.6/§3.7/§3.8 Arabic-quote headings) · docs_audit E uniqueness: no duplicate §N.N · the gate actually checks duplicate-section-numbers — structure both owner-verified and gate-verified |
| Honest delegation to TECH_REFERENCE | ✅ | pointers only where the reference REALLY covers the removed bytes: migration law → §1.2, special-rules tables → §1.4, storage → §1.5, RLS/role-model/money-worlds/coach flows → §2, components live in §3 (code-sourced), SQL forms → §4; live-registries (model tags) point to the CODE per §12.8 (code wins) — no fake pointers; the long §8 narratives (image-safety evolution, multi-coach, wallet, dispatch laws) compressed to binding cores with code-file citations |
| Operational core byte-identical | ✅ | §3.5 canonical command block + note verbatim · §12.5.1 worklog template verbatim · §12.8 hierarchy list verbatim · §2 roles table kept · §12.2 IMPLEMENT→VALIDATE→DOCUMENT→COMMIT→PUSH verbatim — the agent's operating instructions untouched; HONEST NOTE: the file carries NO /plan-/implement-/review table and NO conversation example (owner's references map to §3.5 + §12.2 in THIS repo) — nothing invented, existing examples were SQL/flow narratives now compressed per rule 2 |
| Link integrity | ✅ | internal links docs/TECH_REFERENCE.md + docs/CI_GATES.md resolve on disk · zero `AGENTS.md#` anchor links exist repo-wide (nothing to break) · src/scripts §-references (§3.5/§8/§12.8…) stay valid — section numbers unchanged |
| Docs parity §3.6 | ✅ UPDATED | STATE.md → Phase 113 · QA Latest = Phase 113 + 112 demoted Previous + 107 table moved VERBATIM to archive/QA_CHECKLIST_ARCHIVE.md (cap 6: 113→108) · PROGRESS Phase 113 section + 107 moved VERBATIM to archive/PROGRESS_ARCHIVE.md ملحق (cap 6: 113→108) · worklog Task 113 ×2 (repo + workspace) · CHANGELOG.md stays EMPTY per Phase 111 order |
| Gates after edits | ✅ | tsc 0 · eslint 0 · vitest 191/191 · migration_audit --ci 0 · docs_parity 0 · docs_audit 0 · check-stale-refs 0 · check-ui-wiring 0 |

---

## Previous Verification — 2026-09-03 (Phase 112 — DOC INTERFACES SLIMMED («الأمر الثاني»): owner «اختصر شرح البوابات الآلية (CI Gates) إلى 3 سطور فقط، وضع رابطاً واضحاً لـ docs/CI_GATES.md مع عبارة للاطلاع على التفاصيل الكاملة» + «احذف أي شرح تقني عميق (RLS، المكونات) واستبدله برابط لـ docs/TECH_REFERENCE.md»)

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

> 🗄️ **الأرشفة (Phase 82 + ملحق 2026-09-02):** الجداول الأقدم نُقلت إلى `archive/QA_CHECKLIST_ARCHIVE.md`. **ملحق 2026-09-03 (Phase 107):** كل ما قبل آخر 5 مراحل (102-run → 80) انضم للملحق — الملف ده سقفه 6 جداول بوابةً. **ملحق 2026-09-03 (Phase 109):** جدول Phase 99-run انضم للملحق (السقف 6 اتمسّ بأقسام 109→103b). **ملحق 2026-09-03 (Phase 110):** جدول Phase 103b انضم للملحق (السقف 6 اتمسّ بأقسام 110→104). **ملحق 2026-09-03 (Phase 111):** جدول Phase 104 انضم للملحق (السقف 6 اتمسّ بأقسام 111→105). **ملحق 2026-09-03 (Phase 112):** جدول Phase 105 انضم للملحق (السقف 6 اتمسّ بأقسام 112→107). **ملحق 2026-09-03 (Phase 113):** جدول Phase 107 انضم للملحق (السقف 6 اتمسّ بأقسام 113→108). **ملحق 2026-09-03 (Phase 114):** جدول Phase 108 انضم للملحق (السقف 6 اتمسّ بأقسام 114→109).


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
