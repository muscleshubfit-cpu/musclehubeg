# Documentation Audit Report — MuscleHubEG

> **Task ID:** #2 — Documentation Audit
> **Date:** 2026-08-25
> **Auditor:** Implementation Agent (GML)
> **Reference:** AGENTS.md §12.5 ("Pending consolidation")
> **Scope:** Read-only audit + this single new file (`docs/_AUDIT.md`).
> No existing file was modified or deleted. No recommendation was
> implemented.
>
> **Pre-audit verification (per AGENTS.md §3.7):**
> - `git fetch origin --quiet` executed.
> - Local HEAD `263d4d9` matches `origin/main` (`263d4d9a0495187c14b8ccf0de0e54225447143d`).
> - Working tree clean.
>
> **Ignored directories (per task scope):**
> `node_modules`, `.git`, `archive` (does not exist), `dist` (does not
> exist), `.next` (does not exist), `out` (does not exist), `build`
> (does not exist).
>
> **Functional config exceptions (recorded as one-liners, not analyzed):**
> `package.json`, `tsconfig.json`, `components.json`, `.env.example`,
> `LICENSE`, `bun.lock`, `.gitignore`.

---

## 1. جرد الملفات

### 1.1 ملفات التوثيقة الأساسية (Markdown)

| الملف | الغرض الفعلي | عدد الأسطر | آخر تحديث (git log) |
|---|---|---|---|
| `AGENTS.md` | نظام تشغيل و قواعد الـ AI agents — مطلوب قراءته قبل أي commit | 416 | 2026-08-24 — `263d4d9` — "docs: update Technical Reviewer role, remove ChatGPT references" |
| `DEVELOPER_GUIDE.md` | دليل المطور: إعداد محلي + معمارية + قاعدة بيانات + API routes | 784 | 2026-08-24 — `a079375` — "feat(paypal): restore complete PayPal integration" |
| `PROGRESS.md` | لوحة تحكم الميزات + الـ bugs + سجل تاريخ المشروع | 2840 | 2026-08-24 — `cdad25c` — "docs: refresh verification evidence for 2026-08-24 cycle" |
| `QA_CHECKLIST.md` | دليل التحقق + بروتوكول الاختبار + سجل الـ smoke tests | 191 | 2026-08-24 — `cdad25c` — "docs: refresh verification evidence for 2026-08-24 cycle" |
| `README.md` | ملخص مواجه للمستخدم: Quick Start + الميزات + التقنيات | 399 | 2026-08-24 — `a079375` — "feat(paypal): restore complete PayPal integration" |
| `SECURITY.md` | سياسة أمنية شاملة: التهديدات، الأسرار، PII، الـ RLS | 379 | 2026-08-24 — `a079375` — "feat(paypal): restore complete PayPal integration" |
| `worklog.md` | سجل زمني append-only لكل تغيير قام به أي agent | 763 | 2026-08-24 — `02671d6` — "fix(affiliate): min-w-0 on grid-item articles + wrap long URLs in `<pre>`" |

### 1.2 ملفات توثيقية ذات امتدادات غير تقليدية

| الملف | الغرض الفعلي | عدد الأسطر | آخر تحديث (git log) | ملاحظة |
|---|---|---|---|---|
| `public/robots.txt` | قواعد زحف محركات البحث (SEO) | 64 | 2026-08-24 — `a079375` | توثيقي-وظيفي |
| `public/ads.txt` | معرّف ناشر Google AdSense | 1 | 2026-08-24 — `a079375` | سطر واحد: `google.com, pub-8658364692422583, DIRECT, f08c47fec0942fa0` |
| `public/MuscleHubEG_Updates_Report.docx` | تقرير قديم بصيغة Word (binary) | ~135 (binary) | 2026-08-24 — `a079375` | **غير مُشار إليه في أي مكان بالكود** |
| `public/MuscleHubEG_Updates_Report.doc` | نسخة مطابقة من الـ .docx (binary) | ~135 (binary) | 2026-08-24 — `a079375` | **MD5 مطابق للـ .docx** (`44d69061e9937621859f4d3cf6977034`) — ملف مكرر |
| `supabase/migrations/RUN_ON_SUPABASE.sql` | ملف SQL تجميعي قديم لتطبيق migrations يدوياً | 68 | 2026-08-24 — `a079375` | يحتوي migrations 0011 + 0012 فقط — **متقادم** (لا يشمل 0013–0016) |
| `.github/workflows/generate-blog-post.yml` | CI workflow لتوليد المدونة | 171 | 2026-08-24 — `a079375` | توثيقي-وظيفي |

### 1.3 Functional config (سطر واحد لكل ملف، بدون تحليل)

- `package.json` — functional config (manifest + scripts).
- `tsconfig.json` — functional config (TypeScript compiler).
- `components.json` — functional config (shadcn/ui).
- `.env.example` — functional config (env var template).
- `LICENSE` — functional config (proprietary license).
- `bun.lock` — functional config (lockfile).
- `.gitignore` — functional config (ignore patterns).
- `next.config.ts`, `tailwind.config.ts`, `postcss.config.mjs`, `eslint.config.mjs`, `vercel.json`, `metadata.json`, `public/manifest.json`, `public/sw.js`, `supabase/migrations/*.sql` — functional config (tooling/runtime).

### 1.4 ملف مفقود مهم

| الملف المفقود | المرجع في AGENTS.md | عدد المرات المُشار إليه |
|---|---|---|
| **`PROJECT_CONTEXT.md`** | §12.5 (سطر 358), §12.7 (سطر 379), §12.8 (سطر 396) | **9 مرات** عبر `AGENTS.md` + `DEVELOPER_GUIDE.md` + `PROGRESS.md` |

### 1.5 مجلدات مفقودة

- `archive/` — لا يوجد (رغم أن المهمة الحالية و §3.6 يفترضان إمكانية الأرشفة فيه).
- `scripts/` — لا يوجد **ومُتجاهل في `.gitignore` سطر 47** (`/scripts/`). أي إشارة إليه في التوثيق تشير لملفات محلية فقط على جهاز المطور، غير متاحة لباقي المساهمين.

---

## 2. التكرار

