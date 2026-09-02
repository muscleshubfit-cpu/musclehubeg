"use client";

import { type ReactNode, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/hooks/use-auth";
import { SiteHeader } from "@/components/SiteHeader";
import { getCoachClientStats } from "@/lib/data";
import { isSupabaseConfigured } from "@/lib/supabase/client";
import { ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * ADMIN SHELL — the admin console's DEDICATED chrome (Admin Panel 2.0,
 * Phase 101 owner directive: «اعملنى ريبيلد للوحة تحكم الادمن»).
 *
 * Replaces AppLayout inside /admin/* only (AdminGate renders this instead).
 * The member/coach app at (app)/* keeps AppLayout untouched.
 *
 * WHY A DEDICATED SHELL:
 *  - The old admin sidebar was the COACH sidebar plus 4 extra links —
 *    admin surfaces were split between /admin/* (card-grid launcher) and
 *    /coach (client management), and the coach-system hub added a SECOND
 *    launcher level. Navigation was 2–3 taps deep for daily surfaces.
 *  - The new shell is a sectioned, pathname-active SIDEBAR with every
 *    admin surface ONE tap away, plus live pending-count badges (payment
 *    requests + coach-page review queue) so work announces itself.
 *
 * NAV CONTEXT SAFETY: useNav() is a thin URL adapter (no provider), and
 * admin views never import AppLayout — swapping the chrome breaks nothing.
 * Coach surfaces (client management /coach, public page /coach/landing)
 * stay reachable from the «أسطري» section via real URLs.
 */

type BadgeKey = "pendingPayment" | "pendingPages";

type AdminNavItem = {
  href: string;
  emoji: string;
  ar: string;
  en: string;
  badge?: BadgeKey;
  exact?: boolean;
};

type AdminNavSection = {
  ar: string;
  en: string;
  items: AdminNavItem[];
};

const SECTIONS: AdminNavSection[] = [
  {
    ar: "نظرة عامة",
    en: "Overview",
    items: [
      { href: "/admin/dashboard", emoji: "🏛", ar: "الرئيسية", en: "Dashboard", exact: true },
    ],
  },
  {
    ar: "العملاء والعضويات",
    en: "Clients & memberships",
    items: [
      { href: "/admin/members", emoji: "👥", ar: "الأعضاء", en: "Members" },
      {
        href: "/admin/payments",
        emoji: "💳",
        ar: "طلبات العضويات",
        en: "Membership requests",
        badge: "pendingPayment",
      },
      { href: "/admin/accounts", emoji: "🛡️", ar: "الحسابات", en: "Accounts" },
    ],
  },
  {
    ar: "المدربون",
    en: "Coaches",
    items: [
      { href: "/admin/coaches", emoji: "🎛️", ar: "مركز المدربين", en: "Coach hub" },
      {
        href: "/admin/coach-pages",
        emoji: "🗂️",
        ar: "صفحات المدربين",
        en: "Coach pages",
        badge: "pendingPages",
      },
      { href: "/admin/assignments", emoji: "🤝", ar: "التعيينات", en: "Assignments" },
      { href: "/admin/wallets", emoji: "👷", ar: "المحافظ", en: "Wallets" },
      { href: "/admin/coach-support", emoji: "🛠️", ar: "دعم المدربين", en: "Coach support" },
    ],
  },
  {
    ar: "المالية",
    en: "Finances",
    items: [
      { href: "/admin/finances", emoji: "💰", ar: "المالية", en: "Finances" },
    ],
  },
  {
    ar: "المحتوى",
    en: "Content",
    items: [
      { href: "/admin/blog", emoji: "📝", ar: "المدونة", en: "Blog" },
      {
        href: "/admin/external-plans",
        emoji: "📋",
        ar: "خطط لغير الأعضاء",
        en: "External plans",
      },
    ],
  },
  {
    ar: "النمو والتسويق",
    en: "Growth",
    items: [
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
  {
    ar: "أسطري",
    en: "My surfaces",
    items: [
      { href: "/coach", emoji: "🧑‍💼", ar: "إدارة العملاء الكاملة", en: "Full client manager" },
      { href: "/coach/landing", emoji: "🌐", ar: "صفحتي العامة", en: "My public page" },
      { href: "/profile", emoji: "👤", ar: "ملفي الشخصي", en: "My profile" },
    ],
  },
];

export function AdminShell({ children }: { children: ReactNode }) {
  const { lang } = useI18n();
  const { profile } = useAuth();
  const pathname = usePathname() || "";
  const isAr = lang === "ar";

  // Live badges — best-effort, never block the shell from rendering.
  const [pendingPayment, setPendingPayment] = useState<number | null>(null);
  const [pendingPages, setPendingPages] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [stats, pagesRes] = await Promise.all([
          getCoachClientStats(),
          fetch("/api/admin/coach-pages").catch(() => null),
        ]);
        if (cancelled) return;
        if (stats) setPendingPayment(Number(stats.pending_payment) || 0);
        if (pagesRes && pagesRes.ok) {
          const data = await pagesRes.json();
          if (data?.counts) setPendingPages(Number(data.counts.pending) || 0);
        }
      } catch {
        /* badges stay hidden */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [pathname]);

  const badgeFor = (key?: BadgeKey): number | null =>
    key === "pendingPayment" ? pendingPayment : key === "pendingPages" ? pendingPages : null;

  const isActive = (item: AdminNavItem) =>
    item.exact ? pathname === item.href : pathname.startsWith(item.href);

  const sectionLabel = (label: string) => (
    <p className="px-3 pb-1 pt-4 text-[10px] font-bold uppercase tracking-wider text-[#86868b]">
      {label}
    </p>
  );

  const renderItem = (item: AdminNavItem, compact = false) => {
    const active = isActive(item);
    const badge = badgeFor(item.badge);
    return (
      <Link
        key={item.href}
        href={item.href}
        className={cn(
          "flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-normal transition-colors",
          compact ? "shrink-0 whitespace-nowrap" : "block w-full text-start",
          active
            ? "bg-[#1d1d1f] font-medium text-white"
            : "text-[#6e6e73] hover:text-[#1d1d1f]",
        )}
      >
        <span className="text-base leading-none">{item.emoji}</span>
        <span className={cn(compact ? "" : "truncate")}>
          {isAr ? item.ar : item.en}
        </span>
        {badge !== null && badge > 0 && (
          <span className="ms-auto rounded-full bg-[#ff9500] px-1.5 py-0.5 text-[10px] font-bold text-white">
            {badge}
          </span>
        )}
      </Link>
    );
  };

  return (
    <div className="flex min-h-screen flex-col bg-white text-[#1d1d1f]">
      {!isSupabaseConfigured && (
        <div className="bg-[#1d1d1f] px-3 py-1.5 text-center text-xs font-normal text-white">
          {isAr
            ? "وضع تجريبي — مفيش بيانات Supabase. البيانات بتتخزن محلياً بس."
            : "Demo mode — no Supabase credentials. Data stored locally only."}
        </div>
      )}
      <SiteHeader variant="app" />

      {/* Console identity banner — dark = admin (2026-08-30 staff identity) */}
      <div className="border-b border-[#1d1d1f] bg-[#1d1d1f]">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3 px-4 py-2.5 md:px-6">
          <div className="flex items-center gap-2.5 text-white">
            <ShieldCheck className="h-5 w-5" />
            <div className="leading-tight">
              <p className="text-sm font-bold">
                {isAr ? "لوحة الأدمن 2.0" : "Admin Console 2.0"}
              </p>
              <p className="text-[11px] text-white/70">
                {isAr ? "إدارة كاملة للموقع" : "Full site management"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/coach"
              className="hidden rounded-full bg-white/15 px-2.5 py-1 text-[10px] font-bold text-white transition-colors hover:bg-white/25 sm:block"
            >
              {isAr ? "واجهة المدرب ›" : "Coach console ›"}
            </Link>
            <span className="rounded-full bg-white/15 px-2.5 py-1 text-[10px] font-bold text-white">
              {profile?.full_name || (isAr ? "أدمن" : "Admin")}
            </span>
          </div>
        </div>
      </div>

      {/* Mobile: compact scrollable chips (replaces the old 13-big-button
          grid that pushed content down two screens) */}
      <div className="border-b border-[#f2f2f7] bg-white md:hidden">
        <div className="flex gap-2 overflow-x-auto px-4 py-2.5">
          {SECTIONS.flatMap((s) => s.items).map((item) => renderItem(item, true))}
        </div>
      </div>

      <div className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 md:px-6 md:py-10">
        <div className="flex gap-8 md:gap-12">
          {/* Desktop: the nested admin sidebar */}
          <aside className="hidden w-56 shrink-0 md:block">
            <nav className="sticky top-24 space-y-0.5">
              {SECTIONS.map((section) => (
                <div key={section.en}>
                  {sectionLabel(isAr ? section.ar : section.en)}
                  {section.items.map((item) => renderItem(item))}
                </div>
              ))}
            </nav>
          </aside>

          <main id="main-content" className="min-w-0 flex-1">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
