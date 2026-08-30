"use client";

import {
 supabase,
 isSupabaseConfigured,
 read,
 write,
 uid,
 LS_PREFIX,
} from "./helpers";

// ---------------------------------------------------------------------------
// Notifications
// ---------------------------------------------------------------------------

export async function listNotifications(userId: string) {
 if (isSupabaseConfigured && supabase) {
 const { data } = await supabase
 .from("notifications")
 .select("*")
 .eq("user_id", userId)
 .order("created_at", { ascending: false })
 .limit(20);
 return data ?? [];
 }
 return read<any[]>(LS_PREFIX + "notifs", []).filter((n) => n.user_id === userId);
}

export async function markNotificationsRead(userId: string) {
 if (isSupabaseConfigured && supabase) {
 await supabase.from("notifications").update({ read: true }).eq("user_id", userId).eq("read", false);
 return;
 }
 const all = read<any[]>(LS_PREFIX + "notifs", []);
 all.forEach((n) => { if (n.user_id === userId) n.read = true; });
 write(LS_PREFIX + "notifs", all);
}

// 0049 — per-item read: clicking ONE notification marks IT read
// (owner rule: «بعد الضغط على الاشعار بيفضل موجود غير مقروء — مفروض
// يختفى مقروء»). RLS notifs_update_self_or_coach lets the owner update
// his own rows client-side; the bell flips its state optimistically.
export async function markNotificationRead(id: string) {
 if (isSupabaseConfigured && supabase) {
 await supabase.from("notifications").update({ read: true }).eq("id", id);
 return;
 }
 const all = read<any[]>(LS_PREFIX + "notifs", []);
 all.forEach((n) => { if (n.id === id) n.read = true; });
 write(LS_PREFIX + "notifs", all);
}

export async function createNotification(userId: string, type: string, title: string, body: string, link?: string) {
 if (isSupabaseConfigured && supabase) {
 const { data, error } = await supabase
 .from("notifications")
 .insert({ user_id: userId, type, title, body, link })
 .select()
 .single();
 if (error) throw new Error(error.message);
 return data;
 }
 const all = read<any[]>(LS_PREFIX + "notifs", []);
 const row = { id: uid(), user_id: userId, type, title, body, link, read: false, created_at: new Date().toISOString() };
 all.push(row);
 write(LS_PREFIX + "notifs", all);
 return row;
}

// ---------------------------------------------------------------------------
// Admin Notifications (for coach)
// ---------------------------------------------------------------------------

export async function listAdminNotifications() {
 if (isSupabaseConfigured && supabase) {
 const { data } = await supabase
 .from("admin_notifications")
 .select("*")
 .order("created_at", { ascending: false })
 .limit(30);
 return data ?? [];
 }
 return read<any[]>(LS_PREFIX + "admin_notifs", []);
}

export async function markAdminNotificationsRead() {
 if (isSupabaseConfigured && supabase) {
 await supabase.from("admin_notifications").update({ read: true }).eq("read", false);
 return;
 }
 const all = read<any[]>(LS_PREFIX + "admin_notifs", []);
 all.forEach((n) => { n.read = true; });
 write(LS_PREFIX + "admin_notifs", all);
}

// 0049 — staff bell: clicking ONE admin_notification marks IT read
// (same owner rule as the client bell). RLS allows admins to update any
// row and staff to update broadcast rows or rows targeted at them.
export async function markAdminNotificationRead(id: string) {
 if (isSupabaseConfigured && supabase) {
 await supabase.from("admin_notifications").update({ read: true }).eq("id", id);
 return;
 }
 const all = read<any[]>(LS_PREFIX + "admin_notifs", []);
 all.forEach((n) => { if (n.id === id) n.read = true; });
 write(LS_PREFIX + "admin_notifs", all);
}

export async function createAdminNotification(
 type: string,
 title: string,
 body: string,
 link?: string,
 clientId?: string,
) {
 if (isSupabaseConfigured && supabase) {
 // Use the server-side endpoint instead of direct supabase insert.
 // The RLS policy on admin_notifications only allows coaches to
 // insert directly — but createAdminNotification is called from
 // client-side code (new_client, questionnaire_submitted, new_ticket,
 // payment_request) where the user is NOT a coach. The server endpoint
 // uses supabaseAdmin (service_role) to bypass RLS.
 //
 // MULTI-COACH ROUTING: `clientId` lets the server route the bell
 // notification to the client's ASSIGNED coach (target_coach_id)
 // instead of the legacy broadcast-to-all-staff.
 try {
 const res = await fetch("/api/notifications/admin", {
 method: "POST",
 headers: { "Content-Type": "application/json" },
 body: JSON.stringify({ type, title, body, link, clientId }),
 });
 if (!res.ok) {
 const err = await res.json().catch(() => ({}));
 throw new Error(err.error || `HTTP ${res.status}`);
 }
 const data = await res.json();
 return data;
 } catch (e: any) {
 // Re-throw so callers can .catch() if they want to suppress
 throw e;
 }
 }
 const all = read<any[]>(LS_PREFIX + "admin_notifs", []);
 const row = { id: uid(), type, title, body, link, read: false, created_at: new Date().toISOString() };
 all.push(row);
 write(LS_PREFIX + "admin_notifs", all);
 return row;
}