### 2.1 إحصائيات المشروع مكررة 5 مرات بقيم متضاربة

الإحصائيات التالية مذكورة في 5 مواضع مختلفة، وتختلف القيم بينها:

| المواضع | ما يُكرَّر |
|---|---|
| `README.md` § Project Structure + § Database + § Known Issues | عدد الجداول، عدد migrations، عدد API routes، عدد UI components، عدد views، عدد الصفحات |
| `DEVELOPER_GUIDE.md` § 2 + § 4 + § 8 | نفس الإحصائيات أعلاه |
| `PROGRESS.md` § "Reconciled Status" (سطر 22–39) | نفس الإحصائيات بالقيم الصحيحة |
| `PROGRESS.md` § "إحصائيات المشروع" (سطر 606–624) | نفس الإحصائيات بالقيم القديمة |
| `QA_CHECKLIST.md` § "Repository Facts" (سطر 29–39) | جزء من الإحصائيات بالقيم الصحيحة |

انظر §3 أدناه للاقتباسات الحرفية.

### 2.2 تعليمات الإعداد المحلي (Quick Start) مكررة

- `README.md` § "Quick Start" (سطر 33–105): prerequisites, install, env vars, demo mode, run locally.
- `DEVELOPER_GUIDE.md` § 1 "الإعداد المحلي" (سطر 29–101): نفس التعليمات بالعربية.
- `.env.example` (93 سطر): يكرّر نفس متغيرات البيئة المذكورة في README و DEVELOPER_GUIDE.

### 2.3 وصف قاعدة البيانات + الجداول مكرر

- `README.md` § "Database" (سطر 252–292): قائمة بـ 22 جدول + 3 جداول ad-hoc.
- `DEVELOPER_GUIDE.md` § 4 "قاعدة البيانات + RLS" (سطر 233–294): نفس القائمة بـ 20 جدول + 3 جداول ad-hoc.
- `SECURITY.md` § 4 (سطر 130–147): يصف الـ Supabase clients فقط دون الجداول.
- `PROGRESS.md` Phase 5 (سطر 671–682): يصف الإصلاحات على نفس الجداول.

### 2.4 معمارية الـ AI Provider مكررة

- `README.md` § "AI Provider Strategy" (سطر 336–348): `callFreeOpenRouter` vs `callFreeOpenRouterRace`، 6 providers.
- `DEVELOPER_GUIDE.md` § 6 (سطر 349–377): نفس الدالتين + قائمة النماذج.
- `DEVELOPER_GUIDE.md` § 12 "AI Provider Pattern" (سطر 619–645): نفس الجدول مرة أخرى مع code examples.
- `DEVELOPER_GUIDE.md` § 14 "Phase 6" (سطر 703–781): نفس المعمارية بتفاصيل أعمق.
- `PROGRESS.md` Phase 6 (سطر 703–781): نفس المعلومات.
- `SECURITY.md` § 3.1 (سطر 92–105): قائمة الـ 6 providers.

### 2.5 سياسة الأمان + القواعد التشغيلية مكررة بين AGENTS.md و SECURITY.md

- `AGENTS.md` § 3.2 "Do Not Expose Secrets" (سطر 55–68): قواعد عامة.
- `SECURITY.md` § 2 "Secrets Policy" (سطر 38–87): نفس القواعد بتفصيل أكبر.
- `AGENTS.md` § 3.3 "Do Not Modify Production Data" (سطر 70–83).
- `SECURITY.md` § 5 "Customer Data Policy" (سطر 151–174) + § 6 "Production Database Policy" (سطر 178–194).

### 2.6 تعليمات الـ Build + Deploy مكررة

- `README.md` § "Deployment (Vercel)" (سطر 108–129).
- `DEVELOPER_GUIDE.md` § 1 "Build للإنتاج" (سطر 77–82) + § 10 "الـ Deploy على Vercel" (سطر 499–528).
- `SECURITY.md` § 10 "Security Headers" (سطر 300–318).
- `PROGRESS.md` — مبعثر في عدة أقسام.

### 2.7 الـ Demo Mode مكرر

- `README.md` سطر 100–104.
- `DEVELOPER_GUIDE.md` سطر 64–66.
- `.env.example` سطر 12–16.
- `SECURITY.md` سطر 144–147، 331–333.

### 2.8 النسختان المكررتان من تقرير الـ Word

- `public/MuscleHubEG_Updates_Report.docx`
- `public/MuscleHubEG_Updates_Report.doc`

MD5 للملفين مطابق (`44d69061e9937621859f4d3cf6977034`). الملفان متطابقان بايت-بايت (6785 bytes لكل منهما). لا يوجد أي إشارة لأي منهما في أي ملف بالكود.

---

## 3. التضارب

### 3.1 عدد الجداول في قاعدة البيانات

**`README.md` سطر 254:**
> `**22 tables** are formally defined via 15 migrations (0001 → 0015),
> all with Row Level Security (RLS) policies.`

**`DEVELOPER_GUIDE.md` سطر 235:**
> `### الجداول (20 جدول مُعرّفة في migrations + 3 مُستخدمة في الكود بدون migration)`

**`DEVELOPER_GUIDE.md` سطر 237–240:**
> `> **Phase 7 correction (2026-08-19):** The previous count of "22 tables"
> > was inaccurate. The actual state:
> > - **20 tables** are formally defined via migrations 0001 → 0012.`

**`PROGRESS.md` سطر 32:**
> `| Tables formally defined in migrations | **22** | unique CREATE TABLE across migrations |`

**`PROGRESS.md` سطر 616:**
> `| عدد جداول الـ DB (مُعرّفة في migrations) | **20** | 22 |`

**القيمة الفعلية (متحقَّق منها بالكود):** 22 جدول. → `README.md` و `PROGRESS.md` سطر 32 صحيحان؛ `DEVELOPER_GUIDE.md` و `PROGRESS.md` سطر 616 متقادمان.

---

### 3.2 عدد migrations

**`README.md` سطر 80:**
> `Run each migration file in order (0001 → 0012) from the supabase/migrations/ folder`

