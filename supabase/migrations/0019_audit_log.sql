-- =====================================================================
--  MuscleHubEG — Audit Log Table + Triggers
--
--  Decision 3: automatic audit trail for sensitive tables.
--  Records every INSERT/UPDATE/DELETE on financial + subscription tables.
--
--  Tables audited:
--    - subscriptions (tier changes, status changes)
--    - referral_earnings (amount, status changes)
--    - referral_payouts (approval, rejection, payment)
--    - subscription_requests (approval, rejection)
--
--  Idempotent: safe to run multiple times.
--  Owner must run this in Supabase SQL Editor, then:
--    NOTIFY pgrst, 'reload schema';
-- =====================================================================

-- ---------- audit_log table ----------

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

-- Coaches can see all audit logs; clients cannot see any
drop policy if exists audit_log_select_coach on public.audit_log;
create policy audit_log_select_coach
  on public.audit_log for select
  to authenticated
  using (public.is_coach());

-- ---------- Generic audit trigger function ----------

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

  -- Compute changed fields for UPDATE
  if TG_OP = 'UPDATE' then
    select array_agg(key) into v_changed_fields
    from jsonb_object_keys(v_new) as key
    where v_new -> key is distinct from v_old -> key;
  end if;

  insert into public.audit_log (table_name, operation, record_id, changed_by, old_data, new_data, changed_fields)
  values (
    TG_TABLE_NAME,
    TG_OP,
    v_record_id,
    auth.uid(),
    v_old,
    v_new,
    v_changed_fields
  );

  -- Return appropriate row for each operation
  if TG_OP = 'DELETE' then
    return OLD;
  else
    return NEW;
  end if;
end;
$$;

-- ---------- Attach triggers to sensitive tables ----------

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
