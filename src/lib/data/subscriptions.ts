"use client";

import {
 supabase,
 isSupabaseConfigured,
 validateUploadFile,
 processSubscriptionInitialPayment,
 read,
 write,
 uid,
 LS_PROFILES,
 LS_SUBS,
 LS_PREFIX,
 type Profile,
} from "./helpers";
import { createNotification, createAdminNotification } from "./notifications";

export async function listAllClients() {
 if (isSupabaseConfigured && supabase) {
 const { data } = await supabase
 .from("profiles")
 .select("*")
 .eq("role", "client")
 .order("created_at", { ascending: false });
 return data ?? [];
 }
 const profiles = read<Record<string, Profile>>(LS_PROFILES, {});
 return Object.values(profiles).filter((p) => p.role === "client");
}

/**
 * Decision 1 fix: fetch all coach client data in ONE query via RPC.
 * Replaces the N+1 pattern in CoachView (listAllClients +
 * listAllSubscriptions + listSubscriptionRequests + per-client
 * getQuestionnaire × 2 = 2N+3 queries).
 *
 * Returns: client profile + latest sub + pending payments + questionnaire
 * status for every client, in a single round-trip.
 *
 * Falls back to the old multi-query path if the RPC is not available
 * (e.g. migration not yet applied to production).
 */
export async function getCoachClientListOptimized() {
 if (isSupabaseConfigured && supabase) {
 try {
 const { data, error } = await supabase.rpc("get_coach_client_list");
 if (!error && data) {
 return data;
 }
 // RPC not available — fall through to old path
 console.warn("[data] get_coach_client_list RPC not available, using fallback");
 } catch (e) {
 console.warn("[data] get_coach_client_list RPC failed, using fallback:", e);
 }
 }
 // Fallback: return null so caller uses the old multi-query path
 return null;
}

// ---------------------------------------------------------------------------
// Subscription Requests (for coach payments page)
// ---------------------------------------------------------------------------

export async function listSubscriptionRequests(status?: string) {
 if (isSupabaseConfigured && supabase) {
 let q = supabase.from("subscription_requests").select("*").order("created_at", { ascending: false });
 if (status && status !== "all") q = q.eq("status", status as "pending" | "approved" | "rejected");
 const { data } = await q;
 return data ?? [];
 }
 return read<any[]>(LS_PREFIX + "subreqs", []);
}

export async function submitSubscriptionRequest(req: any) {
 if (isSupabaseConfigured && supabase) {
 // M9 fix: check for existing pending request from the same user for the
 // same plan tier to prevent spamming the coach's payment review queue.
 const { data: existing } = await supabase
 .from("subscription_requests")
 .select("id, status")
 .eq("user_id", req.user_id)
 .eq("plan_tier", req.plan_tier)
 .eq("status", "pending")
 .maybeSingle();
 if (existing) {
 throw new Error("You already have a pending request for this plan. Please wait for the coach to review it.");
 }
 const { data, error } = await supabase.from("subscription_requests").insert(req).select().single();
 if (error) throw new Error(error.message);
 // Notify THE ASSIGNED COACH about new payment request (multi-coach routing)
 await createAdminNotification(
 "payment_request",
 "طلب دفع جديد ",
 `${req.full_name} طلب اشتراك ${req.plan_tier} لمدة ${req.duration_months} شهر — $${req.price_usd}`,
 "coach-payments",
 req.user_id,
 ).catch(() => {});
 return data;
 }
 const all = read<any[]>(LS_PREFIX + "subreqs", []);
 const row = { id: uid(), ...req, status: "pending", created_at: new Date().toISOString() };
 all.push(row);
 write(LS_PREFIX + "subreqs", all);
 return row;
}

