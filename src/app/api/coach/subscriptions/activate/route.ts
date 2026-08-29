import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth-server";
import { supabaseAdmin, isSupabaseAdminConfigured } from "@/lib/supabase/admin";
import {
  COACH_ACTIVATABLE_TIERS,
  coachActivationCostUsd,
  isCoachPaymentMethod,
  type CoachPaymentMethod,
} from "@/lib/coach-limits";

/**
 * COACH ACTIVATES A CLIENT'S SUBSCRIPTION AFTER OFFLINE PAYMENT (0034)
 * + WALLET GATE (0035).
 *
 * OWNER MODEL: the coach collects the money from HIS client OUTSIDE the
 * site (cash / Vodafone Cash / InstaPay / bank transfer) and then
 * activates the subscription from the client's page. BUT the coach also
 * pays THE SITE a monthly fixed fee per client (coach_fees × months)
 * from his WALLET: since 0035 a coach can only activate when his wallet
 * balance covers fee_per_client × months — the fee is debited
 * atomically (coach_adjust_wallet) BEFORE extending, and refunded if
 * the activation itself fails. ADMINS are exempt (no wallet check).
 * The site still never touches the coach↔client money — it RECORDS it
 * (coach_payments) and the client sees the receipt on his dashboard.
 *
 * POST /api/coach/subscriptions/activate
 *   { client_id, tier, months, amount?, method?, note? }
 *
 * - coach: may ONLY activate for his own assigned clients (verified
 *   against coach_assignments — poaching-proof, mirrors /api/coach/claim).
 * - admin: may activate for anyone (wallet-exempt manual override).
 * - The extension itself runs extend_subscription() (0018 math, now
 *   0034-guarded) through the service role, then a coach_payments row
 *   is written and the client gets a notification.
 */

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(request: NextRequest) {
  const auth = await requireUser(request);
  if (auth instanceof Response) return auth;

  if (auth.role !== "coach" && auth.role !== "admin") {
    return NextResponse.json(
      { error: "forbidden", message: "هذه الصفحة للمدربين فقط" },
      { status: 403 },
    );
  }

  if (!isSupabaseAdminConfigured || !supabaseAdmin) {
    return NextResponse.json({ error: "Server not configured" }, { status: 500 });
  }

  const body = await request.json().catch(() => ({} as Record<string, unknown>));
  const clientId = String(body.client_id ?? "").trim();
  const tier = String(body.tier ?? "").trim();
  const months = Number(body.months);
  const amountRaw = body.amount;
  const method = (body.method ?? "cash") as CoachPaymentMethod;
  const note = String(body.note ?? "").trim().slice(0, 500) || null;

  if (!UUID_RE.test(clientId)) {
    return NextResponse.json(
      { error: "bad_request", message: "عميل غير صحيح" },
      { status: 400 },
    );
  }
  if (!(COACH_ACTIVATABLE_TIERS as readonly string[]).includes(tier)) {
    return NextResponse.json(
      { error: "bad_tier", message: "اختر باقة صحيحة (بريميوم / برو / كوتشينج)" },
      { status: 400 },
    );
  }
  if (!Number.isInteger(months) || months < 1 || months > 12) {
    return NextResponse.json(
      { error: "bad_months", message: "المدة من شهر إلى ١٢ شهر" },
      { status: 400 },
    );
  }
  let amount: number | null = null;
  if (amountRaw !== undefined && amountRaw !== null && amountRaw !== "") {
    const n = Number(amountRaw);
    if (!Number.isFinite(n) || n < 0 || n > 10_000_000) {
      return NextResponse.json(
        { error: "bad_amount", message: "المبلغ غير صحيح" },
        { status: 400 },
      );
    }
    amount = Math.round(n * 100) / 100;
  }
  if (!isCoachPaymentMethod(method)) {
    return NextResponse.json(
      { error: "bad_method", message: "طريقة دفع غير معروفة" },
      { status: 400 },
    );
  }

  // Target must be a real CLIENT (staff emails are never clients).
  const { data: target, error: targetErr } = await supabaseAdmin
    .from("profiles")
    .select("id, role, full_name")
    .eq("id", clientId)
    .maybeSingle();

  if (targetErr || !target) {
    return NextResponse.json(
      { error: "not_found", message: "العميل غير موجود" },
      { status: 404 },
    );
  }
  if (target.role !== "client") {
    return NextResponse.json(
      { error: "not_a_client", message: "ده مش عميل — أعضاء الفريق لا تُفعَّل لهم اشتراكات" },
      { status: 409 },
    );
  }

  // Coaches activate ONLY their own clients; admins pass.
  if (auth.role === "coach") {
    const { data: owned } = await supabaseAdmin
      .from("coach_assignments")
      .select("client_id")
      .eq("client_id", clientId)
      .eq("coach_id", auth.id)
      .maybeSingle();
    if (!owned) {
      return NextResponse.json(
        { error: "not_your_client", message: "العميل ده مش من عملاؤك" },
        { status: 403 },
      );
    }
  }

  // ── 0035 WALLET GATE — no paid slot, no activation (coaches only). ──
  // OWNER PRICING (2026-08-30): «اسعار المدربين لكل عميل ٣٠٠ الشهر /
  // ٨٠٠ ٣ شهور» + GLOBAL USD decree («٣٠٠ جنيه تصبح ٦ دولار») — package
  // prices for 1 and 3 months ALWAYS win in USD ($6 / $16); other
  // durations stay linear on the coach's monthly base (his admin-set
  // fee_per_client, else the $6 monthly rate).
  const paymentId = crypto.randomUUID();
  let walletCost = 0;
  if (auth.role === "coach") {
    const [feeRes, walletRes] = await Promise.all([
      supabaseAdmin
        .from("coach_fees" as any)
        .select("fee_per_client")
        .eq("coach_id", auth.id)
        .maybeSingle(),
      supabaseAdmin
        .from("coach_wallets" as any)
        .select("balance")
        .eq("coach_id", auth.id)
        .maybeSingle(),
    ]);
    const fee = Number((feeRes.data as any)?.fee_per_client ?? 0) || 0;
    walletCost = coachActivationCostUsd(months, fee);
    if (walletCost > 0) {
      const missingTable = [feeRes.error, walletRes.error]
        .find(Boolean)
        ?.message.includes("coach_wallet");
      if (missingTable) {
        return NextResponse.json(
          {
            error: "db_error",
            message: "شغّل هجرة 0035 أولًا (RUN_ON_SUPABASE_0035_COACH_WALLET.sql)",
          },
          { status: 503 },
        );
      }
      const balance = Number((walletRes.data as any)?.balance ?? 0);
      if (balance < walletCost) {
        return NextResponse.json(
          {
            error: "insufficient_wallet",
            message: `رصيد محفظتك (${balance}$) مش كفاية لتفعيل ${months} ${months === 1 ? "شهر" : "شهور"} — المطلوب ${walletCost}$. اشحن المحفظة الأول (PayPal / انستاباي / فودافون كاش) وهيتم التفعيل فورًا.`,
            balance,
            cost: walletCost,
          },
          { status: 402 },
        );
      }
    }
  }

  // ── Debit the wallet FIRST (atomic) so no failure can leave a free
  // slot; refunded below if the activation itself fails.
  if (walletCost > 0) {
    const { error: debitErr } = await (supabaseAdmin as any).rpc("coach_adjust_wallet", {
      p_coach_id: auth.id,
      p_amount: -walletCost,
      p_kind: "activation",
      p_ref_id: paymentId,
      p_note: `تفعيل ${months} ${months === 1 ? "شهر" : "شهور"} — عميل ${(target as any).full_name ?? clientId}`,
      p_created_by: auth.id,
    });
    if (debitErr) {
      const insufficient = debitErr.message.includes("insufficient");
      return NextResponse.json(
        {
          error: "insufficient_wallet",
          message: insufficient
            ? "رصيد محفظتك مش كفاية — اشحن المحفظة الأول (انستاباي / فودافون كاش / PayPal)."
            : "فشل خصم رسوم التفعيل من المحفظة — حاول تاني.",
        },
        { status: 402 },
      );
    }
  }

  // Extend / create the subscription (0018 math — preserves paid days).
  // Service-role call → passes the 0034 guard.
  const subscriptionType = tier === "coaching" ? "coaching" : "membership";
  const { data: subscription, error: rpcErr } = await supabaseAdmin.rpc(
    "extend_subscription",
    {
      p_client_id: clientId,
      p_tier: tier,
      p_months: months,
      p_subscription_type: subscriptionType,
    },
  );

  if (rpcErr || !subscription) {
    const msg = rpcErr?.message ?? "سبب غير معروف";
    const friendly = msg.includes("assigned coach")
      ? "العميل ده مش من عملاؤك"
      : `فشل تفعيل الاشتراك: ${msg}`;
    // Refund the wallet debit — the coach never pays for a failed slot.
    if (walletCost > 0) {
      await (supabaseAdmin as any).rpc("coach_adjust_wallet", {
        p_coach_id: auth.id,
        p_amount: walletCost,
        p_kind: "adjust",
        p_ref_id: paymentId,
        p_note: "استرداد — فشل تفعيل الاشتراك",
        p_created_by: auth.id,
      });
    }
    return NextResponse.json(
      { error: "activation_failed", message: friendly },
      { status: 502 },
    );
  }

  // Ledger row — the admin's audit trail of offline collections.
  const { error: payErr } = await supabaseAdmin
    .from("coach_payments" as any)
    .insert({
      id: paymentId,
      coach_id: auth.id,
      client_id: clientId,
      subscription_id: (subscription as any).id ?? null,
      tier,
      months,
      amount,
      currency: "USD",
      method,
      note,
    });

  if (payErr) {
    // Subscription is ACTIVE — never fail the coach over ledger trouble.
    console.error("[api/coach/subscriptions/activate] ledger insert failed:", payErr.message);
  }

  // Tell the client his subscription is live.
  const end = (subscription as any).end_date
    ? new Date((subscription as any).end_date).toLocaleDateString("ar-EG")
    : "";
  await supabaseAdmin.from("notifications").insert({
    user_id: clientId,
    type: "subscription_activated",
    title: "تم تفعيل اشتراكك 🎉",
    body: `مدربك قام بتفعيل اشتراكك لمدة ${months} ${months === 1 ? "شهر" : "شهور"} — ساري حتى ${end}.`,
    link: "/dashboard",
  });

  return NextResponse.json({
    ok: true,
    subscription,
    payment_id: payErr ? null : paymentId,
  });
}
