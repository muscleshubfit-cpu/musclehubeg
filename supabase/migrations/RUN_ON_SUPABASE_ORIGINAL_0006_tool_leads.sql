-- =====================================================================
--  MuscleHub — Tool Leads table
--
--  Stores email/WhatsApp leads captured from the free tools (calorie,
--  BMI, macro, body-fat calculators). Users OPT IN to receive their
--  results via email/WhatsApp, and we keep their contact info for
--  marketing. All fields are optional except tool_slug.
-- =====================================================================

-- ---------- tool_leads ----------
create table if not exists public.tool_leads (
  id uuid primary key default gen_random_uuid(),
  tool_slug text not null check (tool_slug in ('calorie-calculator', 'bmi-calculator', 'macro-calculator', 'body-fat-calculator')),
  email text,
  whatsapp text,
  -- short human-readable summary of the result, e.g. "TDEE: 2500 kcal, protein: 188g"
  result_summary text,
  -- full structured JSON of the result (for re-creating the email)
  result_json jsonb,
  -- language the user was viewing the tool in
  lang text default 'ar',
  -- marketing consent
  consent boolean not null default true,
  -- whether the lead has been contacted by the coach (manual flag)
  contacted boolean not null default false,
  -- whether this lead has been converted to a paying client
  converted boolean not null default false,
  created_at timestamptz not null default now()
);

-- Index for sorting by created_at (dashboard view)
create index if not exists tool_leads_created_at_idx
  on public.tool_leads (created_at desc);

-- Index for filtering by tool
create index if not exists tool_leads_tool_slug_idx
  on public.tool_leads (tool_slug);

-- Index for dedup by email
create index if not exists tool_leads_email_idx
  on public.tool_leads (email) where email is not null;

-- Index for dedup by whatsapp
create index if not exists tool_leads_whatsapp_idx
  on public.tool_leads (whatsapp) where whatsapp is not null;

-- ---------- Row Level Security ----------
-- Public can INSERT (anonymous users submitting leads).
-- Only coaches can SELECT/UPDATE/DELETE.

alter table public.tool_leads enable row level security;

-- Anyone can insert a lead (no auth required — the tool is public)
create policy "Anyone can submit a tool lead"
  on public.tool_leads for insert
  to anon, authenticated
  with check (true);

-- Only coaches can view leads
create policy "Coaches can view tool leads"
  on public.tool_leads for select
  to authenticated
  using (public.is_coach());

-- Only coaches can update leads (e.g. mark as contacted/converted)
create policy "Coaches can update tool leads"
  on public.tool_leads for update
  to authenticated
  using (public.is_coach())
  with check (public.is_coach());

-- Only coaches can delete leads
create policy "Coaches can delete tool leads"
  on public.tool_leads for delete
  to authenticated
  using (public.is_coach());
