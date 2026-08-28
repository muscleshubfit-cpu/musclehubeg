-- =====================================================================
-- RUN_ON_SUPABASE_0030_MULTI_COACH.sql   (ONE-SHOT SCRIPT)
-- =====================================================================
-- MULTI-COACH FOUNDATION (owner-approved design, 2026-08-29 — the 7
-- discussion answers):
--   * 1 client ↔ 1 coach (coach_assignments, client_id UNIQUE).
--   * Clients belong to the SITE and are ASSIGNED to a coach; the
--     admin IS the general coach and inherits everything.
--   * A plain coach sees ONLY his assigned clients (data, plans,
--     questionnaires, progress, tickets, payments, notifications).
--   * Admin-exclusive surfaces (leads, saved-results, blog, referrals
--     admin, audit, allowlist) are locked to is_admin().
--   * Coach bell notifications are routed to ONE coach via
--     target_coach_id (assigned coach, fallback admin) — no more
--     broadcast-to-all-staff.
--
-- Run: Supabase Dashboard → SQL Editor → paste → Run. ONE file, no
-- ALTER TYPE inside → safe as a single paste (no mid-script commit).
-- Idempotent: safe to run multiple times.
-- =====================================================================
-- HOW TO PASTE SAFELY -------------------------------------------------
-- If you ever see  ERROR 42601 "unterminated dollar-quoted string at
-- or near $$"  → that is a TRUNCATED/MANGLED COPY, not a script bug
-- (the closing $$; of a function body never reached the server).
--   1. Open this RAW url and copy ALL of it (Ctrl+A then Ctrl+C,
--      or the "Copy raw file" button):
--   https://raw.githubusercontent.com/muscleshubfit-cpu/musclehubeg/main/supabase/migrations/RUN_ON_SUPABASE_0030_MULTI_COACH.sql
--   2. In Supabase SQL Editor open a NEW empty query — delete any old
--      text first (leftover content breaks the paste).
--   3. Paste, then press Ctrl+End: the LAST lines you see MUST be the
--      "END OF SCRIPT 0030" marker at the bottom of this file.
--      If you cannot see it → the copy was cut; re-copy from the raw url.
--   4. Run → expected output:  "Success. No rows returned"
-- =====================================================================

-- ============================================================
-- PART 1 — coach_assignments table + RLS
-- ============================================================
create table if not exists public.coach_assignments (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null unique references public.profiles(id) on delete cascade,
  coach_id uuid not null references public.profiles(id) on delete cascade,
  assigned_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint coach_assignments_no_self check (client_id <> coach_id)
);

create index if not exists idx_coach_assignments_coach on public.coach_assignments(coach_id);
create index if not exists idx_coach_assignments_client on public.coach_assignments(client_id);

alter table public.coach_assignments enable row level security;

-- Read: admin (all) | the coach himself (his clients) | the client (his own row)
drop policy if exists ca_select on public.coach_assignments;
create policy ca_select
  on public.coach_assignments for select
  to authenticated
  using (
    public.is_admin()
    or coach_id = auth.uid()
    or client_id = auth.uid()
  );

