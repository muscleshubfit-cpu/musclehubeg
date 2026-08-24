-- 0016_add_paypal_to_payment_method.sql
-- Add 'paypal' to the payment_method CHECK constraint on subscription_requests
--
-- This allows PayPal payment records to be stored in subscription_requests
-- alongside manual payments (instapay, vodafone_cash).
--
-- PayPal records are inserted with status='approved' (auto-approved by
-- the server-side Capture endpoint). The coach sees them in the payments
-- dashboard but no manual action is needed.
--
-- Idempotent: uses IF EXISTS checks. Safe to re-run.

-- Drop the old constraint
alter table public.subscription_requests
  drop constraint if exists subscription_requests_payment_method_check;

-- Add the new constraint with 'paypal' included
alter table public.subscription_requests
  add constraint subscription_requests_payment_method_check
  check (payment_method in ('instapay', 'vodafone_cash', 'paypal'));