**`README.md` سطر 183:**
> `└── migrations/             # 15 SQL migration files (0001–0015) + RUN_ON_SUPABASE.sql`

**`README.md` سطر 254:**
> `15 migrations (0001 → 0015)`

**`DEVELOPER_GUIDE.md` سطر 240:**
> `**20 tables** are formally defined via migrations 0001 → 0012.`

**`PROGRESS.md` سطر 31:**
> `| Migrations | **16** (0001 → 0016) — adds affiliate engine + paypal payment_method | ls supabase/migrations/ |`

**`PROGRESS.md` سطر 618:**
> `| عدد الـ migrations | **12** (0001 → 0012) | 12 ✅ |`

**`QA_CHECKLIST.md` سطر 33:**
> `| Migrations | **16** (0001 → 0016) | ls supabase/migrations/*.sql | grep -v RUN_ON | wc -l |`

**القيمة الفعلية (متحقَّق منها بالكود):** 16 ملف migration (0001 → 0016) + `RUN_ON_SUPABASE.sql`. → `PROGRESS.md` سطر 31 و `QA_CHECKLIST.md` صحيحان؛ `README.md` و `DEVELOPER_GUIDE.md` و `PROGRESS.md` سطر 618 متقادمة.

---

### 3.3 عدد API routes

**`README.md` سطر 141:**
> `├── api/                # API routes (28 endpoints — see DEVELOPER_GUIDE §8)`

**`DEVELOPER_GUIDE.md` سطر 126:**
> `│   ├── api/                     # API Routes (28 endpoints — see §8)`

**`DEVELOPER_GUIDE.md` سطر 409–411:**
> `> **Phase 7 correction (2026-08-19):** The previous doc listed 22
> > API routes. The actual count (verified by
> > find src/app/api -name "route.ts*") is **28 routes**.`

**`DEVELOPER_GUIDE.md` سطر 445:**
> `**Total: 28 routes** (verified via find src/app/api -name "route.ts*" | wc -l).`

**`PROGRESS.md` سطر 28:**
> `| API routes | **36** | find src/app/api -name "route.ts*" | wc -l |`

**`PROGRESS.md` سطر 589:**
> `| API documentation | ✅ مكتمل (Phase 7) | جدول في DEVELOPER_GUIDE §8 يوثّق كل الـ 28 route |`

**`PROGRESS.md` سطر 614:**
> `| عدد الـ API routes | **28** | 22 |`

**`QA_CHECKLIST.md` سطر 35:**
> `| API routes | **36** | find src/app/api -name "route.ts*" | wc -l |`

**القيمة الفعلية:** 36 (`find src/app/api -name "route.ts*" | wc -l` = 36، متحقَّق منها). → `PROGRESS.md` سطر 28 و `QA_CHECKLIST.md` صحيحان؛ `README.md` و `DEVELOPER_GUIDE.md` و `PROGRESS.md` سطر 589 + 614 متقادمة. لاحظ أيضاً أن `DEVELOPER_GUIDE.md` § 8 يسرد فعلياً **28 صفاً فقط** في جدوله، بينما يوجد 36 route — أي أن الجدول نفسه ناقص 8 routes (PayPal الثلاث + steps 2a/2b/2c/2d الإضافية + `cron/blog/step2-generate`).

---

### 3.4 عدد shadcn UI components

**`README.md` سطر 157:**
> `│   │   ├── ui/                 # shadcn/ui primitives (50 files, new-york style)`

**`DEVELOPER_GUIDE.md` سطر 148:**
> `│   ├── ui/                      # 28 shadcn/ui component`

**`PROGRESS.md` سطر 29:**
> `| shadcn UI components | **51** | find src/components/ui -name "*.tsx" | wc -l |`

**`PROGRESS.md` سطر 619:**
> `| عدد ملفات shadcn UI | **50** | 28 |`

**القيمة الفعلية:** 51 (`find src/components/ui -name "*.tsx" | wc -l` = 51، متحقَّق منها). → `PROGRESS.md` سطر 29 صحيح؛ الباقي متقادم.

---

### 3.5 عدد الـ Views

**`README.md` سطر 158:**
> `│   │   ├── views/              # Page-level views (23 views)`

**`DEVELOPER_GUIDE.md` سطر 149:**
> `│   ├── views/                   # 17 page-level view`

**`PROGRESS.md` سطر 30:**
> `| Views (src/components/views/) | **25** | find src/components/views -name "*.tsx" | wc -l |`

**`PROGRESS.md` سطر 620:**
> `| عدد الـ views | **23** | 17 |`

**القيمة الفعلية:** 25 (`find src/components/views -name "*.tsx" | wc -l` = 25، متحقَّق منها). → `PROGRESS.md` سطر 30 صحيح؛ الباقي متقادم.

---

### 3.6 عدد الصفحات (page.tsx)

**`PROGRESS.md` سطر 27:**
> `| Pages (page.tsx) | **51** | find src/app -name "page.tsx" | wc -l |`

**`PROGRESS.md` سطر 615:**
> `| عدد الصفحات (page.tsx) | **47** | 40+ |`

**`QA_CHECKLIST.md` سطر 34:**
> `| Pages (page.tsx) | **51** | find src/app -name "page.tsx" | wc -l |`

**القيمة الفعلية:** 51. → `PROGRESS.md` سطر 27 و `QA_CHECKLIST.md` صحيحان؛ `PROGRESS.md` سطر 615 متقادم.

---

### 3.7 عدد ملفات الكود في `src/`

**`PROGRESS.md` سطر 26:**
> `| TypeScript / TSX files in src/ | **255** | find src -name "*.ts" -o -name "*.tsx" | wc -l |`

**`PROGRESS.md` سطر 613:**
> `| عدد ملفات الكود (.ts + .tsx) في src/ | **226** | ~120 |`

**القيمة الفعلية:** (غير مُعاد التحقق منها في هذا الفحص، لكن التضارب داخل نفس الملف واضح).

---

### 3.8 جدول GitHub Actions cron

**`README.md` سطر 185:**
> `├── .github/workflows/          # GitHub Actions (3-step blog generation pipeline, every 2h)`

