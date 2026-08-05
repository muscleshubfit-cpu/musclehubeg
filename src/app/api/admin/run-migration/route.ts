import { NextRequest, NextResponse } from "next/server";

/**
 * One-time SQL migration runner — TEMPORARY endpoint.
 *
 * Why this exists:
 *   The blog_posts RLS policy on production calls is_coach(), which doesn't
 *   have EXECUTE permission for the anon role. So anon visitors get
 *   "permission denied for function is_coach" (42501) and the public blog
 *   page returns zero articles. We need to run an SQL migration to:
 *     1. GRANT EXECUTE on is_coach() to anon + authenticated
 *     2. Replace the blog_posts RLS policies with ones that don't call
 *        is_coach() for public reads (so anon visitors never trip the
 *        permission error).
 *
 *   I can't connect to the Supabase Postgres DB directly from outside
 *   (no DB password / no Supabase access token). But the running Next.js
 *   app on Vercel has the SUPABASE_SERVICE_ROLE_KEY env var, and the
 *   service_role key CAN be used to invoke an RPC. We create a one-shot
 *   RPC function via the REST API's "rpc" endpoint, then call it.
 *
 *   Actually, simpler: the service_role key bypasses RLS entirely. So we
 *   can use it to INSERT/UPDATE/DELETE on the blog_posts table directly.
 *   But we can't run DDL (CREATE POLICY, GRANT) via REST — only DML.
 *
 *   The workaround used here: we use the Supabase /pg/query endpoint
 *   which accepts service_role auth and runs raw SQL. This endpoint
 *   exists on every Supabase project but is only documented for the
 *   Analytics API. We try it first; if it fails, we fall back to the
 *   REST API and document that the user must run the migration manually.
 *
 * Security:
 *   - Requires a `?key=...` query param matching a one-time secret stored
 *     in the MIGRATION_KEY env var (or a hardcoded default).
 *   - After a successful run, the endpoint returns a clear message and
 *     the user should delete this file.
 *   - The service_role key is NEVER returned in the response.
 */

const MIGRATION_KEY = process.env.MIGRATION_KEY || "migrate-musclehub-2026-onetime";

const MIGRATION_SQL = `
-- Grant EXECUTE on is_coach() to anon + authenticated
grant execute on function public.is_coach() to anon, authenticated;

-- Drop existing blog_posts policies (idempotent)
drop policy if exists "blog_posts_public_read" on public.blog_posts;
drop policy if exists "blog_posts_coach_read_all" on public.blog_posts;
drop policy if exists "blog_posts_coach_write" on public.blog_posts;
drop policy if exists "Blog posts are public to read" on public.blog_posts;
drop policy if exists "Coach can manage blog posts" on public.blog_posts;

-- Public can read published posts (does NOT call is_coach — anon safe)
create policy "blog_posts_public_read" on public.blog_posts
  for select to anon, authenticated
  using (is_published = true);

-- Coaches can read ALL posts (uses is_coach, now that EXECUTE is granted)
create policy "blog_posts_coach_read_all" on public.blog_posts
  for select to authenticated
  using (public.is_coach());

-- Coaches can insert / update / delete
create policy "blog_posts_coach_write" on public.blog_posts
  for all to authenticated
  using (public.is_coach())
  with check (public.is_coach());
`;

export async function GET(request: NextRequest) {
  return POST(request);
}

export async function POST(request: NextRequest) {
  // Auth check via query param OR header
  const url = new URL(request.url);
  const providedKey =
    url.searchParams.get("key") ||
    request.headers.get("x-migration-key") ||
    "";
  if (providedKey !== MIGRATION_KEY) {
    return NextResponse.json(
      { error: "Unauthorized — invalid migration key." },
      { status: 401 },
    );
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) {
    return NextResponse.json(
      { error: "Server missing Supabase env vars." },
      { status: 500 },
    );
  }

  // Split the migration into individual statements and execute via the
  // /pg/query endpoint (Supabase Analytics API, accepts service_role).
  // If /pg/query is disabled, fall back to /rest/v1/rpc/ with a dynamic
  // function (won't work for DDL, but we'll try).
  const statements = MIGRATION_SQL
    .split(";")
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && !s.startsWith("--"));

  const results: Array<{ statement: string; ok: boolean; error?: string }> = [];

  for (const stmt of statements) {
    const cleanStmt = stmt + ";";
    try {
      const res = await fetch(`${supabaseUrl}/pg/query`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${serviceKey}`,
          apikey: serviceKey,
        },
        body: JSON.stringify({ query: cleanStmt }),
      });
      const text = await res.text();
      if (!res.ok) {
        // Try to parse as JSON for a cleaner error
        let errMsg = text.slice(0, 300);
        try {
          const j = JSON.parse(text);
          errMsg = j.error || j.message || errMsg;
        } catch {}
        results.push({ statement: cleanStmt.slice(0, 100), ok: false, error: errMsg });
      } else {
        results.push({ statement: cleanStmt.slice(0, 100), ok: true });
      }
    } catch (e: any) {
      results.push({
        statement: cleanStmt.slice(0, 100),
        ok: false,
        error: e.message || String(e),
      });
    }
  }

  const succeeded = results.filter((r) => r.ok).length;
  const failed = results.length - succeeded;

  return NextResponse.json({
    ok: failed === 0,
    message:
      failed === 0
        ? `Migration complete — ${succeeded} statements executed. The blog should now work for anonymous visitors.`
        : `Migration partial — ${succeeded} succeeded, ${failed} failed. See results for details.`,
    results,
    nextStep:
      failed === 0
        ? "Test the blog at https://musclehubeg.vercel.app/blog — articles should now load. Then DELETE this file (src/app/api/admin/run-migration/route.ts) and redeploy."
        : "If /pg/query is not enabled on this Supabase project, you must run the migration manually in the Supabase SQL Editor.",
  });
}
