"use client";

import {
 supabase,
 isSupabaseConfigured,
} from "./helpers";

// ---------------------------------------------------------------------------
// Coach presence (online status)
// ---------------------------------------------------------------------------

export async function getCoachPresence() {
 if (isSupabaseConfigured && supabase) {
 const { data } = await supabase
 .from("coach_presence")
 .select("*")
 .limit(1)
 .maybeSingle();
 if (!data) return { status: "offline", lastSeen: null };
 // Consider online if last seen < 2 minutes ago
 const lastSeen = new Date(data.last_seen);
 const isOnline = Date.now() - lastSeen.getTime() < 2 * 60 * 1000;
 return { status: isOnline ? "online" : "offline", lastSeen: data.last_seen };
 }
 return { status: "offline", lastSeen: null };
}

export async function updateCoachPresence(userId: string, status: "online" | "offline") {
 if (isSupabaseConfigured && supabase) {
 // Upsert presence
 const { data: existing } = await supabase
 .from("coach_presence")
 .select("id")
 .eq("user_id", userId)
 .maybeSingle();
 if (existing) {
 await supabase
 .from("coach_presence")
 .update({ status, last_seen: new Date().toISOString() })
 .eq("id", existing.id);
 } else {
 await supabase
 .from("coach_presence")
 .insert({ user_id: userId, status, last_seen: new Date().toISOString() });
 }
 }
}
