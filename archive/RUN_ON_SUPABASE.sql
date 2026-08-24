-- =====================================================================
--  MuscleHub — Combined Pending Migrations
--
--  ⚠️ RUN THIS IN SUPABASE SQL EDITOR:
--  https://supabase.com/dashboard/project/wyopqryzfjifyeyvyxfy/sql/new
--
--  Just paste everything below and click "Run".
--  Both migrations are idempotent (safe to re-run).
-- =====================================================================

-- =====================================================================
--  Migration 0011: Allow multiple subscriptions per client
-- =====================================================================

-- Step 1: Add subscription_type column
alter table public.subscriptions
  add column if not exists subscription_type text default 'membership';

-- Step 2: Backfill existing rows
update public.subscriptions
  set subscription_type = 'coaching'
  where tier = 'coaching';

update public.subscriptions
  set subscription_type = 'membership'
  where tier in ('premium', 'pro', 'starter', 'elite')
    and subscription_type is null;

-- Step 3: Drop the old unique(client_id) constraint
alter table public.subscriptions
  drop constraint if exists subscriptions_client_id_key;

-- Step 4: Add new unique(client_id, tier) constraint
create unique index if not exists subscriptions_client_id_tier_uidx
  on public.subscriptions (client_id, tier);

-- Step 5: Add index for querying active subs by client_id
create index if not exists subscriptions_client_id_status_idx
  on public.subscriptions (client_id, status);

-- Step 6: Add index for querying by subscription_type
create index if not exists subscriptions_type_idx
  on public.subscriptions (subscription_type);


-- =====================================================================
--  Migration 0012: Rename price_egp → price_usd
-- =====================================================================

-- This is NOT idempotent (rename twice would fail),
-- but the column already has the new name in code.
-- If it fails with "column does not exist", it means
-- the migration was already applied.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'subscription_requests'
      AND column_name = 'price_egp'
  ) THEN
    ALTER TABLE public.subscription_requests RENAME COLUMN price_egp TO price_usd;
    RAISE NOTICE 'Renamed price_egp → price_usd';
  ELSE
    RAISE NOTICE 'price_egp column not found — migration 0012 may already be applied';
  END IF;
END $$;
