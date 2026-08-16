import { NextRequest, NextResponse } from "next/server";
import { requireCoach, isAuthConfigured } from "@/lib/auth-server";

/**
 * POST /api/admin/run-migration
 *
 * Runs pending SQL migrations against production Supabase using the
 * service-role key (server-only, bypasses RLS).
 *
 * Body:
 *   { migration: "0006_tool_leads" }
 *
 * Auth: coach-only (via session cookies).
 *
 * Available migrations are whitelisted in MIGRATIONS below — no arbitrary
 * SQL is accepted from the client.
 */

const MIGRATIONS: Record<string, string> = {
  "0006_tool_leads": `
-- ---------- tool_leads ----------
create table if not exists public.tool_leads (
  id uuid primary key default gen_random_uuid(),
  tool_slug text not null check (tool_slug in ('calorie-calculator', 'bmi-calculator', 'macro-calculator', 'body-fat-calculator')),
  email text,
  whatsapp text,
  result_summary text,
  result_json jsonb,
  lang text default 'ar',
  consent boolean not null default true,
  contacted boolean not null default false,
  converted boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists tool_leads_created_at_idx on public.tool_leads (created_at desc);
create index if not exists tool_leads_tool_slug_idx on public.tool_leads (tool_slug);
create index if not exists tool_leads_email_idx on public.tool_leads (email) where email is not null;
create index if not exists tool_leads_whatsapp_idx on public.tool_leads (whatsapp) where whatsapp is not null;

alter table public.tool_leads enable row level security;

drop policy if exists "Anyone can submit a tool lead" on public.tool_leads;
create policy "Anyone can submit a tool lead"
  on public.tool_leads for insert
  to anon, authenticated
  with check (true);

drop policy if exists "Coaches can view tool leads" on public.tool_leads;
create policy "Coaches can view tool leads"
  on public.tool_leads for select
  to authenticated
  using (public.is_coach());

drop policy if exists "Coaches can update tool leads" on public.tool_leads;
create policy "Coaches can update tool leads"
  on public.tool_leads for update
  to authenticated
  using (public.is_coach())
  with check (public.is_coach());

drop policy if exists "Coaches can delete tool leads" on public.tool_leads;
create policy "Coaches can delete tool leads"
  on public.tool_leads for delete
  to authenticated
  using (public.is_coach());
  `.trim(),
};

export async function POST(request: NextRequest) {
  // Auth: coach session OR a temporary admin secret (for one-shot migrations
  // when we don't have a logged-in coach browser session handy).
  // The admin secret is read from ADMIN_MIGRATION_SECRET env var (server-only).
  const adminSecret = process.env.ADMIN_MIGRATION_SECRET;
  const providedSecret = request.headers.get("x-admin-secret") || "";

  if (adminSecret && providedSecret && adminSecret === providedSecret) {
    // Authenticated via admin secret — skip coach check
  } else if (isAuthConfigured) {
    const auth = await requireCoach(request);
    if (auth instanceof Response) return auth;
  } else {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const migrationName = body?.migration;

  if (!migrationName || !MIGRATIONS[migrationName]) {
    return NextResponse.json(
      {
        error: "Unknown migration",
        available: Object.keys(MIGRATIONS),
      },
      { status: 400 },
    );
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceKey) {
    return NextResponse.json(
      {
        error:
          "SUPABASE_SERVICE_ROLE_KEY not configured on server. Cannot run DDL.",
      },
      { status: 500 },
    );
  }

  // Supabase's REST API (PostgREST) doesn't support DDL statements.
  // However, the Postgres direct connection DOES. We try the /pg/query
  // endpoint first (enabled on some projects), then fall back to the
  // Management API.
  //
  // Approach: try the /pg/query endpoint via the project URL.
  // If 404, fall back to reporting what to do manually.
  const sql = MIGRATIONS[migrationName];

  try {
    // Try /pg/query (some Supabase projects enable this for service role)
    const pgRes = await fetch(`${supabaseUrl}/pg/query`, {
      method: "POST",
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query: sql }),
    });

    if (pgRes.ok) {
      const result = await pgRes.json();
      return NextResponse.json({
        ok: true,
        migration: migrationName,
        method: "pg/query",
        result,
      });
    }

    const errText = await pgRes.text();
    return NextResponse.json(
      {
        error: "Migration runner endpoint not available",
        status: pgRes.status,
        details: errText,
        hint:
          "Open Supabase SQL Editor and paste the migration SQL manually. See supabase/migrations/0006_tool_leads.sql",
        sqlForManualRun: sql,
      },
      { status: 500 },
    );
  } catch (e: any) {
    return NextResponse.json(
      {
        error: "Network error running migration",
        details: e?.message,
      },
      { status: 500 },
    );
  }
}
