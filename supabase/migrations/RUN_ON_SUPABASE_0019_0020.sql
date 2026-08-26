-- =====================================================================
--  MuscleHubEG — Unified Run Script for Migrations 0019 + 0020
--
--  Applies:
--    0019 — Audit log table + triggers (Decision 3)
--    0020 — get_coach_client_list() RPC (Decision 1 — N+1 fix)
--
--  How to run:
--    1. Open: https://supabase.com/dashboard/project/wyopqryzfjifyeyvyxfy/sql/new
--    2. Paste this entire file.
--    3. Click Run.
--    4. Run separately: NOTIFY pgrst, 'reload schema';
-- =====================================================================

-- ═══════════════════════════════════════════════════════════════
--  MIGRATION 0019 — Audit Log
-- ═══════════════════════════════════════════════════════════════

create table if not exists public.audit_log (
  id uuid primary key default gen_random_uuid(),
  table_name text not null,
  operation text not null check (operation in ('INSERT', 'UPDATE', 'DELETE')),
  record_id uuid,
  changed_by uuid references auth.users(id) on delete set null,
  old_data jsonb,
  new_data jsonb,
  changed_fields text[],
  created_at timestamptz not null default now()
);

create index if not exists idx_audit_log_table on public.audit_log(table_name);
create index if not exists idx_audit_log_record on public.audit_log(record_id);
create index if not exists idx_audit_log_created on public.audit_log(created_at desc);

alter table public.audit_log enable row level security;

drop policy if exists audit_log_select_coach on public.audit_log;
create policy audit_log_select_coach
  on public.audit_log for select
  to authenticated
  using (public.is_coach());

create or replace function public.audit_row()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_changed_fields text[];
  v_old jsonb;
  v_new jsonb;
  v_record_id uuid;
begin
  v_old := case when TG_OP = 'DELETE' or TG_OP = 'UPDATE' then to_jsonb(OLD) else null end;
  v_new := case when TG_OP = 'INSERT' or TG_OP = 'UPDATE' then to_jsonb(NEW) else null end;
  v_record_id := coalesce(
    (v_new ->> 'id')::uuid,
    (v_old ->> 'id')::uuid
  );

  if TG_OP = 'UPDATE' then
    select array_agg(key) into v_changed_fields
    from jsonb_object_keys(v_new) as key
    where v_new -> key is distinct from v_old -> key;
  end if;

  insert into public.audit_log (table_name, operation, record_id, changed_by, old_data, new_data, changed_fields)
  values (TG_TABLE_NAME, TG_OP, v_record_id, auth.uid(), v_old, v_new, v_changed_fields);

  if TG_OP = 'DELETE' then return OLD; else return NEW; end if;
end;
$$;

drop trigger if exists audit_subscriptions on public.subscriptions;
create trigger audit_subscriptions
  after insert or update or delete on public.subscriptions
  for each row execute function public.audit_row();

drop trigger if exists audit_referral_earnings on public.referral_earnings;
create trigger audit_referral_earnings
  after insert or update or delete on public.referral_earnings
  for each row execute function public.audit_row();

drop trigger if exists audit_referral_payouts on public.referral_payouts;
create trigger audit_referral_payouts
  after insert or update or delete on public.referral_payouts
  for each row execute function public.audit_row();

drop trigger if exists audit_subscription_requests on public.subscription_requests;
create trigger audit_subscription_requests
  after insert or update or delete on public.subscription_requests
  for each row execute function public.audit_row();

grant select on public.audit_log to authenticated;
grant execute on function public.audit_row() to authenticated;


-- ═══════════════════════════════════════════════════════════════
--  MIGRATION 0020 — get_coach_client_list() RPC (N+1 fix)
-- ═══════════════════════════════════════════════════════════════

create or replace function public.get_coach_client_list()
returns table (
  client_id uuid,
  client_email text,
  client_full_name text,
  client_phone text,
  client_avatar_url text,
  client_created_at timestamptz,
  sub_tier text,
  sub_status text,
  sub_end_date timestamptz,
  sub_months int,
  pending_payments int,
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
    (select s.tier from public.subscriptions s where s.client_id = p.id order by case s.tier when 'pro' then 3 when 'premium' then 2 when 'coaching' then 1 else 0 end desc, s.created_at desc limit 1) as sub_tier,
    (select s.status from public.subscriptions s where s.client_id = p.id order by s.created_at desc limit 1) as sub_status,
    (select s.end_date from public.subscriptions s where s.client_id = p.id order by s.created_at desc limit 1) as sub_end_date,
    (select s.months from public.subscriptions s where s.client_id = p.id order by s.created_at desc limit 1) as sub_months,
    (select count(*) from public.subscription_requests sr where sr.user_id = p.id and sr.status = 'pending')::int as pending_payments,
    (select nq.status from public.nutrition_questionnaires nq where nq.client_id = p.id limit 1) as nutri_q_status,
    (select fq.status from public.fitness_questionnaires fq where fq.client_id = p.id limit 1) as fit_q_status
  from public.profiles p
  where p.role = 'client'
  order by p.created_at desc
$$;

grant execute on function public.get_coach_client_list() to authenticated;