-- Write: ADMIN ONLY (assignment is the platform owner's job).
-- The auto-assign trigger below is SECURITY DEFINER → bypasses RLS.
drop policy if exists ca_insert_admin on public.coach_assignments;
create policy ca_insert_admin
  on public.coach_assignments for insert
  to authenticated
  with check (public.is_admin());

drop policy if exists ca_update_admin on public.coach_assignments;
create policy ca_update_admin
  on public.coach_assignments for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists ca_delete_admin on public.coach_assignments;
create policy ca_delete_admin
  on public.coach_assignments for delete
  to authenticated
  using (public.is_admin());

-- ============================================================
-- PART 2 — helper functions
-- ============================================================
-- coach_of(client) → the ASSIGNED coach's profile id (or null).
create or replace function public.coach_of(p_client uuid)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select a.coach_id
  from public.coach_assignments a
  where a.client_id = p_client
  limit 1
$$;

-- is_coach_over(client) → THE client-data predicate from now on:
-- true for the admin (sees everything) and for the coach ASSIGNED to
-- this exact client. NEVER use bare is_coach() for client data again.
create or replace function public.is_coach_over(p_client uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_admin() or exists (
    select 1
    from public.coach_assignments a
    where a.client_id = p_client
      and a.coach_id = auth.uid()
  )
$$;

grant execute on function public.coach_of(uuid) to anon, authenticated;
grant execute on function public.is_coach_over(uuid) to anon, authenticated;

-- ============================================================
-- PART 3 — auto-assign every NEW client to the admin (general coach)
-- ============================================================
-- Clients belong to the site; until the owner reassigns them they are
-- followed by the general coach (admin). Allowlisted staff signups are
-- NEVER assigned as clients (guard works regardless of trigger order).
create or replace function public.auto_assign_client_to_admin()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin uuid;
begin
  if new.role = 'client' then
    if exists (
      select 1 from public.coach_emails
      where lower(email) = lower(new.email)
    ) then
      return new;  -- staff signup — never a client
    end if;

    select id into v_admin
    from public.profiles
    where role = 'admin'
    order by created_at
    limit 1;

    if v_admin is not null and v_admin <> new.id then
      insert into public.coach_assignments (client_id, coach_id, assigned_by)
      values (new.id, v_admin, v_admin)
      on conflict (client_id) do nothing;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_auto_assign_client on public.profiles;
create trigger trg_auto_assign_client
  after insert on public.profiles
  for each row execute function public.auto_assign_client_to_admin();

-- ============================================================
-- PART 4 — backfill: every EXISTING client → the admin
-- ============================================================
insert into public.coach_assignments (client_id, coach_id, assigned_by)
select p.id, a.id, a.id
from public.profiles p
cross join lateral (
  select id from public.profiles where role = 'admin' order by created_at limit 1
) a
where p.role = 'client'
  and not exists (
    select 1 from public.coach_emails ce where lower(ce.email) = lower(p.email)
  )
on conflict (client_id) do nothing;

-- ============================================================
-- PART 5 — RLS scoping: CLIENT-DATA tables
--          is_coach() → is_coach_over(client_col)
--          (same policy names, drop + recreate)
-- ============================================================

-- ---------- profiles (coach sees own + his clients' rows) ----------
drop policy if exists profiles_select_self_or_coach on public.profiles;
create policy profiles_select_self_or_coach
  on public.profiles for select
  using (auth.uid() = id or public.is_coach_over(id));

-- ---------- subscriptions ----------
drop policy if exists subs_select_owner_or_coach on public.subscriptions;
create policy subs_select_owner_or_coach
  on public.subscriptions for select
  using (auth.uid() = client_id or public.is_coach_over(client_id));

drop policy if exists subs_insert_self_or_coach on public.subscriptions;
create policy subs_insert_self_or_coach
  on public.subscriptions for insert
  with check (auth.uid() = client_id or public.is_coach_over(client_id));

drop policy if exists subs_update_self_or_coach on public.subscriptions;
create policy subs_update_self_or_coach
  on public.subscriptions for update
  using (public.is_coach_over(client_id))
  with check (public.is_coach_over(client_id));

-- ---------- nutrition_questionnaires ----------
drop policy if exists nutriq_owner_or_coach on public.nutrition_questionnaires;
create policy nutriq_owner_or_coach
  on public.nutrition_questionnaires for select
  using (auth.uid() = client_id or public.is_coach_over(client_id));

drop policy if exists nutriq_update_self_or_coach on public.nutrition_questionnaires;
create policy nutriq_update_self_or_coach
  on public.nutrition_questionnaires for update
  using (auth.uid() = client_id or public.is_coach_over(client_id));

-- ---------- fitness_questionnaires ----------
drop policy if exists fitq_owner_or_coach on public.fitness_questionnaires;
create policy fitq_owner_or_coach
  on public.fitness_questionnaires for select
  using (auth.uid() = client_id or public.is_coach_over(client_id));

drop policy if exists fitq_update_self_or_coach on public.fitness_questionnaires;
create policy fitq_update_self_or_coach
  on public.fitness_questionnaires for update
  using (auth.uid() = client_id or public.is_coach_over(client_id));

-- ---------- progress_entries ----------
drop policy if exists progress_owner_or_coach on public.progress_entries;
create policy progress_owner_or_coach
  on public.progress_entries for select
  using (auth.uid() = client_id or public.is_coach_over(client_id));

-- ---------- plans ----------
drop policy if exists plans_owner_or_coach on public.plans;
create policy plans_owner_or_coach
  on public.plans for select
  using (auth.uid() = client_id or public.is_coach_over(client_id));

drop policy if exists plans_insert_coach on public.plans;
create policy plans_insert_coach
  on public.plans for insert
  with check (public.is_coach_over(client_id));

drop policy if exists plans_update_coach on public.plans;
create policy plans_update_coach
  on public.plans for update
  using (public.is_coach_over(client_id));

drop policy if exists plans_delete_coach on public.plans;
create policy plans_delete_coach
  on public.plans for delete
  using (public.is_coach_over(client_id));

-- ---------- support_tickets ----------
drop policy if exists tickets_owner_or_coach on public.support_tickets;
create policy tickets_owner_or_coach
  on public.support_tickets for select
  using (auth.uid() = client_id or public.is_coach_over(client_id));

drop policy if exists tickets_update_coach on public.support_tickets;
create policy tickets_update_coach
  on public.support_tickets for update
  using (auth.uid() = client_id or public.is_coach_over(client_id));

-- ---------- ticket_messages ----------
drop policy if exists ticket_msgs_owner_or_coach on public.ticket_messages;
create policy ticket_msgs_owner_or_coach
  on public.ticket_messages for select
  using (
    exists (
      select 1 from public.support_tickets t
      where t.id = ticket_id
        and (t.client_id = auth.uid() or public.is_coach_over(t.client_id))
    )
  );

drop policy if exists ticket_msgs_insert_self_or_coach on public.ticket_messages;
create policy ticket_msgs_insert_self_or_coach
  on public.ticket_messages for insert
  with check (
    sender_id = auth.uid()
    and exists (
      select 1 from public.support_tickets t
      where t.id = ticket_id
        and (t.client_id = auth.uid() or public.is_coach_over(t.client_id))
    )
  );

-- ---------- chat_messages (coach review of client chats) ----------
drop policy if exists chat_owner_or_coach on public.chat_messages;
create policy chat_owner_or_coach
  on public.chat_messages for select
  using (auth.uid() = client_id or public.is_coach_over(client_id));

-- ---------- notifications (client bell — coach scoped to his clients) ----------
drop policy if exists notifs_select_owner_or_coach on public.notifications;
create policy notifs_select_owner_or_coach
  on public.notifications for select
  to authenticated
  using (auth.uid() = user_id or public.is_coach_over(user_id));

drop policy if exists notifs_insert_self_or_coach on public.notifications;
create policy notifs_insert_self_or_coach
  on public.notifications for insert
  to authenticated
  with check (auth.uid() = user_id or public.is_coach_over(user_id));

drop policy if exists notifs_update_self_or_coach on public.notifications;
create policy notifs_update_self_or_coach
  on public.notifications for update
  to authenticated
  using (auth.uid() = user_id or public.is_coach_over(user_id));

-- ============================================================
-- PART 6 — RLS lock: ADMIN-EXCLUSIVE tables
--          is_coach() → is_admin()   (owner answer 6)
-- ============================================================

-- ---------- referrals + earnings + payouts ----------
drop policy if exists referrals_select_own on public.referrals;
create policy referrals_select_own
  on public.referrals for select
  to authenticated
  using (auth.uid() = referrer_id or public.is_admin());

drop policy if exists referrals_insert_coach on public.referrals;
create policy referrals_insert_coach
  on public.referrals for insert
  to authenticated
  with check (public.is_admin() or auth.uid() = referrer_id);

drop policy if exists referrals_update_coach on public.referrals;
create policy referrals_update_coach
  on public.referrals for update
  to authenticated
  using (public.is_admin());

drop policy if exists earnings_select_own on public.referral_earnings;
create policy earnings_select_own
  on public.referral_earnings for select
  to authenticated
  using (auth.uid() = user_id or public.is_admin());

drop policy if exists earnings_insert_coach on public.referral_earnings;
create policy earnings_insert_coach
  on public.referral_earnings for insert
  to authenticated
  with check (public.is_admin() or auth.uid() = user_id);

drop policy if exists earnings_update_coach on public.referral_earnings;
create policy earnings_update_coach
  on public.referral_earnings for update
  to authenticated
  using (public.is_admin() or auth.uid() = user_id);

-- ---------- tool_leads (admin-exclusive per owner answer 6) ----------
drop policy if exists "Coaches can view tool leads" on public.tool_leads;
create policy "Coaches can view tool leads"
  on public.tool_leads for select
  to authenticated
  using (public.is_admin());

drop policy if exists "Coaches can update tool leads" on public.tool_leads;
create policy "Coaches can update tool leads"
  on public.tool_leads for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "Coaches can delete tool leads" on public.tool_leads;
create policy "Coaches can delete tool leads"
  on public.tool_leads for delete
  to authenticated
  using (public.is_admin());

-- ---------- blog_posts (admin-exclusive CMS) ----------
drop policy if exists "blog_posts_coach_read_all" on public.blog_posts;
create policy "blog_posts_coach_read_all"
  on public.blog_posts for select
  to authenticated
  using (public.is_admin());

drop policy if exists "blog_posts_coach_write" on public.blog_posts;
create policy "blog_posts_coach_write"
  on public.blog_posts for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ---------- subscription_requests (payments: coach sees HIS clients') ----------
drop policy if exists "Coaches can view subscription requests" on public.subscription_requests;
create policy "Coaches can view subscription requests"
  on public.subscription_requests for select
  to authenticated
  using (public.is_coach_over(user_id));

drop policy if exists "Coaches can review subscription requests" on public.subscription_requests;
create policy "Coaches can review subscription requests"
  on public.subscription_requests for update
  to authenticated
  using (public.is_coach_over(user_id))
  with check (public.is_coach_over(user_id));

drop policy if exists "Coaches can delete subscription requests" on public.subscription_requests;
create policy "Coaches can delete subscription requests"
  on public.subscription_requests for delete
  to authenticated
  using (public.is_coach_over(user_id));

-- ---------- audit_log (platform audit = admin) ----------
drop policy if exists audit_log_select_coach on public.audit_log;
create policy audit_log_select_coach
  on public.audit_log for select
  to authenticated
  using (public.is_admin());

-- ---------- coach_emails allowlist (admin manages the staff list) ----------
drop policy if exists coach_emails_select_coach on public.coach_emails;
create policy coach_emails_select_coach
  on public.coach_emails for select
  to authenticated
  using (public.is_admin());

-- ============================================================
-- PART 7 — admin_notifications: target_coach_id + scoped policies
-- ============================================================
-- Legacy rows (target_coach_id null) stay visible to all staff.
-- New rows are routed to ONE coach (assigned coach, fallback admin).
alter table public.admin_notifications
  add column if not exists target_coach_id uuid references public.profiles(id) on delete set null;

create index if not exists idx_admin_notifs_target_coach
  on public.admin_notifications(target_coach_id)
  where target_coach_id is not null;

drop policy if exists admin_notifs_select_coach on public.admin_notifications;
create policy admin_notifs_select_coach
  on public.admin_notifications for select
  to authenticated
  using (
    public.is_admin()
    or (
      public.is_staff()
      and (target_coach_id is null or target_coach_id = auth.uid())
    )
  );

drop policy if exists admin_notifs_insert_coach on public.admin_notifications;
create policy admin_notifs_insert_coach
  on public.admin_notifications for insert
  to authenticated
  with check (public.is_staff());

drop policy if exists admin_notifs_update_coach on public.admin_notifications;
create policy admin_notifs_update_coach
  on public.admin_notifications for update
  to authenticated
  using (
    public.is_admin()
    or (
      public.is_staff()
      and (target_coach_id is null or target_coach_id = auth.uid())
    )
  );

-- ============================================================
-- PART 8 — get_coach_client_list(): scoped + assignment columns
-- ============================================================
-- Plain coach → ONLY his assigned clients.
-- Admin → ALL clients + who they are assigned to (for reassignment UI).
-- Return type changes → DROP then CREATE (OR REPLACE cannot widen).
drop function if exists public.get_coach_client_list();

create function public.get_coach_client_list()
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
  fit_q_status text,
  assigned_coach_id uuid,
  assigned_coach_name text
)
language sql
security definer
set search_path = public
as $$
  select
    p.id,
    p.email,
    p.full_name,
    p.phone,
    p.avatar_url,
    p.created_at,

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
    ),

    (
      select s.status
      from public.subscriptions s
      where s.client_id = p.id
      order by s.created_at desc
      limit 1
    ),

    (
      select s.end_date
      from public.subscriptions s
      where s.client_id = p.id
      order by s.created_at desc
      limit 1
    ),

    (
      select s.months
      from public.subscriptions s
      where s.client_id = p.id
      order by s.created_at desc
      limit 1
    ),

    (
      select count(*)
      from public.subscription_requests sr
      where sr.user_id = p.id and sr.status = 'pending'
    )::int,

    (
      select nq.status
      from public.nutrition_questionnaires nq
      where nq.client_id = p.id
      limit 1
    ),

    (
      select fq.status
      from public.fitness_questionnaires fq
      where fq.client_id = p.id
      limit 1
    ),

    ca.coach_id,
    cp.full_name

  from public.profiles p
  left join public.coach_assignments ca on ca.client_id = p.id
  left join public.profiles cp on cp.id = ca.coach_id
  where p.role = 'client'
    and (public.is_admin() or ca.coach_id = auth.uid())
  order by p.created_at desc
$$;

grant execute on function public.get_coach_client_list() to authenticated;

-- ============================================================
-- PART 9 — PostgREST schema reload
-- ============================================================
notify pgrst, 'reload schema';

-- =====================================================================
-- ===== END OF SCRIPT 0030 — after pasting, press Ctrl+End in the
-- ===== SQL editor: you MUST see this marker. If you don't, the copy
-- ===== was truncated → re-copy everything from the RAW url above.
-- =====================================================================

-- =====================================================================
-- VERIFY (paste each in the SQL Editor):
--   1) select client_email, assigned_coach_name
--      from public.get_coach_client_list();   -- run AS the admin:
--      expected: ALL clients, each with the admin's name
--   2) select count(*) from public.coach_assignments;
--      expected: one row per existing client
--   3) insert a test signup → it should appear in coach_assignments
--      with coach_id = the admin (auto-assign trigger)
-- =====================================================================
