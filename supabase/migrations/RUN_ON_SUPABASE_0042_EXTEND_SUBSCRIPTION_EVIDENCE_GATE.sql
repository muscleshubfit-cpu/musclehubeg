-- =====================================================================
-- RUN ON SUPABASE — 0042 EXTEND_SUBSCRIPTION EVIDENCE GATE (2026-08-30)
-- =====================================================================
-- AUDIT FOLLOW-UP TO 0041 (owner decrees 2026-08-30).
-- 0041 revoked direct INSERT/UPDATE on subscriptions — but the RPC door
-- stayed half-open: extend_subscription() (0034) lets the client's
-- ASSIGNED COACH activate ANY tier with NO wallet debit and NO
-- coach_payments ledger row. Owner decree (b): the ONLY coach door is
-- /api/coach/subscriptions/activate (service role + wallet + ledger).
-- The one legitimate coach flow outside it — approving a client's PAID
-- membership request (client submitted subscription_requests + receipt)
-- — is preserved, but now EVIDENCE-ENFORCED at DB level:
--   coach calls MUST consume an APPROVED, UNCONSUMED request matching
--   (client, tier, months) — atomically, replay-proof (consumed_at).
-- Admins / service_role unchanged (request id optional for them).
-- OVERLOAD SAFETY: the legacy 4-arg function is DROPPED — a live 4-arg
--   overload would be a ready-made bypass. Server callers are updated
--   to the 5-arg signature (p_request_id: null) in the same commit.
-- Idempotent. No tables dropped; authenticated grant preserved.
-- PASTE SAFETY: raw url only → SQL Editor → Ctrl+End must show:
--   END OF SCRIPT 0042   → Run → expect: Success. No rows returned
-- =====================================================================

-- ============================================================
-- PART 1 — consumption marker on payment requests
-- ============================================================
alter table public.subscription_requests
  add column if not exists consumed_at timestamptz;

-- ============================================================
-- PART 2 — extend_subscription(): evidence-gated rebuild (5-arg)
-- ============================================================
create or replace function public.extend_subscription(
  p_client_id uuid,
  p_tier text,
  p_months int,
  p_subscription_type text default 'membership',
  p_request_id uuid default null
)
returns public.subscriptions
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.subscriptions%rowtype;
  v_end timestamptz;
  v_months_total int;
  v_caller uuid := auth.uid();
  v_jwt_role text;
  v_req public.subscription_requests%rowtype;
begin
  -- JWT role (service_role callers = server routes with the admin key)
  begin
    v_jwt_role := coalesce(
      (current_setting('request.jwt.claims', true)::jsonb)->>'role', '');
  exception when others then
    v_jwt_role := '';
  end;

  -- ---------------------------------------------------------------
  -- 0042 GUARD — three doors, one law:
  --   1. service_role   (server routes: PayPal capture, activation)
  --   2. admin          (owner-staff manual overrides)
  --   3. assigned coach — ONLY by consuming an APPROVED, UNCONSUMED
  --      payment request matching (client, tier, months).
  --      No evidence → no activation. Replay → consumed_at blocks it.
  -- ---------------------------------------------------------------
  if coalesce(v_jwt_role, '') <> 'service_role' then
    if v_caller is null then
      raise exception 'extend_subscription: authentication required';
    end if;
    if public.is_admin() then
      null; -- trusted override
    elsif public.is_coach_over(p_client_id) then
      if p_request_id is null then
        raise exception 'extend_subscription: coaches must approve a payment request — pass p_request_id (0042)';
      end if;
      select * into v_req
      from public.subscription_requests
      where id = p_request_id
      for update;
      if not found
         or v_req.user_id <> p_client_id
         or v_req.plan_tier <> p_tier
         or v_req.duration_months <> p_months
         or v_req.status <> 'approved'
         or v_req.consumed_at is not null then
        raise exception 'extend_subscription: no valid approved payment request for this (client, tier, months) — activation refused (0042)';
      end if;
    else
      raise exception 'extend_subscription: only the client''s assigned coach (with an approved payment request) or an admin can activate subscriptions';
    end if;
  end if;

  -- Consume the evidence for ANY caller that supplied a request id
  -- (idempotent; the FOR UPDATE above already serialized coach races)
  if p_request_id is not null then
    update public.subscription_requests
    set consumed_at = now()
    where id = p_request_id and consumed_at is null;
  end if;

  -- Try to fetch existing subscription with a row lock
  select * into v_row
  from public.subscriptions
  where client_id = p_client_id and tier = p_tier
  for update;

  if found then
    -- Extend from the later of existing end_date or now
    if v_row.end_date is not null and v_row.end_date > now() then
      v_end := v_row.end_date + make_interval(months => p_months);
    else
      v_end := now() + make_interval(months => p_months);
    end if;

    v_months_total := coalesce(v_row.months, 0) + p_months;

    update public.subscriptions
    set
      end_date = v_end,
      months = v_months_total,
      status = 'active'
    where id = v_row.id
    returning * into v_row;

    return v_row;
  else
    -- New subscription
    v_end := now() + make_interval(months => p_months);

    insert into public.subscriptions
      (client_id, tier, months, start_date, end_date, status, subscription_type)
    values
      (p_client_id, p_tier, p_months, now(), v_end, 'active', p_subscription_type)
    returning * into v_row;

    return v_row;
  end if;
end;
$$;

-- ============================================================
-- PART 3 — overload demolition: the legacy 4-arg version keeps
--          the unguarded coach clause → drop it once the 5-arg
--          replacement exists
-- ============================================================
drop function if exists public.extend_subscription(uuid, text, int, text);

-- Hygiene: no implicit PUBLIC execute; authenticated explicitly granted
revoke execute on function public.extend_subscription(uuid, text, int, text, uuid) from public;
grant execute on function public.extend_subscription(uuid, text, int, text, uuid) to authenticated;

notify pgrst, 'reload schema';

-- ============================================================
-- VERIFY — ONE grid, all checks at once (0041 REV 4 style)
-- Expect: guard_present=t | consumed_at_column=t | signature_5arg=t
--         | authenticated_execute=t | legacy_overload_gone=t
-- ============================================================
select
  (select position('coaches must approve a payment request' in coalesce(pg_get_functiondef('public.extend_subscription(uuid, text, int, text, uuid)'::regprocedure), '')) > 0)
    as guard_present,

  (select exists (select 1 from pg_attribute
     where attrelid = 'public.subscription_requests'::regclass
       and attname = 'consumed_at'
       and not attisdropped))
    as consumed_at_column,

  (select cardinality(proargnames) from pg_proc
     where oid = 'public.extend_subscription(uuid, text, int, text, uuid)'::regprocedure) = 5
    as signature_5arg,

  (select has_function_privilege('authenticated',
     'public.extend_subscription(uuid, text, int, text, uuid)', 'EXECUTE'))
    as authenticated_execute,

  (select to_regprocedure('public.extend_subscription(uuid, text, int, text)') is null)
    as legacy_overload_gone;

-- END OF SCRIPT 0042