**`README.md` سطر 326:**
> `Blog generation runs 3×/day via GitHub Actions cron (06:00, 14:00, 22:00 UTC)`

**`DEVELOPER_GUIDE.md` سطر 397:**
> `GitHub Actions (every 2 hours)`

**`DEVELOPER_GUIDE.md` سطر 526:**
> `ملف .github/workflows/generate-blog-post.yml يشغّل 3-step pipeline كل ساعتين`

**القيمة الفعلية** (من `.github/workflows/generate-blog-post.yml`):
> `cron: "0 */2 * * *"` — **كل ساعتين** (12 مرة/يوم)، وليس 3 مرات/يوم.

→ `README.md` سطر 326 متضارب مع سطر 185 من نفس الملف، ومع `DEVELOPER_GUIDE.md`، ومع الكود الفعلي.

---

### 3.9 حالة الـ Build المحلي (B18)

**`README.md` سطر 124–129:**
> `> **Build script note:** package.json defines the build script as
> > node scripts/compress-images.js && next build, but the scripts/
> > directory does **not exist** in the repository. Local bun run build
> > would fail at the first step.`

**`README.md` سطر 373–376:**
> `- **B18 (new)** — package.json build script references
>   scripts/compress-images.js, but the scripts/ directory does not
>   exist. Local bun run build fails; production Vercel build is
>   unaffected (uses vercel.json buildCommand).`

**`DEVELOPER_GUIDE.md` سطر 544:**
> `| Build (local) | ⚠️ مكسور — bun run build يفشل بسبب scripts/compress-images.js غير موجود (B18) |`

**`PROGRESS.md` سطر 39:**
> `| scripts/ directory | **MISSING** ❌ (referenced in package.json build step) |`

**`PROGRESS.md` سطر 52:**
> `| Local bun run build | ✅ **FIXED** (Phase 7, Master Repair Batch 001) — removed obsolete node scripts/compress-images.js && prefix from package.json build script (B18). Now exits 0 with 73/73 static pages. |`

**`PROGRESS.md` سطر 91 (B18):**
> `✅ **FIXED** (Master Repair Batch 001) — removed the obsolete node scripts/compress-images.js && prefix from package.json build script.`

**القيمة الفعلية** (من `package.json` سطر 7):
> `"build": "next build"` — البادئة `node scripts/compress-images.js &&` أُزيلت.

→ B18 **مُصحَّح فعلياً**. لكن `README.md` و `DEVELOPER_GUIDE.md` و `PROGRESS.md` سطر 39 لا يزالون يقولون إن الـ build مكسور. متناقض داخلياً داخل `PROGRESS.md` نفسه (سطر 39 يقول MISSING، سطر 52 + 91 يقول FIXED).

ملاحظة إضافية: `package.json` سطر 10 لا يزال يحتوي على `"compress-images": "node scripts/compress-images.js"` (script مستقل، ليس part من build). هذا الـ script الآن ميت لأن `scripts/` غير موجود.

---

### 3.10 وجود `PROJECT_CONTEXT.md`

**`AGENTS.md` سطر 358:**
> `- Document every completed task while executing it.
>   Use the existing documentation files (PROGRESS.md, worklog.md,
>   AGENTS.md, PROJECT_CONTEXT.md, DEVELOPER_GUIDE.md,
>   SECURITY.md, QA_CHECKLIST.md, README.md).`

**`AGENTS.md` سطر 379:**
> `- When building an AI task list, aggregate from: actual source code,
>   PROJECT_CONTEXT.md, PROGRESS.md, worklog.md,
>   DEVELOPER_GUIDE.md, and conversations/context as needed.`

**`AGENTS.md` سطر 396:**
> `4. Project Documentation (README.md, DEVELOPER_GUIDE.md,
>   PROGRESS.md, AGENTS.md, PROJECT_CONTEXT.md, SECURITY.md)`

**`DEVELOPER_GUIDE.md` سطر 5–8:**
> `> **Note (Phase 7):** Several stale claims in this file were reconciled
> > against the actual source code. Look for > **Phase 7 correction:**
> > notes inline. See also PROJECT_CONTEXT.md for the reconciled
> > repository statistics.`

**`PROGRESS.md` سطر 272:**
> `- Created AGENTS.md, PROJECT_CONTEXT.md, SECURITY.md, LICENSE`

**`PROGRESS.md` سطر 583:**
> `| **PROJECT_CONTEXT.md** | ✅ جديد (Phase 7) | هوية المشروع + الحالة الحالية |`

**`PROGRESS.md` سطر 1590:**
> `Full rationale and the 8 numbered approved decisions are in
> PROJECT_CONTEXT.md §11 (AI Architecture Direction).`

**`PROGRESS.md` سطر 1628:**
> `| 13 | Build dedicated plan-generation UI surface (separate from EVO) | NOT STARTED | Per decision #2 in PROJECT_CONTEXT.md §11.2. New page(s) in the Next.js app that call Render. |`

**القيمة الفعلية:** `PROJECT_CONTEXT.md` **غير موجود** على `origin/main` (تحققت عبر `git ls-tree -r origin/main --name-only | grep PROJECT_CONTEXT` — لا نتائج). تم التحقق أيضاً محلياً. الملف مُشار إليه 9+ مرات في 3 ملفات توثيق مختلفة على أنه "موجود" أو "جديد"، لكنه لا وجود له.

---

### 3.11 الـ AI Model المستخدم في البحث الخارجي

**`PROGRESS.md` سطر 118:**
> `**src/lib/gemini-wrapper.ts**: Updated default model to gemini-3.7-flash and introduced a resilient model fallback loop (gemini-3.7-flash → gemini-3.6-flash → gemini-flash-latest)`

**`PROGRESS.md` سطر 2656:**
> `بناء محرك بحث خارجي محلي src/lib/external-search.ts يعتمد على Gemini 2.5 Flash مع Google Search Grounding`

**`worklog.md` سطر 5:**
> `Re-engineered src/lib/blog-admin.ts and /api/ai/blog-tool to route all blog editor AI tools directly to callGemini (Gemini 3.7 Flash)`

