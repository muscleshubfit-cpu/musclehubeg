-- 0070 — REBRAND DATA: Musclehubeg/MuscleHub family → Alkemos
--
-- Owner directive 2026-09-06 («ابدأ التغيير»): the platform brand moved from
-- Musclehubeg to Alkemos (alkemos.com live since Phase 118/119 migration).
-- This migration renames the OLD BRAND inside existing DATA rows so the
-- 56 blog articles and any other brand-bearing text match the new identity.
--
-- Applied automatically by the Supabase–GitHub integration (Phase 120 law).
--
-- Properties:
--   * DATA-ONLY — no schema change (types.ts untouched, migration_audit safe).
--   * IDEMPOTENT — every statement is guarded; a second run matches 0 rows.
--   * auth.users is NEVER touched (§6 manual-path exception — not needed here).
--   * slug columns are NEVER touched (URL stability law).
--   * Functional identifiers are naturally safe: emails/GitHub org use
--     "muscleshubfit" (no "musclehub" substring — cannot match any regex).
--
-- Replacement law (mirrors the repo-wide code rebrand in the SAME commit,
-- scripts-side chain order):
--   1) old-domain links first : musclehubeg.vercel.app → alkemos.com
--   2) ALL-CAPS family        : MUSCLEHUB(EG| EG)?      → ALKEMOS
--   3) lowercase family       : musclehub(eg| eg)?      → alkemos
--   4) Title-case family      : [Mm]uscle[Hh]ub ?([Ee][Gg])? → Alkemos

-- ============================================================================
-- A) blog_posts — the primary surface (56 live articles carry the old brand)
-- ============================================================================

UPDATE blog_posts SET
  title             = regexp_replace(regexp_replace(regexp_replace(regexp_replace(title,             'musclehubeg\.vercel\.app', 'alkemos.com', 'g'), 'MUSCLEHUB(EG| EG)?', 'ALKEMOS', 'g'), 'musclehub(eg| eg)?', 'alkemos', 'g'), '[Mm]uscle[Hh]ub ?([Ee][Gg])?', 'Alkemos', 'g'),
  excerpt           = regexp_replace(regexp_replace(regexp_replace(regexp_replace(excerpt,           'musclehubeg\.vercel\.app', 'alkemos.com', 'g'), 'MUSCLEHUB(EG| EG)?', 'ALKEMOS', 'g'), 'musclehub(eg| eg)?', 'alkemos', 'g'), '[Mm]uscle[Hh]ub ?([Ee][Gg])?', 'Alkemos', 'g'),
  content           = regexp_replace(regexp_replace(regexp_replace(regexp_replace(content,           'musclehubeg\.vercel\.app', 'alkemos.com', 'g'), 'MUSCLEHUB(EG| EG)?', 'ALKEMOS', 'g'), 'musclehub(eg| eg)?', 'alkemos', 'g'), '[Mm]uscle[Hh]ub ?([Ee][Gg])?', 'Alkemos', 'g'),
  meta_title        = regexp_replace(regexp_replace(regexp_replace(regexp_replace(meta_title,        'musclehubeg\.vercel\.app', 'alkemos.com', 'g'), 'MUSCLEHUB(EG| EG)?', 'ALKEMOS', 'g'), 'musclehub(eg| eg)?', 'alkemos', 'g'), '[Mm]uscle[Hh]ub ?([Ee][Gg])?', 'Alkemos', 'g'),
  meta_description  = regexp_replace(regexp_replace(regexp_replace(regexp_replace(meta_description,  'musclehubeg\.vercel\.app', 'alkemos.com', 'g'), 'MUSCLEHUB(EG| EG)?', 'ALKEMOS', 'g'), 'musclehub(eg| eg)?', 'alkemos', 'g'), '[Mm]uscle[Hh]ub ?([Ee][Gg])?', 'Alkemos', 'g'),
  focus_keyword     = regexp_replace(regexp_replace(regexp_replace(regexp_replace(focus_keyword,     'musclehubeg\.vercel\.app', 'alkemos.com', 'g'), 'MUSCLEHUB(EG| EG)?', 'ALKEMOS', 'g'), 'musclehub(eg| eg)?', 'alkemos', 'g'), '[Mm]uscle[Hh]ub ?([Ee][Gg])?', 'Alkemos', 'g'),
  cover_alt         = regexp_replace(regexp_replace(regexp_replace(regexp_replace(cover_alt,         'musclehubeg\.vercel\.app', 'alkemos.com', 'g'), 'MUSCLEHUB(EG| EG)?', 'ALKEMOS', 'g'), 'musclehub(eg| eg)?', 'alkemos', 'g'), '[Mm]uscle[Hh]ub ?([Ee][Gg])?', 'Alkemos', 'g'),
  faq_json          = regexp_replace(regexp_replace(regexp_replace(regexp_replace(faq_json::text,    'musclehubeg\.vercel\.app', 'alkemos.com', 'g'), 'MUSCLEHUB(EG| EG)?', 'ALKEMOS', 'g'), 'musclehub(eg| eg)?', 'alkemos', 'g'), '[Mm]uscle[Hh]ub ?([Ee][Gg])?', 'Alkemos', 'g')::jsonb,
  schema_json       = regexp_replace(regexp_replace(regexp_replace(regexp_replace(schema_json::text, 'musclehubeg\.vercel\.app', 'alkemos.com', 'g'), 'MUSCLEHUB(EG| EG)?', 'ALKEMOS', 'g'), 'musclehub(eg| eg)?', 'alkemos', 'g'), '[Mm]uscle[Hh]ub ?([Ee][Gg])?', 'Alkemos', 'g')::jsonb