export async function reviewSubscriptionRequest(id: string, action: "approve" | "reject", adminNote?: string) {
 if (isSupabaseConfigured && supabase) {
 // M10 fix: only update if status is still "pending" — prevents re-approving
 // or re-rejecting an already-processed request (double-commission, etc.)
 const { data, error } = await supabase
 .from("subscription_requests")
 .update({ status: action === "approve" ? "approved" : "rejected", reviewed_at: new Date().toISOString() })
 .eq("id", id)
 .eq("status", "pending")
 .select()
 .single();
 if (error) throw new Error(error.message);
 if (!data) throw new Error("Subscription request not found or already processed");

 // If approved, create a subscription for the user
 if (action === "approve") {
 const req = data;
 const start = new Date();
 const end = new Date();
 end.setMonth(end.getMonth() + req.duration_months);
 await upsertSubscription(req.user_id, req.plan_tier, req.duration_months, start.toISOString(), end.toISOString());
 // Notify the user
 await createNotification(req.user_id, "subscription_approved", "تم تفعيل اشتراكك!", `تم الموافقة على طلب اشتراكك (${req.plan_tier}) لمدة ${req.duration_months} أشهر.`, "/dashboard");
 // Award affiliate commission through the new engine (idempotent, transaction-level).
 // This replaces the legacy awardCommission() call with a generic, idempotent engine.
 // Engine flow:
 //   processSubscriptionInitialPayment()
 //     → createAffiliateTransaction (type: subscription_initial)
 //     → processCommission()
 //         → look up affiliate from referrals (first-click, permanent)
 //         → idempotency check (unique index on affiliate_commissions.transaction_id)
 //         → insert affiliate_commissions row
 //         → insert referral_earnings row (links to payout system)
 //         → update referrals.status → 'completed'
 //         → notify the affiliate
 // If anything fails inside the engine, the try/catch swallows the error
 // so the subscription approval itself is not blocked.
 try {
 // OWNER DECREE (2026-08-30) — «عميل المدرب لا يُحسب فى نظام الأفيليت»:
 // a client who CHOSE A COACH (coach_assignments row — via the coach's
 // landing page, an invite, or an admin assignment) can subscribe to any
 // site plan, but his payment must NEVER generate affiliate commission.
 // The gate lives at the money moment (commission time) so it covers
 // every attribution order (ref cookie first / coach first / OAuth claim).
 // RLS makes the row visible exactly to the actors who can review here:
 // admin (is_admin) and the client's own coach (coach_id = auth.uid()).
 const { data: coachRow } = await supabase
 .from("coach_assignments")
 .select("coach_id")
 .eq("client_id", req.user_id)
 .maybeSingle();
 if (coachRow) {
 console.info(
 "[reviewSubscriptionRequest] Affiliate commission SKIPPED — client has a coach (owner decree: coach clients are outside the affiliate system):",
 req.user_id,
 );
 } else {
 const paymentAmount = req.price_usd ? Number(req.price_usd) : 10; // already USD
 await processSubscriptionInitialPayment(
   req.user_id,
   paymentAmount,
   req.id,
   req.plan_tier,
 );
 }
 } catch (e) {
 console.error("[reviewSubscriptionRequest] Affiliate commission error:", e);
 }
 } else {
 // M55 fix: include rejection reason in the notification if provided
 const reasonText = adminNote ? ` (${adminNote})` : "";
 await createNotification(data.user_id, "subscription_rejected", "تم رفض طلب الاشتراك", `تم رفض طلب اشتراكك.${reasonText} يرجى التواصل مع الدعم.`, "/memberships");
 }
 return data;
 }
 const all = read<any[]>(LS_PREFIX + "subreqs", []);
 const idx = all.findIndex((r) => r.id === id);
 if (idx >= 0) all[idx].status = action === "approve" ? "approved" : "rejected";
 write(LS_PREFIX + "subreqs", all);
 return all[idx];
}

export async function getReceiptSignedUrl(filePath: string): Promise<string> {
 if (isSupabaseConfigured && supabase) {
 const { data } = await supabase.storage.from("receipts").createSignedUrl(filePath, 3600);
 return data?.signedUrl ?? "";
 }
 return "";
}

export async function uploadReceipt(file: File): Promise<string> {
 // M7 fix: validate file type + size before uploading
 validateUploadFile(file, ["image/jpeg", "image/png", "image/webp", "application/pdf"], 5 * 1024 * 1024);
 if (isSupabaseConfigured && supabase) {
 const ext = file.name.split(".").pop();
 const path = `receipts/${Date.now()}.${ext}`;
 const { error } = await supabase.storage.from("receipts").upload(path, file);
 if (error) throw new Error(error.message);
 return path;
 }
 return "";
}

// ---------------------------------------------------------------------------
// Plan file upload (coach uploads PDF files)
// ---------------------------------------------------------------------------

export async function uploadPlanFile(bucket: string, clientId: string, file: File): Promise<string> {
 if (isSupabaseConfigured && supabase) {
 const ext = file.name.split(".").pop();
 const path = `${clientId}/${Date.now()}.${ext}`;
 const { error } = await supabase.storage.from(bucket).upload(path, file);
 if (error) throw new Error(error.message);
 return path;
 }
 return "";
}

export async function getPlanFileUrl(bucket: string, filePath: string): Promise<string> {
 if (isSupabaseConfigured && supabase) {
 const { data } = await supabase.storage.from(bucket).createSignedUrl(filePath, 3600);
 return data?.signedUrl ?? "";
 }
 return "";
}

