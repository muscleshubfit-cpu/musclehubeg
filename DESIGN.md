# MuscleHubEG — Design System Documentation

> **Last updated:** 2026-08-25
> **Status:** Active — binding reference for all UI/UX decisions
> **Audience:** AI agents, developers, designers

---

## 1. Design Philosophy

MuscleHubEG follows an **Apple-inspired premium aesthetic** — clean,
minimal, focused on content clarity. The design prioritizes:

1. **Whitespace** — generous padding, no visual clutter
2. **Hierarchy** — clear visual priority via size, color, and weight
3. **Consistency** — same patterns repeated across all pages
4. **Performance** — no unnecessary animations or heavy assets
5. **Accessibility** — WCAG AA compliant, `prefers-reduced-motion` respected

---

## 2. Color System

All colors are defined in `src/app/globals.css` as CSS variables and mapped
to Tailwind utility classes via `tailwind.config.ts`.

### Primary Palette

| Variable | Hex | Tailwind | Usage |
|---|---|---|---|
| `--background` | `#ffffff` | `bg-white` | Page background |
| `--foreground` | `#1d1d1f` | `text-[#1d1d1f]` | Primary text |
| `--primary` | `#0071e3` | `bg-[#0071e3]` | CTA buttons, links, accents |
| `--secondary` | `#f5f5f7` | `bg-[#f5f5f7]` | Section backgrounds, card backgrounds |
| `--muted-foreground` | `#6e6e73` | `text-[#6e6e73]` | Secondary text |
| `--border` | `#d2d2d7` | `border-[#d2d2d7]` | Borders, dividers |
| `--destructive` | `#ff3b30` | `text-[#ff3b30]` | Errors, delete actions |
| `--success` | `#34c759` | `text-[#34c759]` | Success states, protein macros |
| `--warning` | `#ff9500` | `text-[#ff9500]` | Warnings, intermediate level |

### Category Accent Colors

| Category | Color | Usage |
|---|---|---|
| Exercise: chest | `#0071e3` | Blue |
| Exercise: back | `#0090e3` | Light blue |
| Exercise: shoulders | `#00b8d9` | Cyan |
| Exercise: legs | `#34c759` | Green |
| Exercise: biceps | `#5ac8fa` | Sky |
| Exercise: triceps | `#007aff` | iOS blue |
| Exercise: core | `#ff9500` | Orange |
| Exercise: cardio | `#ff3b30` | Red |
| Food: protein | `#ff6b6b` | Coral |
| Food: carb | `#ffa94d` | Amber |
| Food: fat | `#69db7c` | Light green |
| Food: vegetable | `#38d9a9` | Teal |
| Food: fruit | `#ff8787` | Pink |
| Food: dairy | `#a9b5c1` | Gray-blue |
| Food: nuts | `#d9943a` | Bronze |
| Food: snack | `#9775fa` | Purple |
| Food: drink | `#5c7cfa` | Indigo |

---

## 3. Typography

### Font Families

| Context | Font Family | Source |
|---|---|---|
| English (primary) | **Inter** | `@fontsource/inter` |
| Arabic (primary) | **Cairo** | `@fontsource/cairo` |
| Monospace | `ui-monospace` | System |

### Font Sizes (Tailwind scale)

| Element | Mobile | Desktop |
|---|---|---|
| Page title (h1) | `text-3xl` (30px) | `text-5xl` (48px) |
| Section title (h2) | `text-2xl` (24px) | `text-4xl` (36px) |
| Card title (h3) | `text-lg` (18px) | `text-lg` (18px) |
| Body text | `text-sm` (14px) | `text-base` (16px) |
| Caption/label | `text-xs` (12px) | `text-xs` (12px) |
| Micro label | `text-[10px]` (10px) | `text-[10px]` (10px) |

### Font Weights

| Weight | Tailwind | Usage |
|---|---|---|
| Normal (400) | `font-normal` | Body text, descriptions |
| Medium (500) | `font-medium` | Labels, buttons |
| Semibold (600) | `font-semibold` | Card titles, subheadings |
| Bold (700) | `font-bold` | Hero titles, emphasis |

---

## 4. Layout & Spacing

### Container Widths

