"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useI18n } from "@/lib/i18n";
import { Loader2 } from "lucide-react";
import { PageHeader } from "@/components/admin/ui";

/**
 * COACH HUB (/admin/coaches) — Admin Panel 2.0 (Phase 101).
 * The old /admin/coach-system hub (Phase 51/54) moves to the sidebar's
 * Coaches section — the hub itself stays as the section's landing page,
 * and /admin/coach-system redirects here so old links keep working.
 * The four individual surfaces are ALSO one tap away in the sidebar, so
 * the hub is no longer a mandatory second navigation level.
 */

type Card = {
  href: string;
  emoji: string;
  ar: string;
  en: string;
  descAr: string;
  descEn: string;
  badge?: "pending" | "missing";
};

export default function CoachHubPage() {
  const { lang } = useI18n();
  const isAr = lang === "ar";
  const [pending, setPending] = useState<number | null>(null);
  const [missing, setMissing] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/admin/coach-pages");
        if (!res.ok) return;
        const data = await res.json();
        if (cancelled || !data?.counts) return;
        setPending(Number(data.counts.pending) || 0);
        setMissing(Number(data.counts.missing) || 0);
      } catch {
        /* badges stay hidden */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const cards: Card[] = [
    {
      href: "/admin/coach-pages",
      emoji: "🗂️",
      ar: "صفحات المدربين",
      en: "Coach pages",
      descAr: "مراجعة صفحات المدربين — موافقة أو رفض بسبب، وتذكير اللي لسه ما أنشأش صفحته",
      descEn:
        "Review coach pages — approve or reject with reason, and remind those without a page",
      badge: "pending",
    },
    {
      href: "/admin/assignments",
      emoji: "🤝",
      ar: "التعيينات",
      en: "Assignments",
      descAr: "إضافة مدرب جديد، ربط العملاء بالمدربين (1 ↔ 1)، رسوم الكوتشينج، وسجل الدفعات اليدوية",
      descEn:
        "Add coaches, assign clients (1 ↔ 1), coaching fees & the offline-payments ledger",
    },
    {
      href: "/admin/wallets",
      emoji: "👷",
      ar: "المحافظ",
      en: "Wallets",
      descAr: "أرصدة المحافظ، طلبات الشحن والإيصالات، والتعديل اليدوي",
      descEn: "Balances, receipt top-ups & manual adjustments",
    },
    {
      href: "/admin/coach-support",
      emoji: "🛠️",
      ar: "دعم المدربين",
      en: "Coach support",
      descAr: "رسائل دعم المدربين الواردة للإدارة والرد عليها",
      descEn: "Coach→site support inbox and replies",
    },
  ];

  return (
    <div className="space-y-8">
      <PageHeader
        title={isAr ? "مركز المدربين" : "Coach hub"}
        sub={
          isAr
            ? "كل أدوات إدارة المدربين في مكان واحد — والقائمة الجانبية بتوصلك لأي أداة منهم مباشرة في نقرة واحدة."
            : "Every coach-management tool in one place — the sidebar also reaches each tool directly in one tap."
        }
      />

      <div className="grid gap-4 sm:grid-cols-2">
        {cards.map((card) => (
          <Link
            key={card.href}
            href={card.href}
            className="group rounded-3xl border border-[#d2d2d7] bg-white p-5 transition-all hover:-translate-y-0.5 hover:border-[#1d1d1f]/40 hover:shadow-lg hover:shadow-black/5"
          >
            <div className="flex items-start justify-between gap-2">
              <span className="text-3xl">{card.emoji}</span>
              <div className="flex gap-1.5">
                {card.badge === "pending" && pending !== null && pending > 0 && (
                  <span className="rounded-full bg-[#ff9500] px-2.5 py-1 text-[10px] font-bold text-white">
                    {isAr ? `${pending} في الانتظار` : `${pending} pending`}
                  </span>
                )}
                {card.badge === "pending" && missing !== null && missing > 0 && (
                  <span className="rounded-full bg-[#86868b]/15 px-2.5 py-1 text-[10px] font-bold text-[#6e6e73]">
                    {isAr ? `${missing} بدون صفحة` : `${missing} no page`}
                  </span>
                )}
              </div>
            </div>
            <p className="mt-3 font-semibold">{isAr ? card.ar : card.en}</p>
            <p className="mt-1 text-sm leading-relaxed text-[#6e6e73]">
              {isAr ? card.descAr : card.descEn}
            </p>
          </Link>
        ))}
      </div>

      {pending === null && (
        <p className="flex items-center gap-2 text-xs text-[#86868b]">
          <Loader2 className="h-3 w-3 animate-spin" />
          {isAr ? "جاري فحص طابور المراجعة…" : "Checking the review queue…"}
        </p>
      )}

      <p className="text-xs text-[#6e6e73]">
        {isAr
          ? "ملاحظة: تنبيه «أكمل إعداد صفحتك» بيوصله للمدرب في جرس إشعاراته تلقائيًا أول ما يسجّل — وتقدر تبعته يدويًا من قائمة صفحات المدربين بزر «تذكير»."
          : "Note: the «complete your page» bell fires automatically at signup — and you can re-send it manually from the review queue with the Remind button."}
      </p>
    </div>
  );
}
