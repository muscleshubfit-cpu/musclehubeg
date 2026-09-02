import { NextRequest, NextResponse } from "next/server";
import { requireCoach, isAuthConfigured, type AuthUser } from "@/lib/auth-server";
import { supabaseAdmin, isSupabaseAdminConfigured } from "@/lib/supabase/admin";
import { COACH_AD_PACKAGES, coachAdPackageById } from "@/lib/coach-limits";
import type { CoachAd } from "@/lib/supabase/types";

/**
 * «أعلن معنا» — COACH AD SUBSCRIPTIONS (0037, owner-approved).
 *
 * The coach subscribes for a FIXED duration at a FIXED price (never a
 * percentage — owner law) and his ad (a featured card linking to his
 * public page) runs on the homepage «مدربون مميزون» strip for that
 * window. Payment = wallet debit (same rails as activation: InstaPay /
 * Vodafone Cash / PayPal top-ups). ADMINS are wallet-exempt.
 *
 * GET  /api/coach/ads  → packages + balance + own ad history
 * POST /api/coach/ads  { package_id } → debit wallet + start/extend ad
 *
 * Extension law: buying while an ad is still running EXTENDS its
 * ends_at by the package days (no overlap loss). The wallet debit is
 * atomic (coach_adjust_wallet) and happens BEFORE the ad write; if the
 * ad write fails the debit is refunded — the coach never pays for a
 * failed subscription. Each purchase notifies the admins.
 */

export async function GET(request: NextRequest) {
  let user: AuthUser;
  if (isAuthConfigured) {
    const auth = await requireCoach(request);
    if (auth instanceof Response) return auth;
    user = auth;
  } else {
    return NextResponse.json({ error: "Auth not configured" }, { status: 500 });
  }

  if (!isSupabaseAdminConfigured || !supabaseAdmin) {
    return NextResponse.json({ error: "Server not configured" }, { status: 500 });
  }

  const [adsRes, walletRes] = await Promise.all([
    supabaseAdmin
      .from("coach_ads")
      .select("id, package_id, days, price_usd, status, starts_at, ends_at, created_at")
      .eq("coach_id", user.id)
      .order("created_at", { ascending: false })
      .limit(20),
    supabaseAdmin
      .from("coach_wallets")
      .select("balance")
      .eq("coach_id", user.id)
      .maybeSingle(),
  ]);

  const adsError = adsRes.error;
  if (adsError && adsError.code !== "42P01") {
    return NextResponse.json({ error: adsError.message }, { status: 500 });
  }

  const ads = adsRes.data ?? [];
  const now = Date.now();
  const activeAd = ads.find(
    (a) =>
      a.status === "active" &&
      a.ends_at && new Date(String(a.ends_at)).getTime() > now,
  );

  return NextResponse.json({
    packages: COACH_AD_PACKAGES,
    balance: Number(walletRes.data?.balance ?? 0),
    activeAd: activeAd
      ? { ends_at: activeAd.ends_at, package_id: activeAd.package_id }
      : null,
    ads,
  });
}

