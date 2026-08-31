-- =====================================================================
--  MuscleHub — Allow multiple subscriptions per client
--
--  Previously: unique(client_id) constraint meant a client could only
--  have ONE subscription. This prevented combining a Coaching
--  subscription (human coach) with a Premium/Pro membership (platform
--  features).
--
--  This migration:
--    1. Drops the unique(client_id) constraint
--    2. Adds a unique(client_id, tier) constraint — allows multiple
--       subs per client as long as the tiers are different
--    3. Adds a `subscription_type` column for categorization
--       ('membership' for Premium/Pro, 'coaching' for Coaching)
--    4. Backfills existing rows with subscription_type based on tier
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
-- (We use IF EXISTS so this migration is idempotent — running it
-- twice doesn't fail.)
alter table public.subscriptions
  drop constraint if exists subscriptions_client_id_key;

-- Step 4: Add new unique(client_id, tier) constraint — allows
-- multiple subs per client as long as the tiers are different.
-- So a client can have both 'coaching' AND 'premium' but NOT two
-- 'premium' subs.
create unique index if not exists subscriptions_client_id_tier_uidx
  on public.subscriptions (client_id, tier);

-- Step 5: Add index for querying active subs by client_id
create index if not exists subscriptions_client_id_status_idx
  on public.subscriptions (client_id, status);

-- Step 6: Add index for querying by subscription_type
create index if not exists subscriptions_type_idx
  on public.subscriptions (subscription_type);
