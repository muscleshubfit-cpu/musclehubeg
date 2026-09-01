-- 0062 — 7-DAY REFUND SYSTEM + AFFILIATE EARNINGS SAFETY HOLD
-- ============================================================
-- Owner request (2026-09-01):
--   «فى نقطة الغاء الاشتراكات واسترجاع الفلوس خلال ٧ ايام يكون فى شرط
--    عدم استخدام المميزات، وكذلك فى سحب الارباح من الافيليت لازم نراعى
--    نقطة الغاء الاشتراكات»
--
-- Two halves:
--   A) refund_requests — the backing system for the promise already
--      published on /memberships («استرداد كامل خلال 7 أيام من تفعيل
--      الاشتراك، بشرط عدم استخدام أي ميزة مدفوعة»). Eligibility itself
--      is computed SERVER-SIDE (src/lib/refund.ts) from the tamper-proof
--      usage ledgers; this table stores the request + the usage snapshot
--      the admin sees when approving.
--   B) referral_earnings.available_at — commissions earned from
--      subscription payments are HELD for 7 days (the refund window).
--      If the referred member cancels + gets refunded inside the window,
--      the commission is reversed BEFORE it can ever be withdrawn.
--      Balance + payout FIFO now count only rows whose available_at has
--      passed (see src/lib/referral.ts).

-- ─────────────────────────────────────────────────────────────
-- A) refund_requests
-- ─────────────────────────────────────────────────────────────
create table if not exists public.refund_requests (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references public.profiles(id) on delete cascade,
  subscription_id   uuid references public.subscriptions(id) on delete set null,
  tier              text not null,
  months            integer,
  amount_usd        numeric(10, 2),
  payment_reference text,
  payment_source    text,
  status            text not null default 'pending'
                    check (status in ('pending', 'approved', 'rejected')),
  admin_note        text,
  usage_snapshot    jsonb,
  created_at        timestamptz not null default now(),
  processed_at      timestamptz
);

alter table public.refund_requests enable row level security;

-- Members may SEE their own request's state (the API writes with the
-- service role after server-side eligibility checks — no INSERT/UPDATE
-- policies on purpose, mirroring the subscriptions table law 0041).
drop policy if exists "refund_requests_select_own" on public.refund_requests;
create policy "refund_requests_select_own"
  on public.refund_requests for select
  to authenticated
  using (auth.uid() = user_id);

create index if not exists idx_refund_requests_user
  on public.refund_requests (user_id);
create index if not exists idx_refund_requests_status
  on public.refund_requests (status, created_at desc);

-- ─────────────────────────────────────────────────────────────
-- B) referral_earnings.available_at (7-day safety hold)
-- ─────────────────────────────────────────────────────────────
alter table public.referral_earnings
  add column if not exists available_at timestamptz not null default now();

-- Backfill: subscription commissions created LESS than 7 days ago stay
-- held until created_at + 7d; everything else (older commissions,
-- one-time/coach activations, clawback rows) becomes available now.
update public.referral_earnings
   set available_at = case
         when transaction_type in ('subscription_initial', 'subscription_renewal')
              and created_at > now() - interval '7 days'
         then created_at + interval '7 days'
         else created_at
       end
 where available_at = now()
   and created_at is not null;