WHERE title ILIKE '%musclehub%'
   OR excerpt ILIKE '%musclehub%'
   OR content ILIKE '%musclehub%'
   OR meta_title ILIKE '%musclehub%'
   OR meta_description ILIKE '%musclehub%'
   OR focus_keyword ILIKE '%musclehub%'
   OR cover_alt ILIKE '%musclehub%'
   OR faq_json::text ILIKE '%musclehub%'
   OR schema_json::text ILIKE '%musclehub%'
   OR array_to_string(keywords, ' ') ILIKE '%musclehub%'
   OR array_to_string(tags, ' ') ILIKE '%musclehub%'
   OR author ILIKE '%musclehub%';

-- author: the byline default was 'MuscleHub' since migration 0013 → 'Alkemos'
UPDATE blog_posts SET author = 'Alkemos'
WHERE author ILIKE '%musclehub%';

ALTER TABLE blog_posts ALTER COLUMN author SET DEFAULT 'Alkemos';

-- keywords / tags arrays (element-wise)
UPDATE blog_posts SET
  keywords = ARRAY(
    SELECT regexp_replace(regexp_replace(regexp_replace(regexp_replace(k, 'musclehubeg\.vercel\.app', 'alkemos.com', 'g'), 'MUSCLEHUB(EG| EG)?', 'ALKEMOS', 'g'), 'musclehub(eg| eg)?', 'alkemos', 'g'), '[Mm]uscle[Hh]ub ?([Ee][Gg])?', 'Alkemos', 'g')
    FROM unnest(keywords) AS k
  )
WHERE array_to_string(keywords, ' ') ILIKE '%musclehub%';

UPDATE blog_posts SET
  tags = ARRAY(
    SELECT regexp_replace(regexp_replace(regexp_replace(regexp_replace(t, 'musclehubeg\.vercel\.app', 'alkemos.com', 'g'), 'MUSCLEHUB(EG| EG)?', 'ALKEMOS', 'g'), 'musclehub(eg| eg)?', 'alkemos', 'g'), '[Mm]uscle[Hh]ub ?([Ee][Gg])?', 'Alkemos', 'g')
    FROM unnest(tags) AS t
  )
WHERE array_to_string(tags, ' ') ILIKE '%musclehub%';

-- ============================================================================
-- B) Secondary tables — guarded sweeps (only rows that actually match change)
-- ============================================================================

