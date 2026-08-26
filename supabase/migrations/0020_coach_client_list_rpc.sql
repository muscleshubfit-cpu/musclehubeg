-- =====================================================================
--  MuscleHubEG — get_coach_client_list() RPC
--
--  Decision 1: fix N+1 queries in CoachView.
--  Previously: listAllClients + listAllSubscriptions + listSubscriptionRequests
--  + per-client getQuestionnaire(×2) = 2N+3 queries for N clients.
--
--  This function returns all clients + their latest subscription +
--  pending payment count + questionnaire status in ONE query.
--
--  SECURITY DEFINER — bypasses RLS (safe: caller must be a coach).
--
--  Idempotent: safe to run multiple times.
--  Owner must run this + NOTIFY pgrst, 'reload schema';
-- =====================================================================

create or replace function public.get_coach_client_list()
returns table (
  client_id uuid,
  client_email text,
  client_full_name text,
  client_phone text,
  client_avatar_url text,
  client_created_at timestamptz,
  -- Latest subscription (best membership tier)
  sub_tier text,
  sub_status text,
  sub_end_date timestamptz,
  sub_months int,
  -- Pending payment requests count
  pending_payments int,
  -- Questionnaire status (latest)
  nutri_q_status text,
  fit_q_status text
)
language sql
security definer
set search_path = public
as $$
  select
    p.id as client_id,
    p.email as client_email,
    p.full_name as client_full_name,
    p.phone as client_phone,
    p.avatar_url as client_avatar_url,
    p.created_at as client_created_at,

    -- Latest active subscription (pro > premium > coaching)
    (
      select s.tier
      from public.subscriptions s
      where s.client_id = p.id
      order by
        case s.tier
          when 'pro' then 3
          when 'premium' then 2
          when 'coaching' then 1
          else 0
        end desc,
        s.created_at desc
      limit 1
    ) as sub_tier,

    (
      select s.status
      from public.subscriptions s
      where s.client_id = p.id
      order by s.created_at desc
      limit 1
    ) as sub_status,

    (
      select s.end_date
      from public.subscriptions s
      where s.client_id = p.id
      order by s.created_at desc
      limit 1
    ) as sub_end_date,

    (
      select s.months
      from public.subscriptions s
      where s.client_id = p.id
      order by s.created_at desc
      limit 1
    ) as sub_months,

    -- Pending payment requests
    (
      select count(*)
      from public.subscription_requests sr
      where sr.user_id = p.id and sr.status = 'pending'
    )::int as pending_payments,

    -- Questionnaire status
    (
      select nq.status
      from public.nutrition_questionnaires nq
      where nq.client_id = p.id
      limit 1
    ) as nutri_q_status,

    (
      select fq.status
      from public.fitness_questionnaires fq
      where fq.client_id = p.id
      limit 1
    ) as fit_q_status

  from public.profiles p
  where p.role = 'client'
  order by p.created_at desc
$$;

grant execute on function public.get_coach_client_list() to authenticated;
