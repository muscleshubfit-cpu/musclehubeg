import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth-server";
import { supabaseAdmin, isSupabaseAdminConfigured } from "@/lib/supabase/admin";

/**
 * GET /api/affiliate/referred-coaches — Phase 67 (owner-approved).
 *
 * The inviter's «مدربين دعّيتهم» list: every referred user of the calling
 * member who became a COACH, with his client-activation count and the
 * commission the inviter earned from him.
 *
 * Why an API: the referrer is usually a plain CLIENT — RLS lets him read
 * his own referrals rows but NOT the referred users' profiles (role
 * lives there). The service role resolves the coach side server-side and
 * returns ONLY rows scoped to the caller (referrer_id = session user) —
 * no cross-user leakage.
 *
 * Response: { coaches: [{ coachId, name, emailMasked, joinedAt,
 *             activations, earned }] }
 */
export async function GET(request: NextRequest) {
  const auth = await requireUser(request);
  if (auth instanceof Response) return auth;

  if (!isSupabaseAdminConfigured || !supabaseAdmin) {
    return NextResponse.json({ error: "Server not configured" }, { status: 500 });
  }

  // 1. The caller's referrals (first-click, permanent — one per referred user)
  const { data: referrals } = await supabaseAdmin
    .from("referrals")
    .select("id, referred_id, referred_email, status, commission_amount, created_at")
    .eq("referrer_id", auth.id)
    .order("created_at", { ascending: false });

  const rows = (referrals ?? []) as {
    id: string;
    referred_id: string | null;
    referred_email: string | null;
    status: string;
    commission_amount: number;
    created_at: string;
  }[];

  const referredIds = rows.map((r) => r.referred_id).filter(Boolean) as string[];
  if (referredIds.length === 0) return NextResponse.json({ coaches: [] });

  // 2. Which of them are coaches?
  const { data: coachProfiles } = await supabaseAdmin
    .from("profiles")
    .select("id, full_name, email, role, created_at")
    .in("id", referredIds)
    .eq("role", "coach");

  const coaches = (coachProfiles ?? []) as {
    id: string;
    full_name: string | null;
    email: string | null;
    created_at: string;
  }[];
  if (coaches.length === 0) return NextResponse.json({ coaches: [] });

  // 3. Per-coach activation commissions earned by THIS inviter
  const { data: commissions } = await supabaseAdmin
    .from("affiliate_commissions")
    .select("referral_id, amount")
    .eq("affiliate_user_id", auth.id)
    .eq("commission_type", "coach_client_activation")
    .neq("status", "reversed");

  const commRows = (commissions ?? []) as { referral_id: string | null; amount: number }[];
  const byReferral = new Map<string, { activations: number; earned: number }>();
  for (const c of commRows) {
    if (!c.referral_id) continue;
    const cur = byReferral.get(c.referral_id) ?? { activations: 0, earned: 0 };
    cur.activations += 1;
    cur.earned += Number(c.amount);
    byReferral.set(c.referral_id, cur);
  }

  // 4. Join + mask the coach email (privacy — the inviter sees a hint, not PII)
  const maskEmail = (email: string | null) =>
    email ? email.replace(/^(.).*(@.*)$/, "$1***$2") : null;

  const coachById = new Map(coaches.map((c) => [c.id, c]));
  const result = rows
    .filter((r) => r.referred_id && coachById.has(r.referred_id))
    .map((r) => {
      const coach = coachById.get(r.referred_id as string)!;
      const stat = byReferral.get(r.id) ?? { activations: 0, earned: 0 };
      return {
        coachId: coach.id,
        name: coach.full_name || r.referred_email || "—",
        emailMasked: maskEmail(coach.email),
        joinedAt: coach.created_at,
        referralStatus: r.status,
        activations: stat.activations,
        earned: Math.round(stat.earned * 100) / 100,
      };
    });

  return NextResponse.json({ coaches: result });
}
