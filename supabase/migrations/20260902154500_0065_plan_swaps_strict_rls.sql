-- ============================================================================
-- 0065 — PLAN_SWAPS STRICT RLS — IMMUTABLE USAGE LEDGER (Phase 100, 2026-09-02)
-- ============================================================================
-- Owner directive (2026-09-02):
--   «Secure the plan_swaps table. Users can only SELECT and INSERT their own
--    swap records (auth.uid() = user_id). Coaches can SELECT swap records of
--    their assigned clients (using the coach_assignments relation, just like
--    you did for progress_photos). Ensure no one can UPDATE or DELETE (since
--    it's a historical log).»
--
-- WHY THIS MATTERS:
--   plan_swaps is the tamper-proof feature-usage ledger the refund system
--   depends on (refund.ts counts swaps as burned paid features — «users
--   can't delete/forge these» is the published promise on /memberships).
--   Until now the table had RLS DISABLED (ad-hoc Phase-5-era creation,
--   deliberately left policy-less by 0063's no-blind-writes rule) — the
--   lock simply did not exist yet. This migration closes that gap.
--
-- CODE-COMPATIBILITY PROOF (audited before writing — why nothing breaks):
--   * tier-limits.ts countThisWeekSwaps()/recordSwap() → service-role admin
--     client → bypasses RLS → enforcement path untouched.
--   * refund.ts countFeatureUsageSince() → service-role admin client
--     (server-only module by contract) → refund path untouched.
--   * data/plans.ts getSwapUsage() → browser client (RLS applies) BUT it
--     ALWAYS filters .eq("user_id", <logged-in profile.id>) and PlansView
--     is its sole caller → covered by select_own; a coach viewing a
--     client's usage is covered by select_assigned_coach.
--   * ZERO .update() / .delete() calls on plan_swaps in the entire src tree
--     → the immutable-log design breaks no live code path.
--
-- DESIGN (deterministic pattern proven in 0064):
--   PART A — enable RLS + drop ANY unknown-name policies first (a leftover
--            permissive policy would void the lock even with ours added).
--   PART B — member: SELECT + INSERT own rows only. No DELETE for anyone.
--   PART C — coach: SELECT-only on assigned clients via
--            coach_assignments(client_id = plan_swaps.user_id AND
--            coach_id = auth.uid()) — the same relationship 0064 granted
--            for progress_photos.
--   PART D — immutability belt-and-braces: no UPDATE/DELETE policy exists
--            (RLS already blocks both), AND the table-level UPDATE/DELETE
--            grants are revoked from anon+authenticated so any accidental
--            attempt fails LOUDLY with "permission denied" instead of
--            silently matching 0 rows. service_role keeps its grants —
--            the server-side ledger writer keeps working.
--
-- Idempotent: safe to re-run. No data is modified or removed.
-- ============================================================================

-- ---------------------------------------------------------------
-- PART A — enable RLS + deterministic policy reset
-- ---------------------------------------------------------------
alter table public.plan_swaps enable row level security;

-- Drop ANY existing policy on this one table (deterministic end-state; the
-- table's only consumer is this app and every access the app needs is
-- recreated below in the same transaction).
do $$
declare r record;
begin
  for r in
    select policyname from pg_policies
    where schemaname = 'public' and tablename = 'plan_swaps'
  loop
    execute format('drop policy if exists %I on public.plan_swaps', r.policyname);
  end loop;
end $$;

-- ---------------------------------------------------------------
-- PART B — member: own rows, SELECT + INSERT only
-- ---------------------------------------------------------------
create policy plan_swaps_select_own on public.plan_swaps
  for select to authenticated
  using (auth.uid() = user_id);

create policy plan_swaps_insert_own on public.plan_swaps
  for insert to authenticated
  with check (auth.uid() = user_id);

-- ---------------------------------------------------------------
-- PART C — coach: read-only on assigned clients' swaps
-- ---------------------------------------------------------------
create policy plan_swaps_select_assigned_coach on public.plan_swaps
  for select to authenticated
  using (
    exists (
      select 1 from public.coach_assignments ca
      where ca.client_id = plan_swaps.user_id
        and ca.coach_id  = auth.uid()
    )
  );

-- ---------------------------------------------------------------
-- PART D — immutable historical log (no UPDATE, no DELETE — for anyone)
-- ---------------------------------------------------------------
-- RLS already blocks UPDATE/DELETE (no policy exists for either command);
-- revoking the table privileges adds a second, louder lock: an accidental
-- request fails with a clear "permission denied" instead of silently
-- affecting zero rows. Deliberately NOT revoked from service_role — the
-- server-side ledger writer (tier-limits.recordSwap) and the refund
-- counter keep working unchanged.
revoke update, delete on public.plan_swaps from anon, authenticated;

-- ---------------------------------------------------------------
-- Reload PostgREST schema cache (policies/RLS are picked up live, this
-- refreshes any cached relation metadata)
-- ---------------------------------------------------------------
notify pgrst, 'reload schema';
