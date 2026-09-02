"use client";

import {
 supabase,
 isSupabaseConfigured,
 validateUploadFile,
 read,
 write,
 uid,
 LS_PROFILES,
 LS_SUBS,
 LS_PREFIX,
 type Profile,
} from "./helpers";
import { createNotification, createAdminNotification } from "./notifications";
import { canonicalModelTier } from "../plans";
import type { Subscription, SubscriptionRequest } from "@/lib/supabase/types";

/** Input accepted by submitSubscriptionRequest — mirrors the subscription_requests Insert shape (payment_method union == lib/plans PaymentMethod). */
export type SubscriptionRequestInput = Pick<
 SubscriptionRequest,
 "user_id" | "full_name" | "whatsapp" | "plan_tier" | "duration_months" | "price_usd" | "payment_method" | "receipt_path"
>;

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
// PAGED client list (Phase 52 — «تخيل لو فى ١٠٠٠٠٠٠٠ مستخدم مسجل»)
// Server-side paging/filtering/sorting inside Postgres. Returns null when
// the 0047 RPC is not applied yet → callers fall back to the full-list path.
// ---------------------------------------------------------------------------

export type CoachClientPageOpts = {
  limit?: number;
  offset?: number;
  search?: string;
  filter?: string; // all|active|expiring|no_plan|no_questionnaire|pending_payment|expired|premium|pro|coaching
  segment?: string; // all|coach|site (admin only)
  sort?: string; // newest|oldest|name|expiry
};

export async function getCoachClientListPaged(opts: CoachClientPageOpts = {}) {
 if (isSupabaseConfigured && supabase) {
 try {
 const { data, error } = await supabase.rpc("get_coach_client_list_paged", {
 p_limit: Math.max(1, Math.min(opts.limit ?? 25, 100)),
 p_offset: Math.max(0, opts.offset ?? 0),
 p_search: opts.search?.trim() || null,
 p_filter: opts.filter || "all",
 p_segment: opts.segment || "all",
 p_sort: opts.sort || "newest",
 });
 if (!error && data) return data;
 if (error) console.warn("[data] get_coach_client_list_paged not ready:", error.message);
 } catch (e) {
 console.warn("[data] get_coach_client_list_paged failed, using fallback:", e);
 }
 }
 return null;
}

export type CoachClientStats = {
 total: number;
 active: number;
 expiring: number;
 no_plan: number;
 no_questionnaire: number;
 pending_payment: number;
 expired: number;
 premium: number;
 pro: number;
 coaching: number;
 coach_clients: number;
 site_clients: number;
};

// ---------------------------------------------------------------------------
// UNIFIED ADMIN CLIENTS FEED (Phase 103 — 0067).
// Every profile (client + coach + admin) with membership lifecycle, B2B
// coach relation, site-coach follow-up relation, coach_kind and the
// test-account flag. Admin-only inside the RPC (non-admin gets an empty
// set). Returns null when the 0067 RPC is not applied yet → the unified
// clients page shows its own "service not applied" empty state.
// ---------------------------------------------------------------------------

export type AdminClientsPageOpts = {
  limit?: number;
  offset?: number;
  search?: string;
  filter?: string; // all|active|expiring|expired|no_plan|pending_payment|premium|pro|coaching
  type?: string; // all|member_site|client_of_coach|coach|coach_site|coach_b2b|admin
  test?: string; // all|test|real
  sort?: string; // newest|oldest|name|expiry
};

export async function getAdminClientsPaged(opts: AdminClientsPageOpts = {}) {
  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase.rpc("get_admin_clients_paged", {
        p_limit: Math.max(1, Math.min(opts.limit ?? 25, 100)),
        p_offset: Math.max(0, opts.offset ?? 0),
        p_search: opts.search?.trim() || null,
        p_filter: opts.filter || "all",
        p_type: opts.type || "all",
        p_test: opts.test || "all",
        p_sort: opts.sort || "newest",
      });
      if (!error && data) return data;
      if (error) console.warn("[data] get_admin_clients_paged not ready:", error.message);
    } catch (e) {
      console.warn("[data] get_admin_clients_paged failed:", e);
    }
  }
  return null;
}

export type AdminClientsStats = {
  total: number;
  member_site: number;
  client_of_coach: number;
  coach_site: number;
  coach_b2b: number;
  admin_count: number;
  test_count: number;
  active: number;
  expiring: number;
  expired: number;
  pending_payment: number;
};