-- notifications: in-app messages (title/body/link)
UPDATE notifications SET
  title = regexp_replace(regexp_replace(regexp_replace(regexp_replace(title, 'musclehubeg\.vercel\.app', 'alkemos.com', 'g'), 'MUSCLEHUB(EG| EG)?', 'ALKEMOS', 'g'), 'musclehub(eg| eg)?', 'alkemos', 'g'), '[Mm]uscle[Hh]ub ?([Ee][Gg])?', 'Alkemos', 'g'),
  body  = regexp_replace(regexp_replace(regexp_replace(regexp_replace(body,  'musclehubeg\.vercel\.app', 'alkemos.com', 'g'), 'MUSCLEHUB(EG| EG)?', 'ALKEMOS', 'g'), 'musclehub(eg| eg)?', 'alkemos', 'g'), '[Mm]uscle[Hh]ub ?([Ee][Gg])?', 'Alkemos', 'g'),
  link  = regexp_replace(regexp_replace(regexp_replace(regexp_replace(link,  'musclehubeg\.vercel\.app', 'alkemos.com', 'g'), 'MUSCLEHUB(EG| EG)?', 'ALKEMOS', 'g'), 'musclehub(eg| eg)?', 'alkemos', 'g'), '[Mm]uscle[Hh]ub ?([Ee][Gg])?', 'Alkemos', 'g')
WHERE title ILIKE '%musclehub%' OR body ILIKE '%musclehub%' OR link ILIKE '%musclehub%';

-- coach_pages: public coach landing pages (headline/bio/specialties + EN + review_note)
UPDATE coach_pages SET
  headline        = regexp_replace(regexp_replace(regexp_replace(regexp_replace(headline,        'musclehubeg\.vercel\.app', 'alkemos.com', 'g'), 'MUSCLEHUB(EG| EG)?', 'ALKEMOS', 'g'), 'musclehub(eg| eg)?', 'alkemos', 'g'), '[Mm]uscle[Hh]ub ?([Ee][Gg])?', 'Alkemos', 'g'),
  bio             = regexp_replace(regexp_replace(regexp_replace(regexp_replace(bio,             'musclehubeg\.vercel\.app', 'alkemos.com', 'g'), 'MUSCLEHUB(EG| EG)?', 'ALKEMOS', 'g'), 'musclehub(eg| eg)?', 'alkemos', 'g'), '[Mm]uscle[Hh]ub ?([Ee][Gg])?', 'Alkemos', 'g'),
  specialties     = regexp_replace(regexp_replace(regexp_replace(regexp_replace(specialties,     'musclehubeg\.vercel\.app', 'alkemos.com', 'g'), 'MUSCLEHUB(EG| EG)?', 'ALKEMOS', 'g'), 'musclehub(eg| eg)?', 'alkemos', 'g'), '[Mm]uscle[Hh]ub ?([Ee][Gg])?', 'Alkemos', 'g'),
  headline_en     = regexp_replace(regexp_replace(regexp_replace(regexp_replace(headline_en,     'musclehubeg\.vercel\.app', 'alkemos.com', 'g'), 'MUSCLEHUB(EG| EG)?', 'ALKEMOS', 'g'), 'musclehub(eg| eg)?', 'alkemos', 'g'), '[Mm]uscle[Hh]ub ?([Ee][Gg])?', 'Alkemos', 'g'),
  bio_en          = regexp_replace(regexp_replace(regexp_replace(regexp_replace(bio_en,          'musclehubeg\.vercel\.app', 'alkemos.com', 'g'), 'MUSCLEHUB(EG| EG)?', 'ALKEMOS', 'g'), 'musclehub(eg| eg)?', 'alkemos', 'g'), '[Mm]uscle[Hh]ub ?([Ee][Gg])?', 'Alkemos', 'g'),
  specialties_en  = regexp_replace(regexp_replace(regexp_replace(regexp_replace(specialties_en,  'musclehubeg\.vercel\.app', 'alkemos.com', 'g'), 'MUSCLEHUB(EG| EG)?', 'ALKEMOS', 'g'), 'musclehub(eg| eg)?', 'alkemos', 'g'), '[Mm]uscle[Hh]ub ?([Ee][Gg])?', 'Alkemos', 'g'),
  review_note     = regexp_replace(regexp_replace(regexp_replace(regexp_replace(review_note,     'musclehubeg\.vercel\.app', 'alkemos.com', 'g'), 'MUSCLEHUB(EG| EG)?', 'ALKEMOS', 'g'), 'musclehub(eg| eg)?', 'alkemos', 'g'), '[Mm]uscle[Hh]ub ?([Ee][Gg])?', 'Alkemos', 'g')