| Context | Max width | Tailwind |
|---|---|---|
| Landing page | `max-w-6xl` (72rem) | `mx-auto max-w-6xl px-4` |
| App pages | `max-w-6xl` (72rem) | `mx-auto max-w-6xl px-4` |
| Article body | `max-w-3xl` (48rem) | `mx-auto max-w-3xl px-4` |
| Form width | `max-w-md` (28rem) | `mx-auto max-w-md` |

### Section Padding

| Context | Mobile | Desktop |
|---|---|---|
| Section vertical | `py-12` (48px) | `md:py-20` (80px) |
| Card internal | `p-5` or `p-6` | same |
| Card grid gap | `gap-4` (16px) | same |
| Pill gap | `gap-3` (12px) | same |

### Border Radius

| Element | Radius | Tailwind |
|---|---|---|
| Cards | `1.5rem` | `rounded-3xl` |
| Pills/buttons | `9999px` | `rounded-full` |
| Small cards | `1rem` | `rounded-2xl` |
| Images (thumbnails) | `0.75rem` | `rounded-xl` |
| Input fields | `0.5rem` | `rounded-lg` |

---

## 5. Component Patterns

### 5.1 Category Pill (card-style tile)

Used on `/exercises` and `/foods` for category selection.

```
┌──────────────────┐
│                  │
│   [64×64 image]  │  ← rounded-xl, object-cover, ring-1 ring-black/5
│                  │
│   Category name  │  ← text-[11px] font-medium leading-tight
└──────────────────┘
```

- Container: `w-20 flex flex-col items-center gap-2 rounded-2xl p-2`
- Active state: `bg-[#1d1d1f] text-white ring-2 ring-[#0071e3] ring-offset-2`
- Inactive: `bg-[#f5f5f7] text-[#6e6e73] hover:bg-white`
- Image error: conditional rendering with emoji fallback (no `display:none`)

### 5.2 Content Card

Used for exercise, food, and program listings.

```
┌────────────────────────────┐
│  ┌──────────────────────┐  │
│  │                      │  │  ← aspect-[4/3] (exercises) or aspect-square (foods)
│  │    Image / Thumbnail  │  │
│  │                      │  │
│  └──────────────────────┘  │
│  ┌──────────────────────┐  │
│  │ [Category] [Level]   │  │  ← pill badges
│  │ Exercise Name        │  │  ← text-lg font-semibold
│  │ Equipment: Barbell   │  │  ← text-xs text-muted
│  │ Learn more ›         │  │  ← text-sm text-primary
│  └──────────────────────┘  │
└────────────────────────────┘
```

- Container: `card-hover group overflow-hidden rounded-3xl bg-[#f5f5f7]`
- Hover: `translateY(-4px) + box-shadow: 0 12px 32px rgba(0,0,0,0.08)`

### 5.3 Empty State

Used when search/filter yields no results.

```
┌────────────────────────────────┐
│           ┌─────┐              │
│           │ 🔍  │              │  ← lucide SearchX icon in bg-primary/10 circle
│           └─────┘              │
│       No results found         │  ← text-lg font-semibold
│  Try adjusting your filters    │  ← text-sm text-muted
│       [Reset filters]          │  ← bg-foreground text-white rounded-full
└────────────────────────────────┘
```

### 5.4 Header Drawer (navigation menu)

7 grouped sections in a slide-in drawer:

1. Home
2. Paid Services (Coaching + Memberships + EVO)
3. Affiliate
4. Tools (expandable dropdown)
5. Resources (Exercises + Programs + Foods + Blog)
6. My Account (authenticated)
7. Coach Admin (if isCoach)

- Drawer width: `85vw max-w-sm`
- Items: `rounded-lg px-3 py-2.5 text-sm`
- Active group header: `text-[10px] uppercase tracking-wider text-muted`

### 5.5 Footer

5 groups in a responsive grid + horizontal Legal & Basic row:

| Group | Items |
|---|---|
| Brand | MuscleHubEG + tagline + copyright |
| Paid Services | Coaching + Memberships + EVO AI Coach |
| Affiliate & Referral | Affiliate Program + Referral Dashboard |
| Tools | 6 individual tools |
| Resources | Exercises + Programs + Foods + Blog |
| Legal & Basic (bottom row) | About + Contact + FAQ + Privacy + Terms |

