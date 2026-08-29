-- ============================================================ 0038 ======
-- GLOBAL USD (owner decree 2026-08-30):
--   «التسعير يكون كله بالدولار لكامل الموقع لأن الموقع عالمى وغير محدد
--    لمصر — احسب فرق سعر العملة، مثلا ٣٠٠ جنيه تصبح ٦ دولار وهكذا»
--   Fixed owner rate: 50 EGP = $1.
--   A) coach_ads.price_egp → price_usd (column rename)
--   B) All stored currency values flip 'EGP' → 'USD'
--      (coach_wallets, coach_topup_requests, coach_fees)
--   C) Existing EGP amounts convert to USD at ÷50 — ONCE:
--      coach_wallets.balance, coach_topup_requests.amount,
--      coach_wallet_transactions.amount + balance_after,
--      coach_fees.fee_per_client
-- Idempotent: the conversion + rename run ONLY when price_egp still
-- exists, so re-running this file can never halve values twice.
-- Run via raw link in Supabase SQL editor. END OF SCRIPT 0038
-- =========================================================================

-- PART A+B+C — one-shot guarded block -------------------------------------
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'coach_ads'
      and column_name = 'price_egp'
  ) then
    -- C) Convert existing EGP amounts to USD at the owner rate (÷50).
    update public.coach_wallets
      set balance = round(balance / 50.0, 2);
    update public.coach_topup_requests
      set amount = round(amount / 50.0, 2);
    update public.coach_wallet_transactions
      set amount = round(amount / 50.0, 2),
          balance_after = round(balance_after / 50.0, 2);
    update public.coach_fees
      set fee_per_client = round(fee_per_client / 50.0, 2);

    -- B) Flip every stored currency marker to USD.
    update public.coach_wallets set currency = 'USD' where currency <> 'USD';
    update public.coach_topup_requests set currency = 'USD' where currency <> 'USD';
    update public.coach_fees set currency = 'USD' where currency <> 'USD';

    -- A) Rename the ads price column (USD from now on).
    alter table public.coach_ads rename column price_egp to price_usd;
  end if;
end
$$;

-- New wallets/fees/topups created from now on default to USD (guards the
-- register path against any code path still writing the old default).
alter table public.coach_wallets alter column currency set default 'USD';
alter table public.coach_topup_requests alter column currency set default 'USD';
alter table public.coach_fees alter column currency set default 'USD';

-- VERIFY (run these — expect the values shown):
--   select column_name from information_schema.columns
--     where table_name='coach_ads' and column_name like 'price%';
--   → price_usd  (price_egp must NOT appear)
--   select distinct currency from coach_wallets;
--   → USD
--   select distinct currency from coach_fees;
--   → USD
--   select currency, balance from coach_wallets limit 5;
--   → balances shown in USD (any old EGP values already ÷50)
-- ==================================================== END OF SCRIPT 0038
