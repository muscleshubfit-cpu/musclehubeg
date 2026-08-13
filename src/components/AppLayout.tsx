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
  const { isCoach } = useAuth();
  const { view, navigate } = useNav();
  const isAr = lang === "ar";

  const clientNav: { to: View; label: string }[] = [
    { to: "dashboard", label: t("nav.dashboard") },
    { to: "chat", label: t("nav.coach") },
    { to: "questionnaires", label: t("nav.questionnaires") },
    { to: "progress", label: t("nav.progress") },
    { to: "plans", label: t("nav.plans") },
    { to: "support", label: t("nav.support") },
    { to: "referral", label: t("nav.referral") },
    { to: "pricing", label: t("nav.pricing") },
  ];
  const coachNav: { to: View; label: string }[] = [
    { to: "coach", label: t("nav.clients") },
    { to: "coach-support", label: t("nav.support.coach") },
    { to: "coach-payments", label: t("nav.admin") },
    { to: "blog-admin", label: isAr ? "المدونة" : "Blog" },
  ];
  const nav = isCoach ? coachNav : clientNav;

  return (
    <div className="flex min-h-screen flex-col bg-white text-[#1d1d1f]">
      {!isSupabaseConfigured && (
        <div className="bg-[#1d1d1f] py-1.5 px-3 text-center text-xs font-normal text-white">
          {isAr
            ? "وضع تجريبي — مفيش بيانات Supabase. البيانات بتتخزن محلياً بس."
            : "Demo mode — no Supabase credentials. Data stored locally only."}
        </div>
      )}
      <SiteHeader variant="app" />

      <div className="mx-auto flex w-full max-w-6xl flex-1 gap-12 px-4 py-12 md:px-6 md:py-16">
        {/* Sidebar — Apple-style text-only nav */}
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
                      ? "bg-[#f5f5f7] text-[#1d1d1f] font-medium"
                      : "text-[#6e6e73] hover:text-[#1d1d1f]",
                  )}
                >
                  {item.label}
                </button>
              );
            })}
          </nav>
        </aside>

        <main id="main-content" className="min-w-0 flex-1 pb-24 md:pb-0">{children}</main>
      </div>

      {/* Bottom nav (mobile) — Apple-style minimal text */}
      <nav className="fixed bottom-0 left-0 right-0 z-30 grid grid-flow-col border-t border-[#d2d2d7] bg-white/95 backdrop-blur md:hidden">
        {nav.map((item) => {
          const active = view === item.to;
          return (
            <button
              key={item.to}
              onClick={() => navigate(item.to)}
              className={cn(
                "flex flex-col items-center gap-1 py-2 text-[10px] font-normal",
                active ? "text-[#0071e3]" : "text-[#6e6e73]",
              )}
            >
              {item.label}
            </button>
          );
        })}
      </nav>
    </div>
  );
}
