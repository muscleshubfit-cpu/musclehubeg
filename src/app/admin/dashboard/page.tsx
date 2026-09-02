"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useI18n } from "@/lib/i18n";
import { getCoachClientStats, listSubscriptionRequests, type CoachClientStats } from "@/lib/data";
import { PageHeader, StatTile, fmtMoney, fmtNum } from "@/components/admin/ui";

/**
 * ADMIN DASHBOARD (/admin/dashboard) — Admin Panel 2.0 (Phase 101).
 *
 * The old /admin home was a launcher of launchers (13 cards → coach-system
 * hub → 4 more cards). With the dedicated sidebar carrying navigation,
 * the dashboard becomes an AT-A-GLANCE screen: the six numbers the owner
 * checks daily (clients, active subs, expired, pending payments, pending
 * page reviews, approved revenue) + compact quick-action cards.
 *
 * All counters are best-effort — a failing source hides its tile, never
 * breaks the page.
 */

type QuickCard = { href: string; emoji: string; ar: string; en: string };

const QUICK: { ar: string; en: string; cards: QuickCard[] }[] = [
  {
    ar: "العملاء والعضويات",
    en: "Clients & memberships",
    cards: [
      { href: "/admin/members", emoji: "👥", ar: "جدول الأعضاء", en: "Members table" },
      { href: "/admin/payments", emoji: "💳", ar: "طلبات العضويات", en: "Membership requests" },
      { href: "/admin/accounts", emoji: "🛡️", ar: "الحسابات", en: "Accounts" },
    ],
  },
  {
    ar: "المدربون",
    en: "Coaches",
    cards: [
      { href: "/admin/coaches", emoji: "🎛️", ar: "مركز المدربين", en: "Coach hub" },
      { href: "/admin/coach-pages", emoji: "🗂️", ar: "مراجعة الصفحات", en: "Page reviews" },
      { href: "/admin/wallets", emoji: "👷", ar: "المحافظ", en: "Wallets" },
    ],
  },
  {
    ar: "المالية والمحتوى",
    en: "Finances & content",
    cards: [
      { href: "/admin/finances", emoji: "💰", ar: "المالية", en: "Finances" },
      { href: "/admin/blog", emoji: "📝", ar: "المدونة", en: "Blog" },
      { href: "/admin/external-plans", emoji: "📋", ar: "خطط لغير الأعضاء", en: "External plans" },
    ],
  },
  {
    ar: "النمو",
    en: "Growth",
    cards: [
      { href: "/admin/referrals", emoji: "🎁", ar: "الإحالات", en: "Referrals" },
      { href: "/admin/leads", emoji: "📨", ar: "Leads الأدوات", en: "Tool leads" },
      {
        href: "/admin/saved-results",
        emoji: "🔖",
        ar: "النتائج المحفوظة",
        en: "Saved results",
      },
    ],
  },
];

export default function AdminDashboardPage() {
  const { lang } = useI18n();
  const isAr = lang === "ar";
  const [stats, setStats] = useState<CoachClientStats | null>(null);
  const [pendingPages, setPendingPages] = useState<number | null>(null);
  const [revenueApproved, setRevenueApproved] = useState<number | null>(null);
  const [revenuePending, setRevenuePending] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [st, pagesRes, reqs] = await Promise.all([
          getCoachClientStats(),
          fetch("/api/admin/coach-pages").catch(() => null),
          listSubscriptionRequests("all"),
        ]);
        if (cancelled) return;
        setStats(st);
        if (pagesRes && pagesRes.ok) {
          const data = await pagesRes.json();
          if (data?.counts) setPendingPages(Number(data.counts.pending) || 0);
        }
        const approved = reqs
          .filter((r) => r.status === "approved")
          .reduce((s, r) => s + (Number(r.price_usd) || 0), 0);
        const pending = reqs
          .filter((r) => r.status === "pending")
          .reduce((s, r) => s + (Number(r.price_usd) || 0), 0);
        setRevenueApproved(approved);
        setRevenuePending(pending);
      } catch {
        /* tiles stay hidden */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="space-y-8">
      <PageHeader
        title={isAr ? "الرئيسية" : "Dashboard"}
        sub={
          isAr
            ? "الأرقام اللي بتفحصها كل يوم في مكان واحد — والتنقل الكامل من القائمة الجانبية."
            : "The daily numbers in one place — full navigation lives in the sidebar."
        }
      />

      {/* KPI strip — the six daily numbers */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
        <StatTile
          label={isAr ? "إجمالي العملاء" : "Total clients"}
          value={stats ? fmtNum(stats.total, isAr) : null}
          href="/admin/members"
        />
        <StatTile
          label={isAr ? "اشتراكات نشطة" : "Active subs"}
          value={stats ? fmtNum(stats.active, isAr) : null}
          tone="green"
          href="/admin/members"
        />
        <StatTile
          label={isAr ? "اشتراكات منتهية" : "Expired subs"}
          value={stats ? fmtNum(stats.expired, isAr) : null}
          tone="red"
          href="/admin/members"
        />
        <StatTile
          label={isAr ? "طلبات دفع معلّقة" : "Pending payments"}
          value={stats ? fmtNum(stats.pending_payment, isAr) : null}
          tone="orange"
          href="/admin/payments"
        />
        <StatTile
          label={isAr ? "صفحات بانتظار المراجعة" : "Pages pending review"}
          value={pendingPages !== null ? fmtNum(pendingPages, isAr) : null}
          tone="orange"
          href="/admin/coach-pages"
        />
        <StatTile
          label={isAr ? "إيرادات معتمدة" : "Approved revenue"}
          value={revenueApproved !== null ? fmtMoney(revenueApproved) : null}
          sub={
            revenuePending !== null && revenuePending > 0
              ? isAr
                ? `${fmtMoney(revenuePending)} معلّقة`
                : `${fmtMoney(revenuePending)} pending`
              : undefined
          }
          tone="blue"
          href="/admin/finances"
        />
      </div>

      {/* Compact quick actions — the sidebar carries the full map */}
      <div className="space-y-6">
        {QUICK.map((group) => (
          <section key={group.en} className="space-y-3">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-[#6e6e73]">
              {isAr ? group.ar : group.en}
            </h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {group.cards.map((card) => (
                <Link
                  key={card.href}
                  href={card.href}
                  className="group flex items-center gap-3 rounded-2xl border border-[#d2d2d7] bg-white p-4 transition-all hover:-translate-y-0.5 hover:border-[#1d1d1f]/40 hover:shadow-lg hover:shadow-black/5"
                >
                  <span className="text-2xl">{card.emoji}</span>
                  <span className="font-medium">{isAr ? card.ar : card.en}</span>
                  <span className="ms-auto text-[#6e6e73] transition-transform group-hover:translate-x-0.5 rtl:rotate-180">
                    ›
                  </span>
                </Link>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
