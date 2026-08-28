-- =====================================================================
-- RUN_ON_SUPABASE_0030B_MULTI_COACH_CLIENT_RLS.sql   (PART 2 of 4)
-- =====================================================================
-- RUN ORDER (strict):  0030A -> 0030B -> 0030C -> 0030D
-- B = RLS rewrites on CLIENT-DATA tables: profiles, subscriptions,
--     nutrition/fitness questionnaires, progress, plans, tickets,
--     ticket_messages, chat, notifications — is_coach() replaced by
--     is_coach_over(client_col) so a plain coach sees ONLY his
--     assigned clients (same policy names, drop + recreate).
--
-- PREREQ: is_coach_over() is created in 0030A. If B errors with
-- "function public.is_coach_over(uuid) does not exist" — run A first.
-- Idempotent: safe to re-run.
--
-- HOW TO PASTE: RAW url -> Ctrl+A, Ctrl+C -> NEW empty query -> paste
-- -> Ctrl+End -> see "END OF SCRIPT 0030B" -> Run -> "Success. No rows
-- returned".
--
-- RAW (this part B):
-- https://raw.githubusercontent.com/muscleshubfit-cpu/musclehubeg/main/supabase/migrations/RUN_ON_SUPABASE_0030B_MULTI_COACH_CLIENT_RLS.sql
-- RAW (next — C):
-- https://raw.githubusercontent.com/muscleshubfit-cpu/musclehubeg/main/supabase/migrations/RUN_ON_SUPABASE_0030C_MULTI_COACH_ADMIN_RLS_NOTIFS.sql
-- =====================================================================

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


-- =====================================================================
-- ===== END OF SCRIPT 0030B — if you can see this line (Ctrl+End), the
-- ===== paste is complete. NOW RUN PART 0030C.
-- =====================================================================