→ متناقض داخل `PROGRESS.md` نفسه (سطر 118 يقول `gemini-3.7-flash`، سطر 2656 يقول `Gemini 2.5 Flash`). `worklog.md` يقول 3.7.

---

### 3.12 سعر العضوية (USD مقابل EGP)

**`README.md` سطر 215–217:**
> `- **Premium ($14.99/mo):** Unlimited EVO, 3 plans/mo, 50 saved results, PDF export
> - **Pro ($29.99/mo):** 6 plans/mo, pattern analysis, 200 saved results, no ads, premium content
> - **Coaching ($39.99/mo):** Human coach + EVO (Premium-tier EVO access)`

**`DEVELOPER_GUIDE.md` سطر 340–345:**
> `| Free | $0 | $0 | 10/يوم | 0 | 3 | ❌ | ✅ |
> | Premium | $14.99 | $119 | غير محدود | 3 | 50 | ✅ | ✅ |
> | Pro | $29.99 | $239 | غير محدود | 6 | 200 | ✅ | ❌ |
> | Coaching | $39.99 | $359 | غير محدود | غير محدود | غير محدود | ✅ | ❌ |`

→ متسق بين الملفين (بعد migration 0012 الذي أعاد تسمية `price_egp` → `price_usd`). لكن `PROGRESS.md` سطر 567 ما زال يقول:
> `| B15 | ~~price_egp field name~~ | subscription_requests table | ✅ **تم الإصلاح** — إعادة تسمية لـ price_usd (migration 0012) + إصلاح bug قسمة العمولة (/50) | — |`

— هذا توثيق تاريخي لـ bug تم إصلاحه، لكنه يُظهر أن الاسم القديم `price_egp` ما زال يظهر في مرجع تاريخي. **ليس تضارباً فعلياً**، فقط سجل تاريخي.

---

### 3.13 عدد الصفحات في `bun run build`

**`PROGRESS.md` سطر 52:**
> `Local bun run build | ✅ **FIXED** (Phase 7, Master Repair Batch 001) — ... Now exits 0 with 73/73 static pages.`

**`PROGRESS.md` سطر 2717:**
> `- [x] bun run build: 79/79 pages, 0 errors`

**`worklog.md` سطر 95:**
> `- bun run build: PASS (79/79 static pages, 0 errors)`

**`worklog.md` سطر 631:**
> `- Build: exit 0; all 78 routes registered`

**`worklog.md` سطر 699:**
> `- Next.js build (npx next build): exit 0; all 78 routes registered`

→ أرقام متناقضة: 73 (في `PROGRESS.md` سطر 52) مقابل 79 (في `PROGRESS.md` سطر 2717 + `worklog.md` سطر 95) مقابل 78 (في `worklog.md` سطر 631 + 699). كلها داخل نفس الفحص الزمني.

---

### 3.14 robots.txt يسمح بـ `/pricing` (route محذوف)

**`public/robots.txt` سطر 11:**
> `Allow: /pricing`

**`PROGRESS.md` سطر 564 (B12):**
> `| B12 | ~~`/pricing` page لسه موجودة~~ | ✅ **تم الحذف** — استبدال كل navigate("pricing") بـ navigate("memberships") + حذف من View type | — |`

**`PROGRESS.md` سطر 546 (M5):**
> `| M5 | "Pricing" tab لا يزال في navigation | ✅ **تم** (Phase 7, Master Repair Batch 001) — إزالة الـ entry المكرر |`

→ `/pricing` كـ route **محذوف** بالكامل، لكن `robots.txt` لا يزال يسمح بزحفه. متناقض.

---

## 4. التقادم والملفات الميتة

### 4.1 ملف مفقود مهم

- **`PROJECT_CONTEXT.md`** — مُشار إليه 9 مرات عبر 3 ملفات كأنه "موجود" أو "جديد في Phase 7"، لكنه **غير موجود** على `origin/main` ولا في التاريخ (`git log --all -- PROJECT_CONTEXT.md` لا نتائج). إما لم يُلتزم أصلاً، أو حُذف بدون تحديث المراجع.

### 4.2 ملفات ميتة (orphaned)

- **`public/MuscleHubEG_Updates_Report.docx`** + **`public/MuscleHubEG_Updates_Report.doc`** — ملفان ثنائيان (6785 bytes لكل منهما)، **MD5 مطابق**، لا يوجد أي إشارة لأي منهما في الكود (`grep -rn "MuscleHubEG_Updates_Report" .` لا نتائج). يبدوان نسخة قديمة من تقرير تم نسيانه في `public/`.

### 4.3 مسارات مكسورة (broken paths)

#### 4.3.1 مسارات `/home/z/my-project/download/` (محلية على جهاز واحد فقط)

| الملف | السطر | المسار المكسور |
|---|---|---|
| `DEVELOPER_GUIDE.md` | 284 | `/home/z/my-project/download/MuscleHubEG_Database_Fix_v4.sql` |
| `DEVELOPER_GUIDE.md` | 688 | `/home/z/my-project/download/MuscleHubEG_Database_Fix_v4.sql` |
| `DEVELOPER_GUIDE.md` | 689 | `/home/z/my-project/download/MuscleHubEG_Fix_support_tickets_status.sql` |
| `PROGRESS.md` | 256 | `/home/z/my-project/download/MuscleHubEG_Database_Fix_v4.sql` |
| `PROGRESS.md` | 740 | `/home/z/my-project/download/MuscleHubEG_Database_Fix_v4.sql` |
| `PROGRESS.md` | 741 | `/home/z/my-project/download/MuscleHubEG_Fix_support_tickets_status.sql` |
| `SECURITY.md` | 187 | `/home/z/my-project/download/` |

هذه مسارات محلية على جهاز مطور واحد، غير موجودة في الـ repo. لا يمكن لأي مساهم آخر الوصول إليها.

#### 4.3.2 مسارات `scripts/*.js` (الـ scripts/ directory غير موجود ومُتجاهل في .gitignore)

