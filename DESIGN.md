# Alkemos — Design System Documentation

> **Last updated:** 2026-09-06 (Phase 127 — owner feedback pass on the Marble & Chrome identity: hero rework, page banners, EVO reference card, site-wide application)
> **Status:** Active — binding reference for all UI/UX decisions
> **Audience:** AI agents, developers, designers

---

## 1. Design Philosophy

Alkemos runs the **«Marble & Chrome»** identity (owner directive, Phase 126 + 127):
a monochrome marble-and-metal system inspired by classical Greek
architecture, rendered with modern layout discipline. Every surface is
either pristine marble (light theme) or dark honed stone (dark theme);
every accent is chrome (brushed-metal gradient). The ONLY chromatic
exception is `--ai` cyan, reserved strictly for AI-assistant surfaces.

Core laws:

1. **Monochrome by default** — `--bg` / `--text` / `--muted` + the chrome
   gradient carry the whole design. No blue/green/purple accents outside
   semantic status colors deep inside the app (destructive/success only).
2. **Zero emoji in DOM** on marketing + hub surfaces — icons come from the
   owner's engraved icon sheets (see §6). (Phase 127 removed the last
   emoji renders from /tools, /programs, /memberships.)
3. **Theme parity** — light and dark are the SAME structure, only tokens
   flip (`[data-theme="dark"]`). No element may exist in one theme only.
4. **Zero pure-black / pure-white borders** — borders use `--edge` /
   `--chrome-edge`, never `#000`/`#fff`.
5. **Performance** — fixed-ratio media (no CLS), WebP method=6, no heavy
   animations, `prefers-reduced-motion` respected.

---

## 2. Identity Tokens (globals.css — single source of truth)

### 2.1 Core palette

| Variable | Light | Dark | Usage |
|---|---|---|---|
| `--bg` | `#FFFFFF` | `#0B0B0D` | Page background |
| `--text` | `#0B0B0D` | `#F5F5F7` | Primary text / solid action color |
| `--muted` / `--muted-foreground` | `#6B7075` | `#9BA0A6` | Secondary text |
| `--muted-2` | `#4A5260` | `#B9BEC4` | Body copy on tinted surfaces |
| `--tint` | `#F5F6F8` | `#121316` | Soft section / chip background |
| `--card` | `#ffffff` | `#141518` | Card surface |
| `--edge` | `#E4E6E9` | `#26292E` | Hairline borders |
| `--ai` | `#38C7FF` | `#45D6FF` | **AI-assistant elements ONLY** |

### 2.2 Chrome system

| Variable | Light | Dark |
|---|---|---|
| `--chrome` | `linear-gradient(145deg,#FDFDFD 0%,#C9CED3 35%,#878E94 50%,#E6E9EC 70%,#9AA0A6 100%)` | same |
| `--chrome-edge` | `#7D8388` | `#4A5056` |
| `--border-chrome` | `1px solid #C9CED3` | `1px solid #3A3F45` |
| `--shadow` | `0 8px 24px rgba(11,11,13,.06)` | `0 0 0 1px rgba(255,255,255,.04), 0 12px 32px rgba(0,0,0,.5)` |
| `--radius-chrome` | `14px` | `14px` |

### 2.3 Artwork-backed tokens

`--hero-img`, `--marble-img`, `--meander-img`, `--prog-backdrop`,
`--navbar-bg` — CSS `url()` pairs that flip with the theme (zero hydration
flicker; the browser swaps by `data-theme`, no JS image-src churn).

### 2.4 Theme engine

- `data-theme="light|dark"` on `<html>`, stamped pre-paint by the
  `#alkemos-theme-init` inline script (root layout) — manual choice
  (localStorage `alkemos-theme`) or OS `prefers-color-scheme`.
- `ThemeToggle` cycles light → dark → system and follows the OS live
  while in system mode.
- `--ai` cyan is EXCLUSIVELY for AI surfaces (EVO widget/chat/glow ring).
  Never use it for links, CTAs, or decoration.

### 2.5 Dark-compatibility shim (Phase 126)

