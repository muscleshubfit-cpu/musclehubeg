"use client";

import { type ReactNode } from "react";
import {
  LayoutDashboard,
  ClipboardList,
  LineChart,
  FileText,
  LogOut,
  Dumbbell,
  Crown,
  Bot,
  LifeBuoy,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useI18n } from "@/lib/i18n";
import { LanguageToggle } from "@/components/LanguageToggle";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useNav, type View } from "@/hooks/use-nav";

export function AppLayout({ children }: { children: ReactNode }) {
  const { t } = useI18n();
  const { isCoach, signOutAsync, profile } = useAuth();
  const { view, navigate } = useNav();

  const clientNav: { to: View; label: string; icon: any }[] = [
    { to: "dashboard", label: t("nav.dashboard"), icon: LayoutDashboard },
    { to: "chat", label: t("nav.coach"), icon: Bot },
    { to: "questionnaires", label: t("nav.questionnaires"), icon: ClipboardList },
    { to: "progress", label: t("nav.progress"), icon: LineChart },
    { to: "plans", label: t("nav.plans"), icon: FileText },
    { to: "support", label: t("nav.support"), icon: LifeBuoy },
    { to: "pricing", label: t("nav.pricing"), icon: Crown },
  ];
  const coachNav: { to: View; label: string; icon: any }[] = [
    { to: "coach", label: t("nav.clients"), icon: LayoutDashboard },
  ];
  const nav = isCoach ? coachNav : clientNav;

  const handleSignOut = async () => {
    await signOutAsync();
    navigate("landing");
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="sticky top-0 z-30 border-b border-border bg-background/80 backdrop-blur">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-3 px-4">
          <button
            onClick={() => navigate(isCoach ? "coach" : "dashboard")}
            className="flex min-w-0 items-center gap-2"
          >
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-gradient-primary">
              <Dumbbell className="h-5 w-5 text-primary-foreground" />
            </span>
            <span className="truncate font-display text-lg font-bold">{t("brand.name")}</span>
          </button>
          <div className="flex items-center gap-1">
            <LanguageToggle />
            <Button variant="ghost" size="sm" onClick={handleSignOut} className="gap-2">
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">{t("nav.logout")}</span>
            </Button>
          </div>
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-6xl flex-1 gap-6 px-4 py-6">
        <aside className="hidden w-56 shrink-0 md:block">
          <nav className="sticky top-20 space-y-1">
            {nav.map((item) => {
              const active = view === item.to;
              return (
                <button
                  key={item.to}
                  onClick={() => navigate(item.to)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-start text-sm font-medium transition-colors",
                    active
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-secondary hover:text-foreground",
                  )}
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </button>
              );
            })}
          </nav>
        </aside>

        <main className="min-w-0 flex-1 pb-24 md:pb-0">{children}</main>
      </div>

      {/* Bottom nav (mobile) */}
      <nav className="fixed bottom-0 left-0 right-0 z-30 grid grid-flow-col border-t border-border bg-background/95 backdrop-blur md:hidden">
        {nav.map((item) => {
          const active = view === item.to;
          return (
            <button
              key={item.to}
              onClick={() => navigate(item.to)}
              className={cn(
                "flex flex-col items-center gap-1 py-2 text-[11px]",
                active ? "text-primary" : "text-muted-foreground",
              )}
            >
              <item.icon className="h-5 w-5" />
              {item.label}
            </button>
          );
        })}
      </nav>
    </div>
  );
}
