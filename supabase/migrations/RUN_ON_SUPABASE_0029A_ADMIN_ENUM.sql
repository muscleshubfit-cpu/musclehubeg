-- =====================================================================
-- RUN_ON_SUPABASE_0029A_ADMIN_ENUM.sql  (STEP 1 of 2 — run FIRST)
-- =====================================================================
-- ROLE MODEL v2 (owner directive 2026-08-29):
--   client  → consumer surfaces only
--   coach   → staff: own clients, coach tools, NO admin surfaces
--   admin   → platform owner / general coach: everything, zero limits
--
-- This file ONLY extends the user_role enum with 'admin'.
--
-- WHY A SEPARATE FILE: PostgreSQL 12+ allows ALTER TYPE ... ADD VALUE
-- inside a transaction, but the new value CANNOT BE USED in the same
-- transaction. Supabase SQL Editor wraps the whole script in one
-- transaction, so 0029B (which writes role='admin') must run AFTER this
-- file commits.
--
-- Run order (Supabase Dashboard → SQL Editor):
--   1. THIS FILE        (0029A)
--   2. RUN_ON_SUPABASE_0029B_ADMIN_ROLE.sql  (0029B)
--
-- Idempotent: safe to run multiple times.
-- =====================================================================

alter type public.user_role add value if not exists 'admin';

-- =====================================================================
-- VERIFY (0029A applied):
--   select unnest(enum_range(null::public.user_role));
-- Expected: client | coach | admin
-- =====================================================================
