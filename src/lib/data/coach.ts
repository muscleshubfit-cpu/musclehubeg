"use client";

import {
 supabase,
 isSupabaseConfigured,
} from "./helpers";

// ---------------------------------------------------------------------------
// Coach presence (online status)
// Phase 105: rewritten against the LIVE production shape proven
// column-by-column in Phase 99-run — coach_presence has id · coach_id ·
// last_seen · updated_at (NO user_id, NO status column). The previous
// implementation queried user_id/status and therefore failed silently
// on production forever (always «offline»).
// Online semantics WITHOUT a status column: a fresh last_seen (≤ 2 min)
// = online; going offline removes the row entirely.
// ---------------------------------------------------------------------------

const ONLINE_WINDOW_MS = 2 * 60 * 1000;

export async function getCoachPresence(coachId: string) {
 if (isSupabaseConfigured && supabase) {
 const { data } = await supabase
 .from("coach_presence")
 .select("coach_id, last_seen")
 .eq("coach_id", coachId)
 .maybeSingle();
 if (!data) return { status: "offline", lastSeen: null };
 // Consider online if last seen < 2 minutes ago
 const lastSeen = new Date(data.last_seen);
 const isOnline = Date.now() - lastSeen.getTime() < ONLINE_WINDOW_MS;
 return { status: isOnline ? "online" : "offline", lastSeen: data.last_seen };
 }
 return { status: "offline", lastSeen: null };
}

export async function updateCoachPresence(coachId: string, status: "online" | "offline") {
 if (isSupabaseConfigured && supabase) {
 // Defensive select-then-update/insert on the LIVE coach_id key —
 // upsert(onConflict) is avoided because the live uniqueness of
 // coach_id is unproven (Phase 99-run probed columns, not constraints).
 const { data: existing } = await supabase
 .from("coach_presence")
 .select("id")
 .eq("coach_id", coachId)
 .maybeSingle();
 if (status === "offline") {
 if (existing) {
 await supabase.from("coach_presence").delete().eq("id", existing.id);
 }
 return;
 }
 if (existing) {
 await supabase
 .from("coach_presence")
 .update({ last_seen: new Date().toISOString(), updated_at: new Date().toISOString() })
 .eq("id", existing.id);
 } else {
 await supabase
 .from("coach_presence")
 .insert({ coach_id: coachId, last_seen: new Date().toISOString() });
 }
 }
}
