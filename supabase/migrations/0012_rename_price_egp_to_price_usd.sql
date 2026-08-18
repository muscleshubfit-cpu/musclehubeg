-- =====================================================================
--  MuscleHub — Rename price_egp → price_usd in subscription_requests
--
--  The field was storing USD values despite the EGP name.
--  This also fixes the commission calculation bug where values were
--  incorrectly divided by 50 (EGP→USD conversion) when they were
--  already in USD.
-- =====================================================================

alter table public.subscription_requests
  rename column price_egp to price_usd;