Legacy Apple-light utility classes on secondary surfaces
(`bg-white`, `bg-[#f5f5f7]`, `text-[#1d1d1f]`, `text-[#6e6e73]`,
`border-[#d2d2d7]`) are remapped to identity tokens **in dark mode only**
(globals.css). Light mode is untouched. New code MUST NOT use these
classes — use the `var(--…)` tokens directly (Phase 127 converted all
six hub pages: tools / exercises / programs / foods / blog / memberships).

---

## 3. Typography

### Font Families

| Context | Font Family | Source |
|---|---|---|
| Display (headings, EN) | **Playfair Display** 500/600/700 | `@fontsource/playfair-display` → `--font-display` |
| Body (EN) | **Inter** | `@fontsource/inter` |
| Arabic | **Cairo** | `@fontsource/cairo` (same scale; Arabic never uses the serif) |

The lapidary serif (`font-display` / default `h1–h4`) is the "engraved in
stone" voice. Arabic headings keep Cairo per owner directive §16 — Arabic
readability beats stylistic mirroring.

### Font Sizes (Tailwind scale)

| Element | Mobile | Desktop |
|---|---|---|
| Hero title | `text-4xl` | `md:text-6xl lg:text-7xl` |
| Page title (h1) | `text-3xl` | `md:text-5xl` |
| Section title (h2) | `text-2xl/3xl` | `md:text-4xl/5xl` |
| Card title (h3) | `text-lg` | `text-lg` |
| Body text | `text-sm/base` | `text-base/lg` |

### Font Weights

Normal (400) body · Semibold (600) titles & chrome buttons · Bold (700)
prices/stat numbers.

---

## 4. Core Recipes (CSS classes in globals.css)

| Class | Recipe | Use |
|---|---|---|
| `.btn-chrome` | chrome gradient bg + `#0B0B0D` text + 1px `--chrome-edge` + radius 999px + 600 weight | ALL primary CTAs |
| `.btn-outline` | transparent + 1px `--text` border + `--text` + radius 999px | Secondary CTAs |
| `.marble-card` | `--card` bg + `--border-chrome` + radius 14 + `--shadow` + marble texture `::before` at 5% (dark 7%) | Every card surface |
| `.seal-chip` | chrome-border pill, small-caps tracking, `--muted-foreground`, translucent card bg | Stat seals, tags, badges |
| `.chrome-text` | chrome gradient clipped to text (lightened ramp in dark) | Numbers, prices, "Learn more ›" links |
| `.meander-divider` | Greek-key band, repeat-x, 28px, opacity .85 | Section separators |
| `.navbar-chrome` | sticky, `--navbar-bg` + blur(12px) + chrome bottom border | Site header |
| `.evo-hero-card` / `.evo-hero-art` | Phase 127 EVO section card — text left, warrior art right with a mask fade into the marble; `[dir=rtl]` flips the mask | Homepage EVO section |
| `.hero-art` / `.hero-bg` | Phase 131 unified overlay — artwork = absolute cover layer (ThemeImg pair), content centered INSIDE it; min-height floor 100vw×713/1280 (92vh on wide viewports) | Homepage hero |

**Buttons law:** there are exactly TWO button styles on marketing/hub
surfaces — `.btn-chrome` (primary) and `.btn-outline` (secondary). No
blue buttons, no gradients besides chrome.

---

## 5. Layout & Spacing

### Container Widths

| Context | Max width |
|---|---|
| Landing sections | `max-w-4xl` – `max-w-6xl` (per section) |
| Hub pages | `max-w-4xl` (tools) / `max-w-6xl` (explorers, memberships, blog) |
| Article body | `max-w-3xl` |

### Section Padding

Section vertical `py-12` / `md:py-20` · card internal `p-5–p-8` · grid gap
`gap-4` (cards) / `gap-3` (pills).

### Border Radius

Cards `var(--radius-chrome)` = 14px (marble-card) · pills/buttons `9999px`
· small inner cards `rounded-2xl`.

---

## 6. Brand Asset System (`public/images/brand/`)

All artwork comes from the owner's generated sets (v3 upload, archived at
`download/alkemos-brand/v3/`; rebuilt by `scripts/build_assets_v3.py` and
Phase 127's `scripts/build_assets_v127.py` + `fix_hero_logo2.py`):

