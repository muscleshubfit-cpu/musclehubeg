-- 0015_affiliate_engine.sql
-- Affiliate Engine Foundation: Transaction-level commission abstraction
--
-- This migration introduces:
--   1. affiliate_transactions — generic paid-transaction records
--   2. affiliate_commissions — idempotent commission records with types
--   3. Unique constraints for idempotency (one commission per transaction)
--   4. Reversal support (status='reversed')
--   5. Extends referral_earnings with transaction linkage
--
-- Design principles:
--   - Payment-provider agnostic (no Stripe/PayPal-specific fields)
--   - Supports: subscription_initial, subscription_renewal, one_time_product, one_time_service
--   - Idempotent: unique constraint prevents duplicate commissions per transaction
--   - Reversible: commission can be 'reversed' when payment is refunded
--   - Backward compatible: existing referral_earnings rows are unaffected
--
-- NOTE: This migration has already been applied to the production Supabase
-- database (https://supabase.com/dashboard/project/wyopqryzfjifyeyvyxfy).
-- The SQL file is committed here for reproducibility on fresh clones and
-- for new Supabase environments. All statements use IF NOT EXISTS so the
-- migration is fully idempotent — safe to re-run.

-- ============================================================
-- 1. affiliate_transactions — records of verified paid transactions
-- ============================================================
create table if not exists public.affiliate_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  -- The affiliate (referrer) who should receive commission for this transaction.
  -- Looked up from referrals table at transaction creation time.
  affiliate_user_id uuid references public.profiles(id) on delete set null,
  -- Transaction type: distinguishes initial vs renewal vs one-time
  transaction_type text not null check (transaction_type in (
    'subscription_initial',
    'subscription_renewal',
    'one_time_product',
    'one_time_service'
  )),
  -- Amount paid (USD)
  amount numeric(10,2) not null,
  -- Currency (for future multi-currency support)
  currency text not null default 'USD',
  -- External reference: subscription_request_id, Stripe charge ID, etc.
  -- For current manual payments: subscription_request_id UUID
  -- For future Stripe: charge_xxxxx or sub_xxxxx
  external_reference text,
  -- Product/plan identifier: 'premium', 'pro', 'coaching', or future product SKU
  product_id text,
  -- Whether this transaction is affiliate-eligible
  -- Default true for paid transactions; false for free/cancelled
  affiliate_eligible boolean not null default true,
  -- Transaction status
  status text not null default 'completed' check (status in (
    'completed',    -- payment verified, commission should be generated
    'refunded',     -- payment refunded, commission should be reversed
    'reversed',     -- transaction reversed (chargeback, dispute)
    'pending'       -- payment pending verification (no commission yet)
  )),
  -- Metadata (JSONB) for extensibility
  metadata jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Indexes
create index if not exists idx_aff_txn_user on public.affiliate_transactions(user_id);
create index if not exists idx_aff_txn_affiliate on public.affiliate_transactions(affiliate_user_id);
create index if not exists idx_aff_txn_type on public.affiliate_transactions(transaction_type);
create index if not exists idx_aff_txn_status on public.affiliate_transactions(status);
create index if not exists idx_aff_txn_reference on public.affiliate_transactions(external_reference);
-- Prevent duplicate transactions for the same external reference + type
create unique index if not exists uq_aff_txn_reference
  on public.affiliate_transactions(external_reference, transaction_type)
  where external_reference is not null;

-- ============================================================
-- 2. affiliate_commissions — idempotent commission records
-- ============================================================
create table if not exists public.affiliate_commissions (
  id uuid primary key default gen_random_uuid(),
  -- The affiliate who earns this commission
  affiliate_user_id uuid not null references public.profiles(id) on delete cascade,
  -- The transaction that triggered this commission
  transaction_id uuid not null references public.affiliate_transactions(id) on delete cascade,
  -- Link to existing referrals table (for audit trail)
  referral_id uuid references public.referrals(id) on delete set null,
  -- Commission type matches transaction type
  commission_type text not null check (commission_type in (
    'subscription_initial',
    'subscription_renewal',
    'one_time_product',
    'one_time_service'
  )),
  -- Commission amount (20% of transaction amount by default)
  amount numeric(10,2) not null,
  -- Commission rate used (for audit)
  rate numeric(5,4) not null default 0.2000,
  -- Commission status lifecycle
  status text not null default 'available' check (status in (
    'pending',      -- created but not yet available (holding period)
    'available',    -- available for payout
    'requested',    -- user requested payout
    'paid',         -- paid out to affiliate
    'reversed'      -- reversed due to refund/cancellation
  )),
  -- Reversal tracking
  reversed_at timestamptz,
  reversal_reason text,
  -- Link to referral_earnings for payout system integration
  -- (null for new commissions; populated when earning is created)
  earning_id uuid references public.referral_earnings(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Indexes
create index if not exists idx_aff_comm_affiliate on public.affiliate_commissions(affiliate_user_id);
create index if not exists idx_aff_comm_status on public.affiliate_commissions(status);
create index if not exists idx_aff_comm_type on public.affiliate_commissions(commission_type);
create index if not exists idx_aff_comm_transaction on public.affiliate_commissions(transaction_id);

-- IDEMPOTENCY: one commission per transaction (prevents duplicates)
-- This is the critical constraint — even if the code tries to create
-- a duplicate commission, the database will reject it.
create unique index if not exists uq_aff_comm_transaction
  on public.affiliate_commissions(transaction_id);

-- ============================================================
-- 3. Extend referral_earnings with transaction linkage
-- ============================================================
-- Add a column to link earnings back to affiliate_commissions
-- (nullable for backward compatibility with existing rows)
alter table public.referral_earnings
  add column if not exists affiliate_commission_id uuid
  references public.affiliate_commissions(id) on delete set null;

-- Add transaction_type to earnings for dashboard filtering
-- Existing rows are NULL; CHECK passes on NULL automatically.
alter table public.referral_earnings
  add column if not exists transaction_type text
  check (
    transaction_type is null
    or transaction_type in (
      'subscription_initial',
      'subscription_renewal',
      'one_time_product',
      'one_time_service'
    )
  );

-- ============================================================
-- 4. RLS Policies
-- ============================================================
alter table public.affiliate_transactions enable row level security;
alter table public.affiliate_commissions enable row level security;

-- Users can read their own transactions and commissions
drop policy if exists "aff_txn_select_own" on public.affiliate_transactions;
create policy "aff_txn_select_own" on public.affiliate_transactions
  for select using (user_id = auth.uid() or affiliate_user_id = auth.uid());

drop policy if exists "aff_comm_select_own" on public.affiliate_commissions;
create policy "aff_comm_select_own" on public.affiliate_commissions
  for select using (affiliate_user_id = auth.uid());

-- Coaches can read all (via existing coach RLS pattern)
drop policy if exists "aff_txn_select_coach" on public.affiliate_transactions;
create policy "aff_txn_select_coach" on public.affiliate_transactions
  for select using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
      and profiles.role = 'coach'
    )
  );

drop policy if exists "aff_comm_select_coach" on public.affiliate_commissions;
create policy "aff_comm_select_coach" on public.affiliate_commissions
  for select using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
      and profiles.role = 'coach'
    )
  );

-- Service role (server-side) has full access
drop policy if exists "aff_txn_service_role" on public.affiliate_transactions;
create policy "aff_txn_service_role" on public.affiliate_transactions
  for all using (auth.role() = 'service_role');

drop policy if exists "aff_comm_service_role" on public.affiliate_commissions;
create policy "aff_comm_service_role" on public.affiliate_commissions
  for all using (auth.role() = 'service_role');

-- ============================================================
-- 5. Update existing referral_earnings RLS for new columns
-- ============================================================
-- The existing earnings_select_own policy already covers SELECT.
-- No changes needed — the new columns are nullable and inherit
-- the existing RLS policy automatically.

-- ============================================================
-- 6. Add updated_at triggers
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
