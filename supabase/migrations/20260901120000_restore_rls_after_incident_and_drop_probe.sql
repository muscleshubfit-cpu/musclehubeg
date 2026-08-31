-- ============================================================================
-- 20260901120000_restore_rls_after_incident_and_drop_probe.sql
-- 0056 — RESTORE the FULL set of RLS guards that the Phase 61 incident
--        (partial re-run of 0001-0005) silently reverted, + drop the
--        Phase 61 probe table (clears the Supabase RLS advisory).
--
-- WHY (Phase 63 forensics, 2026-09-01):
--   0055 restored only 3 guards (handle_new_user, profiles_update_self,
--   subs_update via the 0017 wording). A full cross-check of every object
--   defined by 0001-0005 against every later migration found ~30 MORE
--   policies + is_coach() that were re-created with their OLD pre-hardening
--   definitions:
--     - 0030B multi-coach client-data scoping (is_coach_over) was reverted
--       to bare is_coach() → ANY coach could read ALL clients' plans,
--       chats, questionnaires, progress, tickets (PROVEN live: test coach
--       saw 10 other-client plans + 98 other-client chat rows).
--     - 0041 paid-activation + admin-only subscription update was reverted
--       to the 0001 self/coach version.
--     - 0030C admin-exclusive locks (referrals, earnings, blog CMS,
--       admin notifications routing) were reverted to 0003/0004 versions.
--     - 0029B is_coach() (coach OR admin) was reverted to coach-only
--       (0001) → admin lost table-level access wherever is_coach() gates.
--     - 0031 profiles select (coach_of clause) was reverted to 0001.
--
-- SOURCES (verbatim final definitions, chronological last-writer-wins):
--   is_coach()                    → RUN_ON_SUPABASE_0029B_ADMIN_ROLE.sql
--   profiles_select_self_or_coach → RUN_ON_SUPABASE_0031_COACH_PAGES.sql
--   subs_* + plans_insert_coach   → RUN_ON_SUPABASE_0041_COACH_CLIENT_BOUNDARY.sql
--   all other client-data policies→ RUN_ON_SUPABASE_0030B_MULTI_COACH_CLIENT_RLS.sql
--   admin-exclusive policies      → RUN_ON_SUPABASE_0030C_MULTI_COACH_ADMIN_RLS_NOTIFS.sql
--
-- ALSO: drop table public.gh_sync_probe — the Phase 61 integration probe
--   served its purpose (auto-apply proven 3/3) and triggered the Supabase
--   "RLS Disabled in Public" Critical advisory. Dropping removes it.
--
-- Idempotent: safe to re-run. Auto-applied by the GitHub integration.
-- ============================================================================

-- ─────────────────────────── PART 1 ───────────────────────────
-- is_coach() — restore 0029B: coach OR admin (0001 version excluded admin).
create or replace function public.is_coach()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role in ('coach', 'admin')
  )
$$;

-- ─────────────────────────── PART 2 ───────────────────────────
-- CLIENT-DATA scoping — restore 0030B/0031/0041 (is_coach_over, NOT bare
-- is_coach(), so a coach sees ONLY his assigned clients; admin sees all).

-- ---------- profiles (0031: own row + clients + page visitors) ----------
drop policy if exists profiles_select_self_or_coach on public.profiles;
create policy profiles_select_self_or_coach
  on public.profiles for select
  using (
    auth.uid() = id
    or public.is_coach_over(id)
    or public.coach_of(auth.uid()) = id
  );

-- ---------- subscriptions (0041: admin sees all; coach only active
--            coaching tier of his clients; update = admin only) ----------
drop policy if exists subs_select_owner_or_coach on public.subscriptions;
create policy subs_select_owner_or_coach
  on public.subscriptions for select
  using (
    auth.uid() = client_id
    or public.is_admin()
    or (public.is_coach_over(client_id) and tier = 'coaching')
  );

drop policy if exists subs_insert_self_or_coach on public.subscriptions;
create policy subs_insert_self_or_coach
  on public.subscriptions for insert
  with check (auth.uid() = client_id or public.is_admin());

drop policy if exists subs_update_self_or_coach on public.subscriptions;
create policy subs_update_self_or_coach
  on public.subscriptions for update
  using (public.is_admin())
  with check (public.is_admin());

-- ---------- nutrition_questionnaires (0030B) ----------
drop policy if exists nutriq_owner_or_coach on public.nutrition_questionnaires;
create policy nutriq_owner_or_coach
  on public.nutrition_questionnaires for select
  using (auth.uid() = client_id or public.is_coach_over(client_id));

drop policy if exists nutriq_update_self_or_coach on public.nutrition_questionnaires;
create policy nutriq_update_self_or_coach
  on public.nutrition_questionnaires for update
  using (auth.uid() = client_id or public.is_coach_over(client_id));

-- ---------- fitness_questionnaires (0030B) ----------
drop policy if exists fitq_owner_or_coach on public.fitness_questionnaires;
create policy fitq_owner_or_coach
  on public.fitness_questionnaires for select
  using (auth.uid() = client_id or public.is_coach_over(client_id));

