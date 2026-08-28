-- =====================================================================
-- RUN_ON_SUPABASE_0030C_MULTI_COACH_ADMIN_RLS_NOTIFS.sql   (PART 3 of 4)
-- =====================================================================
-- RUN ORDER (strict):  0030A -> 0030B -> 0030C -> 0030D
-- C = admin-exclusive locks (referrals/earnings/payouts, tool_leads,
--     blog_posts, audit_log, coach_emails -> is_admin()) + payments
--     scoped per coach (subscription_requests via is_coach_over) +
--     coach notifications routing (admin_notifications.target_coach_id
--     + scoped select/update policies).
--
-- PREREQ: 0030A (is_coach_over) + migration 0029 already applied
-- (is_admin / is_staff). Idempotent: safe to re-run.
--
-- HOW TO PASTE: RAW url -> Ctrl+A, Ctrl+C -> NEW empty query -> paste
-- -> Ctrl+End -> see "END OF SCRIPT 0030C" -> Run -> "Success. No rows
-- returned".
--
-- RAW (this part C):
-- https://raw.githubusercontent.com/muscleshubfit-cpu/musclehubeg/main/supabase/migrations/RUN_ON_SUPABASE_0030C_MULTI_COACH_ADMIN_RLS_NOTIFS.sql
-- RAW (next — D, the final part):
-- https://raw.githubusercontent.com/muscleshubfit-cpu/musclehubeg/main/supabase/migrations/RUN_ON_SUPABASE_0030D_MULTI_COACH_RPC_RELOAD.sql
-- =====================================================================

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


-- =====================================================================
-- ===== END OF SCRIPT 0030C — if you can see this line (Ctrl+End), the
-- ===== paste is complete. NOW RUN PART 0030D (the final part).
-- =====================================================================