---

## 6. Animation System

Defined in `src/app/globals.css`. All animations respect
`prefers-reduced-motion: reduce`.

| Class | Effect | Duration | Usage |
|---|---|---|---|
| `animate-fade-in-up` | Opacity 0→1 + translateY 16px→0 | 0.5s ease-out | Page entrances |
| `card-hover` | translateY -4px + box-shadow on hover | 0.3s ease | Content cards |
| `skeleton-shimmer` | Gradient background slide | 1.5s infinite | Skeleton loaders |
| `group-hover:scale-105` | Image zoom on card hover | 0.5s | Program/food images |

### `prefers-reduced-motion`

```css
@media (prefers-reduced-motion: reduce) {
  .animate-fade-in-up,
  .card-hover,
  .skeleton-shimmer {
    animation: none !important;
    transition: none !important;
  }
}
```

---

## 7. Image System

### 7.1 AI-Generated Images (Apple iPhone style)

All category/tool/program thumbnails are AI-generated (z-ai image generation)
in a consistent style:

- **Style:** "Premium product photography, Apple iPhone style, minimal white
  background, soft studio lighting, high detail, professional product
  photography, ultra clean, white seamless background"
- **Size:** 1024×1024 PNG
- **Avg size:** 70-100 KB per image

### 7.2 Image Inventory

| Folder | Count | Purpose |
|---|---|---|
| `/public/images/categories/foods/` | 9 | Food category thumbnails |
| `/public/images/categories/exercises/` | 8 | Exercise category thumbnails |
| `/public/images/tools/` | 6 | Tool listing thumbnails |
| `/public/images/programs/` | 7 | Workout program thumbnails |
| `/public/images/` (root) | 19 | Hero/marketing photos (existing JPGs) |
| **Total** | **49** | |

### 7.3 Image URL Convention

- Local images: always start with `/images/...` (absolute path from public root)
- External images: `https://...` (only for yuhonas individual exercise photos)
- The `getExerciseImageUrl()` function handles both local (`/`) and external
  (`http`) paths — it passes local paths through without modification.

### 7.4 Fallback Pattern

All images use **conditional rendering** (not `display: none`) for emoji
fallback. This is better for SEO and accessibility:

```tsx
const [imgError, setImgError] = useState(false);

{imgError ? (
  <span className="text-2xl">{emoji}</span>
) : (
  <img src={src} onError={() => setImgError(true)} />
)}
```

---

## 8. Performance Patterns

### 8.1 Incremental Rendering

Pages with large datasets use pagination + infinite scroll:

| Page | Dataset size | Page size | Mechanism |
|---|---|---|---|
| `/exercises` | 868 | 48 | scroll + "Load more" button |
| `/foods` | 8,830 | 60 | scroll + "Load more" button |

### 8.2 Deferred Filtering

`/foods` uses `useDeferredValue` to keep the search input responsive even
when filtering 8,830 items:

```tsx
const filtered = useMemo(() => filterFoods({...}), [...]);
const deferredFiltered = useDeferredValue(filtered);
// Render uses deferredFiltered — input stays responsive
```

### 8.3 Lazy Image Loading

All `<img>` tags use `loading="lazy"` to avoid blocking initial render.

---

## 9. Bilingual Support (EN/AR)

- **Default language:** English (`lang="en" dir="ltr"`)
- **Arabic:** `lang="ar" dir="rtl"` — RTL layout handled by Tailwind's
  `rtl:` variant + logical properties (`ps-`, `pe-`, `start`, `end`)
- **Language toggle:** in header (always visible)
- **Brand name:** "MuscleHubEG" is never translated

---

## 10. Verification Protocol

After any UI change, verify (per `AGENTS.md` §3.5):

```bash
npx tsc --noEmit     # 0 errors
npx eslint .         # 0 errors (≤6 pre-existing warnings)
npx next build       # exit 0, all 78 routes registered
```

After deploying, verify on Live:
- No horizontal scroll on 390px viewport
- No white screens on any route
- Images load correctly (check `/exercises` category pills + `/foods` pills)
- Empty state appears when filtering yields 0 results
