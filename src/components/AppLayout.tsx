"use client";

import { type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { useI18n } from "@/lib/i18n";
import { SiteHeader } from "@/components/SiteHeader";
import { cn } from "@/lib/utils";
import { useNav, type View } from "@/hooks/use-nav";
import { isSupabaseConfigured } from "@/lib/supabase/client";
import { openEvoFloatingChat } from "@/lib/evo-chat-context";
import { ShieldCheck, Users } from "lucide-react";

/**
 * AppLayout — the shell for ALL authenticated surfaces.
 *
 * 2026-08-30 OWNER DIRECTIVE — STAFF CONSOLE IDENTITY:
 * «اعاده تنسيق صفحة الادمن وصفحة المدرب لانها حاليا بتتعرض كأنهم اعضاء»
 * The old shell rendered staff and members with the IDENTICAL look
 * (member-blue nav, plain sidebar, welcome line) — the admin console
 * and coach console now carry their own identity:
 *   - a dark console banner (🛡 لوحة الأدمن / 👥 لوحة المدرب) with a
 *     role chip, above the content on BOTH desktop and mobile
 *   - section-labelled sidebar (إدارة العملاء / إدارة الموقع)
 *   - staff-colored active states: admin = dark #1d1d1f,
 *     coach = violet #8b5cf6 (member blue #0071e3 untouched)
 *
 * 0046: new admin menu item «صفحات المدربين» — the coach-pages review
 * queue (approve/reject coach-written public content).
 */
export function AppLayout({ children }: { children: ReactNode }) {
  const { t, lang } = useI18n();
  const { profile, isCoach, isAdmin } = useAuth();
  const { view, navigate } = useNav();
  const pathname = usePathname();
  const isAr = lang === "ar";

  type NavItem = { to: View; label: string; emoji: string; action?: "evo-chat" };
  const clientNav: NavItem[] = [
    { to: "dashboard", label: t("nav.dashboard"), emoji: "🏠" },
    // EVO CHAT SURFACE LAW (2026-08-27): opens the floating widget — the
    // /chat page no longer exists (next.config redirects it to /evo).
    { to: "chat", label: t("nav.coach"), emoji: "💬", action: "evo-chat" },
    { to: "questionnaires", label: t("nav.questionnaires"), emoji: "📋" },
    { to: "progress", label: t("nav.progress"), emoji: "📊" },
    { to: "plans", label: t("nav.plans"), emoji: "📄" },
    { to: "support", label: t("nav.support"), emoji: "🔧" },
    { to: "referral", label: t("nav.referral"), emoji: "🎁" },
    { to: "memberships", label: t("nav.pricing"), emoji: "👑" },
  ];
  // STAFF NAV (coach | admin): the coach's work surface. Clients first —
  // the questionnaire review queue inside each client page is the coach's
  // entry point (owner directive: نقطة اطلاع الكوتش على الاستبيانات).
  const coachNav: NavItem[] = [
    { to: "coach", label: t("nav.clients"), emoji: "👥" },
    { to: "coach-support", label: t("nav.support.coach"), emoji: "🔧" },
    // 0043 TERMINOLOGY: «المدفوعات» removed from the coach nav — site
    // membership requests are admin-only (coachNavAdmin below). The
    // coach's B2B money surfaces are the client page + his wallet.
    // COACH WALLET (0035): the coach pays THE SITE a monthly fixed fee
    // per client from this balance — top-up via InstaPay / Vodafone
    // Cash / PayPal + receipt → admin review. Activation debits it.
    { to: "coach-wallet", label: isAr ? "محفظتي" : "My Wallet", emoji: "👛" },
    // «أعلن معنا» (0037): fixed-duration ad packages — the featured card
    // runs on the homepage «مدربون مميزون» strip. Wallet debited.
    { to: "coach-ads", label: isAr ? "أعلن معنا" : "Advertise", emoji: "📣" },
    // «دعم المدربين» (0037): the coach → site support channel, separate
    // from the site's client support (client support belongs to coach).
    { to: "coach-help", label: isAr ? "دعم المدربين" : "Coach Support", emoji: "🛟" },
  ];
  // ADMIN-EXCLUSIVE nav items (owner directive 2026-08-29 — answers Q6):
  // blog CMS, referrals admin, tool leads, saved results are hidden from
  // future coach accounts; the admin (owner / general coach) sees them.
  const coachNavAdmin: NavItem[] = [
    { to: "blog-admin", label: isAr ? "المدونة" : "Blog", emoji: "📝" },
    { to: "admin-referrals", label: isAr ? "الإحالات" : "Referrals", emoji: "🎁" },
    // 0043: SITE membership payment requests (B2C) — admin-only review
    // at /admin/payments (site coaching ≠ coach system B2B).
    { to: "admin-payments", label: isAr ? "عضويات الموقع" : "Site memberships", emoji: "💳" },
  ];
  // Custom external links for admin-only pages that live outside the View
  // type (real URLs under /admin/*). Saved Results was previously reachable
  // only from the header drawer — deep-audit fix (2026-08-28) puts it on par
  // with Tool Leads in the persistent sidebar.
  const coachExtraLinks = [
    // 0046: coach-pages REVIEW QUEUE — moderation for coach-written
    // public content (approve / reject with reason).
    { href: "/admin/coach-pages", label: isAr ? "صفحات المدربين" : "Coach pages", emoji: "🗂️" },
    // Phase 2B follow-up («مفيش لسة طريقة لتعيين المدربين»): the 1↔1
    // client↔coach assignment got its OWN obvious admin surface.
    { href: "/admin/assignments", label: isAr ? "تعيين المدربين" : "Coach assignments", emoji: "🤝" },
    // 0035: receipt review + manual wallet credit (محافظ المدربين).
    { href: "/admin/wallets", label: isAr ? "محافظ المدربين" : "Coach wallets", emoji: "👛" },
    // 0045 (owner request): mark TEST accounts + delete accounts, one surface.
    { href: "/admin/accounts", label: isAr ? "الحسابات" : "Accounts", emoji: "👥" },
    { href: "/admin/leads", label: isAr ? "Leads الأدوات" : "Tool Leads", emoji: "📨" },
    { href: "/admin/saved-results", label: isAr ? "النتائج المحفوظة" : "Saved Results", emoji: "🔖" },
  ];
  const nav = isCoach ? [...coachNav, ...(isAdmin ? coachNavAdmin : [])] : clientNav;

  // ── STAFF CONSOLE IDENTITY (2026-08-30) ──
  const consoleMeta = isAdmin
    ? {
        title: isAr ? "لوحة الأدمن" : "Admin Console",
        sub: isAr ? "إدارة كاملة للموقع" : "Full site management",
        chip: isAr ? "أدمن" : "Admin",
        // admin accent = console dark
        activeCls: "bg-[#1d1d1f] text-white",
        icon: <ShieldCheck className="h-5 w-5" />,
      }
    : {
        title: isAr ? "لوحة المدرب" : "Coach Console",
        sub: isAr ? "إدارة عملائك وأعمالك" : "Manage your clients & business",
        chip: isAr ? "مدرب" : "Coach",
        // coach accent = violet
        activeCls: "bg-[#8b5cf6] text-white",
        icon: <Users className="h-5 w-5" />,
      };

  // Sidebar section labels (staff only): business surfaces vs site admin.
  const sectionLabel = (label: string) => (
    <p className="px-3 pb-1 pt-4 text-[10px] font-bold uppercase tracking-wider text-[#86868b]">
      {label}
    </p>
  );

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

      {/* STAFF CONSOLE BANNER — the admin/coach instantly knows he is in
          HIS work surface, not the member app. */}
      {isCoach && (
        <div
          className={cn(
            "border-b",
            isAdmin ? "border-[#1d1d1f] bg-[#1d1d1f]" : "border-[#8b5cf6] bg-[#8b5cf6]",
          )}
        >
          <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3 px-4 py-2.5 md:px-6">
            <div className="flex items-center gap-2.5 text-white">
              {consoleMeta.icon}
              <div className="leading-tight">
                <p className="text-sm font-bold">{consoleMeta.title}</p>
                <p className="text-[11px] text-white/70">{consoleMeta.sub}</p>
              </div>
            </div>
            <span className="rounded-full bg-white/15 px-2.5 py-1 text-[10px] font-bold text-white">
              {profile?.full_name || consoleMeta.chip}
            </span>
          </div>
        </div>
      )}

      <div className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 md:px-6 md:py-12">
        {/* Mobile: Large navigation buttons at top (after welcome) */}
        {/* Desktop: sidebar nav on the left */}
        <div className="flex gap-8 md:gap-12">
          {/* Desktop sidebar */}
          <aside className="hidden w-48 shrink-0 md:block">
            <nav className="sticky top-24 space-y-1">
              {/* Console identity block (staff) */}
              {isCoach && (
                <div
                  className={cn(
                    "mb-2 rounded-xl p-3 text-white",
                    isAdmin ? "bg-[#1d1d1f]" : "bg-[#8b5cf6]",
                  )}
                >
                  <div className="flex items-center gap-2">
                    {consoleMeta.icon}
                    <p className="text-xs font-bold">{consoleMeta.title}</p>
                  </div>
                </div>
              )}

              {/* Section: clients & service (staff) / plain list (member) */}
              {isCoach && sectionLabel(isAr ? "العملاء والخدمة" : "Clients & service")}
              {(isCoach ? coachNav : nav).map((item) => {
                const active = view === item.to;
                return (
                  <button
                    key={item.to}
                    onClick={() =>
                      item.action === "evo-chat" ? openEvoFloatingChat() : navigate(item.to)
                    }
                    className={cn(
                      "block w-full cursor-pointer rounded-lg px-3 py-2 text-start text-sm font-normal transition-colors",
                      active
                        ? isCoach
                          ? cn(consoleMeta.activeCls, "font-medium")
                          : "bg-[#f5f5f7] font-medium text-[#1d1d1f]"
                        : "text-[#6e6e73] hover:text-[#1d1d1f]",
                    )}
                  >
                    {item.label}
                  </button>
                );
              })}

              {/* Section: site management (admin nav items + admin-only URLs) */}
              {isAdmin && (
                <>
                  {sectionLabel(isAr ? "إدارة الموقع" : "Site management")}
                  {coachNavAdmin.map((item) => {
                    const active = view === item.to;
                    return (
                      <button
                        key={item.to}
                        onClick={() => navigate(item.to)}
                        className={cn(
                          "block w-full cursor-pointer rounded-lg px-3 py-2 text-start text-sm font-normal transition-colors",
                          active
                            ? cn(consoleMeta.activeCls, "font-medium")
                            : "text-[#6e6e73] hover:text-[#1d1d1f]",
                        )}
                      >
                        {item.label}
                      </button>
                    );
                  })}
                  {coachExtraLinks.map((link) => {
                    // 0045: per-link active state (was hardcoded to admin-leads).
                    const active = (pathname || "").startsWith(link.href) || view === ("admin-leads" as any);
                    return (
                      <a
                        key={link.href}
                        href={link.href}
                        className={cn(
                          "block w-full rounded-lg px-3 py-2 text-start text-sm font-normal transition-colors",
                          active
                            ? cn(consoleMeta.activeCls, "font-medium")
                            : "text-[#6e6e73] hover:text-[#1d1d1f]",
                        )}
                      >
                        {link.label}
                      </a>
                    );
                  })}
                  {/* Console home — the admin's overview dashboard */}
                  <a
                    href="/admin"
                    className={cn(
                      "mt-3 block w-full rounded-lg border border-[#1d1d1f]/20 px-3 py-2 text-start text-xs font-medium text-[#1d1d1f] transition-colors hover:bg-[#f5f5f7]",
                      (pathname || "") === "/admin" && "bg-[#f5f5f7]",
                    )}
                  >
                    {isAr ? "🏛 الرئيسية لوحة الأدمن" : "🏛 Admin home"}
                  </a>
                </>
              )}
            </nav>
          </aside>

          {/* Main content */}
          <main id="main-content" className="min-w-0 flex-1">
            {/* Mobile: Large nav buttons at top of every page */}
            <div className="mb-8 md:hidden">
              {/* Welcome message — members only; staff already have the
                  console banner above (no duplicate greeting). */}
              {!isCoach && profile && (
                <p className="mb-4 text-sm font-normal text-[#6e6e73]">
                  {isAr ? "أهلاً" : "Welcome"}, <span className="font-medium text-[#1d1d1f]">{profile.full_name}</span>
                </p>
              )}
              {/* Large nav buttons — 2 columns, scrollable */}
              <div className="grid grid-cols-2 gap-3 overflow-x-auto pb-2">
                {nav.map((item) => {
                  const active = view === item.to;
                  return (
                    <button
                      key={item.to}
                      onClick={() =>
                        item.action === "evo-chat" ? openEvoFloatingChat() : navigate(item.to)
                      }
                      className={cn(
                        "flex cursor-pointer items-center gap-2 rounded-2xl px-4 py-3 text-sm font-medium transition-colors",
                        active
                          ? isCoach
                            ? consoleMeta.activeCls
                            : "bg-[#0071e3] text-white"
                          : "bg-[#f5f5f7] text-[#1d1d1f]",
                      )}
                    >
                      <span className="text-base">{item.emoji}</span>
                      <span className="truncate">{item.label}</span>
                    </button>
                  );
                })}
                {isAdmin && coachExtraLinks.map((link) => (
                  <a
                    key={link.href}
                    href={link.href}
                    className="flex items-center gap-2 rounded-2xl bg-[#f5f5f7] px-4 py-3 text-sm font-medium text-[#1d1d1f] transition-colors"
                  >
                    <span className="text-base">{link.emoji}</span>
                    <span className="truncate">{link.label}</span>
                  </a>
                ))}
                {isAdmin && (
                  <a
                    href="/admin"
                    className="flex items-center gap-2 rounded-2xl bg-[#1d1d1f] px-4 py-3 text-sm font-medium text-white transition-colors"
                  >
                    <span className="text-base">🏛</span>
                    <span className="truncate">{isAr ? "الرئيسية لوحة الأدمن" : "Admin home"}</span>
                  </a>
                )}
              </div>
            </div>

            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
