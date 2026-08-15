# MuscleHub Design System Skill

## Identity

This is a **premium fitness coaching platform** for Coach Ahmed Zake.
The design language is **Apple-grade minimalism** — clean, confident,
and human. NOT a generic AI-generated fitness app.

## The Golden Rule

> **Avoid the "AI aesthetic" at all costs.**
>
> No neon gradients. No glassmorphism soup. No purple/pink glows.
> No emoji-as-icons in navigation. No centered-everything landing pages
> with three identical feature cards. No "trusted by" logo strips.
>
> Every element should look like it was designed by a human who cares.
> When in doubt, remove. Then remove again.

---

## Color Tokens

### Primary Palette (used 90% of the time)

| Token | Hex | Usage |
|---|---|---|
| `--background` | `#FFFFFF` | Page background — always pure white |
| `--foreground` | `#1D1D1F` | Primary text — Apple's true black (not pure #000) |
| `--secondary-bg` | `#F5F5F7` | Section backgrounds, cards, input fields |
| `--muted-text` | `#6E6E73` | Secondary text, labels, captions |
| `--border` | `#D2D2D7` | Borders, dividers — barely visible |
| `--accent` | `#0071E3` | Links, CTAs, active states — Apple blue ONLY |

### Semantic Colors (used sparingly)

| Token | Hex | Usage |
|---|---|---|
| `--success` | `#34C759` | Success states — Apple green |
| `--warning` | `#FF9500` | Warnings — Apple orange |
| `--danger` | `#FF3B30` | Errors, delete — Apple red |

### Forbidden Colors

