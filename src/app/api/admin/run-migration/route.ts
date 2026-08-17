// @ts-nocheck
import { NextRequest, NextResponse } from "next/server";
import { requireCoach, isAuthConfigured } from "@/lib/auth-server";
import { supabaseAdmin, isSupabaseAdminConfigured } from "@/lib/supabase/admin";

/**
 * POST /api/admin/run-migration
 *
 * One-time endpoint to run DB migrations that require DDL access
 * (ALTER TABLE, CREATE INDEX, etc). Uses supabaseAdmin (service_role)
 * to execute raw SQL via Supabase's built-in RPC.
 *
 * This endpoint is coach-only.
 */

// The SQL we want to run — split into individual statements
const STATEMENTS = [
  // Step 1: Add subscription_type column
  `alter table public.subscriptions add column if not exists subscription_type text default 'membership'`,

  // Step 2: Backfill — coaching rows
  `update public.subscriptions set subscription_type = 'coaching' where tier = 'coaching'`,

  // Step 3: Backfill — membership rows
  `update public.subscriptions set subscription_type = 'membership' where tier in ('premium', 'pro', 'starter', 'elite') and subscription_type is null`,

  // Step 4: Drop old unique(client_id) constraint
  `alter table public.subscriptions drop constraint if exists subscriptions_client_id_key`,

  // Step 5: Add new unique(client_id, tier) index
  `create unique index if not exists subscriptions_client_id_tier_uidx on public.subscriptions (client_id, tier)`,

  // Step 6: Add status index
  `create index if not exists subscriptions_client_id_status_idx on public.subscriptions (client_id, status)`,

  // Step 7: Add subscription_type index
  `create index if not exists subscriptions_type_idx on public.subscriptions (subscription_type)`,

  // Step 8: Create exec_sql function for future migrations (if not exists)
  `create or replace function public.exec_sql(sql_text text) returns void as $$ begin execute sql_text; end; $$ language plpgsql security definer`,
];

export async function POST(request: NextRequest) {
  if (isAuthConfigured) {
    const auth = await requireCoach(request);
    if (auth instanceof Response) return auth;
  }

  if (!isSupabaseAdminConfigured || !supabaseAdmin) {
    return NextResponse.json(
      { error: "Supabase admin not configured" },
      { status: 500 },
    );
  }

  const results: Array<{ step: number; sql: string; ok: boolean; error?: string }> = [];

  for (let i = 0; i < STATEMENTS.length; i++) {
    const stmt = STATEMENTS[i];
    try {
      // Try using the exec_sql RPC function (if it exists)
      const { error } = await supabaseAdmin.rpc("exec_sql", {
        sql_text: stmt,
      });

      if (error) {
        // If exec_sql doesn't exist yet, we need to create it first.
        // But we can't create it without DDL access... catch-22.
        // So for the LAST statement (creating exec_sql), it's expected
        // to fail if it already exists.
        if (i === STATEMENTS.length - 1 && error.message.includes("already exists")) {
          results.push({ step: i + 1, sql: stmt.slice(0, 80), ok: true });
        } else {
          results.push({ step: i + 1, sql: stmt.slice(0, 80), ok: false, error: error.message });
        }
      } else {
        results.push({ step: i + 1, sql: stmt.slice(0, 80), ok: true });
      }
    } catch (e: any) {
      results.push({ step: i + 1, sql: stmt.slice(0, 80), ok: false, error: e.message });
    }
  }

  const allOk = results.every((r) => r.ok);
  return NextResponse.json({
    ok: allOk,
    results,
    message: allOk
      ? "Migration completed successfully — multi-subscription support is now active"
      : "Some statements failed — check results for details",
  });
}
