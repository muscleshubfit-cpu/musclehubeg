"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useI18n } from "@/lib/i18n";
import { getCoachClientStats, type CoachClientStats } from "@/lib/data";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * ADMIN CONSOLE HOME (/admin) — Phase 52 owner directive:
 * «افحص داشبورد الادمن لان محتاج تنسيق الأزرار ... لانها مبعثرة»
 * The flat 13-card grid is now GROUPED into labeled sections (coaches /
 * clients & memberships / content / growth / my account) with a quick
 * stats strip on top. Every admin surface stays reachable — just sorted
 * the way work actually flows.
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

type Section = {
  titleAr: string;
  titleEn: string;
  cards: Card[];
};

export default function AdminConsoleHome() {
  const { lang } = useI18n();
  const isAr = lang === "ar";
  const [pendingPages, setPendingPages] = useState<number | null>(null);
  const [stats, setStats] = useState<CoachClientStats | null>(null);

  // Live counters (best-effort — never block the page).
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [pagesRes, st] = await Promise.all([
          fetch("/api/admin/coach-pages").catch(() => null),
          getCoachClientStats(),
        ]);
        if (cancelled) return;
        if (pagesRes && pagesRes.ok) {
          const data = await pagesRes.json();
          if (data?.counts) setPendingPages(Number(data.counts.pending) || 0);
        }
        setStats(st);
      } catch {
        /* badges stay hidden */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const fmt = (n: number | null | undefined) =>
    n === null || n === undefined ? "…" : n.toLocaleString(isAr ? "ar-EG" : "en-US");

  // Quick stats strip — the four numbers the owner checks daily.
  const tiles = [
    {
      href: "/coach",
      label: isAr ? "إجمالي العملاء" : "Total clients",
      value: stats?.total ?? null,
      color: "text-[#1d1d1f]",
    },
    {
      href: "/coach",
      label: isAr ? "اشتراكات نشطة" : "Active subs",
      value: stats?.active ?? null,
      color: "text-[#34c759]",
    },
    {
      href: "/admin/payments",
      label: isAr ? "طلبات دفع معلّقة" : "Pending payments",
      value: stats?.pending_payment ?? null,
      color: "text-[#0071e3]",
    },
    {
      href: "/admin/coach-pages",
      label: isAr ? "صفحات بانتظار المراجعة" : "Pages pending review",
      value: pendingPages,
      color: "text-[#ff9500]",
    },
  ];

  const sections: Section[] = [
    {
      titleAr: "المدربون",
      titleEn: "Coaches",
      cards: [
        {
          // Phase 51 hub leads the section — every coach tool lives inside it.
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
          href: "/admin/assignments",
          emoji: "🤝",
          title: isAr ? "تعيين المدربين" : "Coach assignments",
          desc: isAr ? "ربط العميل بمدربه (1 ↔ 1)" : "Assign clients to coaches (1 ↔ 1)",
        },
        {
          href: "/admin/wallets",
          emoji: "👛",
          title: isAr ? "محافظ المدربين" : "Coach wallets",
          desc: isAr ? "مراجعة الإيصالات وشحن المحافظ" : "Review receipts & top up wallets",
        },
        {
          href: "/admin/coach-support",
          emoji: "🛠️",
          title: isAr ? "دعم المدربين" : "Coach support",
          desc: isAr ? "رسائل دعم المدربين والرد عليها" : "Coach support inbox & replies",
        },
      ],
    },
    {
      titleAr: "العملاء والعضويات",
      titleEn: "Clients & memberships",
      cards: [
        {
          href: "/coach",
          emoji: "👥",
          title: isAr ? "العملاء" : "Clients",
          desc: isAr
            ? "كل عملاء الموقع واشتراكاتهم واستبياناتهم — مقسّمة صفحات مع بحث وترتيب"
            : "All site clients, subscriptions & questionnaires — paged with search & sort",
        },
        {
          href: "/admin/payments",
          emoji: "💳",
          title: isAr ? "عضويات الموقع" : "Site memberships",
          desc: isAr ? "مراجعة طلبات اشتراكات الموقع" : "Review site membership requests",
        },
        {
          href: "/admin/accounts",
          emoji: "🛡️",
          title: isAr ? "الحسابات" : "Accounts",
          desc: isAr ? "تعليم الحسابات التجريبية ومسح أي حساب" : "Mark test accounts & delete any account",
        },
      ],
    },
    {
      titleAr: "المحتوى",
      titleEn: "Content",
      cards: [
        {
          href: "/admin/blog",
          emoji: "📝",
          title: isAr ? "المدونة" : "Blog",
          desc: isAr ? "إدارة المقالات المنشورة والمسودات" : "Manage published posts & drafts",
        },
      ],
    },
    {
      titleAr: "النمو والتسويق",
      titleEn: "Growth",
      cards: [
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
      ],
    },
    {
      titleAr: "حسابي",
      titleEn: "My account",
      cards: [
        {
          // Phase 51 — the admin's own public page + member-style profile
          // are reachable from his console.
          href: "/coach/landing",
          emoji: "🌐",
          title: isAr ? "صفحتي العامة" : "My public page",
          desc: isAr
            ? "إعداد صفحتك العامة أمام العملاء — وتظهر بعد مراجعتك لها بنفسك"
            : "Set up your own public coach page",
        },
        {
          href: "/profile",
          emoji: "👤",
          title: isAr ? "الصفحة الشخصية" : "Personal page",
          desc: isAr ? "بياناتك وعضويتك ونتائجك المحفوظة" : "Your info, membership & saved results",
        },
      ],
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
            ? "مركز إدارة Musclehubeg — كل أدوات الموقع مقسّمة في أقسام واضحة."
            : "The Musclehubeg control center — every admin tool, grouped."}
        </p>
      </div>

      {/* Quick stats — the numbers the owner checks daily, one tap away */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {tiles.map((tile) => (
          <Link
            key={tile.label}
            href={tile.href}
            className="rounded-2xl bg-[#f5f5f7] p-4 transition-colors hover:bg-[#ebebed]"
          >
            <p className={cn("text-2xl font-semibold tracking-tight md:text-3xl", tile.color)}>
              {fmt(tile.value)}
            </p>
            <p className="mt-1 text-xs font-normal text-[#6e6e73]">{tile.label}</p>
          </Link>
        ))}
      </div>

      {sections.map((section) => (
        <section key={section.titleEn} className="space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-[#6e6e73]">
            {isAr ? section.titleAr : section.titleEn}
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {section.cards.map((card) => (
              <Link
                key={card.href}
                href={card.href}
                className="group rounded-3xl border border-[#d2d2d7] bg-white p-5 transition-all hover:-translate-y-0.5 hover:border-[#1d1d1f]/40 hover:shadow-lg hover:shadow-black/5"
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="text-3xl">{card.emoji}</span>
                  {card.badgeKey === "pendingPages" && pendingPages !== null && pendingPages > 0 && (
                    <span className="rounded-full bg-[#ff9500] px-2.5 py-1 text-[10px] font-bold text-white">
                      {isAr ? `${pendingPages} في الانتظار` : `${pendingPages} pending`}
                    </span>
                  )}
                </div>
                <p className="mt-3 font-semibold">{card.title}</p>
                <p className="mt-1 text-sm leading-relaxed text-[#6e6e73]">{card.desc}</p>
              </Link>
            ))}
          </div>
        </section>
      ))}

      {pendingPages === null && (
        <p className="flex items-center gap-2 text-xs text-[#86868b]">
          <Loader2 className="h-3 w-3 animate-spin" />
          {isAr ? "جاري فحص طوابير المراجعة…" : "Checking the review queues…"}
        </p>
      )}
    </div>
  );
}