/** One row of counts for the unified clients page tiles + type buttons. */
export async function getAdminClientsStats(): Promise<AdminClientsStats | null> {
  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase.rpc("get_admin_clients_stats");
      if (!error && data && data.length > 0) {
        const s = data[0];
        const n = (v: unknown) => Number(v) || 0;
        return {
          total: n(s.total),
          member_site: n(s.member_site),
          client_of_coach: n(s.client_of_coach),
          coach_site: n(s.coach_site),
          coach_b2b: n(s.coach_b2b),
          admin_count: n(s.admin_count),
          test_count: n(s.test_count),
          active: n(s.active),
          expiring: n(s.expiring),
          expired: n(s.expired),
          pending_payment: n(s.pending_payment),
        };
      }
      if (error) console.warn("[data] get_admin_clients_stats not ready:", error.message);
    } catch (e) {
      console.warn("[data] get_admin_clients_stats failed:", e);
    }
  }
  return null;
}

/** One row of tab counts over the caller's scope (admin → everyone; coach → his clients). */
export async function getCoachClientStats(): Promise<CoachClientStats | null> {
 if (isSupabaseConfigured && supabase) {
 try {
 const { data, error } = await supabase.rpc("get_coach_client_stats");
 if (!error && data && data.length > 0) {
 const s = data[0];
 const n = (v: unknown) => Number(v) || 0;
 return {
 total: n(s.total), active: n(s.active), expiring: n(s.expiring),
 no_plan: n(s.no_plan), no_questionnaire: n(s.no_questionnaire),
 pending_payment: n(s.pending_payment), expired: n(s.expired),
 premium: n(s.premium), pro: n(s.pro), coaching: n(s.coaching),
 coach_clients: n(s.coach_clients), site_clients: n(s.site_clients),
 };
 }
 if (error) console.warn("[data] get_coach_client_stats not ready:", error.message);
 } catch (e) {
 console.warn("[data] get_coach_client_stats failed:", e);
 }
 }
 return null;
}

// ---------------------------------------------------------------------------
// Subscription Requests (for coach payments page)
// ---------------------------------------------------------------------------

export async function listSubscriptionRequests(status?: string): Promise<SubscriptionRequest[]> {
 if (isSupabaseConfigured && supabase) {
 let q = supabase.from("subscription_requests").select("*").order("created_at", { ascending: false });
 if (status && status !== "all") q = q.eq("status", status as "pending" | "approved" | "rejected");
 const { data } = await q;
 return data ?? [];
 }
 return read<SubscriptionRequest[]>(LS_PREFIX + "subreqs", []);
}

export async function submitSubscriptionRequest(req: SubscriptionRequestInput): Promise<SubscriptionRequest> {
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
 // Notify THE ADMIN about new payment request — 0043 MODEL: site
 // membership purchases (B2C) are reviewed by the admin only; coaches
 // never see them (terminology law). Link → /admin/payments.
 await createAdminNotification(
 "payment_request",
 "طلب دفع جديد ",
 `${req.full_name} طلب اشتراك ${req.plan_tier} لمدة ${req.duration_months} شهر — $${req.price_usd}`,
 "/admin/payments",
 req.user_id,
 ).catch(() => {});
 return data;
 }
 const all = read<SubscriptionRequest[]>(LS_PREFIX + "subreqs", []);
 const row: SubscriptionRequest = {
 id: uid(),
 ...req,
 status: "pending",
 reviewed_at: null,
 created_at: new Date().toISOString(),
 };
 all.push(row);
 write(LS_PREFIX + "subreqs", all);
 return row;
}