| الملف | السطر | المسار المكسور |
|---|---|---|
| `DEVELOPER_GUIDE.md` | 557 | `bun run compress-images` (الـ script في `package.json` يشير لـ `node scripts/compress-images.js`) |
| `DEVELOPER_GUIDE.md` | 560 | `node scripts/scan-blog-urls-broad.js` |
| `DEVELOPER_GUIDE.md` | 563 | `node scripts/fix-blog-known-garbled.js` |
| `DEVELOPER_GUIDE.md` | 572 | `scripts/scan-blog-urls-broad.js` |
| `DEVELOPER_GUIDE.md` | 573 | `scripts/fix-blog-known-garbled.js` |
| `DEVELOPER_GUIDE.md` | 574 | `scripts/scan-blog-garbled.js` |
| `package.json` | 10 | `"compress-images": "node scripts/compress-images.js"` |

تم التأكيد عبر `git log --all --oneline -- scripts/` أن مجلد `scripts/` **لم يُلتزم أبداً** في التاريخ. كما أن `.gitignore` سطر 47 يتجاهله صراحةً (`/scripts/`).

#### 4.3.3 إشارة لـ `/admin/ai-settings` (route غير موجود)

- `.env.example` سطر 26: `Leave them empty and configure via the in-app "AI Settings" page at /admin/ai-settings`
- لا يوجد route باسم `/admin/ai-settings` في `src/app/admin/` (الموجود: blog, leads, referrals, saved-results فقط).
- `grep -rn "ai-settings" --include="*.ts" --include="*.tsx" --include="*.md" .` لا نتائج أخرى.

### 4.4 ملفات الـ env المتقادمة

**`.env.example` سطر 57–72** يوثّق 5 متغيرات لـ Z.ai:
- `ZAI_BASE_URL=https://internal-api.z.ai/v1`
- `ZAI_API_KEY=Z.ai`
- `ZAI_TOKEN=`
- `ZAI_CHAT_ID=`
- `ZAI_USER_ID=`

لكن `PROGRESS.md` سطر 2654–2656 (Phase 8) يقول:
> `1. استبدال الاعتمادية على Z.ai تماماً:
>    - إزالة مكتبة z-ai-web-dev-sdk من المشروع لمنع مشاكل الـ Private IP (internal-api.z.ai) التي كانت تفشل دائمًا في بيئة Vercel.`

التحقق: `grep -i "z-ai" package.json` لا نتائج → `z-ai-web-dev-sdk` فعلاً أُزيل من dependencies. لكن:
- `src/lib/ai.ts` **بالكامل** ملف مخصص لـ Z.ai integration (45+ سطر تشير لـ ZAI_*).
- `src/lib/blog-generate.ts` سطر 795, 807 يشير لـ z-ai في التعليقات.
- `.env.example` ما زال يوثّق الـ ZAI_* env vars.

→ `.env.example` متقادم في قسم Z.ai. كما أن `src/lib/ai.ts` كود ميت (لكن هذا خارج نطاق فحص التوثيق).

### 4.5 `RUN_ON_SUPABASE.sql` متقادم

- الملف يحتوي فقط على migrations 0011 + 0012.
- migrations 0013 → 0016 غير موجودة فيه.
- التعليق الافتتاحي يقول "MuscleHub" (البراند القديم) بدلاً من "MuscleHubEG".
- الملف يبدو أنه كان ملف "concat-and-run" مؤقت، نُسي ولم يُحدَّث.

### 4.6 أقسام Deprecated في AGENTS.md

- **AGENTS.md § 5 "Source-of-Truth Hierarchy"** — عُلِّم `> **Deprecated (2026-08-24):** Superseded by §12.8.` لكن القسم لا يزال يشغل مساحة (سطر 194–196).
- **AGENTS.md § 9 "Final Report Format"** — عُلِّم `> **Deprecated (2026-08-24):** Superseded by §12.9.` لكن القسم لا يزال يشغل مساحة (سطر 271–273).

### 4.7 QA_CHECKLIST.md يشير لـ HEAD قديم

- `QA_CHECKLIST.md` سطر 16: `HEAD a5b6a9a matches origin/main`
- `QA_CHECKLIST.md` سطر 17: `git rev-parse HEAD == git rev-parse origin/main == a5b6a9a`
- `QA_CHECKLIST.md` سطر 23: `Commit a079375` (PayPal restoration).
- `QA_CHECKLIST.md` سطر 24: `Commit a5b6a9a` (duplicate-button fix).
- `QA_CHECKLIST.md` سطر 25: `Commit e0c6f0e` (coaching CTA).

الـ HEAD الفعلي الحالي: `263d4d9`. لذا `a5b6a9a` ليس HEAD الحالي. هذا متوقع لملف "snapshot" لكنه يدل على أن آخر تحديث للـ QA_CHECKLIST كان بعد commit `a5b6a9a` وقبل `263d4d9` (التغييرات الأخيرة لم تُحدَّث في الـ QA log).

### 4.8 إشارة QA_CHECKLIST.md إلى AGENTS.md §5 (Deprecated)

- `QA_CHECKLIST.md` سطر 3: `Per AGENTS.md §5, this file is source-of-truth #3...`
- لكن `AGENTS.md` §5 **Deprecated** (سطر 196) ومُستبدل بـ §12.8.

### 4.9 التواريخ في ترويسة الملفات غير متطابقة

| الملف | "Last updated" المُعلن | آخر commit فعلي |
|---|---|---|
| `README.md` سطر 6 | `2026-08-23 (rebase + documentation cleanup)` | `2026-08-24` (`a079375`) |
| `DEVELOPER_GUIDE.md` سطر 3 | `2026-08-19 (Phase 7...)` | `2026-08-24` (`a079375`) |
| `SECURITY.md` سطر 3 | `2026-08-23` | `2026-08-24` (`a079375`) |

### 4.10 إشارة README.md لـ B18 كـ "new" رغم أنه مُصحَّح

- `README.md` سطر 373: `**B18 (new)** — package.json build script references scripts/compress-images.js...`
- لكن `PROGRESS.md` سطر 91 يقول إن B18 **FIXED** في Master Repair Batch 001. كلمة "new" في README متقادمة.

### 4.11 AGENTS.md §3.5 يشير لـ B18 كأنه مشكلة حالية

- `AGENTS.md` سطر 102–105:
  > `Note: package.json build step references scripts/compress-images.js
  > which is currently missing — see PROGRESS.md known issues.`

