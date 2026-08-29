-- =====================================================================
-- RUN ON SUPABASE — 0034 COACH ACTIVATION + PAYMENTS LEDGER
-- (owner model: the coach collects payment from his client OUTSIDE the
--  site — cash / Vodafone Cash / InstaPay — then activates the client's
--  subscription himself; the site records WHO activated WHAT for WHOM.
--  Coach AI quotas (4 nutrition + 4 workout per client) are enforced in
--  app code by counting completed ai_jobs — no DB counter needed.)
--
-- HOW TO PASTE SAFELY:
--   1. Copy from the RAW GitHub url ONLY (never the GitHub blob page).
--   2. Supabase → SQL Editor → NEW empty query → paste.
--   3. Press Ctrl+End — the LAST line must be:  END OF SCRIPT 0034
--   4. Run → expect:  Success. No rows returned
-- Idempotent — safe to re-run. No tables dropped, no RLS removed.
-- Prereq: 0018 (extend_subscription), 0030A (coach_assignments), 0033.
-- =====================================================================

-- ============================================================
-- PART 1 — extend_subscription(): CALLER GUARD (security fix)
-- ============================================================
-- Until 0034 ANY authenticated user could call this SECURITY DEFINER
-- RPC for ANY client (free self-upgrade hole). From 0034 only these
-- may activate/extend a subscription:
--   1. server code using the service-role key (PayPal capture/webhook,
--      the new /api/coach/subscriptions/activate route)
--   2. an ADMIN
--   3. the client's ASSIGNED COACH (coach_assignments)
-- Everyone else gets an exception. The 0018 extension math
-- (preserve remaining paid days, row lock) is unchanged.
create or replace function public.extend_subscription(
  p_client_id uuid,
  p_tier text,
  p_months int,
  p_subscription_type text default 'membership'
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
  v_caller uuid;
  v_claims text;
  v_jwt_role text;
begin
  -- ---- 0034 guard: who is calling? --------------------------------
  v_caller := auth.uid();
  v_claims := current_setting('request.jwt.claims', true);
  v_jwt_role := '';
  if v_claims is not null and btrim(v_claims) <> '' then
    begin
      v_jwt_role := coalesce((v_claims::jsonb)->>'role', '');
    exception when others then
      v_jwt_role := '';
    end;
  end if;

  if coalesce(v_jwt_role, '') <> 'service_role' then
    if v_caller is null then
      raise exception 'extend_subscription: authentication required';
    end if;
    if not public.is_admin()
       and not exists (
         select 1 from public.coach_assignments ca
         where ca.client_id = p_client_id
           and ca.coach_id = v_caller
       ) then
      raise exception 'extend_subscription: only the client''s assigned coach or an admin can activate subscriptions';
    end if;
  end if;
  -- -----------------------------------------------------------------

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
-- PART 2 — coach_payments: the offline-payment ledger
-- ============================================================
-- One row per coach activation: the coach took the payment OUTSIDE
-- the site (cash / Vodafone Cash / InstaPay / bank transfer) and
-- pressed «تفعيل». Admin audits everything; the client sees the
-- receipt note on his own subscription.
create table if not exists public.coach_payments (
  id              uuid primary key default gen_random_uuid(),
  coach_id        uuid not null references public.profiles(id) on delete cascade,
  client_id       uuid not null references public.profiles(id) on delete cascade,
  subscription_id uuid references public.subscriptions(id) on delete set null,
  tier            text not null,
  months          int not null check (months between 1 and 24),
  amount          numeric check (amount is null or amount >= 0),
  currency        text not null default 'EGP',
  method          text not null default 'cash'
                  check (method in ('cash','vodafone_cash','instapay','bank_transfer','other')),
  note            text,
  created_at      timestamptz not null default now()
);

alter table public.coach_payments enable row level security;

drop policy if exists coach_payments_admin_all on public.coach_payments;
create policy coach_payments_admin_all
  on public.coach_payments for all
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists coach_payments_coach_select_own on public.coach_payments;
create policy coach_payments_coach_select_own
  on public.coach_payments for select
  to authenticated
  using (coach_id = auth.uid());

drop policy if exists coach_payments_client_select_own on public.coach_payments;
create policy coach_payments_client_select_own
  on public.coach_payments for select
  to authenticated
  using (client_id = auth.uid());

drop policy if exists coach_payments_coach_insert_own_client on public.coach_payments;
create policy coach_payments_coach_insert_own_client
  on public.coach_payments for insert
  to authenticated
  with check (
    coach_id = auth.uid()
    and public.coach_of(client_id) = auth.uid()
  );

create index if not exists coach_payments_client_idx
  on public.coach_payments(client_id);
create index if not exists coach_payments_coach_idx
  on public.coach_payments(coach_id, created_at desc);

-- ============================================================
-- PART 3 — reload PostgREST schema cache
-- ============================================================
notify pgrst, 'reload schema';

-- ============================================================
-- VERIFY (run separately after the script succeeds)
--   select proname from pg_proc where proname='extend_subscription';
--   select count(*) from public.coach_payments;   -- 0 rows is correct
-- Negative test (as a normal client, should FAIL with our message):
--   select public.extend_subscription('<some-other-client-uuid>','premium',1);
-- ============================================================

-- END OF SCRIPT 0034
