-- ============================================================================
-- 0057 — AFFILIATE FOUNDATION (Phase 65, approved by owner 2026-09-01)
-- ============================================================================
-- Context (Phase 64 study findings, verified live on production):
--   1. affiliate_transactions / affiliate_commissions were NEVER applied to
--      production (RUN_ON_SUPABASE_ORIGINAL_0015 was excluded from the
--      auto-apply pipeline by design) → every commission attempt failed
--      silently. Ported here 1:1 with the owner-approved extensions.
--   2. referrals INSERT policy (restore 20260901120000) requires
--      auth.uid() = referrer_id, but tracking ran in the NEW user's session
--      with referrer_id = the INVITER → silent RLS failure, 0 referrals rows.
--      Fixed by (a) a SECURITY DEFINER signup trigger that records the
--      referral server-side from auth.users.raw_user_meta_data.referral_code
--      and (b) widening the INSERT policy so a new user may record his own
--      referral (referred_id = auth.uid()).
--   3. Owner decree (2026-09-01, supersedes scope of the 2026-08-30 decree):
--      a referred COACH is now part of the affiliate system — every CLIENT
--      ACTIVATION he pays for ($6 / $16 wallet debit) earns his inviter a
--      20% commission (type coach_client_activation). The 2026-08-30 decree
--      «عميل المدرب لا يُحسب» REMAINS in force for plain clients who have a
--      coach (their payments still never generate commission for anyone).
--   4. Cancel flow: subscriptions.cancel_requested_at lets a member request
--      cancellation from his account page (access kept until end_date;
--      admin acts on the request). Column only — writes go through the
--      service-role API (0041 keeps direct UPDATE admin-only).
-- All statements idempotent — safe to re-run.
-- ============================================================================

-- ============================================================
-- 1. affiliate_transactions — verified paid transactions
--    (port of 0015 §1 + NEW type coach_client_activation)
-- ============================================================
create table if not exists public.affiliate_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  -- The affiliate (referrer) who should receive commission for this transaction
  affiliate_user_id uuid references public.profiles(id) on delete set null,
  transaction_type text not null check (transaction_type in (
    'subscription_initial',
    'subscription_renewal',
    'one_time_product',
    'one_time_service',
    'coach_client_activation'
  )),
  amount numeric(10,2) not null,
  currency text not null default 'USD',
  external_reference text,
  product_id text,
  affiliate_eligible boolean not null default true,
  status text not null default 'completed' check (status in (
    'completed',
    'refunded',
    'reversed',
    'pending'
  )),
  metadata jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_aff_txn_user on public.affiliate_transactions(user_id);
create index if not exists idx_aff_txn_affiliate on public.affiliate_transactions(affiliate_user_id);
create index if not exists idx_aff_txn_type on public.affiliate_transactions(transaction_type);
create index if not exists idx_aff_txn_status on public.affiliate_transactions(status);
create index if not exists idx_aff_txn_reference on public.affiliate_transactions(external_reference);
-- Idempotency: one transaction per external reference + type
create unique index if not exists uq_aff_txn_reference
  on public.affiliate_transactions(external_reference, transaction_type)
  where external_reference is not null;

-- ============================================================
-- 2. affiliate_commissions — idempotent commission records
--    (port of 0015 §2 + NEW type coach_client_activation)
-- ============================================================
create table if not exists public.affiliate_commissions (
  id uuid primary key default gen_random_uuid(),
  affiliate_user_id uuid not null references public.profiles(id) on delete cascade,
  transaction_id uuid not null references public.affiliate_transactions(id) on delete cascade,
  referral_id uuid references public.referrals(id) on delete set null,
  commission_type text not null check (commission_type in (
    'subscription_initial',
    'subscription_renewal',
    'one_time_product',
    'one_time_service',
    'coach_client_activation'
  )),
  amount numeric(10,2) not null,
  rate numeric(5,4) not null default 0.2000,
  status text not null default 'available' check (status in (
    'pending',
    'available',
    'requested',
    'paid',
    'reversed'
  )),
  reversed_at timestamptz,
  reversal_reason text,
  earning_id uuid references public.referral_earnings(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_aff_comm_affiliate on public.affiliate_commissions(affiliate_user_id);
create index if not exists idx_aff_comm_status on public.affiliate_commissions(status);
create index if not exists idx_aff_comm_type on public.affiliate_commissions(commission_type);
create index if not exists idx_aff_comm_transaction on public.affiliate_commissions(transaction_id);
-- Idempotency: ONE commission per transaction
create unique index if not exists uq_aff_comm_transaction
  on public.affiliate_commissions(transaction_id);

-- ============================================================
-- 3. referral_earnings: transaction linkage (port of 0015 §3,
--    never applied — columns are missing in production)
-- ============================================================
alter table public.referral_earnings
  add column if not exists affiliate_commission_id uuid
  references public.affiliate_commissions(id) on delete set null;

alter table public.referral_earnings
  add column if not exists transaction_type text
  check (
    transaction_type is null
    or transaction_type in (
      'subscription_initial',
      'subscription_renewal',
      'one_time_product',
      'one_time_service',
      'coach_client_activation'
    )
  );

-- ============================================================
-- 4. RLS on the new tables
--    (port of 0015 §4 + admin read for /admin/referrals)
-- ============================================================
alter table public.affiliate_transactions enable row level security;
alter table public.affiliate_commissions enable row level security;

drop policy if exists "aff_txn_select_own" on public.affiliate_transactions;
create policy "aff_txn_select_own" on public.affiliate_transactions
  for select to authenticated
  using (user_id = auth.uid() or affiliate_user_id = auth.uid());

drop policy if exists "aff_comm_select_own" on public.affiliate_commissions;
create policy "aff_comm_select_own" on public.affiliate_commissions
  for select to authenticated
  using (affiliate_user_id = auth.uid());

drop policy if exists "aff_txn_select_coach" on public.affiliate_transactions;
create policy "aff_txn_select_coach" on public.affiliate_transactions
  for select to authenticated
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
        and profiles.role = 'coach'
    )
  );