| Asset | Purpose |
|---|---|
| `hero-light/dark.webp` (1280×713) | Homepage hero background — **logo scrubbed off the artwork (Phase 127): the chrome logo is an HTML element instead** |
| `logo-hero-light/dark.webp` (760px) | Silver-chrome hero lockup (from `logo-main-*`) — displayed full-opacity, upper-center |
| `logo-navbar-light/dark.png` | Horizontal navbar logo (36px height) |
| `logo-footer-white.png` | White mono lockup for the always-dark footer |
| `mark-helmet.png` | Helmet mark (favicon set, comparison-table column head) |
| `header-{section}-{light,dark}.webp` (1280×477) | **The owner's 12 PAGE banners** (tools / exercises / programs / foods / blog / pricing) — rendered via `<PageBanner section="…" />` at the top of each hub page (Phase 127: NOT homepage section banners) |
| `evo-card-light/dark.webp` | Programs-card stadium backdrop (12% blur) + EVO page art |
| `evo-hero-light/dark.webp` (640×675) | Phase 127 EVO section warrior crop (warrior at 67–85% of crop width) |
| `evo-widget-light/dark.webp` (480×480) | Widget/avatar bust (72% fill) |
| `texture-marble-light/dark.webp` | Marble texture layer (5%/7% on cards, footer) |
| `divider-meander-light/dark.webp` | Greek-key repeating band |
| `icons/<name>-{light,dark}.webp` (200×200) | **38 engraved icons** — the ONLY icon set on marketing/hub surfaces (calories, bmi, macros, bodyfat, hydration, mealplanner, dumbbell, house, rack, runner, protein, carbs, fats, fruits, scroll, laurel, evo, checkseal, doric…) |

### Icon usage

- `EngravedIcon name="calories"` renders the light+dark pair (CSS picks).
- Lucide icons remain INSIDE the logged-in app only (drawer, dashboard).
- Category emoji fallbacks were removed in Phase 127 (zero-emoji law).

### Cache law (Phase 128)

Brand artwork files CHANGE CONTENT between phases but KEEP their
filenames — so they must NEVER be long-cached in browsers:

- `/images/brand/*` and `/sw.js` → `Cache-Control: public, max-age=0,
  must-revalidate` (next.config.ts + vercel.json; the brand rule comes
  after the generic `/images/*` rule so it wins).
- Other `/images/*` → `public, max-age=86400` (no `immutable`, no 1-year).
- `/_next/static/*` stays `immutable` 1-year (content-hashed — safe).
- `sw.js` itself is registered as `/sw.js?v=N` (bump with CACHE_VERSION)
  so SW updates jump over any stale HTTP-cache copy; the worker is
  network-first for everything non-hashed and posts `SW_UPDATED` → the
  page reloads once when a new worker activates.

---

## 7. Page Recipes

### 7.1 Homepage hero (Phase 131 unified overlay)

ONE mode at every viewport (globals.css `.hero-art` / `.hero-bg`): the
artwork is an absolutely-positioned COVER layer (`.hero-bg`, ThemeImg
pair, eager LCP) with the content — chrome logo lockup (`w-32` mobile →
`w-64` desktop) → serif H1 → 3 hero-scoped smaller seal chips
(`.hero-seals`) — centered INSIDE it (owner directive Phase 131:
«تصغير اللوجو والنص والازرار قليلا ثم نقلهم داخل الصورة»; the stats
subline is REMOVED). **No CTA buttons, no eyebrow wordmark** (Phase 127).

Height floors keep the artwork effectively complete:

- **every viewport:** `min-height: 100vw × 713/1280` (natural artwork
  height) — phones/tablets show the full scene, sides intact; the compact
  content grows the box only a few px (cover then trims ≤ ~6% of the
  decorative side margins).
- **aspect > 1501/1000** (laptops/desktops): `min-height: 92vh`.

Luminance law: the artwork center is clean in BOTH themes (bright in
light / near-black in dark) → no veil ever; verify any new artwork the
same way before shipping.

**Navbar bar (Phase 128):** `[menu][theme] …… logo …… [lang][bell][account]`
— the theme toggle lives on the MENU side (owner directive: it used to hug
the centered logo); RTL mirrors automatically.

### 7.2 Hub page header (Phase 127)

