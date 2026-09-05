# Project Images

This folder contains all images used by the Alkemos project.

## Where to Upload Your Images

### 📁 `categories/foods/` — 9 food category thumbnails

Upload square images (400×400 recommended, JPG/PNG/WebP/SVG).

| Filename | Category | Used in |
|---|---|---|
| `protein.jpg` | بروتين | `/foods` page + landing page |
| `carb.jpg` | كارب | `/foods` page + landing page |
| `fat.jpg` | دهون | `/foods` page + landing page |
| `vegetable.jpg` | خضار | `/foods` page |
| `fruit.jpg` | فواكه | `/foods` page |
| `dairy.jpg` | ألبان | `/foods` page |
| `nuts.jpg` | مكسرات | `/foods` page |
| `snack.jpg` | سناك | `/foods` page |
| `drink.jpg` | مشروبات | `/foods` page |

### 📁 `categories/exercises/` — 8 exercise category thumbnails

Upload square images (400×400 recommended).

| Filename | Category | Used in |
|---|---|---|
| `chest.jpg` | صدر | `/exercises` page + landing page |
| `back.jpg` | ظهر | `/exercises` page |
| `shoulders.jpg` | أكتاف | `/exercises` page |
| `legs.jpg` | أرجل | `/exercises` page + landing page |
| `biceps.jpg` | بايسبس | `/exercises` page |
| `triceps.jpg` | ترايسبس | `/exercises` page |
| `core.jpg` | كور | `/exercises` page + landing page |
| `cardio.jpg` | كارديو | `/exercises` page + landing page |

> **Note:** Exercise category images currently use the yuhonas/free-exercise-db
> library on GitHub (raw URLs). If you upload local images here, we'll update
> the code to use them instead.

### 📁 `tools/` — 6 tool thumbnails

Upload square images (400×400 recommended).

| Filename | Tool | Used in |
|---|---|---|
| `calorie-calculator.jpg` | حاسبة السعرات | `/tools` page + landing page |
| `bmi-calculator.jpg` | حاسبة BMI | `/tools` page + landing page |
| `macro-calculator.jpg` | حاسبة الماكروز | `/tools` page + landing page |
| `body-fat-calculator.jpg` | حاسبة الدهون | `/tools` page + landing page |
| `water-tracker.jpg` | متتبع الماء | `/tools` page + landing page |
| `meal-planner.jpg` | مخطط الوجبات | `/tools` page + landing page |

### 📁 `programs/` — 3 workout program thumbnails

Upload wider images (600×400 recommended, 16:10 aspect).

| Filename | Program | Used in |
|---|---|---|
| `home-workout.jpg` | منزلي بدون معدات | landing page |
| `full-gym.jpg` | جيم كامل | landing page |
| `hiit.jpg` | حرق دهون HIIT | landing page |

## How to Upload

1. **Add images via GitHub web UI:**
   - Open the folder on GitHub (e.g. `public/images/categories/foods/`)
   - Click "Add file" → "Upload files"
   - Drag your images, name them exactly as listed above
   - Commit with message: `chore(images): add food category thumbnails`

2. **Or via git CLI:**
   ```bash
   # Copy your images to the right folders
   cp ~/Downloads/protein.jpg public/images/categories/foods/
   cp ~/Downloads/chest.jpg public/images/categories/exercises/
   # ...etc
   git add public/images/
   git commit -m "chore(images): add local category thumbnails"
   git push
   ```

3. **After uploading, tell me** and I'll update the code to use local paths
   (`/images/categories/foods/protein.jpg`) instead of Unsplash URLs.

## Image Specs

- **Format:** JPG (preferred for photos), PNG (for transparency), WebP (best compression), or SVG (for vector)
- **Size:** 400×400 for categories/tools, 600×400 for programs
- **File size:** < 100 KB each (compress before upload if larger)
- **Compression tool:** https://tinypng.com/ (free, handles JPG/PNG/WebP)

## Existing Images (already in repo)

The following images already exist in `public/images/` (root level, not in subfolders):

- `accessories.jpg`, `ahmed-*.jpg`, `coach-portrait.jpg`, `dumbbell-gym.jpg`
- `evo-*.jpg`, `fitness-*.jpg`, `gym-interior.jpg`, `hero-ahmed.jpg`
- `meal-*.jpg`, `running-outdoor.jpg`, `yoga-studio.jpg`

These are used on the landing page hero, About, Coaching, and EVO sections. No action needed for these.

## Why Local Images?

Previously, the project used Unsplash URLs like
`https://images.unsplash.com/photo-XXXX?w=400`. This had problems:

1. **404 errors:** Many photo IDs became invalid (Unsplash removed them).
2. **External dependency:** Site performance depended on Unsplash uptime.
3. **Privacy:** External requests leak visitor IP to Unsplash.

By hosting images locally, the site is fully self-contained and reliable.
