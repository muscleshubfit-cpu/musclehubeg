-- RUN_ON_SUPABASE_0027_STORAGE_BUCKETS.sql
-- Owner audit fix (2026-08-28): /api/upload now really exists and writes to
-- Supabase Storage via the SERVICE-ROLE key, which bypasses RLS — so these
-- buckets need NO storage policies. This script is IDEMPOTENT: run it any
-- number of times safely (SQL Editor → Run all).
--
-- Buckets (all PRIVATE — objects are streamed through the authenticated
-- /api/file proxy, never public URLs):
--   questionnaire-photos : member physique photos on the nutrition questionnaire
--   progress-photos      : member progress photos (already in use — kept in sync here)
--   receipts             : membership payment receipts (already in use — kept in sync here)
--
-- If a bucket already exists, INSERT ... ON CONFLICT does nothing.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('questionnaire-photos', 'questionnaire-photos', false, 5242880,
    array['image/jpeg','image/png','image/webp','image/heic','image/heif']),
  ('progress-photos', 'progress-photos', false, 5242880,
    array['image/jpeg','image/png','image/webp','image/heic','image/heif']),
  ('receipts', 'receipts', false, 5242880,
    array['image/jpeg','image/png','image/webp','image/heic','image/heif','application/pdf'])
on conflict (id) do nothing;

-- VERIFY (should list 3 rows):
-- select id, public, file_size_limit from storage.buckets
-- where id in ('questionnaire-photos','progress-photos','receipts');
