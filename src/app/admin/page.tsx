"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useI18n } from "@/lib/i18n";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * ADMIN CONSOLE HOME (/admin) — 2026-08-30 owner directive:
 * «اعاده تنسيق صفحة الادمن ... بتتعرض كأنهم اعضاء»
 * The admin previously had NO own dashboard (login landed on /coach —
 * the coach's client list). This is his overview: every admin surface
 * as one card grid + a LIVE pending-review counter for coach pages.
 *
 * Admin-only by inheritance: the /admin layout (AdminGate) bounces
 * non-admins before this renders.
 */

type Card = {
  href: string;
  emoji: string;
  title: string;
  desc: string;
  badgeKey?: "pendingPages";
};

export default function AdminConsoleHome() {
  const { lang } = useI18n();
  const isAr = lang === "ar";
  const [pendingPages, setPendingPages] = useState<number | null>(null);

  // Live counter for the review queue badge (best-effort — never blocks).
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/admin/coach-pages");
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled && data?.counts) setPendingPages(Number(data.counts.pending) || 0);
      } catch {
        /* badge stays hidden */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const cards: Card[] = [
    {
      // Phase 51 (owner: «ضيف صفحة لادارة نظام المدربين — زرار فى داشبورد
      // الادمن — يجمع فيها كل الازرار الخاصة بادارة المدربين») — the hub
      // leads the grid; individual coach surfaces remain below.
      href: "/admin/coach-system",
      emoji: "🎛️",
      title: isAr ? "إدارة نظام المدربين" : "Coach system",
      desc: isAr
        ? "كل أدوات إدارة المدربين في صفحة واحدة — المراجعة والتعيين والمحافظ والدعم"
        : "Every coach-management tool in one page — review, assignments, wallets, support",
      badgeKey: "pendingPages",
    },
    {
      href: "/admin/coach-pages",
      emoji: "🗂️",
      title: isAr ? "صفحات المدربين" : "Coach pages",
      desc: isAr
        ? "راجع محتوى صفحات المدربين — موافقة أو رفض بسبب"
        : "Review coach-written pages — approve or reject with reason",
      badgeKey: "pendingPages",
    },
    {
      href: "/coach",
      emoji: "👥",
      title: isAr ? "العملاء" : "Clients",
      desc: isAr ? "كل عملاء الموقع واشتراكاتهم واستبياناتهم" : "All site clients, subscriptions & questionnaires",
    },
    {
      href: "/admin/assignments",
      emoji: "🤝",
      title: isAr ? "تعيين المدربين" : "Coach assignments",
      desc: isAr ? "ربط العميل بمدربه (1 ↔ 1)" : "Assign clients to coaches (1 ↔ 1)",
    },
    {
      href: "/admin/payments",
      emoji: "💳",
      title: isAr ? "عضويات الموقع" : "Site memberships",
      desc: isAr ? "مراجعة طلبات اشتراكات الموقع" : "Review site membership requests",
    },
    {
      href: "/admin/wallets",
      emoji: "👛",
      title: isAr ? "محافظ المدربين" : "Coach wallets",
      desc: isAr ? "مراجعة الإيصالات وشحن المحافظ" : "Review receipts & top up wallets",
    },
    {
      href: "/admin/accounts",
      emoji: "👥",
      title: isAr ? "الحسابات" : "Accounts",
      desc: isAr ? "تعليم الحسابات التجريبية ومسح أي حساب" : "Mark test accounts & delete any account",
    },
    {
      href: "/admin/blog",
      emoji: "📝",
      title: isAr ? "المدونة" : "Blog",
      desc: isAr ? "إدارة المقالات المنشورة والمسودات" : "Manage published posts & drafts",
    },
    {
      href: "/admin/referrals",
      emoji: "🎁",
      title: isAr ? "الإحالات" : "Referrals",
      desc: isAr ? "متابعة نظام دعوة الأصدقاء" : "Monitor the invite-friends engine",
    },
    {
      href: "/admin/leads",
      emoji: "📨",
      title: isAr ? "Leads الأدوات" : "Tool Leads",
      desc: isAr ? "بيانات مستخدمي الحاسبات المجانية" : "Free-tools users data",
    },
    {
      href: "/admin/saved-results",
      emoji: "🔖",
      title: isAr ? "النتائج المحفوظة" : "Saved Results",
      desc: isAr ? "نتائج الأدوات المحفوظة" : "Saved tool results",
    },
    // Phase 51 (owner: «مفروض تكون جزء من الداشبورد مثلا زرار الصفحة
    // الشخصية» + «صفحته العامة مش موجودة فى الداشبورد للادمن») — the
    // member-style /profile page and the admin's OWN public page are
    // reachable from his console instead of the header account button
    // (which now opens this console).
    {
      href: "/coach/landing",
      emoji: "🌐",
      title: isAr ? "صفحتي العامة" : "My public page",
      desc: isAr ? "إعداد صفحتك العامة أمام العملاء — وتظهر بعد مراجعتك لها بنفسك" : "Set up your own public coach page",
    },
    {
      href: "/profile",
      emoji: "👤",
      title: isAr ? "الصفحة الشخصية" : "Personal page",
      desc: isAr ? "بياناتك وعضويتك ونتائجك المحفوظة" : "Your info, membership & saved results",
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">
          {isAr ? "لوحة الأدمن" : "Admin Console"}
        </h1>
        <p className="mt-2 max-w-3xl text-base font-normal text-[#6e6e73] md:text-lg">
          {isAr
            ? "مركز إدارة Musclehubeg — كل أدوات الموقع في مكان واحد."
            : "The Musclehubeg control center — every admin tool in one place."}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((card) => (
          <Link
            key={card.href}
            href={card.href}
            className="group rounded-3xl border border-[#d2d2d7] bg-white p-5 transition-all hover:-translate-y-0.5 hover:border-[#1d1d1f]/40 hover:shadow-lg hover:shadow-black/5"
          >
            <div className="flex items-start justify-between gap-2">
              <span className="text-3xl">{card.emoji}</span>
              {card.badgeKey === "pendingPages" && pendingPages !== null && pendingPages > 0 && (
                <span
                  className={cn(
                    "rounded-full px-2.5 py-1 text-[10px] font-bold",
                    "bg-[#ff9500] text-white",
                  )}
                >
                  {isAr ? `${pendingPages} في الانتظار` : `${pendingPages} pending`}
                </span>
              )}
            </div>
            <p className="mt-3 font-semibold">{card.title}</p>
            <p className="mt-1 text-sm leading-relaxed text-[#6e6e73]">{card.desc}</p>
          </Link>
        ))}
      </div>

      {pendingPages === null && (
        <p className="flex items-center gap-2 text-xs text-[#86868b]">
          <Loader2 className="h-3 w-3 animate-spin" />
          {isAr ? "جاري فحص طابور المراجعة…" : "Checking the review queue…"}
        </p>
      )}
    </div>
  );
}