drop policy if exists "aff_comm_select_coach" on public.affiliate_commissions;
create policy "aff_comm_select_coach" on public.affiliate_commissions
  for select to authenticated
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
        and profiles.role = 'coach'
    )
  );

-- Admin must read both tables in /admin/referrals (engine writes are
-- service-role only — there is intentionally NO authenticated INSERT/UPDATE)
drop policy if exists "aff_txn_select_admin" on public.affiliate_transactions;
create policy "aff_txn_select_admin" on public.affiliate_transactions
  for select to authenticated
  using (public.is_admin());

drop policy if exists "aff_comm_select_admin" on public.affiliate_commissions;
create policy "aff_comm_select_admin" on public.affiliate_commissions
  for select to authenticated
  using (public.is_admin());

-- Service role (server-side engine) has full access
drop policy if exists "aff_txn_service_role" on public.affiliate_transactions;
create policy "aff_txn_service_role" on public.affiliate_transactions
  for all using (auth.role() = 'service_role');

drop policy if exists "aff_comm_service_role" on public.affiliate_commissions;
create policy "aff_comm_service_role" on public.affiliate_commissions
  for all using (auth.role() = 'service_role');

-- ============================================================
-- 5. updated_at triggers (port of 0015 §6)
-- ============================================================
create or replace function public.update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_aff_txn_updated on public.affiliate_transactions;
create trigger trg_aff_txn_updated
  before update on public.affiliate_transactions
  for each row execute function public.update_updated_at();

drop trigger if exists trg_aff_comm_updated on public.affiliate_commissions;
create trigger trg_aff_comm_updated
  before update on public.affiliate_commissions
  for each row execute function public.update_updated_at();

-- ============================================================
-- 6. SERVER-SIDE REFERRAL TRACKING AT SIGNUP
--    Reads raw_user_meta_data.referral_code (set by signUp options on the
--    client-signup path and by admin.createUser on the coach-register path)
--    and records the referral with SECURITY DEFINER — no browser RLS
--    failure possible. Self-referral stays allowed (owner's earlier ruling).
-- ============================================================
create or replace function public.track_referral_on_signup()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  v_code text;
  v_referrer uuid;
begin
  select coalesce(u.raw_user_meta_data ->> 'referral_code', '')
    into v_code
    from auth.users u
    where u.id = new.id;

  if v_code is null or v_code = '' then
    return new;
  end if;

  select p.id into v_referrer
    from public.profiles p
    where p.referral_code = v_code;

  if v_referrer is null then
    return new; -- unknown code → silently skip (same as legacy trackReferral)
  end if;

  -- One referral per referred user, ever (first link wins)
  if exists (select 1 from public.referrals r where r.referred_id = new.id) then
    return new;
  end if;

  insert into public.referrals
    (referrer_id, referred_id, referred_email, referral_code, status, commission_amount)
  values
    (v_referrer, new.id, new.email, v_code, 'pending', 0);

  return new;
end;
$$;

drop trigger if exists trg_profiles_referral_track on public.profiles;
create trigger trg_profiles_referral_track
  after insert on public.profiles
  for each row execute function public.track_referral_on_signup();

-- Belt-and-suspenders: the NEW user may record his own referral row
-- (referrer_id = the inviter) — closes the legacy browser path too
drop policy if exists referrals_insert_coach on public.referrals;
create policy referrals_insert_coach
  on public.referrals for insert
  to authenticated
  with check (
    public.is_admin()
    or auth.uid() = referrer_id
    or auth.uid() = referred_id
  );

-- ============================================================
-- 7. Cancel-request column (Phase 68 — account-page cancellation)
--    Client SELECT own rows already exists (0041 subs_select_owner_or_coach)
--    so the profile page can read it; writes are service-role only.
-- ============================================================
alter table public.subscriptions
  add column if not exists cancel_requested_at timestamptz;

-- ============================================================
-- 8. Reload PostgREST schema cache (new tables + columns must be visible
--    to the REST layer immediately)
-- ============================================================
notify pgrst, 'reload schema';