لكن `package.json` سطر 7 الآن `"build": "next build"` (بدون البادئة المكسورة). الجملة "currently missing" متقادمة.

### 4.12 `PROGRESS.md` § "إحصائيات المشروع" (سطر 606–624) بالكامل متقادم

هذا القسم بالكامل يعطي القيم القديمة (28 API routes, 47 pages, 20 tables, 12 migrations, 50 shadcn, 23 views, 226 code files) بينما القسم المُتحقَّق منه في سطر 22–39 يعطي القيم الصحيحة (36, 51, 22, 16, 51, 25, 255). الجدول القديم يصف نفسه بـ "القيم القديمة مشطوبة" لكنه في الحقيقة يعرض القيم القديمة كقيم "مُتحقَّق منها".

### 4.13 robots.txt Allow: /pricing (تم حذفه)

- `public/robots.txt` سطر 11: `Allow: /pricing` — لكن `/pricing` كـ route محذوف (per PROGRESS.md B12 + M5).

### 4.14 ملفات أخرى شبه فاضية أو هزيلة

لا يوجد ملفات فاضية بالكامل. أصغر ملف توثيقي هو `public/ads.txt` (سطر واحد) لكنه functional config وليس توثيقاً.

أقرب ملف لـ "شبه فاضي" هو `PROGRESS.md` § "Past Incidents" — لكن هذا داخل `SECURITY.md` سطر 373–375: `_None recorded to date._` — وهذا مقصود.

---

## 5. توصية لكل ملف

> **مهم:** هذه توصيات فقط. لا تُنفَّذ أي توصية قبل موافقة المالك.

| الملف | التوصية | السبب |
|---|---|---|
| `AGENTS.md` | **يبقى** — مع تحديث §3.5 (إزالة الإشارة لـ B18 "currently missing")، ودمج §5 + §9 Deprecated أو حذفهما بالكامل بدلاً من إبقائهما كأقسام فارغة بعنوان "Deprecated" | القواعد التشغيلية مطلوبة، لكن الأقسام المُهملة تشغل مساحة وتُربك القارئ |
| `README.md` | **يبقى** — مع تحديث شامل للأرقام (28→36 API routes، 22→22 tables مع توضيح، 15→16 migrations، 50→51 UI، 23→25 views، إزالة B18 "new"، تصحيح cron "3×/day" → "every 2h"، تحديث "Last updated") | الملخص المواجه للمستخدم يحتوي على 6+ أرقام متضاربة مع الكود الفعلي |
| `DEVELOPER_GUIDE.md` | **يبقى** — مع تحديث: §2 إحصائيات (28→36 API، 28→51 UI، 17→25 views)، §4 عدد الجداول (20→22) + migrations (12→16)، §8 جدول الـ API routes (ناقص 8 routes)، §11 إصلاح "Build مكسور" (لم يعد مكسوراً)، §11 إزالة إشارات `scripts/*.js` (5 مواضع)، إزالة المسارات `/home/z/my-project/download/*.sql` (3 مواضع)، تحديث "آخر تحديث" (2026-08-19 → تاريخ فعلي)، إزالة الإشارة لـ `PROJECT_CONTEXT.md` | أكثر ملف يحتوي على تضارب + مسارات مكسورة |
| `PROGRESS.md` | **يبقى** — مع: (1) توحيد §"إحصائيات المشروع" (سطر 606–624) مع §"Verified statistics" (سطر 22–39) — الأخيرة صحيحة، (2) إزالة أو توضيح §"scripts/ directory: MISSING" (سطر 39) لأنه FIXED، (3) تصحيح "Gemini 2.5 Flash" (سطر 2656) → "Gemini 3.7 Flash"، (4) إزالة الإشارة لـ `PROJECT_CONTEXT.md` (9 مواضع) أو استبدالها بمستودع جديد، (5) إزالة المسارات `/home/z/my-project/download/` (3 مواضع) | أكبر ملف + متناقض داخلياً في عدة مواضع |
| `QA_CHECKLIST.md` | **يبقى** — مع: (1) تحديث إشارة "AGENTS.md §5" → "AGENTS.md §12.8" (سطر 3)، (2) تحديث HEAD snapshot `a5b6a9a` → `263d4d9` (3 مواضع) | ملف snapshot بسيط، يحتاج تحديث مرجعيات فقط |
| `SECURITY.md` | **يبقى** — مع: (1) إزالة/تحديث الإشارة لـ `/home/z/my-project/download/` (سطر 187) — استبدالها بمسار نسبي داخل repo أو حذفها، (2) إضافة قسم PayPal (مفقود تماماً رغم أن PayPal هو الـ primary payment method الآن) | السياسة الأمنية لا تذكر PayPal إطلاقاً رغم وجوده في الكود |
| `worklog.md` | **يبقى كما هو** | سجل append-only تاريخي؛ التناقضات في عدد الصفحات (78/79) طبيعية بين commits المختلفة ولا تحتاج تصحيح |
| `public/robots.txt` | **يبقى** — مع حذف `Allow: /pricing` (سطر 11) | الـ route محذوف، إبقاؤه في robots.txt يُضلّل الـ crawlers |
| `public/ads.txt` | **يبقى كما هو** | سطر واحد، صحيح، وظيفي |
| `public/MuscleHubEG_Updates_Report.docx` | **يُحذف** — ملف ثنائي، غير مُشار إليه في أي مكان، مكرر (MD5 مطابق لـ .doc) | orphan dead binary |
| `public/MuscleHubEG_Updates_Report.doc` | **يُحذف** — نفس السبب، MD5 مطابق للـ .docx | orphan dead binary |
| `supabase/migrations/RUN_ON_SUPABASE.sql` | **يُؤرشف في `archive/`** أو **يُحذف** | متقادم (يحتوي 0011 + 0012 فقط، لا يشمل 0013–0016)، تعليق الافتتاحية يقول "MuscleHub" (براند قديم) |
| `.env.example` | **يبقى** — مع: (1) حذف قسم Z.ai كاملاً (سطر 57–72، 5 env vars لم تعد مستخدمة)، (2) إزالة الإشارة لـ `/admin/ai-settings` (سطر 26 — الصفحة غير موجودة) | يوثّق env vars لمكتبة محذوفة (z-ai-web-dev-sdk) + يُشار لـ route غير موجود |
| `.github/workflows/generate-blog-post.yml` | **يبقى كما هو** | functional config، لا مشاكل |
| `LICENSE` | **يبقى كما هو** (functional config) | لا مشاكل |
| `package.json` | **يبقى** — مع: حذف `"compress-images": "node scripts/compress-images.js"` (سطر 10) لأن `scripts/` غير موجود | script ميت يشير لملف غير موجود |
| **`PROJECT_CONTEXT.md` (مفقود)** | **يُستحدث من جديد** أو **تُحذف كل الإشارات إليه** | الملف مذكور 9 مرات في 3 ملفات كأنه موجود، لكنه غير موجود فعلاً. لا يمكن تجاهل هذا التناقض |

