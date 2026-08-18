"use client";

import { type ReactNode } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useI18n } from "@/lib/i18n";
import { SiteHeader } from "@/components/SiteHeader";
import { cn } from "@/lib/utils";
import { useNav, type View } from "@/hooks/use-nav";
import { isSupabaseConfigured } from "@/lib/supabase/client";

export function AppLayout({ children }: { children: ReactNode }) {
  const { t, lang } = useI18n();
  const { profile, isCoach } = useAuth();
  const { view, navigate } = useNav();
  const isAr = lang === "ar";

  const clientNav: { to: View; label: string; emoji: string }[] = [
    { to: "dashboard", label: t("nav.dashboard"), emoji: "🏠" },
    { to: "chat", label: t("nav.coach"), emoji: "💬" },
    { to: "questionnaires", label: t("nav.questionnaires"), emoji: "📋" },
    { to: "progress", label: t("nav.progress"), emoji: "📊" },
    { to: "plans", label: t("nav.plans"), emoji: "📄" },
    { to: "support", label: t("nav.support"), emoji: "🔧" },
    { to: "referral", label: t("nav.referral"), emoji: "🎁" },
    { to: "memberships", label: t("nav.pricing"), emoji: "👑" },
  ];
  const coachNav: { to: View; label: string; emoji: string }[] = [
    { to: "coach", label: t("nav.clients"), emoji: "👥" },
    { to: "coach-support", label: t("nav.support.coach"), emoji: "🔧" },
    { to: "coach-payments", label: t("nav.admin"), emoji: "💳" },
    { to: "blog-admin", label: isAr ? "المدونة" : "Blog", emoji: "📝" },
    { to: "admin-referrals", label: isAr ? "الإحالات" : "Referrals", emoji: "🎁" },
  ];
  // Custom external link for tool leads (not in View type)
  const coachExtraLinks = [
    { href: "/admin/leads", label: isAr ? "Leads الأدوات" : "Tool Leads", emoji: "📨" },
  ];
  const nav = isCoach ? coachNav : clientNav;

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

      <div className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 md:px-6 md:py-12">
        {/* Mobile: Large navigation buttons at top (after welcome) */}
        {/* Desktop: sidebar nav on the left */}
        <div className="flex gap-8 md:gap-12">
          {/* Desktop sidebar */}
          <aside className="hidden w-48 shrink-0 md:block">
            <nav className="sticky top-24 space-y-1">
              {nav.map((item) => {
                const active = view === item.to;
                return (
                  <button
                    key={item.to}
                    onClick={() => navigate(item.to)}
                    className={cn(
                      "block w-full rounded-lg px-3 py-2 text-start text-sm font-normal transition-colors",
                      active
                        ? "bg-[#f5f5f7] font-medium text-[#1d1d1f]"
                        : "text-[#6e6e73] hover:text-[#1d1d1f]",
                    )}
                  >
                    {item.label}
                  </button>
                );
              })}
              {isCoach && coachExtraLinks.map((link) => {
                const active = view === ("admin-leads" as any);
                return (
                  <a
                    key={link.href}
                    href={link.href}
                    className={cn(
                      "block w-full rounded-lg px-3 py-2 text-start text-sm font-normal transition-colors",
                      active
                        ? "bg-[#f5f5f7] font-medium text-[#1d1d1f]"
                        : "text-[#6e6e73] hover:text-[#1d1d1f]",
                    )}
                  >
                    {link.label}
                  </a>
                );
              })}
            </nav>
          </aside>

          {/* Main content */}
          <main id="main-content" className="min-w-0 flex-1">
            {/* Mobile: Large nav buttons at top of every page */}
            <div className="mb-8 md:hidden">
              {/* Welcome message */}
              {profile && (
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
                      onClick={() => navigate(item.to)}
                      className={cn(
                        "flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-medium transition-colors",
                        active
                          ? "bg-[#0071e3] text-white"
                          : "bg-[#f5f5f7] text-[#1d1d1f]",
                      )}
                    >
                      <span className="text-base">{item.emoji}</span>
                      <span className="truncate">{item.label}</span>
                    </button>
                  );
                })}
                {isCoach && coachExtraLinks.map((link) => (
                  <a
                    key={link.href}
                    href={link.href}
                    className="flex items-center gap-2 rounded-2xl bg-[#f5f5f7] px-4 py-3 text-sm font-medium text-[#1d1d1f] transition-colors"
                  >
                    <span className="text-base">{link.emoji}</span>
                    <span className="truncate">{link.label}</span>
                  </a>
                ))}
              </div>
            </div>

            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