WHERE headline ILIKE '%musclehub%' OR bio ILIKE '%musclehub%' OR specialties ILIKE '%musclehub%'
   OR headline_en ILIKE '%musclehub%' OR bio_en ILIKE '%musclehub%' OR specialties_en ILIKE '%musclehub%'
   OR review_note ILIKE '%musclehub%';

-- external_plans: admin-authored manual plans (title/notes/content jsonb)
UPDATE external_plans SET
  title   = regexp_replace(regexp_replace(regexp_replace(regexp_replace(title,   'musclehubeg\.vercel\.app', 'alkemos.com', 'g'), 'MUSCLEHUB(EG| EG)?', 'ALKEMOS', 'g'), 'musclehub(eg| eg)?', 'alkemos', 'g'), '[Mm]uscle[Hh]ub ?([Ee][Gg])?', 'Alkemos', 'g'),
  notes   = regexp_replace(regexp_replace(regexp_replace(regexp_replace(notes,   'musclehubeg\.vercel\.app', 'alkemos.com', 'g'), 'MUSCLEHUB(EG| EG)?', 'ALKEMOS', 'g'), 'musclehub(eg| eg)?', 'alkemos', 'g'), '[Mm]uscle[Hh]ub ?([Ee][Gg])?', 'Alkemos', 'g'),
  content = regexp_replace(regexp_replace(regexp_replace(regexp_replace(content::text, 'musclehubeg\.vercel\.app', 'alkemos.com', 'g'), 'MUSCLEHUB(EG| EG)?', 'ALKEMOS', 'g'), 'musclehub(eg| eg)?', 'alkemos', 'g'), '[Mm]uscle[Hh]ub ?([Ee][Gg])?', 'Alkemos', 'g')::jsonb
WHERE title ILIKE '%musclehub%' OR notes ILIKE '%musclehub%' OR content::text ILIKE '%musclehub%';

-- plans: coach-authored client plans (title/notes; content jsonb)
UPDATE plans SET
  title   = regexp_replace(regexp_replace(regexp_replace(regexp_replace(title,   'musclehubeg\.vercel\.app', 'alkemos.com', 'g'), 'MUSCLEHUB(EG| EG)?', 'ALKEMOS', 'g'), 'musclehub(eg| eg)?', 'alkemos', 'g'), '[Mm]uscle[Hh]ub ?([Ee][Gg])?', 'Alkemos', 'g'),
  notes   = regexp_replace(regexp_replace(regexp_replace(regexp_replace(notes,   'musclehubeg\.vercel\.app', 'alkemos.com', 'g'), 'MUSCLEHUB(EG| EG)?', 'ALKEMOS', 'g'), 'musclehub(eg| eg)?', 'alkemos', 'g'), '[Mm]uscle[Hh]ub ?([Ee][Gg])?', 'Alkemos', 'g'),
  content = regexp_replace(regexp_replace(regexp_replace(regexp_replace(content::text, 'musclehubeg\.vercel\.app', 'alkemos.com', 'g'), 'MUSCLEHUB(EG| EG)?', 'ALKEMOS', 'g'), 'musclehub(eg| eg)?', 'alkemos', 'g'), '[Mm]uscle[Hh]ub ?([Ee][Gg])?', 'Alkemos', 'g')::jsonb
WHERE title ILIKE '%musclehub%' OR notes ILIKE '%musclehub%' OR content::text ILIKE '%musclehub%';