export async function listAllSubscriptions() {
 if (isSupabaseConfigured && supabase) {
 const { data } = await supabase.from("subscriptions").select("*");
 return data ?? [];
 }
 return read<any[]>(LS_SUBS, []);
}

/**
 * Fetch ONLY the calling user's own subscription.
 * Use this in user-facing contexts (e.g. /api/ai/chat) instead of
 * listAllSubscriptions() — which returns every row and is meant for
 * coach-only views. RLS also enforces this server-side, but defense in
 * depth: never trust the body's userId, and never fetch more than needed.
 */
export async function getSubscriptionForClient(clientId: string) {
 if (isSupabaseConfigured && supabase) {
 // T-AI-DEEP-AUDIT-V2 (D5 fix): filter status='active' + end_date>now —
 // mirrors auth-server.ts getAuthUser(). Previously the newest row won
 // regardless of status/expiry, so an EXPIRED or REJECTED subscription
 // still made client UI treat the user as paid (useMembershipTier →
 // ads hidden, export buttons enabled, EVO unlimited-badge …). The
 // server stays the authority; this fix aligns the client picture.
 const { data } = await supabase
 .from("subscriptions")
 .select("*")
 .eq("client_id", clientId)
 .eq("status", "active")
 .gt("end_date", new Date().toISOString())
 .order("created_at", { ascending: false });
 const arr = data ?? [];
 if (arr.length === 0) return null;
 // Separate coaching from memberships — pick best MEMBERSHIP tier
 // (pro > premium). If only coaching, return coaching.
 const hasCoaching = arr.some((s: any) => s.tier === "coaching");
 const membershipSubs = arr.filter((s: any) => ["premium", "pro"].includes(s.tier));
 if (membershipSubs.length > 0) {
 const priority = (tier: string) => {
 if (tier === "pro") return 3;
 if (tier === "premium") return 2;
 return 0;
 };
 membershipSubs.sort((a, b) => priority(b.tier) - priority(a.tier));
 return membershipSubs[0];
 } else if (hasCoaching) {
 return arr.find((s: any) => s.tier === "coaching");
 }
 return arr[0];
 }
 // Local fallback mirrors the same active + expiry filter.
 const now = new Date().toISOString();
 const all = read<any[]>(LS_SUBS, []).filter(
 (s) => s.client_id === clientId && s.status === "active" && s.end_date > now,
 );
 if (all.length === 0) return null;
 const hasCoaching = all.some((s: any) => s.tier === "coaching");
 const membershipSubs = all.filter((s: any) => ["premium", "pro"].includes(s.tier));
 if (membershipSubs.length > 0) {
 const priority = (tier: string) => (tier === "pro" ? 3 : tier === "premium" ? 2 : 0);
 membershipSubs.sort((a, b) => priority(b.tier) - priority(a.tier));
 return membershipSubs[0];
 }
 return all.find((s: any) => s.tier === "coaching") ?? all[0];
}

/**
 * Fetch ALL subscriptions for a client (not just one).
 * Used by the coach client view to show multiple subscriptions
 * (e.g. Coaching + Premium coexisting).
 */
export async function listSubscriptionsForClient(clientId: string) {
 if (isSupabaseConfigured && supabase) {
 const { data } = await supabase
 .from("subscriptions")
 .select("*")
 .eq("client_id", clientId)
 .order("created_at", { ascending: false });
 return data ?? [];
 }
 return read<any[]>(LS_SUBS, []).filter((s) => s.client_id === clientId);
}

export async function upsertSubscription(clientId: string, tier: string, months: number, startDate?: string, endDate?: string) {
 if (isSupabaseConfigured && supabase) {
 // Use migration 0018's extend_subscription() RPC which atomically
 // extends an existing subscription (preserving remaining paid days)
 // instead of overwriting it. Fixes C10 (early renewal lost paid days).
 const subscriptionType = tier === "coaching" ? "coaching" : "membership";
 const { data, error } = await supabase
 .rpc("extend_subscription", {
 p_client_id: clientId,
 p_tier: tier,
 p_months: months,
 p_subscription_type: subscriptionType,
 });
 if (error) throw new Error(error.message);
 return data;
 }
 const all = read<any[]>(LS_SUBS, []);
 const idx = all.findIndex((s) => s.client_id === clientId);
 const row = {
 id: idx >= 0 ? all[idx].id : uid(),
 client_id: clientId,
 tier,
 months,
 start_date: startDate,
 end_date: endDate,
 status: "active" as const,
 created_at: idx >= 0 ? all[idx].created_at : new Date().toISOString(),
 };
 if (idx >= 0) all[idx] = row;
 else all.push(row);
 write(LS_SUBS, all);
 return row;
}
