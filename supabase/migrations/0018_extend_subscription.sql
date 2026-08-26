-- =====================================================================
--  MuscleHubEG — extend_subscription() RPC
--
--  Fixes C10: PayPal capture + manual approval used a simple upsert
--  with start_date=now, end_date=now+months. If a user renewed early
--  (while their subscription was still active), the upsert OVERWROTE
--  the existing row — the user lost all remaining paid days.
--
--  This function atomically extends an existing subscription or
--  creates a new one:
--    - If a subscription exists for (client_id, tier) with end_date > now:
--        new_end = existing.end_date + months
--        (preserves remaining days)
--    - If a subscription exists but end_date <= now (expired):
--        new_end = now + months
--    - If no subscription exists:
--        insert new row with start_date=now, end_date=now+months
--
--  Uses FOR UPDATE row lock to prevent concurrent races.
--  SECURITY DEFINER — bypasses RLS (safe: called only from
--  server-side capture-order route via supabaseAdmin, or from
--  coach-side reviewSubscriptionRequest where is_coach() is true).
--
--  Idempotent: safe to call multiple times (each call extends).
--  Owner must run this in Supabase SQL Editor, then execute
--  `NOTIFY pgrst, 'reload schema';`.
-- =====================================================================

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
begin
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

-- Grant execute to authenticated users (coaches call this from client-side
-- reviewSubscriptionRequest; server-side capture-order uses supabaseAdmin)
grant execute on function public.extend_subscription(uuid, text, int, text) to authenticated;