---

## 6. الهيكل النهائي المقترح بعد التجميع

> **مهم:** هذه مجرد **اقتراح** للهيكل بعد إجراء التوصيات. لا تُنفَّذ إلا بعد موافقة المالك.

### 6.1 شجرة الملفات المقترحة (توثيق فقط)

```
musclehubeg/
├── AGENTS.md                         # قواعد تشغيل الـ AI agents (مُحدَّث — بلا أقسام Deprecated)
├── README.md                         # الملخص المواجه للمستخدم (مُحدَّث — أرقام صحيحة)
├── DEVELOPER_GUIDE.md                # دليل المطور (مُحدَّث — بلا مسارات مكسورة)
├── PROGRESS.md                       # لوحة الميزات + تاريخ المشروع (مُوحَّد — رقم واحد لكل إحصائية)
├── QA_CHECKLIST.md                   # دليل التحقق (مُحدَّث — HEAD snapshot محدَّث)
├── SECURITY.md                       # السياسة الأمنية (مُحدَّث — + قسم PayPal)
├── worklog.md                        # سجل append-only (يبقى كما هو)
├── docs/
│   └── _AUDIT.md                     # هذا الملف (التقرير الحالي)
├── public/
│   ├── robots.txt                    # (مُحدَّث — بلا Allow: /pricing)
│   ├── ads.txt                       # (يبقى كما هو)
│   └── [DELETED] MuscleHubEG_Updates_Report.docx   # ← حذف
│   └── [DELETED] MuscleHubEG_Updates_Report.doc    # ← حذف
├── archive/                          # ← يُستحدث
│   └── RUN_ON_SUPABASE.sql           # ← يُنقل من supabase/migrations/ إلى هنا
├── supabase/
│   └── migrations/
│       ├── 0001_init.sql
│       ├── 0002_blog_posts_and_is_coach_grant.sql
│       ├── ... (0003 → 0016)
│       └── [REMOVED] RUN_ON_SUPABASE.sql          # ← يُؤرشف
└── [OTHER FILES]
```

### 6.2 ملف PROJECT_CONTEXT.md: قرار مطلوب من المالك

أمام المالك خياران فقط:

1. **استحداث `PROJECT_CONTEXT.md`** — إنشاء الملف فعلاً وفق ما يصفه `PROGRESS.md` سطر 583 ("هوية المشروع + الحالة الحالية") و `PROGRESS.md` §11 (8 numbered approved decisions for AI Architecture Direction). هذا يستلزم كتابة محتوى جديد لم يكن موجوداً.
2. **حذف كل الإشارات إليه** (9 مواضع في 3 ملفات) — قبول أن الملف لن يُستحدث، وتنظيف التوثيق من الإشارات إليه.

لا يمكن إبقاء الوضع الحالي (إشارات لملف غير موجود) لأنه يُربك أي قارئ أو agent جديد.

### 6.3 ملخص التغييرات المقترحة

| الفئة | عدد الملفات المتأثرة |
|---|---|
| ملفات تُحذف | 3 (`MuscleHubEG_Updates_Report.docx` + `.doc` + `RUN_ON_SUPABASE.sql` يُؤرشف) |
| ملفات تُحدَّث بدون تغيير هيكلي | 7 (`AGENTS.md`, `README.md`, `DEVELOPER_GUIDE.md`, `PROGRESS.md`, `QA_CHECKLIST.md`, `SECURITY.md`, `public/robots.txt`) |
| ملفات تُستحدث | 1 أو 2 (`PROJECT_CONTEXT.md` إن اختار المالك الاستحداث، + `archive/` directory) |
| ملفات تُضاف إلى `package.json` تنظيف | 1 (حذف script الـ `compress-images`) |
| ملفات تُضاف إلى `.env.example` تنظيف | 1 (حذف قسم Z.ai كاملاً + إشارة `/admin/ai-settings`) |
| إجمالي التغييرات المقترحة | 13–14 ملف/تغيير |

---

## ملحق: قائمة المصادر المُتحقَّق منها

كل القيم "الفعلية" في هذا التقرير تم التحقق منها عبر:

1. `git fetch origin --quiet` ثم `git rev-parse HEAD == git rev-parse origin/main` → تطابق (263d4d9).
2. `find src/app/api -name "route.ts*" | wc -l` → 36
3. `find src/app -name "page.tsx" | wc -l` → 51
4. `find src/components/ui -name "*.tsx" | wc -l` → 51
5. `find src/components/views -name "*.tsx" | wc -l` → 25
6. `ls supabase/migrations/*.sql | grep -v RUN_ON | wc -l` → 16
7. `md5sum public/MuscleHubEG_Updates_Report.*` → تطابق
8. `git ls-tree -r origin/main --name-only | grep PROJECT_CONTEXT` → لا نتائج
9. `git log --all --oneline -- scripts/` → لا نتائج (مجلد `scripts/` لم يُلتزم أبداً)
10. `grep -i "z-ai" package.json` → لا نتائج (z-ai-web-dev-sdk أُزيل)
11. `find src/app/admin -type d` → لا يوجد `ai-settings`
12. `cat .github/workflows/generate-blog-post.yml | grep cron` → `"0 */2 * * *"`

— نهاية التقرير —
