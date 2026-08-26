-- =====================================================================
--  MuscleHubEG — Verification: Are migrations 0017 + 0018 already applied?
--
--  Paste this into Supabase SQL Editor and Run.
--  Each query returns a result — check against "Expected" comments.
--  If ALL return the expected results, migrations are already applied.
-- =====================================================================

-- ─── 1. coach_emails table exists + Owner email seeded (0017) ───
select '1. coach_emails table' as check_name,
       count(*) as row_count,
       string_agg(email, ', ') as emails
from public.coach_emails;
-- Expected: row_count = 1, emails = 'speerr@gmail.com'


-- ─── 2. Functions exist (0017 + 0018) ───
select '2. Functions' as check_name,
       string_agg(proname, ', ' order by proname) as function_names,
       count(*) as function_count
from pg_proc
where proname in ('get_profile_role', 'auto_promote_coach_if_allowed', 'prevent_earnings_tamper', 'extend_subscription')
  and pronamespace = (select oid from pg_namespace where nspname = 'public');
-- Expected: function_count = 4, function_names includes all 4


-- ─── 3. profiles_update_self policy has WITH CHECK (0017) ───
select '3. profiles_update_self WITH CHECK' as check_name,
       polname,
       case when polwithcheck is not null then 'YES ✅' else 'NO ❌' end as has_with_check
from pg_policy
where polname = 'profiles_update_self';
-- Expected: has_with_check = 'YES ✅'


-- ─── 4. prevent_earnings_tamper trigger exists (0017) ───
select '4. prevent_earnings_tamper trigger' as check_name,
       tgname,
       case when tgname is not null then 'EXISTS ✅' else 'MISSING ❌' end as status
from pg_trigger
where tgname = 'prevent_earnings_tamper';
-- Expected: status = 'EXISTS ✅'


-- ─── 5. subs_update_self_or_coach is coach-only (0017) ───
select '5. subs_update coach-only' as check_name,
       polname,
       polqual::text as using_clause,
       polwithcheck::text as with_check_clause
from pg_policy
where polname = 'subs_update_self_or_coach';
-- Expected: both using_clause + with_check_clause contain 'is_coach'


-- ─── 6. extend_subscription function exists (0018) ───
select '6. extend_subscription' as check_name,
       proname,
       case when proname is not null then 'EXISTS ✅' else 'MISSING ❌' end as status
from pg_proc
where proname = 'extend_subscription'
  and pronamespace = (select oid from pg_namespace where nspname = 'public');
-- Expected: status = 'EXISTS ✅'


-- ─── 7. Summary: all checks at once ───
select 'SUMMARY' as check_name,
  (select count(*) from public.coach_emails) as coach_emails_rows,
  (select count(*) from pg_proc where proname in ('get_profile_role','auto_promote_coach_if_allowed','prevent_earnings_tamper','extend_subscription') and pronamespace = (select oid from pg_namespace where nspname='public')) as functions_count,
  (select count(*) from pg_trigger where tgname = 'prevent_earnings_tamper') as trigger_count,
  (select case when polwithcheck is not null then 1 else 0 end from pg_policy where polname = 'profiles_update_self') as profiles_with_check;
-- Expected: coach_emails_rows=1, functions_count=4, trigger_count=1, profiles_with_check=1
