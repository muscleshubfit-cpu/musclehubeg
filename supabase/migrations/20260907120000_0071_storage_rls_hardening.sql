-- =====================================================================
--  Alkemos — 0071: Storage & subscriptions RLS hardening
--  (security audit 2026-09-07, applied live the same day, mirrored here)
--
--  EMERGENCY CONTEXT: a deep audit PROVED with the public anon key that
--  two legacy storage policies leaked every private bucket to anonymous
--  visitors: "Public can read photos" (SELECT for {anon,authenticated}
--  on progress-photos, questionnaire-photos, plan-pdfs, meal-plans,
--  workout-plans, receipts, ticket-attachments) and "Authenticated can
--  upload photos" (INSERT with NO ownership check). The audit enumerated
--  real receipts and a real user's questionnaire photo folder with zero
--  authentication. Separately, the subscriptions INSERT policy allowed
--  any logged-in user to self-insert tier='pro', status='active' rows
--  (free paid-membership self-activation via PostgREST).
--
--  This migration mirrors the fixes executed live on 2026-09-07 so a
--  fresh rebuild converges to the same secured state. Everything is
--  idempotent (drop-if-exists + create).
--
--  Data-only for tables (no column changes) — types.ts untouched.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1) questionnaire-photos: owner-scoped policies
--    The avatar flow (src/app/profile/page.tsx) uploads directly from
--    the browser to questionnaire-photos/<uid>/avatar-*.png and serves
--    it via the bucket's public URL (bucket stays public by design —
--    avatar URLs contain the unguessable uid). These owner policies
--    MUST exist BEFORE the broad legacy policies are dropped, or the
--    browser avatar upload breaks.
-- ---------------------------------------------------------------------
drop policy if exists "qphotos_owner_insert" on storage.objects;
create policy "qphotos_owner_insert" on storage.objects
  for insert to authenticated
  with check ((bucket_id = 'questionnaire-photos') and ((storage.foldername(name))[1] = auth.uid()::text));

drop policy if exists "qphotos_owner_update" on storage.objects;
create policy "qphotos_owner_update" on storage.objects
  for update to authenticated
  using ((bucket_id = 'questionnaire-photos') and ((storage.foldername(name))[1] = auth.uid()::text))
  with check ((bucket_id = 'questionnaire-photos') and ((storage.foldername(name))[1] = auth.uid()::text));

drop policy if exists "qphotos_owner_delete" on storage.objects;
create policy "qphotos_owner_delete" on storage.objects
  for delete to authenticated
  using ((bucket_id = 'questionnaire-photos') and ((storage.foldername(name))[1] = auth.uid()::text));

-- ---------------------------------------------------------------------
-- 2) Kill the two broad legacy storage policies (THE critical fix)
-- ---------------------------------------------------------------------
drop policy if exists "Public can read photos" on storage.objects;
drop policy if exists "Authenticated can upload photos" on storage.objects;

-- ---------------------------------------------------------------------
-- 3) subscriptions: INSERT becomes admin/service-only
--    Rows for real payments are written by the server (service role,
--    bypasses RLS) after PayPal capture + webhook verification; the
--    client-facing flow inserts subscription_requests (own-insert
--    policy, unchanged). A client-side direct INSERT of an active paid
--    row is now impossible.
-- ---------------------------------------------------------------------
drop policy if exists "subs_insert_self_or_coach" on public.subscriptions;
create policy "subs_insert_self_or_coach" on public.subscriptions
  for insert to public
  with check (is_admin());

-- ---------------------------------------------------------------------
-- 4) Bucket privacy + limits (defense in depth)
--    progress-photos: public URL serving disabled — the app already
--    displays progress photos via createSignedUrl(3600) exclusively.
--    Photo buckets: 5MB + image mimes (heic/heif included — the upload
--    route allowlists iPhone defaults). Document buckets: 10MB + pdf.
--    NOTE: enforcement applies to authenticated uploads; the service-
--    role /api/upload proxy enforces its own 5MB + MIME allowlist.
-- ---------------------------------------------------------------------
update storage.buckets set public = false where id = 'progress-photos';

update storage.buckets
  set file_size_limit = 5242880,
      allowed_mime_types = '{"image/jpeg","image/png","image/webp","image/heic","image/heif"}'::text[]
  where id in ('progress-photos', 'questionnaire-photos', 'coach-public');

update storage.buckets
  set file_size_limit = 10485760,
      allowed_mime_types = '{"image/jpeg","image/png","image/webp","application/pdf"}'::text[]
  where id in ('receipts', 'plan-pdfs', 'meal-plans', 'workout-plans', 'ticket-attachments');

-- ---------------------------------------------------------------------
-- 5) coach_presence: RLS + policies (documents the LIVE state that
--    predates this migration — created ad-hoc during Phase-5 drift
--    remediation and never captured in a migration file; mirrored
--    here so fresh environments converge. Verified live 2026-09-07.)
-- ---------------------------------------------------------------------
alter table public.coach_presence enable row level security;

drop policy if exists "coach_presence_public_read" on public.coach_presence;
create policy "coach_presence_public_read" on public.coach_presence
  for select to authenticated
  using (true);

drop policy if exists "coach_presence_owner_update" on public.coach_presence;
create policy "coach_presence_owner_update" on public.coach_presence
  for update to authenticated
  using ((auth.uid() = coach_id));

drop policy if exists "coach_presence_owner_insert" on public.coach_presence;
create policy "coach_presence_owner_insert" on public.coach_presence
  for insert to authenticated
  with check ((auth.uid() = coach_id));

-- ---------------------------------------------------------------------
-- 6) Known-remaining (documented, deliberate):
--    * _purge_backup_blog_posts / _purge_backup_blog_generation_queue —
--      RLS enabled, zero policies → deny-all for anon/authenticated
--      (service-only). Kept until the owner confirms the purge backups
--      can be dropped.
--    * blog_generation_queue / evo_anon_usage — RLS on, zero policies
--      BY DESIGN (service-only tables).
-- ---------------------------------------------------------------------
