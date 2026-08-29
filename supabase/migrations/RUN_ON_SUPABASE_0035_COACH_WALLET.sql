-- =====================================================================
-- RUN ON SUPABASE — 0035 COACH WALLET + TOP-UP RECEIPTS
-- (owner model: the coach pays THE SITE a monthly fixed fee per client.
--  He tops up a WALLET via InstaPay / Vodafone Cash / PayPal, uploads
--  the receipt, the ADMIN reviews and manually credits the wallet.
--  Activating a client's subscription DEBITS the wallet by
--  coach_fees.fee_per_client × months — no balance, no activation.
--  Paymob/Fawry automation = later phase.)
--
-- PASTE SAFELY:
--   1. Copy from the RAW GitHub url ONLY (never the blob page).
--   2. Supabase → SQL Editor → NEW empty query → paste.
--   3. Ctrl+End — the LAST line must be:  END OF SCRIPT 0035
--   4. Run → expect:  Success. No rows returned
-- Idempotent — safe to re-run. Prereq: 0030A, 0033, 0034.
-- =====================================================================

-- PART 1 — coach_wallets: one balance row per coach
create table if not exists public.coach_wallets (
  coach_id   uuid primary key references public.profiles(id) on delete cascade,
  balance    numeric not null default 0 check (balance >= 0),
  currency   text not null default 'EGP',
  updated_at timestamptz not null default now()
);

alter table public.coach_wallets enable row level security;

drop policy if exists coach_wallets_admin_all on public.coach_wallets;
create policy coach_wallets_admin_all
  on public.coach_wallets for all
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists coach_wallets_coach_select_own on public.coach_wallets;
create policy coach_wallets_coach_select_own
  on public.coach_wallets for select
  to authenticated
  using (coach_id = auth.uid());

-- PART 2 — coach_topup_requests: receipt → admin review
create table if not exists public.coach_topup_requests (
  id           uuid primary key default gen_random_uuid(),
  coach_id     uuid not null references public.profiles(id) on delete cascade,
  amount       numeric not null check (amount > 0),
  currency     text not null default 'EGP',
  method       text not null check (method in ('instapay','vodafone_cash','paypal')),
  receipt_path text not null,
  note         text,
  status       text not null default 'pending'
               check (status in ('pending','approved','rejected')),
  admin_note   text,
  reviewed_by  uuid references public.profiles(id) on delete set null,
  reviewed_at  timestamptz,
  created_at   timestamptz not null default now()
);

alter table public.coach_topup_requests enable row level security;

drop policy if exists coach_topups_admin_all on public.coach_topup_requests;
create policy coach_topups_admin_all
  on public.coach_topup_requests for all
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists coach_topups_coach_select_own on public.coach_topup_requests;
create policy coach_topups_coach_select_own
  on public.coach_topup_requests for select
  to authenticated
  using (coach_id = auth.uid());

drop policy if exists coach_topups_coach_insert_own on public.coach_topup_requests;
create policy coach_topups_coach_insert_own
  on public.coach_topup_requests for insert
  to authenticated
  with check (coach_id = auth.uid());

create index if not exists coach_topups_coach_idx
  on public.coach_topup_requests(coach_id, created_at desc);
create index if not exists coach_topups_status_idx
  on public.coach_topup_requests(status, created_at desc);

-- PART 3 — coach_wallet_transactions: the audit ledger
create table if not exists public.coach_wallet_transactions (
  id            uuid primary key default gen_random_uuid(),
  coach_id      uuid not null references public.profiles(id) on delete cascade,
  kind          text not null check (kind in ('topup','activation','adjust')),
  amount        numeric not null check (amount <> 0),
  balance_after numeric not null,
  ref_id        uuid,
  note          text,
  created_by    uuid,
  created_at    timestamptz not null default now()
);

alter table public.coach_wallet_transactions enable row level security;

drop policy if exists coach_wtxn_admin_all on public.coach_wallet_transactions;
create policy coach_wtxn_admin_all
  on public.coach_wallet_transactions for all
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists coach_wtxn_coach_select_own on public.coach_wallet_transactions;
create policy coach_wtxn_coach_select_own
  on public.coach_wallet_transactions for select
  to authenticated
  using (coach_id = auth.uid());

create index if not exists coach_wtxn_coach_idx
  on public.coach_wallet_transactions(coach_id, created_at desc);

-- PART 4 — coach_adjust_wallet(): the ONLY wallet writer
-- Atomic credit/debit with a row lock. p_amount is SIGNED:
--   +500 top-up credit · −150 activation debit · ±any admin adjust.
-- Raises 'insufficient wallet balance' if a debit would go below 0.
-- Caller must be the service role (server routes) or an admin.
create or replace function public.coach_adjust_wallet(
  p_coach_id   uuid,
  p_amount     numeric,
  p_kind       text,
  p_ref_id     uuid default null,
  p_note       text default null,
  p_created_by uuid default null
)
returns numeric
language plpgsql
security definer
set search_path = public
as $$
declare
  v_amount   numeric;
  v_balance  numeric;
  v_new      numeric;
begin
  if coalesce((current_setting('request.jwt.claims', true)::jsonb)->>'role', '')
     <> 'service_role'
   and not public.is_admin() then
    raise exception 'coach_adjust_wallet: service role or admin only';
  end if;

  if p_kind not in ('topup','activation','adjust') then
    raise exception 'coach_adjust_wallet: unknown kind';
  end if;

  v_amount := round(p_amount::numeric, 2);
  if v_amount is null or v_amount = 0 then
    raise exception 'coach_adjust_wallet: amount must not be zero';
  end if;

    insert into public.coach_wallets (coach_id) values (p_coach_id)
  on conflict (coach_id) do nothing;

  select balance into v_balance
  from public.coach_wallets
  where coach_id = p_coach_id
  for update;

  v_new := v_balance + v_amount;
  if v_new < 0 then
    raise exception 'insufficient wallet balance';
  end if;

  update public.coach_wallets
  set balance = v_new, updated_at = now()
  where coach_id = p_coach_id;

  insert into public.coach_wallet_transactions
    (coach_id, kind, amount, balance_after, ref_id, note, created_by)
  values
    (p_coach_id, p_kind, v_amount, v_new, p_ref_id, p_note, p_created_by);

  return v_new;
end;
$$;

-- PART 5 — reload PostgREST schema cache
notify pgrst, 'reload schema';

-- ============================================================
-- VERIFY (run separately): the 3 tables count = 0 correct.
-- Negative test (plain coach — must FAIL):
--   select public.coach_adjust_wallet(auth.uid(), 100, 'topup');
-- ============================================================

-- END OF SCRIPT 0035
