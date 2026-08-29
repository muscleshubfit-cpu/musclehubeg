-- =====================================================================
-- RUN_ON_SUPABASE_0032_COACH_PAGES_I18N.sql   (ONE-SHOT SCRIPT)
-- =====================================================================
-- MULTI-COACH PHASE 2B (follow-up) — coach landing page goes BILINGUAL.
-- The site is AR/EN (mirror law: /coaches/{slug} EN canonical +
-- /ar/coaches/{slug} AR mirror), so each coach page row now carries an
-- ENGLISH copy of its marketing content alongside the existing Arabic:
--   headline_en      — EN headline   (falls back to `headline` if empty)
--   bio_en           — EN bio        (falls back to `bio` if empty)
--   specialties_en   — EN specialties, one per line (falls back to
--                      `specialties` if empty)
-- Existing rows keep working untouched: empty EN fields simply fall
-- back to the current single-language content (and the AR mirror falls
-- back to EN content when the coach only wrote English).
--
-- PREREQ: 0031 applied (coach_pages exists). No new tables, no policies
-- → RLS untouched. Idempotent: safe to re-run.
--
-- HOW TO PASTE: open the RAW url -> Ctrl+A, Ctrl+C -> Supabase SQL
-- Editor -> NEW empty query -> paste -> Ctrl+End -> you MUST see the
-- "END OF SCRIPT 0032" marker at the bottom -> Run -> expected:
-- "Success. No rows returned".
--
-- RAW: https://raw.githubusercontent.com/muscleshubfit-cpu/musclehubeg/main/supabase/migrations/RUN_ON_SUPABASE_0032_COACH_PAGES_I18N.sql
-- =====================================================================

-- ============================================================
-- PART 1 — English content columns on coach_pages
-- ============================================================
alter table public.coach_pages
  add column if not exists headline_en    text not null default '',
  add column if not exists bio_en         text not null default '',
  add column if not exists specialties_en text not null default '';

-- ============================================================
-- PART 2 — PostgREST schema reload
-- ============================================================
notify pgrst, 'reload schema';

-- =====================================================================
-- ===== END OF SCRIPT 0032 — if you can see this line (Ctrl+End), the
-- ===== paste is complete. Expected result: "Success. No rows returned"
-- =====================================================================
--
-- =====================================================================
-- VERIFY (SQL Editor — no login session needed):
--   select column_name from information_schema.columns
--   where table_schema = 'public' and table_name = 'coach_pages'
--   order by ordinal_position;
--   -- expected 11 rows: coach_id, slug, headline, bio, specialties,
--   -- is_published, created_at, updated_at,
--   -- headline_en, bio_en, specialties_en
--   --
--   -- then in the APP: coach -> صفحتي العامة -> fill the English
--   -- fields -> publish -> open /coaches/{slug} (EN) and
--   -- /ar/coaches/{slug} (AR) in a PRIVATE window -> both render,
--   -- toggle يعمل بين النسختين.
-- =====================================================================
