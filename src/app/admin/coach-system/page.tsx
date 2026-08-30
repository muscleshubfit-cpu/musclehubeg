"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useI18n } from "@/lib/i18n";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * COACH SYSTEM MANAGEMENT HUB (/admin/coach-system) — Phase 51.
 * Owner request: «ضيف صفحة لادارة نظام المدربين (زرار فى داشبورد الادمن)
 * ويجمع فيها كل الازرار الخاصة بادارة المدربين».
 *
 * One page that gathers EVERY coach-management surface:
 *   - صفحات المدربين (review queue: approve/reject with reason + the
 *     manual «أكمل إعداد صفحتك» reminder bell)
 *   - تعيين المدربين (1↔1 assignments + add/promote staff + fees + the
 *     offline-payments ledger)
 *   - محافظ المدربين (balances, receipt top-ups, manual adjustments)
 *   - دعم المدربين (the coach→site support inbox)
 *
 * Admin-only by inheritance: the /admin layout (AdminGate) bounces
 * non-admins before this renders. Live pending/missing counters come
 * from the same GET /api/admin/coach-pages the review queue uses.
 */

type Card = {
  href: string;
  emoji: string;
  title: string;
  desc: string;
  badge?: "pages";
};

export default function CoachSystemHub() {
  const { lang } = useI18n();
  const isAr = lang === "ar";
  const [pending, setPending] = useState<number | null>(null);
  const [missing, setMissing] = useState<number | null>(null);

  // Live counters for the review-queue card (best-effort — never blocks).
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
      title: isAr ? "صفحات المدربين" : "Coach pages",
      desc: isAr
        ? "مراجعة صفحات المدربين — موافقة أو رفض بسبب، وتذكير اللي لسه ما أنشأش صفحته"
        : "Review coach pages — approve or reject with reason, and remind those without a page",
      badge: "pages",
    },
    {
      href: "/admin/assignments",
      emoji: "🤝",
      title: isAr ? "تعيين المدربين" : "Coach assignments",
      desc: isAr
        ? "إضافة مدرب جديد، ربط العملاء بالمدربين (1 ↔ 1)، رسوم الكوتشينج، وسجل الدفعات اليدوية"
        : "Add coaches, assign clients (1 ↔ 1), coaching fees & the offline-payments ledger",
    },
    {
      href: "/admin/wallets",
      emoji: "👷",
      title: isAr ? "محافظ المدربين" : "Coach wallets",
      desc: isAr
        ? "أرصدة المحافظ، طلبات الشحن والإيصالات، والتعديل اليدوي"
        : "Balances, receipt top-ups & manual adjustments",
    },
    {
      href: "/admin/coach-support",
      emoji: "🛠️",
      title: isAr ? "دعم المدربين" : "Coach support",
      desc: isAr
        ? "رسائل دعم المدربين الواردة للإدارة والرد عليها"
        : "Coach→site support inbox and replies",
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">
          {isAr ? "إدارة نظام المدربين" : "Coach System Management"}
        </h1>
        <p className="mt-2 max-w-3xl text-base font-normal text-[#6e6e73] md:text-lg">
          {isAr
            ? "كل أدوات إدارة المدربين في مكان واحد. المدرب الجديد لما يسجّل بيتحوّل تلقائيًا لإعداد صفحته العامة ويوصلك إشعار — وصفحته تظهر هنا في قائمة المراجعة."
            : "Every coach-management tool in one place. New coaches land straight on their page setup and you get notified — their page then shows up in the review queue."}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {cards.map((card) => (
          <Link
            key={card.href}
            href={card.href}
            className="group rounded-3xl border border-[#d2d2d7] bg-white p-5 transition-all hover:-translate-y-0.5 hover:border-[#1d1d1f]/40 hover:shadow-lg hover:shadow-black/5"
          >
            <div className="flex items-start justify-between gap-2">
              <span className="text-3xl">{card.emoji}</span>
              {card.badge === "pages" && pending !== null && pending > 0 && (
                <span className="rounded-full bg-[#ff9500] px-2.5 py-1 text-[10px] font-bold text-white">
                  {isAr ? `${pending} في الانتظار` : `${pending} pending`}
                </span>
              )}
              {card.badge === "pages" && missing !== null && missing > 0 && (
                <span className="rounded-full bg-[#86868b]/15 px-2.5 py-1 text-[10px] font-bold text-[#6e6e73]">
                  {isAr ? `${missing} بدون صفحة` : `${missing} no page`}
                </span>
              )}
            </div>
            <p className="mt-3 font-semibold">{card.title}</p>
            <p className="mt-1 text-sm leading-relaxed text-[#6e6e73]">{card.desc}</p>
          </Link>
        ))}
      </div>

      {pending === null && (
        <p className="flex items-center gap-2 text-xs text-[#86868b]">
          <Loader2 className="h-3 w-3 animate-spin" />
          {isAr ? "جاري فحص طابور المراجعة…" : "Checking the review queue…"}
        </p>
      )}

      <p className={cn("text-xs text-[#6e6e73]")}>
        {isAr
          ? "ملاحظة: تنبيه «أكمل إعداد صفحتك» بيوصله للمدرب في جرس إشعاراته تلقائيًا أول ما يسجّل — وتقدر تبعته يدويًا من قائمة صفحات المدربين بزر «تذكير»."
          : "Note: the «complete your page» bell fires automatically at signup — and you can re-send it manually from the review queue with the Remind button."}
      </p>
    </div>
  );
}
