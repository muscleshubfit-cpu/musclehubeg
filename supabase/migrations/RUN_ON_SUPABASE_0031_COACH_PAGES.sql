-- =====================================================================
-- RUN_ON_SUPABASE_0031_COACH_PAGES.sql   (ONE-SHOT SCRIPT)
-- =====================================================================
-- MULTI-COACH PHASE 2B — public coach landing pages + my-coach read.
--   * coach_pages: ONE public landing page per coach (1:1), slug-based
--     URL /coaches/{slug}, self-promoted by the coach (NOT in menus —
--     owner answer 3). Admin can manage any row.
--   * profiles select policy gains: a client may read HIS assigned
--     coach's profile row (name/avatar for the client "my coach" card;
--     uses coach_of() created in 0030A).
--
-- PREREQ: 0030A..D already applied (coach_of, is_admin). No ALTER TYPE
-- → safe as a single paste. Idempotent: safe to re-run.
--
-- HOW TO PASTE: open the RAW url -> Ctrl+A, Ctrl+C -> Supabase SQL
-- Editor -> NEW empty query -> paste -> Ctrl+End -> you MUST see the
-- "END OF SCRIPT 0031" marker at the bottom -> Run -> expected:
-- "Success. No rows returned".
--
-- RAW: https://raw.githubusercontent.com/muscleshubfit-cpu/musclehubeg/main/supabase/migrations/RUN_ON_SUPABASE_0031_COACH_PAGES.sql
-- =====================================================================

-- ============================================================
-- PART 1 — coach_pages table
-- ============================================================
create table if not exists public.coach_pages (
  coach_id     uuid primary key references public.profiles(id) on delete cascade,
  slug         text not null unique,
  headline     text not null default '',
  bio          text not null default '',
  -- one specialty per line (newline-separated, rendered as a list)
  specialties  text not null default '',
  is_published boolean not null default false,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  constraint coach_pages_slug_format check (slug ~ '^[a-z0-9-]{3,40}$')
);

create index if not exists idx_coach_pages_slug
  on public.coach_pages(slug);

alter table public.coach_pages enable row level security;

-- ============================================================
-- PART 2 — RLS on coach_pages
-- ============================================================
-- Read: published pages are PUBLIC (the landing page is anonymous);
-- a coach also reads his own draft; admin reads everything.
drop policy if exists cp_select on public.coach_pages;
create policy cp_select
  on public.coach_pages for select
  to anon, authenticated
  using (
    is_published
    or coach_id = auth.uid()
    or public.is_admin()
  );

-- Write: the coach manages HIS page; admin manages any row.
drop policy if exists cp_write_owner_or_admin on public.coach_pages;
create policy cp_write_owner_or_admin
  on public.coach_pages for all
  to authenticated
  using (coach_id = auth.uid() or public.is_admin())
  with check (coach_id = auth.uid() or public.is_admin());

-- ============================================================
-- PART 3 — profiles: a client may read his assigned coach's row
-- ============================================================
-- Needed by the client "my coach" card (name + avatar). 0030A's
-- profiles policy let coaches see clients; this adds the reverse,
-- restricted to the ONE assigned coach via coach_of(auth.uid()).
drop policy if exists profiles_select_self_or_coach on public.profiles;
create policy profiles_select_self_or_coach
  on public.profiles for select
  using (
    auth.uid() = id
    or public.is_coach_over(id)
    or public.coach_of(auth.uid()) = id
  );

-- ============================================================
-- PART 4 — PostgREST schema reload
-- ============================================================
notify pgrst, 'reload schema';

-- =====================================================================
-- ===== END OF SCRIPT 0031 — if you can see this line (Ctrl+End), the
-- ===== paste is complete. Expected result: "Success. No rows returned"
-- =====================================================================
--
-- =====================================================================
-- VERIFY (SQL Editor — no login session needed):
--   select count(*) from public.coach_pages;          -- expected: 0 (lazy rows)
--   select tgname from pg_trigger
--   where tgrelid = 'public.coach_pages'::regclass;    -- RLS only, no triggers
--   -- then in the APP: coach -> صفحتي العامة -> fill + publish ->
--   -- open /coaches/{slug} in a PRIVATE window -> the page renders.
-- =====================================================================
