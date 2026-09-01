-- ============================================================================
--  MuscleHub — Migration 0060 (2026-09-02)
--  Customers database: every registered member (client OR coach) becomes a
--  lead in `tool_leads` — owner request (Phase 73):
--    «اضافة كل اعضاء الموقع المسجلين (اعضاء او مدربين) لقاعدة العملاء»
--
--  What it does:
--    1) Makes sure the `name` + `type` columns exist (idempotent — also
--       covers 0059 if it was not applied yet) and widens the tool_slug
--       CHECK domain with the new 'signup' slug (8 values total).
--    2) Adds a trigger on auth.users: every NEW account (email signup,
--       Google OAuth, admin invite, coach self-register) is saved into
--       tool_leads automatically as tool_slug='signup' + type='member'.
--       The coach-register / admin-staff routes then upgrade the label
--       to 'coach' when the account is a trainer.
--       SECURITY DEFINER + exception guard → signup can NEVER break.
--    3) BACKFILL: all users ALREADY registered (profiles) are inserted
--       into tool_leads once — clients as 'member', coaches as 'coach',
--       admins as 'admin'.
--
--  Safe to re-run (fully idempotent). No existing rows are modified or
--  removed. Auto-applied by the Supabase GitHub integration.
-- ============================================================================

-- ---------- 1a) Columns (also covers 0059 if it never ran) ----------
alter table public.tool_leads add column if not exists name text;
alter table public.tool_leads add column if not exists type text not null default 'tool';

-- ---------- 1b) Widen the tool_slug CHECK: + 'signup' (8 values) ----------
do $$
declare
  constraint_name text;
begin
  select conname into constraint_name
  from pg_constraint
  where conrelid = 'public.tool_leads'::regclass
    and contype = 'c'
    and pg_get_constraintdef(oid) like '%tool_slug%'
  limit 1;

  if constraint_name is not null then
    execute format('alter table public.tool_leads drop constraint %I', constraint_name);
  end if;
end $$;

alter table public.tool_leads
  add constraint tool_leads_tool_slug_check
  check (tool_slug in (
    'calorie-calculator',
    'bmi-calculator',
    'macro-calculator',
    'body-fat-calculator',
    'water-tracker',
    'meal-planner',
    'newsletter',
    'signup'
  ));

-- ---------- 1c) Indexes ----------
create index if not exists tool_leads_type_idx on public.tool_leads (type);
create index if not exists tool_leads_email_idx on public.tool_leads (email) where email is not null;

-- ---------- 2) Trigger: every new auth user → one 'signup' lead ----------
create or replace function public.handle_new_user_add_lead()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.email is null then
    return new;
  end if;

  -- one signup lead per email (never duplicate)
  if exists (
    select 1 from public.tool_leads
    where tool_slug = 'signup' and email = new.email
  ) then
    return new;
  end if;

  insert into public.tool_leads (tool_slug, email, name, type, lang, consent)
  values (
    'signup',
    new.email,
    nullif(btrim(coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', '')), ''),
    'member',
    'ar',
    true
  );

  return new;
exception when others then
  -- the customer DB is a side quest — a failure here must NEVER block signup
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_add_lead on auth.users;
create trigger on_auth_user_created_add_lead
  after insert on auth.users
  for each row execute function public.handle_new_user_add_lead();

-- ---------- 3) Backfill: users ALREADY registered ----------
-- clients → 'member' · coaches → 'coach' · admins → 'admin'
insert into public.tool_leads (tool_slug, email, name, type, lang, consent)
select
  'signup',
  p.email,
  nullif(btrim(coalesce(p.full_name, '')), ''),
  case p.role when 'coach' then 'coach' when 'admin' then 'admin' else 'member' end,
  'ar',
  true
from public.profiles p
where p.email is not null
  and not exists (
    select 1 from public.tool_leads l
    where l.tool_slug = 'signup' and l.email = p.email
  );

-- ---------- 4) RLS untouched ----------
-- INSERT stays public (leads/subscribe); SELECT/UPDATE/DELETE stay
-- admin/coach-only (0030C). The trigger uses SECURITY DEFINER so it
-- works for anonymous signups regardless of RLS.
