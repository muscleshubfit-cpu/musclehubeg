-- ============================================================================
-- 0064 — PROGRESS_PHOTOS STRICT RLS + HOT-PATH INDEXES (Phase 99, 2026-09-02)
-- ============================================================================
-- Owner GO (2026-09-02): «GO! 🚀 Please execute your complete plan in one go»
-- after the Phase-2-optimizations deep analysis (three independent proofs
-- that the foods/exercise libraries are IN-CODE static files — NOT DB
-- tables — so no library indexes exist to add; the REAL unindexed hot paths
-- are the three ad-hoc Phase-5-era tables backfilled by 0063).
--
-- PART A — HOT-PATH INDEXES (mirror the app's ACTUAL query patterns):
--   * progress_photos: listPhotos() → .eq(user_id).order(taken_on desc)
--     (v2: live column is taken_at)
--   * plan_swaps:      tier-limits.getSwapUsage() →
--                      .eq(user_id).eq(swap_type).gte(created_at)
--   * coach_presence:  data/coach.ts lookups
--     (v2: live key column is coach_id — user_id does not exist live)
--   These tables were created ad-hoc OUTSIDE migrations (closed by 0063) and
--   never received the index treatment that migration-created tables got.
--
-- PART B — STRICT RLS FOR progress_photos (owner directive, Task 2):
--   1) a user can only SELECT/INSERT/DELETE his OWN rows (auth.uid()=user_id)
--      — the DELETE policy is REQUIRED: deletePhoto() is a live feature and
--      would break under RLS without it.
--      UPDATE is deliberately NOT granted: no code path updates photo rows.
--   2) coaches can SELECT photos of users assigned to them:
--      coach_assignments.client_id = progress_photos.user_id AND
--      coach_assignments.coach_id  = auth.uid()
--      (the same relationship the app already uses in MyCoachCard/CoachView).
--   Enforcement is DETERMINISTIC: any pre-existing (unknown-name) policies on
--   this ONE table are dropped first — a leftover permissive "allow all"
--   policy would void the lock even with our policies added. All statements
--   run in ONE transaction = no window where RLS is enabled with zero
--   policies visible to other sessions.
--
-- PART C — STORAGE POLICIES for the `progress-photos` bucket (ADD-ONLY):
--   Without object-level read the coach would see table rows but
--   createSignedUrl() (data/progress.ts listPhotos) would still fail.
--   Owner policy mirrors the currently-working owner-prefix behavior;
--   the coach policy is the NEW grant the owner requested.
--   Existing unknown storage.objects policies are NOT touched (no drops
--   except our own two names for idempotency).
--
-- Idempotent: safe to re-run. No data is modified or removed.
--
-- v2 CORRECTION (2026-09-03 — after the owner reported the pipeline stuck:
--   «افحص ايه المشكلة وليه متعملش ميجريشن من جيتهب ل ٠٠٦٤ الى ٠٠٦٧ واصلح
--   المشكلة» — last applied migration on production was 0063):
--   THE BLOCK: this migration's FIRST deploy failed with 42703 and halted
--   the whole pipeline — 0065/0067 never even attempted, so Phase 99/100
--   RLS never landed and Phase 103's RPC/columns were missing live (the
--   new admin pages were silently broken in production).
--   ROOT CAUSE: TWO phantom columns taken from the types.ts mirror, which
--   is WRONG for these two ad-hoc tables (0063's IF-NOT-EXISTS definitions
--   were a no-op on production — the live tables predate it with different
--   columns). Live PostgREST probe (42703/200 per column) proves:
--     * coach_presence live = id · coach_id · last_seen · updated_at
--       (NO user_id, NO status) → index now on coach_id
--     * progress_photos live = id · user_id · photo_url · taken_at ·
--       created_at (NO taken_on, NO file_path, NO note) → index now on
--       (user_id, taken_at desc)
--   ALL other references of 0064/0065/0067 were live-verified the same way
--   (plan_swaps.user_id/swap_type/created_at · coach_assignments.coach_id/
--   client_id · subscriptions.* · subscription_requests.status ·
--   profiles.* incl. is_test_account/avatar_url/phone · is_admin() RPC
--   returns 200 live) before this re-push. The mirror drift for the two
--   app surfaces (progress.ts taken_on/file_path/note, coach.ts user_id/
--   status) is recorded as Phase 104 candidates — NOT touched here.
-- ============================================================================

-- ---------------------------------------------------------------
-- PART A — hot-path indexes (v2: columns live-verified — the mirror's
--          taken_on/user_id do not exist on production; real ones are
--          taken_at/coach_id — see header note)
-- ---------------------------------------------------------------
create index if not exists idx_progress_photos_user_taken
  on public.progress_photos (user_id, taken_at desc);

create index if not exists idx_plan_swaps_user_type_created
  on public.plan_swaps (user_id, swap_type, created_at desc);

create index if not exists idx_coach_presence_coach
  on public.coach_presence (coach_id);

-- ---------------------------------------------------------------
-- PART B — strict RLS on progress_photos
-- ---------------------------------------------------------------
alter table public.progress_photos enable row level security;

-- Drop ANY existing policy on this one table (deterministic end-state; the
-- table's only consumer is this app and every access the app needs is
-- recreated below inside the same transaction).
do $$
declare r record;
begin
  for r in
    select policyname from pg_policies
    where schemaname = 'public' and tablename = 'progress_photos'
  loop
    execute format('drop policy if exists %I on public.progress_photos', r.policyname);
  end loop;
end $$;

-- 1) member: own rows only ---------------------------------------------------
create policy progress_photos_select_own on public.progress_photos
  for select to authenticated
  using (auth.uid() = user_id);

create policy progress_photos_insert_own on public.progress_photos
  for insert to authenticated
  with check (auth.uid() = user_id);

create policy progress_photos_delete_own on public.progress_photos
  for delete to authenticated
  using (auth.uid() = user_id);

-- 2) coach: read-only on assigned clients' photos ----------------------------
create policy progress_photos_select_assigned_coach on public.progress_photos
  for select to authenticated
  using (
    exists (
      select 1 from public.coach_assignments ca
      where ca.client_id = progress_photos.user_id
        and ca.coach_id  = auth.uid()
    )
  );

-- ---------------------------------------------------------------
-- PART C — storage bucket policies (progress-photos, add-only)
-- ---------------------------------------------------------------
drop policy if exists progress_photos_storage_owner on storage.objects;
create policy progress_photos_storage_owner on storage.objects
  for all to authenticated
  using (
    bucket_id = 'progress-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'progress-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists progress_photos_storage_coach on storage.objects;
create policy progress_photos_storage_coach on storage.objects
  for select to authenticated
  using (
    bucket_id = 'progress-photos'
    and exists (
      select 1 from public.coach_assignments ca
      where ca.client_id = ((storage.foldername(name))[1])::uuid
        and ca.coach_id  = auth.uid()
    )
  );

-- ---------------------------------------------------------------
-- Reload PostgREST schema cache (policies/RLS are picked up live, this
-- refreshes any cached relation metadata)
-- ---------------------------------------------------------------
notify pgrst, 'reload schema';
