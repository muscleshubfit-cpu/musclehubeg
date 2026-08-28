"use client";

import {
 supabase,
 isSupabaseConfigured,
 read,
 write,
 uid,
 LS_PLANS,
 LS_TICKETS,
} from "./helpers";
import { createNotification, createAdminNotification } from "./notifications";
import { getSubscriptionForClient } from "./subscriptions";
import { getLimits } from "@/lib/memberships";

export async function listPlans(clientId: string) {
 if (isSupabaseConfigured && supabase) {
 // Client sees ONLY approved + current plans (drafts are hidden until coach approves)
 const { data } = await supabase
 .from("plans")
 .select("*")
 .eq("client_id", clientId)
 .eq("status", "approved")
 .eq("is_current", true)
 .order("created_at", { ascending: false });
 return data ?? [];
 }
 return read<any[]>(LS_PLANS, []).filter((p) => p.client_id === clientId);
}

/** Coach sees ALL plans including drafts (for review/approval). */
export async function listAllClientPlans(clientId: string) {
 if (isSupabaseConfigured && supabase) {
 const { data } = await supabase
 .from("plans")
 .select("*")
 .eq("client_id", clientId)
 .order("created_at", { ascending: false });
 return data ?? [];
 }
 return read<any[]>(LS_PLANS, []).filter((p) => p.client_id === clientId);
}

/** Approve a draft plan and send it to the client. Archives previous current plans. */
export async function activatePlan(planId: string, clientId: string) {
 if (isSupabaseConfigured && supabase) {
 // Archive existing current plans of the same client+type
 const { data: plan } = await supabase
 .from("plans")
 .select("type")
 .eq("id", planId)
 .maybeSingle();
 if (plan) {
 await supabase
 .from("plans")
 .update({ is_current: false, status: "archived" })
 .eq("client_id", clientId)
 .eq("type", plan.type)
 .eq("is_current", true)
 .neq("id", planId);
 }
 // Approve + activate
 const { data, error } = await supabase
 .from("plans")
 .update({
 status: "approved",
 is_current: true,
 approved_at: new Date().toISOString(),
 })
 .eq("id", planId)
 .select()
 .single();
 if (error) throw new Error(error.message);
 // Notify the client
 await createNotification(
 clientId,
 "plan_activated",
 "تم تفعيل خطة جديدة لك! ",
 "خطتك الجديدة جاهزة الآن. اطّلع عليها من صفحة خططي.",
 "/plans",
 );
 // Notify coach (confirmation — routed to the client's assigned coach)
 await createAdminNotification(
 "plan_approved",
 "تم تفعيل خطة للعميل ",
 `خطة ${plan?.type === "meal" ? "تغذية" : "تمارين"} تم تفعيلها وإرسالها للعميل.`,
 "coach",
 clientId,
 ).catch(() => {});
 return data;
 }
 // Local fallback
 const all = read<any[]>(LS_PLANS, []);
 const idx = all.findIndex((p) => p.id === planId);
 if (idx >= 0) {
 all[idx].status = "approved";
 all[idx].is_current = true;
 all[idx].approved_at = new Date().toISOString();
 write(LS_PLANS, all);
 }
 return all[idx];
}

/**
 * Get current swap usage for display — T-AI-DEEP-AUDIT-V2 (D6 fix).
 * MUST mirror the ENFORCEMENT in tier-limits.ts / /api/ai/jobs exactly:
 *   - weekly Monday-anchored window (was: daily — stale legacy system)
 *   - limits from memberships.ts evoSwapLimit via the VERIFIED active
 *     subscription (was: swapLimitFor from the retired starter/elite
 *     tier system — "premium" resolved to undefined → showed UNLIMITED
 *     while the server enforced 3/week)
 */
