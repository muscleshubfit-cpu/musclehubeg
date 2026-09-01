-- =====================================================================
--  MuscleHub — Migration 0059
--  tool_leads: name + type columns, wider tool_slug domain, newsletter
--
--  Owner request (Phase 72):
--    1) Save the visitor's NAME with every tool lead (email results).
--    2) Newsletter subscribers live in the SAME tool_leads table but
--       with a dedicated type: 'newsletter' (tools stay type 'tool').
--    3) All SIX free tools can save leads — the original CHECK on
--       tool_slug only knew 4 slugs; water-tracker, meal-planner and
--       newsletter were impossible to insert.
--
--  Safe to re-run. No data is modified or removed.
-- =====================================================================

-- ---------- 1) New columns ----------
alter table public.tool_leads add column if not exists name text;
alter table public.tool_leads add column if not exists type text not null default 'tool';

-- ---------- 2) Widen the tool_slug CHECK (old: 4 slugs only) ----------
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
    'newsletter'
  ));

-- ---------- 3) Index for the newsletter/tool split ----------
create index if not exists tool_leads_type_idx on public.tool_leads (type);

-- ---------- 4) Keep existing RLS untouched ----------
-- INSERT stays public (anyone can submit a lead / subscribe).
-- SELECT / UPDATE / DELETE stay admin-only (migration 0030C).
-- No policy changes needed for this migration.