- ❌ Indigo/violet (#6366F1, #818CF8)
- ❌ Gold/amber gradients (#D4AF37, #F59E0B)
- ❌ Pink/magenta accents (#EC4899)
- ❌ Any gradient with more than 2 stops
- ❌ Neon anything

### Color Rules

1. **Backgrounds are white or #F5F5F7. Period.**
2. **Text is #1D1D1F or #6E6E73. No other text colors.**
3. **#0071E3 is the ONLY accent color.** Used for links, CTAs, and active states.
4. **Dark sections use #1D1D1F (not #000).** Text on dark is white.
5. **Semantic colors appear ONLY in status badges and alerts.** Never in buttons or cards.

---

## Typography

### Font Stack

```
--font-sans: "Inter", "Cairo", ui-sans-serif, system-ui, sans-serif;
--font-arabic: "Cairo", ui-sans-serif, system-ui, sans-serif;
--font-mono: ui-monospace, "SF Mono", monospace;
```

### Type Scale (1.250 ratio — Major Third)

| Token | Size | Weight | Line Height | Letter Spacing | Usage |
|---|---|---|---|---|---|
| `display` | 80px (5rem) | 600 | 1.05 | -0.03em | Hero headline (desktop) |
| `h1` | 60px (3.75rem) | 600 | 1.08 | -0.03em | Section headlines (desktop) |
| `h2` | 48px (3rem) | 600 | 1.1 | -0.02em | Section headlines (mobile) |
| `h3` | 28px (1.75rem) | 600 | 1.2 | -0.02em | Card titles |
| `h4` | 22px (1.375rem) | 600 | 1.3 | -0.01em | Subsection titles |
| `body-lg` | 20px (1.25rem) | 400 | 1.6 | -0.01em | Lead paragraphs |
| `body` | 17px (1.0625rem) | 400 | 1.6 | -0.01em | Body text |
| `body-sm` | 15px (0.9375rem) | 400 | 1.5 | 0 | Secondary text |
| `caption` | 13px (0.8125rem) | 400 | 1.4 | 0 | Captions, labels |
| `micro` | 11px (0.6875rem) | 400 | 1.3 | 0.04em | Uppercase labels |

### Typography Rules

1. **Headings use `font-weight: 600` (semibold), NEVER 700 (bold).**
2. **Letter spacing is negative on large text** (-0.03em to -0.01em).
3. **Arabic text uses `letter-spacing: 0` and `font-weight: 700`** for readability.
4. **Body text is 17px minimum.** Never go below 15px for content.
5. **Line height for body text is 1.6.** For headlines, 1.05–1.2.
6. **Uppercase labels** use `text-transform: uppercase` + `letter-spacing: 0.04em` + `font-size: 11px`.

---

## 8px Spacing Grid

All spacing MUST be multiples of 8. No exceptions.

| Token | Value | Usage |
|---|---|---|
| `space-0` | 0px | No spacing |
| `space-1` | 4px | Fine-tuning (icon gaps) |
| `space-2` | 8px | Tight element spacing |
| `space-3` | 12px | Input padding, small gaps |
| `space-4` | 16px | Default element spacing |
| `space-5` | 24px | Card internal padding |
| `space-6` | 32px | Section internal spacing |
| `space-8` | 48px | Between cards |
| `space-10` | 64px | Between sections (mobile) |
| `space-12` | 80px | Between sections (desktop) |
| `space-16` | 128px | Large section padding |
| `space-20` | 160px | Hero section padding |

### Spacing Rules

1. **Every `padding`, `margin`, `gap` must be a multiple of 8** (or 4 for fine-tuning).
2. **Section vertical padding is `py-20` (80px) on mobile, `py-28` (112px) on desktop.**
3. **Card padding is `p-6` (24px) on mobile, `p-8` (32px) on desktop.**
4. **Button padding is `px-6 py-3` (24px / 12px) minimum.**
5. **Max content width is `max-w-4xl` (56rem) for text, `max-w-6xl` (72rem) for grids.**

---

## Border Radius

| Token | Value | Usage |
|---|---|---|
| `radius-sm` | 8px | Small elements, inputs |
| `radius-md` | 12px | Medium elements |
| `radius-lg` | 16px | Cards (small) |
| `radius-xl` | 24px | Cards (large) |
| `radius-2xl` | 32px | Cards (feature) |
| `radius-full` | 9999px | Buttons, pills, badges |

### Rules

1. **Buttons are ALWAYS `rounded-full`.** No exceptions.
2. **Cards are `rounded-3xl` (24-32px).** Large, soft, premium.
3. **Inputs are `rounded-xl` (12px) or `rounded-full`.**
4. **Status badges are `rounded-full`.**

---

## Component Patterns

### Button

```tsx
// Primary (blue)
<button className="rounded-full bg-[#0071e3] px-6 py-3 text-base font-normal text-white transition-opacity hover:opacity-90">

// Secondary (white border)
<button className="rounded-full border border-[#d2d2d7] bg-white px-6 py-3 text-base font-normal text-[#1d1d1f] transition-opacity hover:opacity-90">

// Dark (black)
<button className="rounded-full bg-[#1d1d1f] px-6 py-3 text-base font-normal text-white transition-opacity hover:opacity-90">

// Text link
<button className="text-base font-normal text-[#0071e3] transition-opacity hover:opacity-70">
  Label ›
</button>
```

**Rules:**
- `font-normal`, NEVER `font-bold` on buttons.
- `transition-opacity hover:opacity-90` — the ONLY hover effect on buttons.
- No `active:scale`, no `shadow-glow`, no gradients.
- Text links use `›` arrow, not `<ArrowRight />` icon.

### Card

```tsx
<div className="rounded-3xl bg-[#f5f5f7] p-8">
  <h3 className="text-xl font-semibold tracking-tight">Title</h3>
  <p className="mt-2 text-sm font-normal text-[#6e6e73]">Description</p>
</div>
```

**Rules:**
- Background is `#F5F5F7` (light) or `#1D1D1F` (dark). Never white card on white bg.
- No `border` on cards unless it's a deliberate divider.
- No `shadow` on cards. The rounded bg IS the card.
- Hover: `transition-opacity hover:opacity-90` (fade slightly). No lift, no scale.

### Status Badge

```tsx
// Active/success
<span className="rounded-full bg-[#0071e3]/10 px-2.5 py-0.5 text-xs font-normal text-[#0071e3]">

// Warning
<span className="rounded-full bg-[#ff9500]/10 px-2.5 py-0.5 text-xs font-normal text-[#ff9500]">

// Danger
<span className="rounded-full bg-[#ff3b30]/10 px-2.5 py-0.5 text-xs font-normal text-[#ff3b30]">

// Neutral
<span className="rounded-full bg-[#f5f5f7] px-2.5 py-0.5 text-xs font-normal text-[#6e6e73]">
```

### Input

```tsx
<input
  className="w-full rounded-full border border-[#d2d2d7] bg-[#f5f5f7] px-5 py-3 text-base font-normal outline-none focus:border-[#0071e3]"
/>
```

### Section Layout

```tsx
<section className="bg-white px-4 py-20 md:py-28">
  <div className="mx-auto max-w-4xl text-center">
    <h2 className="text-3xl font-semibold tracking-tight md:text-5xl">Headline</h2>
    <p className="mx-auto mt-6 max-w-xl text-lg font-normal text-[#6e6e73] md:text-xl">
      Description
    </p>
  </div>
</section>
```

### Navigation

```tsx
// Sidebar (desktop)
<button className="block w-full rounded-lg px-3 py-2 text-start text-sm font-normal transition-colors
  active ? "bg-[#f5f5f7] font-medium text-[#1d1d1f]" : "text-[#6e6e73] hover:text-[#1d1d1f]">

// Mobile nav buttons
<button className="flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-medium transition-colors
  active ? "bg-[#0071e3] text-white" : "bg-[#f5f5f7] text-[#1d1d1f]">
```

**Rules:**
- Navigation is TEXT-ONLY. No icons in nav items.
- Mobile nav uses large buttons (44px+ touch target) with emoji + label.
- Active state: blue bg (mobile) or gray bg (desktop sidebar).

---

## Framer Motion Animation Patterns

### Scroll-Triggered Reveal

```tsx
import { Reveal } from "@/components/motion";

<Reveal delay={0.1}>
  <h2>Headline</h2>
</Reveal>
```

- Duration: 0.6s
- Easing: `[0.25, 0.1, 0.25, 1]` (Apple-style ease-out)
- `once: true` (animate once, don't re-trigger)
- `amount: 0.2` (trigger when 20% visible)

### Staggered Children

```tsx
import { StaggerGroup, StaggerItem } from "@/components/motion";

<StaggerGroup stagger={0.1}>
  <StaggerItem>Card 1</StaggerItem>
  <StaggerItem>Card 2</StaggerItem>
  <StaggerItem>Card 3</StaggerItem>
</StaggerGroup>
```

### Hover Transitions

```tsx
import { HoverCard } from "@/components/motion";

<HoverCard lift={8} scale={1.02}>
  <div className="rounded-3xl bg-[#f5f5f7] p-8">...</div>
</HoverCard>
```

- Duration: 0.3s
- `whileHover: { y: -8, scale: 1.02 }`
- `whileTap: { scale: 0.97 }` on buttons

### Animation Rules

1. **Use Framer Motion for ALL animations.** No CSS keyframes, no `animate-*` classes.
2. **Duration: 0.4–0.6s for reveals, 0.2–0.3s for hovers.** Never faster, never slower.
3. **Easing: `[0.25, 0.1, 0.25, 1]`** for all transitions. This is Apple's signature ease.
4. **`prefers-reduced-motion` is respected automatically** by Framer Motion's `useReducedMotion`.
5. **No bounce, no spring, no elastic.** Smooth ease-out only.
6. **Stagger delay: 0.1s between items.** Never more than 0.15s.
7. **Hero animations have `delay: 0.1–0.5s`** for a sequential entrance.

---

## Layout Principles

### Vertical Rhythm

1. **Sections alternate: white → #F5F5F7 → white → #1D1D1F.**
2. **Section padding: `py-20 md:py-28`** (80px / 112px).
3. **Between elements inside a section: `space-y-8` or `space-y-12`.**
4. **Never cram. If it feels tight, add more padding.**

### Grid

1. **Max width: `max-w-6xl` (72rem) for grids, `max-w-4xl` (56rem) for text.**
2. **Grid gaps: `gap-5 md:gap-6`** (20px / 24px).
3. **Cards: 2-column on desktop, 1-column on mobile.**
4. **Feature grids: 3-column on desktop, 1-column on mobile.**

### Alignment

1. **Text is centered in hero sections.**
2. **Text is left-aligned (LTR) or right-aligned (RTL) in content sections.**
3. **Tables and lists are left/right-aligned, never centered.**
4. **Numbers and prices are centered in stat cards.**

---

## Image Guidelines

1. **`object-contain` for person/portrait images** (never crop heads).
2. **`object-cover` for blog thumbnails and background images.**
3. **`rounded-3xl` on all images.** Large, soft corners.
4. **`loading="lazy"` on everything except the hero image.**
5. **No `hover:scale-105` on images.** Use `hover:opacity-90` instead.

---

## RTL (Arabic) Rules

1. **`dir="rtl"` on the `<html>` tag.**
2. **Arabic font: Cairo.** Switch automatically via `html[dir="rtl"]`.
3. **Letter spacing: 0** (Arabic doesn't use letter spacing).
4. **Font weight: 700** for Arabic headings (Cairo is thinner than Inter).
5. **Line height: 1.2** for Arabic headings (wider than Latin).
6. **`rtl:rotate-180`** on directional arrows.

---

## Forbidden Patterns (The "Anti-AI" Checklist)

- ❌ Lucide icons in navigation (`<Dumbbell />`, `<Bot />`, `<Brain />`)
- ❌ Gradient backgrounds (`bg-gradient-to-r from-indigo to-blue`)
- ❌ Glassmorphism (`backdrop-blur-xl bg-white/72`)
- ❌ Glow shadows (`shadow-glow`, `shadow-[0_0_30px_rgba(99,102,241,0.3)]`)
- ❌ Pulsing animations (`animate-pulse`, `animate-gold-pulse`)
- ❌ Shimmer text (`text-shimmer`, `bg-clip-text text-transparent`)
- ❌ Three identical feature cards with icon + title + description
- ❌ "Trusted by" logo strip
- ❌ Centered hero with gradient text and two CTAs
- ❌ Pricing cards with "Most Popular" badge that pulses
- ❌ FAQ accordion with `border-border` and `bg-card`
- ❌ Footer with social icons in circles
- ❌ Any color outside the defined palette
- ❌ `font-bold` (use `font-semibold` or `font-medium`)
- ❌ `shadow-md`, `shadow-lg` (use no shadow or `shadow-sm` only)
- ❌ CSS `@keyframes` animations (use Framer Motion instead)

---

## File Structure

```
src/
  components/
    motion.tsx          — Framer Motion wrappers (Reveal, StaggerGroup, HoverCard)
    views/
      LandingView.tsx   — Homepage
      AuthView.tsx      — Login/Signup
      PricingView.tsx   — Pricing
      DashboardView.tsx — Client dashboard
      ...
  app/
    globals.css         — CSS variables (color tokens, typography)
    layout.tsx          — Root layout (RTL, fonts, cookie checker)
```

---

## When Building New Pages

1. **Start with the section template** (white bg, centered text, py-20).
2. **Use `Reveal` for every block** that should animate on scroll.
3. **Use `StaggerGroup` for grids** — children animate in sequence.
4. **Use `HoverCard` on interactive cards** — smooth lift on hover.
5. **Buttons are `rounded-full`** with `hover:opacity-90`.
6. **Colors: white, #F5F5F7, #1D1D1F, #0071E3.** That's it.
7. **Typography: `font-semibold` headings, `font-normal` body.**
8. **Spacing: multiples of 8. Section padding: py-20 md:py-28.**
9. **No icons in navigation. Text + emoji only on mobile.**
10. **Test in both LTR (English) and RTL (Arabic).**