export async function getSwapUsage(userId: string) {
 const userSub = await getSubscriptionForClient(userId);
 const tierId = (userSub?.tier as any) || "free";
 const LIMIT = getLimits(tierId).evoSwapLimit; // number | null (null = unlimited)
 // Monday-anchored week start — byte-for-byte the same math as
 // tier-limits.countThisWeekSwaps, so display == enforcement.
 const now = new Date();
 const dayOfWeek = now.getDay(); // 0=Sun, 1=Mon, ...
 const mondayOffset = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
 const weekStart = new Date(now);
 weekStart.setDate(now.getDate() - mondayOffset);
 weekStart.setHours(0, 0, 0, 0);
 if (isSupabaseConfigured && supabase) {
 const [meals, exercises] = await Promise.all([
 supabase
 .from("plan_swaps")
 .select("*", { count: "exact", head: true })
 .eq("user_id", userId)
 .eq("swap_type", "meal")
 .gte("created_at", weekStart.toISOString()),
 supabase
 .from("plan_swaps")
 .select("*", { count: "exact", head: true })
 .eq("user_id", userId)
 .eq("swap_type", "exercise")
 .gte("created_at", weekStart.toISOString()),
 ]);
 return {
 meal: {
 used: meals.count ?? 0,
 limit: LIMIT,
 remaining: LIMIT === null ? Infinity : Math.max(0, LIMIT - (meals.count ?? 0)),
 unlimited: LIMIT === null,
 },
 exercise: {
 used: exercises.count ?? 0,
 limit: LIMIT,
 remaining: LIMIT === null ? Infinity : Math.max(0, LIMIT - (exercises.count ?? 0)),
 unlimited: LIMIT === null,
 },
 };
 }
 return {
 meal: { used: 0, limit: LIMIT, remaining: LIMIT === null ? Infinity : LIMIT, unlimited: LIMIT === null },
 exercise: { used: 0, limit: LIMIT, remaining: LIMIT === null ? Infinity : LIMIT, unlimited: LIMIT === null },
 };
}

export async function addPlan(plan: any) {
 if (isSupabaseConfigured && supabase) {
 // New plans from coach upload are "approved" directly (manual upload).
 // New plans from AI generation are "draft" (need approval).
 const status = plan.status || "approved";
 const is_current = plan.is_current ?? (status === "approved");
 const { data, error } = await supabase
 .from("plans")
 .insert({ ...plan, status, is_current })
 .select()
 .single();
 if (error) throw new Error(error.message);
 return data;
 }
 const all = read<any[]>(LS_PLANS, []);
 const status = plan.status || "approved";
 const newRow = {
 ...plan,
 id: uid(),
 status,
 is_current: plan.is_current ?? (status === "approved"),
 approved_at: status === "approved" ? new Date().toISOString() : null,
 created_at: new Date().toISOString(),
 };
 all.push(newRow);
 write(LS_PLANS, all);
 return newRow;
}

export async function deletePlan(id: string) {
 if (isSupabaseConfigured && supabase) {
 await supabase.from("plans").delete().eq("id", id);
 return;
 }
 const all = read<any[]>(LS_PLANS, []);
 write(LS_PLANS, all.filter((p) => p.id !== id));
}

/** Update a plan's content (title, notes, content JSON, status). */
export async function updatePlan(id: string, updates: { title?: string; notes?: string; content?: any; status?: string; is_current?: boolean }) {
 if (isSupabaseConfigured && supabase) {
 const { data, error } = await supabase
 .from("plans")
 .update(updates)
 .eq("id", id)
 .select()
 .single();
 if (error) throw new Error(error.message);
 return data;
 }
 const all = read<any[]>(LS_PLANS, []);
 const idx = all.findIndex((p) => p.id === id);
 if (idx >= 0) {
 all[idx] = { ...all[idx], ...updates };
 write(LS_PLANS, all);
 }
 return all[idx];
}

// ---------------------------------------------------------------------------
// Swap Requests (client → coach, when daily limit is reached)
// ---------------------------------------------------------------------------

export async function createSwapRequest(req: {
 userId: string;
 planId?: string;
 swapType: "meal" | "exercise";
 reason: string;
}) {
 if (isSupabaseConfigured && supabase) {
 // Use support_tickets table with a special type prefix
 const { data, error } = await supabase
 .from("support_tickets")
 .insert({
 client_id: req.userId,
 subject: `[تبديل ${req.swapType === "meal" ? "وجبة" : "تمرين"}] ${req.reason.slice(0, 50)}`,
 status: "open",
 priority: "normal",
 })
 .select()
 .single();
 if (error) throw new Error(error.message);
 // Add the detailed reason as first message
 await supabase.from("ticket_messages").insert({
 ticket_id: data.id,
 sender_id: req.userId,
 body: `طلب تبديل ${req.swapType === "meal" ? "وجبة" : "تمرين"}:\n\n${req.reason}`,
 });
 return data;
 }
 // Local fallback
 const all = read<any[]>(LS_TICKETS, []);
 const ticket = {
 id: uid(),
 client_id: req.userId,
 subject: `[تبديل ${req.swapType === "meal" ? "وجبة" : "تمرين"}] ${req.reason.slice(0, 50)}`,
 status: "open",
 priority: "normal",
 created_at: new Date().toISOString(),
 updated_at: new Date().toISOString(),
 };
 all.push(ticket);
 write(LS_TICKETS, all);
 return ticket;
}