`<SiteHeader variant="landing" />` → `<main>` opens with
`<PageBanner section="{tools|exercises|programs|foods|blog|pricing}" />`
(a 1280×477 owner artwork strip in a marble-card frame, `mb-10`) → h1 +
subline. Works in server components (plain `<img>` pair).

### 7.3 EVO section card (Phase 127 + 128 + 131)

One full-width `marble-card.evo-hero-card`: text column left (**h2 ONLY —
no description (Phase 128) and NO buttons (Phase 131 «ازاله الازرار»)**;
title one step smaller `text-2xl md:text-4xl`), warrior art absolutely
positioned on the inline-end side (60% width desktop / 78% mobile) fading
into the marble via CSS `mask-image`; `[dir=rtl]` mirrors art + mask.
Card min-height `280px` mobile / `340px` desktop (Phase 131 «تصغير ارتفاع
الصورة قليلا»). The floating EVO widget stays the chat entry point.

### 7.4 Pricing cards

`marble-card` surfaces; Pro = dark `#0B0B0D` card with a 2px chrome
gradient ring (border-box trick) + laurel "Popular" seal-chip; prices in
`.chrome-text`; CTAs `.btn-chrome`.

### 7.5 Comparison tables

**ONE real `<table>` at every breakpoint (Phase 131 «عدله الى شكل جدول»
— the Phase 128 mobile card stack is gone):** 4 columns (Feature /
Alkemos / Traditional trainer / Free apps), Alkemos column highlighted
with `--tint` + `--border-chrome` inset; "yes" = engraved `checkseal`
icon; "no" = muted `×` at opacity .5. Below md the table compacts itself
(`text-xs`, `p-2.5` cells, wrapped text, short trainer header label) so
the grid stays readable with zero cutoff — cards are NEVER used.

### 7.6 Footer (always dark, list-menus)

`.footer-marble` (#0B0B0D + marble-dark texture) + `.footer-meander-top`
band on the top edge + white mono logo + light muted links (custom CSS
overrides the app link color inside the footer). Phase 131
(«قوائم بدلاً من صف واحد»): menu-style vertical LISTS in a grid —
`grid-cols-2` (phones) / `grid-cols-3` (md) / `grid-cols-6` (lg = brand +
5 lists: Paid Services, Affiliate & Referral, Tools, Resources, Legal &
Basic). Every footer link lives in a vertical list — no horizontal link
rows. Bottom credit line centered above nothing else.

---

## 8. Bilingual Support (EN/AR)

- Full RTL mirroring via `dir="rtl"` + logical properties
  (`ps/pe/ms/me`, `start/end`, `inset-inline-end`). The EVO card art and
  mask flip with `[dir=rtl]`.
- **Logo lockups stay LTR** (brand artwork is language-neutral).
- Arabic keeps Cairo at the same type scale; no serif for Arabic.
- AR mirrors: `/ar/{exercises,foods,programs,blog,memberships,…}` share
  the EN components with `lang="ar"` — banners/theme/logo pairs are
  language-independent.

---

## 9. Performance Patterns

- Hero artworks `<link rel="preload">`ed in the root layout (no CLS — the
  artwork layer is absolutely positioned; the logo keeps fixed CSS width);
  hero logo light variant preloaded. The `.hero-bg` `<img>` is eager (LCP).
- Theme image pairs: both variants in DOM, CSS shows one — zero JS churn.
- Hub page banners lazy-decode; engraved icons `loading="lazy"`.
- Server components render grids/pills/pagination (explorers) — client
  JS only for search/filter islands.
- All brand raster shipped as WebP method=6 (sources 1.5–2MB → 20–130KB).

---

## 10. Verification Protocol

Before any UI change ships:

1. **Structure parity** light vs dark (same DOM, tokens flip only).
2. **Zero emoji** in rendered DOM on marketing/hub surfaces.
3. **No legacy accent colors** — `#0071e3`, `#34c759`, `#8b5cf6` must not
   appear on hub/marketing surfaces (grep the diff).
4. VLM screenshot pass (light + dark + AR + 390px mobile) against the
   owner's preview references.
5. Full gate suite: `tsc` 0 · `eslint` 0 · `vitest` · `next build` ·
   docs/stale-ref/ui-wiring guards.
