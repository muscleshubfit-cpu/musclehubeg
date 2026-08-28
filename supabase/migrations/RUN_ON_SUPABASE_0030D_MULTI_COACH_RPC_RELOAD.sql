-- =====================================================================
-- RUN_ON_SUPABASE_0030D_MULTI_COACH_RPC_RELOAD.sql   (PART 4 of 4 — LAST)
-- =====================================================================
-- RUN ORDER (strict):  0030A -> 0030B -> 0030C -> 0030D
-- D = get_coach_client_list() rebuilt (plain coach -> ONLY his clients;
--     admin -> all + assigned_coach_id / assigned_coach_name for the
--     reassignment UI) + NOTIFY pgrst 'reload schema' so the Supabase
--     API picks up everything A/B/C changed.
--
-- PREREQ: 0030A (coach_assignments). This is the FINAL part — after it
-- succeeds the multi-coach foundation is fully applied.
-- Idempotent: safe to re-run.
--
-- HOW TO PASTE: RAW url -> Ctrl+A, Ctrl+C -> NEW empty query -> paste
-- -> Ctrl+End -> see "END OF SCRIPT 0030D" -> Run -> "Success. No rows
-- returned".
--
-- RAW (this part D):
-- https://raw.githubusercontent.com/muscleshubfit-cpu/musclehubeg/main/supabase/migrations/RUN_ON_SUPABASE_0030D_MULTI_COACH_RPC_RELOAD.sql
-- =====================================================================

-- ============================================================
-- PART 8 — get_coach_client_list(): scoped + assignment columns
-- ============================================================
-- Plain coach → ONLY his assigned clients.
-- Admin → ALL clients + who they are assigned to (for reassignment UI).
-- Return type changes → DROP then CREATE (OR REPLACE cannot widen).
drop function if exists public.get_coach_client_list();

create function public.get_coach_client_list()
returns table (
  client_id uuid,
  client_email text,
  client_full_name text,
  client_phone text,
  client_avatar_url text,
  client_created_at timestamptz,
  sub_tier text,
  sub_status text,
  sub_end_date timestamptz,
  sub_months int,
  pending_payments int,
  nutri_q_status text,
  fit_q_status text,
  assigned_coach_id uuid,
  assigned_coach_name text
)
language sql
security definer
set search_path = public
as $$
  select
    p.id,
    p.email,
    p.full_name,
    p.phone,
    p.avatar_url,
    p.created_at,

    -- Latest active subscription (pro > premium > coaching)
    (
      select s.tier
      from public.subscriptions s
      where s.client_id = p.id
      order by
        case s.tier
          when 'pro' then 3
          when 'premium' then 2
          when 'coaching' then 1
          else 0
        end desc,
        s.created_at desc
      limit 1
    ),

    (
      select s.status
      from public.subscriptions s
      where s.client_id = p.id
      order by s.created_at desc
      limit 1
    ),

    (
      select s.end_date
      from public.subscriptions s
      where s.client_id = p.id
      order by s.created_at desc
      limit 1
    ),

    (
      select s.months
      from public.subscriptions s
      where s.client_id = p.id
      order by s.created_at desc
      limit 1
    ),

    (
      select count(*)
      from public.subscription_requests sr
      where sr.user_id = p.id and sr.status = 'pending'
    )::int,

    (
      select nq.status
      from public.nutrition_questionnaires nq
      where nq.client_id = p.id
      limit 1
    ),

    (
      select fq.status
      from public.fitness_questionnaires fq
      where fq.client_id = p.id
      limit 1
    ),

    ca.coach_id,
    cp.full_name

  from public.profiles p
  left join public.coach_assignments ca on ca.client_id = p.id
  left join public.profiles cp on cp.id = ca.coach_id
  where p.role = 'client'
    and (public.is_admin() or ca.coach_id = auth.uid())
  order by p.created_at desc
$$;

grant execute on function public.get_coach_client_list() to authenticated;

-- ============================================================
-- PART 9 — PostgREST schema reload
-- ============================================================
notify pgrst, 'reload schema';

-- =====================================================================
-- ===== END OF SCRIPT 0030D — multi-coach foundation FULLY applied
-- ===== (A -> B -> C -> D all succeeded).
-- =====================================================================
--
-- =====================================================================
-- VERIFY — OPTION 1 (SQL Editor, works WITHOUT any login session):
--   select count(*) as assigned_clients from public.coach_assignments;
--     expected: one row per existing client
--   select p.email as client_email, p.full_name as client_name,
--          c.full_name as assigned_coach_name, c.role as coach_role
--   from public.coach_assignments a
--   join public.profiles p on p.id = a.client_id
--   join public.profiles c on c.id = a.coach_id
--   order by a.created_at desc;
--     expected: every client with the admin's name + role 'admin'
--
-- VERIFY — OPTION 2 (simulate the ADMIN session — exactly what the
-- app sees; paste the WHOLE block and Run it as one):
--   begin;
--   select set_config('request.jwt.claim.sub',
--     (select id::text from public.profiles
--      where role = 'admin' limit 1), true);
--   select set_config('request.jwt.claims',
--     json_build_object('sub', (select id::text from public.profiles
--       where role = 'admin' limit 1),
--       'role', 'authenticated')::text, true);
--   select client_email, assigned_coach_name
--   from public.get_coach_client_list();
--   commit;
--     expected: ALL clients, each with the admin's name
--   NOTE: calling get_coach_client_list() WITHOUT this simulated
--   session returns 0 rows in the SQL Editor (auth.uid() is null
--   there) — correct behavior, NOT a bug.
--
-- VERIFY — OPTION 3 (real world): open the coach clients page in the
-- app AS the admin -> all clients + their assigned coach are shown.
-- =====================================================================