export async function POST(request: NextRequest) {
  const auth = await requireCoach(request);
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
  const pkg = coachAdPackageById(body.package_id);
  if (!pkg) {
    return NextResponse.json(
      { error: "bad_package", message: "اختر باقة إعلان صحيحة" },
      { status: 400 },
    );
  }

  const price = pkg.priceUsd;

  // ── Wallet gate + atomic debit (coaches only; admins exempt). ──
  let debited = 0;
  if (auth.role === "coach" && price > 0) {
    const walletRes = await supabaseAdmin
      .from("coach_wallets")
      .select("balance")
      .eq("coach_id", auth.id)
      .maybeSingle();
    const missing = walletRes.error?.message.includes("coach_wallet");
    if (missing) {
      return NextResponse.json(
        {
          error: "db_error",
          message: "شغّل هجرة 0035 أولًا (RUN_ON_SUPABASE_0035_COACH_WALLET.sql)",
        },
        { status: 503 },
      );
    }
    const balance = Number(walletRes.data?.balance ?? 0);
    if (balance < price) {
      return NextResponse.json(
        {
          error: "insufficient_wallet",
          message: `رصيد محفظتك (${balance}$) مش كفاية لاشتراك الإعلان — المطلوب ${price}$. اشحن المحفظة الأول (PayPal / انستاباي / فودافون كاش).`,
          balance,
          cost: price,
        },
        { status: 402 },
      );
    }

    const { error: debitErr } = await supabaseAdmin.rpc(
      "coach_adjust_wallet",
      {
        p_coach_id: auth.id,
        p_amount: -price,
        p_kind: "adjust",
        p_ref_id: null,
        p_note: `إعلان — باقة ${pkg.ar} (${price}$)`,
        p_created_by: auth.id,
      },
    );
    if (debitErr) {
      const insufficient = debitErr.message.includes("insufficient");
      return NextResponse.json(
        {
          error: "insufficient_wallet",
          message: insufficient
            ? "رصيد محفظتك مش كفاية — اشحن المحفظة الأول (انستاباي / فودافون كاش / PayPal)."
            : "فشل خصم رسوم الإعلان من المحفظة — حاول تاني.",
        },
        { status: 402 },
      );
    }
    debited = price;
  }

  // ── Start a new ad or extend the running one. ──
  const now = new Date();
  try {
    const { data: current } = await supabaseAdmin
      .from("coach_ads")
      .select("id, ends_at")
      .eq("coach_id", auth.id)
      .eq("status", "active")
      .gt("ends_at", now.toISOString())
      .order("ends_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    let ad: CoachAd | null = null;
    if (current) {
      // Extension: stack the package days on top of the remaining time.
      const base = new Date(String(current.ends_at));
      const ends = new Date(base.getTime() + pkg.days * 864e5);
      const { data, error } = await supabaseAdmin
        .from("coach_ads")
        .update({ ends_at: ends.toISOString() })
        .eq("id", current.id)
        .select()
        .single();
      if (error) throw error;
      ad = data;
    } else {
      const ends = new Date(now.getTime() + pkg.days * 864e5);
      const { data, error } = await supabaseAdmin
        .from("coach_ads")
        .insert({
          coach_id: auth.id,
          package_id: pkg.id,
          days: pkg.days,
          price_usd: price,
          status: "active",
          starts_at: now.toISOString(),
          ends_at: ends.toISOString(),
        })
        .select()
        .single();
      if (error) throw error;
      ad = data;
    }

    // Fire-and-forget visibility: admins learn about the purchase, the
    // coach gets a receipt notification. Neither can fail the purchase.
    const endsAr = new Date(String(ad!.ends_at)).toLocaleDateString("ar-EG");
    const { error: adminNotifErr } = await supabaseAdmin
      .from("admin_notifications")
      .insert({
        type: "coach_ad",
        title: "اشتراك إعلان جديد",
        body: `مدرب اشترك في باقة إعلان (${pkg.ar}) مقابل ${price}$ — سارية حتى ${endsAr}.`,
        link: "/admin/wallets",
        target_role: "coach",
      });
    if (adminNotifErr) {
      console.error("[api/coach/ads] admin notification failed:", adminNotifErr.message);
    }
    await supabaseAdmin.from("notifications").insert({
      user_id: auth.id,
      type: "coach_ad_started",
      title: "إعلانك اشتغل 🎉",
      body: `اشتراك الإعلان (${pkg.ar}) مفعّل — إعلانك هيظهر في «مدربون مميزون» حتى ${endsAr}.`,
      link: "/coach/ads",
    });

    return NextResponse.json({ ok: true, ad });
  } catch (e) {
    // Refund — the coach never pays for a failed ad subscription.
    const code = (e as { code?: string }).code;
    if (debited > 0) {
      await supabaseAdmin.rpc("coach_adjust_wallet", {
        p_coach_id: auth.id,
        p_amount: debited,
        p_kind: "adjust",
        p_ref_id: null,
        p_note: "استرداد — فشل اشتراك الإعلان",
        p_created_by: auth.id,
      });
    }
    if (code === "42P01" || code === "42703") {
      return NextResponse.json(
        {
          error: "migration_missing",
          message: "جدول الإعلانات غير جاهز — شغّل هجرة 0038 في Supabase أولًا (raw link في المحادثة)",
        },
        { status: 503 },
      );
    }
    return NextResponse.json(
      { error: "ad_failed", message: `فشل تسجيل الإعلان: ${(e as { message?: string })?.message ?? "سبب غير معروف"} — وتم استرداد المبلغ` },
      { status: 502 },
    );
  }
}
