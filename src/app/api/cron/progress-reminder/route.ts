import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin, isSupabaseAdminConfigured } from "@/lib/supabase/admin";

export const maxDuration = 120;

/**
 * Weekly progress reminder cron.
 *
 * Runs every Sunday at 09:00 Cairo (Africa/Cairo, UTC+2).
 * Sends a notification to every ACTIVE client who has NOT logged
 * a progress entry in the current calendar week (Mon–Sun).
 *
 * Dedup: we check for an existing notification with type
 * "progress_weekly_reminder" whose created_at falls in the same
 * calendar week. If found, we skip that client.
 */
export async function GET(request: NextRequest) {
  // ── Auth ───────────────────────────────────────────────────────────
  // Vercel Cron sends Authorization: Bearer <CRON_SECRET>.
  // Fail-closed: if CRON_SECRET is not set, reject with 401 (C4 fix).
  const auth = request.headers.get("authorization");
  const expected = process.env.CRON_SECRET;
  if (!expected || auth !== `Bearer ${expected}`)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!isSupabaseAdminConfigured || !supabaseAdmin)
    return NextResponse.json({ error: "Supabase admin not configured." }, { status: 500 });

  // ── Time helpers ───────────────────────────────────────────────────
  // Cairo is UTC+2 (no DST in Egypt since 2014)
  const CAIRO_OFFSET = 2;
  const now = new Date();
  const cairoNow = new Date(now.getTime() + CAIRO_OFFSET * 60 * 60 * 1000);

  // Cairo day-of-week: 0 = Sunday, 1 = Monday, … 6 = Saturday
  const cairoDow = cairoNow.getUTCDay();

  // Start of the current Cairo week = Monday 00:00 Cairo
  const mondayOffset = cairoDow === 0 ? -6 : 1 - cairoDow;
  const weekStartCairo = new Date(cairoNow);
  weekStartCairo.setUTCHours(0, 0, 0, 0);
  weekStartCairo.setUTCDate(weekStartCairo.getUTCDate() + mondayOffset);

  // Convert week start back to UTC for DB comparison
  const weekStartUTC = new Date(weekStartCairo.getTime() - CAIRO_OFFSET * 60 * 60 * 1000);

  // Notification dedup window: same week start
  // If a "progress_weekly_reminder" notification was created after weekStartUTC, skip

  try {
    // ── 1. Fetch all active clients ───────────────────────────────────
    const { data: activeClients, error: clientsErr } = await supabaseAdmin
      .from("profiles")
      .select("id, full_name")
      .eq("role", "client");

    if (clientsErr) throw new Error(`Profiles query: ${clientsErr.message}`);

    if (!activeClients || activeClients.length === 0) {
      return NextResponse.json({ ok: true, reminded: 0, message: "No active clients found." });
    }

    // ── 2. Check which clients have active subscriptions ──────────────
    const clientIds = activeClients.map((c) => c.id);

    const { data: activeSubs, error: subsErr } = await supabaseAdmin
      .from("subscriptions")
      .select("client_id")
      .eq("status", "active")
      .in("client_id", clientIds);

    if (subsErr) throw new Error(`Subscriptions query: ${subsErr.message}`);

    const activeClientIds = new Set(
      (activeSubs || []).map((s) => s.client_id),
    );

    if (activeClientIds.size === 0) {
      return NextResponse.json({ ok: true, reminded: 0, message: "No clients with active subscriptions." });
    }

    // ── 3. Check who already has a progress entry this week ───────────
    const { data: weekEntries, error: entriesErr } = await supabaseAdmin
      .from("progress_entries")
      .select("client_id")
      .gte("created_at", weekStartUTC.toISOString())
      .in("client_id", Array.from(activeClientIds));

    if (entriesErr) throw new Error(`Progress entries query: ${entriesErr.message}`);

    const clientsWithProgress = new Set(
      (weekEntries || []).map((e) => e.client_id),
    );

    // Clients who need a reminder = active but no progress this week
    const needsReminder = Array.from(activeClientIds).filter(
      (id) => !clientsWithProgress.has(id),
    );

    if (needsReminder.length === 0) {
      return NextResponse.json({ ok: true, reminded: 0, message: "All active clients already logged progress this week." });
    }

    // ── 4. Dedup: skip clients who already received a reminder this week ─
    const { data: existingNotifs, error: notifsErr } = await supabaseAdmin
      .from("notifications")
      .select("user_id")
      .eq("type", "progress_weekly_reminder")
      .gte("created_at", weekStartUTC.toISOString())
      .in("user_id", needsReminder);

    if (notifsErr) throw new Error(`Notifications dedup query: ${notifsErr.message}`);

    const alreadyReminded = new Set(
      (existingNotifs || []).map((n) => n.user_id),
    );

    const toRemind = needsReminder.filter((id) => !alreadyReminded.has(id));

    if (toRemind.length === 0) {
      return NextResponse.json({ ok: true, reminded: 0, message: "All clients already received a reminder this week." });
    }

    // ── 5. Build and insert notifications ─────────────────────────────
    const clientMap = new Map(activeClients.map((c) => [c.id, c]));

    const notifRows = toRemind.map((clientId) => {
      const client = clientMap.get(clientId);
      // NOTE: profiles has NO per-user language column (verified across
      // all migrations) — the old code selected a phantom `lang`, which
      // made PostgREST reject the ENTIRE query (hidden for years by an
      // `any` annotation). Site language is URL-locale based; the old
      // ternary's own fallback branch was "ar" (Alkemos core
      // audience) — the AR text below IS that designed fallback, with
      // the unreachable EN branch removed as dead code.
      const name = client?.full_name || "";

      const title = `حان وقت تسجيل تقدمك الأسبوعي!`;

      const body = `${name ? `مرحباً ${name}` : "مرحباً"}، متنساش تسجل متابعتك الأسبوعية (الوزن، القياسات، الطاقة). ده بيساعد كوتشك يتتبع تقدمك!`;

      return {
        user_id: clientId,
        type: "progress_weekly_reminder",
        title,
        body,
        link: "/progress",
        read: false,
      };
    });

    // Insert in batches of 100 to avoid Supabase payload limits
    const BATCH = 100;
    let totalInserted = 0;

    for (let i = 0; i < notifRows.length; i += BATCH) {
      const batch = notifRows.slice(i, i + BATCH);
      const { error: insertErr } = await supabaseAdmin
        .from("notifications")
        .insert(batch);

      if (insertErr) {
        console.error(
          `[progress-reminder] Batch insert error (offset ${i}):`,
          insertErr.message,
        );
        // Continue with remaining batches
        continue;
      }
      totalInserted += batch.length;
    }

    return NextResponse.json({
      ok: true,
      reminded: totalInserted,
      skipped: {
        noSubscription: clientIds.length - activeClientIds.size,
        hasProgress: clientsWithProgress.size,
        alreadyReminded: alreadyReminded.size,
      },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[progress-reminder] Error:", msg);
    return NextResponse.json(
      { error: msg || "Failed" },
      { status: 500 },
    );
  }
}
