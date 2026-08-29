"use client";

import { useCallback, useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n";
import { useNav } from "@/hooks/use-nav";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

/**
 * «أعلن معنا» — COACH ADS VIEW (0037).
 *
 * The coach subscribes for a FIXED duration at a FIXED price (wallet
 * debit — same rails as activation) and his featured card runs on the
 * homepage «مدربون مميزون» strip, linking visitors to his public page.
 * Buying while an ad is running EXTENDS it — no day is ever lost.
 */

type AdPackage = { id: string; days: number; priceEgp: number; ar: string; en: string };
type AdRow = {
  id: string;
  package_id: string;
  days: number;
  price_egp: number;
  status: string;
  starts_at: string;
  ends_at: string;
  created_at: string;
};

type AdsData = {
  packages: AdPackage[];
  balance: number;
  activeAd: { ends_at: string; package_id: string } | null;
  ads: AdRow[];
};

export function CoachAdsView() {
  const { lang } = useI18n();
  const isAr = lang === "ar";
  const { navigate } = useNav();
  const [data, setData] = useState<AdsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [buying, setBuying] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/coach/ads");
      const json = await res.json().catch(() => null);
      if (res.ok && json) setData(json as AdsData);
      else toast.error(json?.message || (isAr ? "تعذر تحميل بيانات الإعلانات" : "Failed to load ads"));
    } finally {
      setLoading(false);
    }
  }, [isAr]);

  useEffect(() => {
    void load();
  }, [load]);

  const buy = async (packageId: string) => {
    setBuying(packageId);
    try {
      const res = await fetch("/api/coach/ads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ package_id: packageId }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) {
        toast.error(json?.message || (isAr ? "فشل الاشتراك" : "Subscription failed"));
        return;
      }
      toast.success(
        isAr
          ? "اشتغل إعلانك — هيظهر في «مدربون مميزون» على الصفحة الرئيسية"
          : "Your ad is live — it appears in the Featured Coaches strip on the homepage",
      );
      await load();
    } finally {
      setBuying(null);
    }
  };

  const fmtDate = (iso: string) =>
    new Date(iso).toLocaleDateString(isAr ? "ar-EG" : "en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });

  const pkgLabel = (id: string) => {
    const p = data?.packages.find((x) => x.id === id);
    if (!p) return id;
    return isAr ? p.ar : p.en;
  };

  if (loading) {
    return (
      <div className="py-20 text-center text-base font-normal text-[#6e6e73]">
        {isAr ? "جارٍ التحميل…" : "Loading…"}
      </div>
    );
  }

  const packages = data?.packages ?? [];
  const activeAd = data?.activeAd ?? null;
  const balance = data?.balance ?? 0;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">
          {isAr ? "أعلن معنا" : "Advertise with us"}
        </h1>
        <p className="mt-2 text-base font-normal text-[#6e6e73] md:text-lg">
          {isAr
            ? "اشترك لمدة محددة بسعر ثابت — وإعلانك هيظهر ككارت مميز في «مدربون مميزون» على الصفحة الرئيسية، ويوصل الزائر لصفحتك العامة مباشرة."
            : "Subscribe for a fixed duration at a fixed price — your featured card appears in the homepage «Featured Coaches» strip and links straight to your public page."}
        </p>
      </div>

      {/* Status */}
      <div
        className={cn(
          "rounded-2xl p-6",
          activeAd ? "bg-[#34c759]/10" : "bg-[#f5f5f7]",
        )}
      >
        {activeAd ? (
          <>
            <p className="text-sm font-medium text-[#34c759]">
              {isAr ? "إعلانك شغال الآن" : "Your ad is running"}
            </p>
            <p className="mt-1 text-lg font-semibold tracking-tight">
              {isAr ? `ساري حتى ${fmtDate(activeAd.ends_at)}` : `Active until ${fmtDate(activeAd.ends_at)}`}
            </p>
            <p className="mt-1 text-sm font-normal text-[#6e6e73]">
              {isAr
                ? "لو اشتركت تاني والرصيد لسه شغال، المدة هتتجمع على المتبقي — مش هتخسر يوم."
                : "Subscribe again while it runs and the days stack on top — you never lose a day."}
            </p>
          </>
        ) : (
          <>
            <p className="text-sm font-medium text-[#6e6e73]">
              {isAr ? "مفيش إعلان نشط حاليًا" : "No active ad right now"}
            </p>
            <p className="mt-1 text-sm font-normal text-[#6e6e73]">
              {isAr
                ? "اختار باقة من تحت وابدأ — إعلانك بيشتغل فورًا بعد الخصم من المحفظة."
                : "Pick a package below — your ad goes live the moment your wallet is debited."}
            </p>
          </>
        )}
      </div>

      {/* Balance */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#d2d2d7] p-5">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-[#6e6e73]">
            {isAr ? "رصيد محفظتك" : "Your wallet balance"}
          </p>
          <p className="mt-1 text-2xl font-semibold tracking-tight" dir="ltr">
            {balance.toLocaleString(isAr ? "ar-EG" : "en-US")} EGP
          </p>
        </div>
        <button
          onClick={() => navigate("coach-wallet")}
          className="rounded-full border border-[#d2d2d7] bg-white px-5 py-2.5 text-sm font-normal transition-opacity hover:opacity-70"
        >
          {isAr ? "شحن المحفظة" : "Top up wallet"}
        </button>
      </div>

      {/* Packages */}
      <div className="grid gap-4 md:grid-cols-3">
        {packages.map((p) => (
          <div
            key={p.id}
            className="flex flex-col rounded-3xl bg-[#f5f5f7] p-6 transition-shadow hover:shadow-md"
          >
            <p className="text-lg font-semibold tracking-tight">
              {isAr ? p.ar : p.en}
            </p>
            <p className="mt-1 text-sm font-normal text-[#6e6e73]">
              {isAr ? `${p.days} يوم ظهور` : `${p.days} days of exposure`}
            </p>
            <p className="mt-4 text-3xl font-semibold tracking-tight" dir="ltr">
              {p.priceEgp.toLocaleString(isAr ? "ar-EG" : "en-US")}{" "}
              <span className="text-base font-normal text-[#6e6e73]">EGP</span>
            </p>
            <p className="mt-2 text-xs font-normal text-[#6e6e73]">
              {isAr ? "سعر ثابت — خصم من المحفظة" : "Fixed price — debited from your wallet"}
            </p>
            <button
              onClick={() => buy(p.id)}
              disabled={buying !== null}
              className="mt-5 rounded-full bg-[#0071e3] px-6 py-2.5 text-sm font-normal text-white transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {buying === p.id
                ? isAr ? "جارٍ الاشتراك…" : "Subscribing…"
                : activeAd
                  ? isAr ? "تمديد بهذه الباقة" : "Extend with this package"
                  : isAr ? "اشترك الآن" : "Subscribe now"}
            </button>
          </div>
        ))}
      </div>

      {/* What the ad looks like */}
      <div className="rounded-3xl bg-[#f5f5f7] p-6 md:p-8">
        <h2 className="text-lg font-semibold tracking-tight">
          {isAr ? "شكل إعلانك" : "What your ad looks like"}
        </h2>
        <p className="mt-2 text-sm font-normal text-[#6e6e73]">
          {isAr
            ? "الكارت بيعرض صورتك واسمك وعنوان تعريفك من صفحتك العامة — وضغطة واحدة تنقل الزائر ليها. كمّل بيانات صفحتك العامة أولًا عشان الإعلان يجيب أقصى نتيجة."
            : "The card shows your photo, name and headline from your public page — one tap takes the visitor there. Fill in your public page first for maximum impact."}
        </p>
        <button
          onClick={() => navigate("coach-landing")}
          className="mt-4 rounded-full border border-[#d2d2d7] bg-white px-5 py-2.5 text-sm font-normal transition-opacity hover:opacity-70"
        >
          {isAr ? "تعديل صفحتي العامة" : "Edit my public page"}
        </button>
      </div>

      {/* History */}
      {data && data.ads.length > 0 && (
        <div className="rounded-3xl border border-[#d2d2d7] p-6">
          <h2 className="text-base font-semibold tracking-tight">
            {isAr ? "سجل اشتراكات الإعلانات" : "Ad subscription history"}
          </h2>
          <div className="mt-4 space-y-3">
            {data.ads.map((ad) => {
              const expired = ad.status !== "active" || new Date(ad.ends_at).getTime() < Date.now();
              return (
                <div
                  key={ad.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-[#f5f5f7] px-4 py-3"
                >
                  <div>
                    <p className="text-sm font-medium">{pkgLabel(ad.package_id)} — {ad.price_egp} EGP</p>
                    <p className="text-xs font-normal text-[#6e6e73]" dir="ltr">
                      {new Date(ad.starts_at).toLocaleDateString()} → {new Date(ad.ends_at).toLocaleDateString()}
                    </p>
                  </div>
                  <span
                    className={cn(
                      "rounded-full px-3 py-1 text-xs font-medium",
                      expired ? "bg-[#6e6e73]/10 text-[#6e6e73]" : "bg-[#34c759]/10 text-[#34c759]",
                    )}
                  >
                    {expired ? (isAr ? "منتهي" : "Ended") : isAr ? "شغال" : "Running"}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
