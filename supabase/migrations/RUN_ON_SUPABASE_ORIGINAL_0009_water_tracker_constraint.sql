-- =====================================================================
--  MuscleHub — Add water-tracker to allowed saved_results tool_slugs
--
--  The base 0007_saved_results.sql migration created a CHECK constraint
--  that only allowed 4 tool slugs. This migration drops and recreates the
--  constraint to also allow 'water-tracker'.
-- =====================================================================

alter table public.saved_results
  drop constraint if exists saved_results_tool_slug_check;

alter table public.saved_results
  add constraint saved_results_tool_slug_check
  check (tool_slug in (
    'calorie-calculator',
    'bmi-calculator',
    'macro-calculator',
    'body-fat-calculator',
    'water-tracker'
  ));