drop policy if exists fitq_update_self_or_coach on public.fitness_questionnaires;
create policy fitq_update_self_or_coach
  on public.fitness_questionnaires for update
  using (auth.uid() = client_id or public.is_coach_over(client_id));

-- ---------- progress_entries (0030B) ----------
drop policy if exists progress_owner_or_coach on public.progress_entries;
create policy progress_owner_or_coach
  on public.progress_entries for select
  using (auth.uid() = client_id or public.is_coach_over(client_id));

-- ---------- plans (0030B select/update/delete + 0041 paid insert) ----------
drop policy if exists plans_owner_or_coach on public.plans;
create policy plans_owner_or_coach
  on public.plans for select
  using (auth.uid() = client_id or public.is_coach_over(client_id));

drop policy if exists plans_insert_coach on public.plans;
create policy plans_insert_coach
  on public.plans for insert
  with check (
    public.is_coach_over(client_id)
    and (
      public.is_admin()
      or exists (
        select 1 from public.subscriptions s
        -- 0041 REV 4: outer ref MUST be qualified as plans.client_id.
        where s.client_id = plans.client_id
          and s.tier = 'coaching'
          and s.status = 'active'
          and (s.end_date is null or s.end_date > now())
      )
    )
  );

drop policy if exists plans_update_coach on public.plans;
create policy plans_update_coach
  on public.plans for update
  using (public.is_coach_over(client_id));

drop policy if exists plans_delete_coach on public.plans;
create policy plans_delete_coach
  on public.plans for delete
  using (public.is_coach_over(client_id));

-- ---------- support_tickets (0030B) ----------
drop policy if exists tickets_owner_or_coach on public.support_tickets;
create policy tickets_owner_or_coach
  on public.support_tickets for select
  using (auth.uid() = client_id or public.is_coach_over(client_id));

drop policy if exists tickets_update_coach on public.support_tickets;
create policy tickets_update_coach
  on public.support_tickets for update
  using (auth.uid() = client_id or public.is_coach_over(client_id));

-- ---------- ticket_messages (0030B, via parent ticket) ----------
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

-- ---------- chat_messages (0030B) ----------
drop policy if exists chat_owner_or_coach on public.chat_messages;
create policy chat_owner_or_coach
  on public.chat_messages for select
  using (auth.uid() = client_id or public.is_coach_over(client_id));

-- ---------- notifications (0030B, to authenticated) ----------
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

-- ─────────────────────────── PART 3 ───────────────────────────
-- ADMIN-EXCLUSIVE tables — restore 0030C (is_admin(), not is_coach()).

-- ---------- referrals + earnings (0030C) ----------
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

-- ---------- blog_posts CMS (0030C: admin-exclusive management) ----------
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

-- ---------- admin_notifications routing (0030C) ----------
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

-- ─────────────────────────── PART 4 ───────────────────────────
-- Phase 61 cleanup: probe table served its purpose (auto-apply proven);
-- drop it → the Supabase "RLS Disabled in Public" advisory disappears.
drop table if exists public.gh_sync_probe;

-- ─────────────────────────── PART 5 ───────────────────────────
notify pgrst, 'reload schema';

-- VERIFICATION GRID — all values must be 1 / t:
select
  (select position('admin' in prosrc) > 0 from pg_proc where proname = 'is_coach') as is_coach_incl_admin,
  (select count(*) from pg_policies where tablename = 'plans' and policyname = 'plans_owner_or_coach' and coalesce(qual, '') like '%is_coach_over%') as plans_scoped,
  (select count(*) from pg_policies where tablename = 'chat_messages' and policyname = 'chat_owner_or_coach' and coalesce(qual, '') like '%is_coach_over%') as chat_scoped,
  (select count(*) from pg_policies where tablename = 'profiles' and policyname = 'profiles_select_self_or_coach' and coalesce(qual, '') like '%coach_of%') as profiles_scoped,
  (select count(*) from pg_policies where tablename = 'subscriptions' and policyname = 'subs_select_owner_or_coach' and coalesce(qual, '') like '%coaching%') as subs_scoped,
  (select count(*) from pg_policies where tablename = 'subscriptions' and policyname = 'subs_update_self_or_coach' and coalesce(with_check, '') like '%is_admin%') as subs_update_admin_only,
  (select count(*) from pg_policies where tablename = 'plans' and policyname = 'plans_insert_coach' and coalesce(with_check, '') like '%status = ''active''%') as plans_insert_paid_gate,
  (select count(*) from pg_policies where tablename = 'blog_posts' and policyname = 'blog_posts_coach_write' and coalesce(with_check, '') like '%is_admin%') as blog_admin_only,
  (select count(*) from pg_policies where tablename = 'notifications' and policyname = 'notifs_select_owner_or_coach' and coalesce(qual, '') like '%is_coach_over%') as notifs_scoped,
  (select to_regclass('public.gh_sync_probe') is null) as probe_table_dropped;