export async function reviewSubscriptionRequest(id: string, action: "approve" | "reject", adminNote?: string): Promise<SubscriptionRequest> {
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
 // 0042 EVIDENCE GATE: pass the approved request id — the RPC consumes
 // it (consumed_at) so the activation is provably tied to a paid request.
 // 0046 CANONICAL TIER: legacy /coaching products (Starter $20 / Elite
 // $40 — owner-decreed PayPal-tied prices) are approved from their real
 // request rows, but the subscription is written under the canonical
 // model tier (starter → premium, elite → pro) so the 0045 DB guard
 // (tier in premium/pro/coaching) never rejects a real approval. Safe
 // here: the admin approval path is a trusted override in the RPC
 // (0042) — no (client,tier,months) evidence match is required. The
 // client notification below keeps the PRODUCT name they actually bought.
 await upsertSubscription(req.user_id, canonicalModelTier(req.plan_tier), req.duration_months, start.toISOString(), end.toISOString(), req.id);
 // Notify the user
 await createNotification(req.user_id, "subscription_approved", "تم تفعيل اشتراكك!", `تم الموافقة على طلب اشتراكك (${req.plan_tier}) لمدة ${req.duration_months} أشهر.`, "/dashboard");
 // PHASE 66 (owner-approved): award the affiliate commission from the
 // SERVER (POST /api/affiliate/commission) instead of the browser.
 // The Phase 64 study proved the old browser engine call failed
 // silently (RLS blocked tracking inserts; the engine tables never
 // existed in production). The route runs the shared server engine
 // (coach-clients decree gate included) — idempotent on the request id.
 // Best-effort: a commission failure never blocks the approval.
 try {
  const paymentAmount = req.price_usd ? Number(req.price_usd) : 10; // already USD
  await fetch("/api/affiliate/commission", {
   method: "POST",
   headers: { "Content-Type": "application/json" },
   body: JSON.stringify({
    userId: req.user_id,
    amount: paymentAmount,
    reference: req.id,
    productId: req.plan_tier,
   }),
  });
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
 const all = read<SubscriptionRequest[]>(LS_PREFIX + "subreqs", []);
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

export async function listAllSubscriptions(): Promise<Subscription[]> {
 if (isSupabaseConfigured && supabase) {
 const { data } = await supabase.from("subscriptions").select("*");
 return data ?? [];
 }
 return read<Subscription[]>(LS_SUBS, []);
}

/**
 * Fetch ONLY the calling user's own subscription.
 * Use this in user-facing contexts (e.g. /api/ai/chat) instead of
 * listAllSubscriptions() — which returns every row and is meant for
 * coach-only views. RLS also enforces this server-side, but defense in
 * depth: never trust the body's userId, and never fetch more than needed.
 */
export async function getSubscriptionForClient(clientId: string): Promise<Subscription | null> {
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
 const hasCoaching = arr.some((s) => s.tier === "coaching");
 const membershipSubs = arr.filter((s) => ["premium", "pro"].includes(s.tier));
 if (membershipSubs.length > 0) {
 const priority = (tier: string) => {
 if (tier === "pro") return 3;
 if (tier === "premium") return 2;
 return 0;
 };
 membershipSubs.sort((a, b) => priority(b.tier) - priority(a.tier));
 return membershipSubs[0];
 } else if (hasCoaching) {
 return arr.find((s) => s.tier === "coaching") ?? null;
 }
 return arr[0];
 }
 // Local fallback mirrors the same active + expiry filter.
 const now = new Date().toISOString();
 const all = read<Subscription[]>(LS_SUBS, []).filter(
 (s) => s.client_id === clientId && s.status === "active" && s.end_date !== null && s.end_date > now,
 );
 if (all.length === 0) return null;
 const hasCoaching = all.some((s) => s.tier === "coaching");
 const membershipSubs = all.filter((s) => ["premium", "pro"].includes(s.tier));
 if (membershipSubs.length > 0) {
 const priority = (tier: string) => (tier === "pro" ? 3 : tier === "premium" ? 2 : 0);
 membershipSubs.sort((a, b) => priority(b.tier) - priority(a.tier));
 return membershipSubs[0];
 }
 return all.find((s) => s.tier === "coaching") ?? all[0];
}

/**
 * Fetch ALL subscriptions for a client (not just one).
 * Used by the coach client view to show multiple subscriptions
 * (e.g. Coaching + Premium coexisting).
 */
export async function listSubscriptionsForClient(clientId: string): Promise<Subscription[]> {
 if (isSupabaseConfigured && supabase) {
 const { data } = await supabase
 .from("subscriptions")
 .select("*")
 .eq("client_id", clientId)
 .order("created_at", { ascending: false });
 return data ?? [];
 }
 return read<Subscription[]>(LS_SUBS, []).filter((s) => s.client_id === clientId);
}

export async function upsertSubscription(clientId: string, tier: string, months: number, startDate?: string, endDate?: string, requestId?: string | null) {
 if (isSupabaseConfigured && supabase) {
 // Use migration 0018's extend_subscription() RPC which atomically
 // extends an existing subscription (preserving remaining paid days)
 // instead of overwriting it. Fixes C10 (early renewal lost paid days).
 // 0042: coaches MUST pass the approved payment request id — the RPC
 // consumes it atomically (no evidence → no activation). Server routes
 // (service role) pass null.
 const subscriptionType = tier === "coaching" ? "coaching" : "membership";
 const { data, error } = await supabase
 .rpc("extend_subscription", {
 p_client_id: clientId,
 p_tier: tier,
 p_months: months,
 p_subscription_type: subscriptionType,
 p_request_id: requestId ?? null,
 });
 if (error) throw new Error(error.message);
 return data;
 }
 const all = read<Subscription[]>(LS_SUBS, []);
 const idx = all.findIndex((s) => s.client_id === clientId);
 const row: Subscription = {
 id: idx >= 0 ? all[idx].id : uid(),
 client_id: clientId,
 tier,
 months,
 start_date: startDate ?? null,
 end_date: endDate ?? null,
 status: "active" as const,
 subscription_type: tier === "coaching" ? "coaching" : "membership",
 cancel_requested_at: null,
 created_at: idx >= 0 ? all[idx].created_at : new Date().toISOString(),
 };
 if (idx >= 0) all[idx] = row;
 else all.push(row);
 write(LS_SUBS, all);
 return row;
}
