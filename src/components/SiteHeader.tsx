"use client";

import { useState, useEffect } from "react";
import {
  Dumbbell,
  Menu,
  X,
  Home,
  FileText,
  Crown,
  LayoutDashboard,
  ClipboardList,
  LineChart,
  MessageCircle,
  LifeBuoy,
  Gift,
  LogIn,
  LogOut,
  Bot,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { LanguageToggle } from "@/components/LanguageToggle";
import { useI18n } from "@/lib/i18n";
import { useNav } from "@/hooks/use-nav";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";

/**
 * Site header with hamburger menu — works on both landing and inside the app.
 *
 * Layout:
 *   Desktop: [LOGO] ........ [☰]
 *   Mobile:  [☰] [LOGO] .....
 *
 * The hamburger opens a slide-in drawer with this menu order:
 *   1. Home (الرئيسية)
 *   2. Blog (المدونة) — public, no login required
 *   3. Pricing (الأسعار)
 *   4. [if logged in] client pages: Dashboard, Plans, Progress, Chat, Questionnaires, Referral, Support
 *   5. Login / Logout — ALWAYS last
 *
 * Logo only — no site name text.
 */
export function SiteHeader({ variant = "landing" }: { variant?: "landing" | "app" }) {
  const { t, lang } = useI18n();
  const { navigate } = useNav();
  const { profile, isCoach, signOutAsync } = useAuth();
  const isLoggedIn = !!profile;
  const isAr = lang === "ar";
  const [open, setOpen] = useState(false);

  // Lock body scroll when the drawer is open.
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  // Close the drawer on Escape key.
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open]);

  // Where the Blog link should go depends on who's logged in:
  //   - Coach (admin) → /admin/blog (sees everything, both languages)
  //   - Client / visitor → /blog or /ar/blog (their selected language only)
  const blogHref = isCoach ? "/admin/blog" : isAr ? "/ar/blog" : "/blog";

  // Build the menu. Order is FIXED: Home → Blog → Pricing → [client pages if logged in] → Login/Logout (always last)
  type MenuItem = {
    label: string;
    icon: any;
    href?: string;
    onClick?: () => void;
    highlight?: boolean;
  };

  const menu: MenuItem[] = [];

  // 1. Home
  menu.push({
    label: isAr ? "الرئيسية" : "Home",
    icon: Home,
    onClick: () => navigate("landing"),
  });

  // 2. Blog (PUBLIC — always visible, no login required)
  menu.push({
    label: isAr ? "المدونة" : "Blog",
    icon: FileText,
    href: blogHref,
  });

  // 3. Pricing
  menu.push({
    label: isAr ? "الأسعار" : "Pricing",
    icon: Crown,
    onClick: () => navigate("pricing"),
  });

  // 4. Client pages (only when logged in as a client, not coach)
  if (isLoggedIn && !isCoach) {
    menu.push(
      {
        label: isAr ? "لوحة التحكم" : "Dashboard",
        icon: LayoutDashboard,
        onClick: () => navigate("dashboard"),
      },
      {
        label: isAr ? "خططي" : "My Plans",
        icon: FileText,
        onClick: () => navigate("plans"),
      },
      {
        label: isAr ? "تقدمي" : "My Progress",
        icon: LineChart,
        onClick: () => navigate("progress"),
      },
      {
        label: isAr ? "كوتش EVO" : "EVO Coach",
        icon: Bot,
        onClick: () => navigate("chat"),
      },
      {
        label: isAr ? "الاستبيانات" : "Questionnaires",
        icon: ClipboardList,
        onClick: () => navigate("questionnaires"),
      },
      {
        label: isAr ? "دعوة الأصدقاء" : "Referral",
        icon: Gift,
        onClick: () => navigate("referral"),
      },
      {
        label: isAr ? "الدعم" : "Support",
        icon: LifeBuoy,
        onClick: () => navigate("support"),
      },
    );
  }

  // 4b. Coach pages (only when logged in as a coach)
  if (isLoggedIn && isCoach) {
    menu.push(
      {
        label: isAr ? "لوحة الكوتش" : "Coach Dashboard",
        icon: LayoutDashboard,
        onClick: () => navigate("coach"),
      },
      {
        label: isAr ? "المدفوعات" : "Payments",
        icon: Crown,
        onClick: () => navigate("coach-payments"),
      },
      {
        label: isAr ? "دعم العملاء" : "Client Support",
        icon: LifeBuoy,
        onClick: () => navigate("coach-support"),
      },
    );
  }

  // 5. Login / Logout — ALWAYS last
  if (isLoggedIn) {
    menu.push({
      label: isAr ? "تسجيل الخروج" : "Logout",
      icon: LogOut,
      onClick: async () => {
        await signOutAsync();
        navigate("landing");
        setOpen(false);
      },
      highlight: true,
    });
  } else {
    menu.push({
      label: isAr ? "تسجيل الدخول" : "Log in",
      icon: LogIn,
      onClick: () => navigate("auth", { mode: "login" }),
      highlight: true,
    });
  }

  const handleItemClick = (item: MenuItem) => {
    setOpen(false);
    if (item.onClick) item.onClick();
  };

  return (
    <>
      <header className="sticky top-0 z-40 w-full border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div
          className={cn(
            "mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6",
            // Mobile: hamburger on the START side, logo centered/end
            // Desktop: logo on START side, hamburger on END side
            variant === "app" && "max-w-6xl",
          )}
        >
          {/* Mobile: hamburger on the left */}
          <button
            onClick={() => setOpen(true)}
            className="-ms-2 flex h-10 w-10 items-center justify-center rounded-lg text-foreground hover:bg-secondary md:hidden"
            aria-label={isAr ? "فتح القائمة" : "Open menu"}
          >
            <Menu className="h-5 w-5" />
          </button>

          {/* Logo — actual brand logo image (no site name text) */}
          <button
            onClick={() => navigate("landing")}
            className={cn(
              "flex items-center gap-2",
              // On mobile, push logo to the end (right in LTR, left in RTL)
              "ms-auto md:ms-0 md:me-auto",
            )}
            aria-label="MuscleHub"
          >
            {/* Desktop: full landscape logo (1536×1024 → constrained to h-10) */}
            <img
              src="/logo.png"
              alt="MuscleHub"
              className="hidden h-10 w-auto object-contain md:block"
              loading="eager"
            />
            {/* Mobile: square MH monogram icon (logo cropped to square via icon-192) */}
            <img
              src="/icon-192.png"
              alt="MuscleHub"
              className="h-10 w-10 rounded-lg object-contain md:hidden"
              loading="eager"
            />
          </button>

          {/* Desktop: hamburger on the right */}
          <button
            onClick={() => setOpen(true)}
            className="-me-2 hidden h-10 items-center gap-2 rounded-lg px-3 text-foreground hover:bg-secondary md:flex"
            aria-label={isAr ? "فتح القائمة" : "Open menu"}
          >
            <Menu className="h-5 w-5" />
          </button>
        </div>
      </header>

      {/* Slide-in drawer */}
      <div
        className={cn(
          "fixed inset-0 z-50 transition-all duration-300",
          open ? "pointer-events-auto" : "pointer-events-none",
        )}
        aria-hidden={!open}
      >
        {/* Backdrop */}
        <div
          className={cn(
            "absolute inset-0 bg-background/80 backdrop-blur-sm transition-opacity duration-300",
            open ? "opacity-100" : "opacity-0",
          )}
          onClick={() => setOpen(false)}
        />

        {/* Drawer panel — slides in from the START side (right in RTL, left in LTR) */}
        <aside
          className={cn(
            "absolute inset-y-0 start-0 flex w-[85vw] max-w-sm flex-col border-e border-border bg-card shadow-2xl transition-transform duration-300 ease-out",
            open ? "translate-x-0" : "rtl:translate-x-full ltr:-translate-x-full",
          )}
          role="dialog"
          aria-modal="true"
          aria-label={isAr ? "القائمة الرئيسية" : "Main menu"}
        >
          {/* Drawer header — logo + close */}
          <div className="flex h-16 items-center justify-between border-b border-border px-4">
            <img
              src="/logo.png"
              alt="MuscleHub"
              className="h-9 w-auto object-contain"
            />
            <button
              onClick={() => setOpen(false)}
              className="flex h-10 w-10 items-center justify-center rounded-lg text-foreground hover:bg-secondary"
              aria-label={isAr ? "إغلاق القائمة" : "Close menu"}
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Language toggle at the top of the menu */}
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {isAr ? "اللغة" : "Language"}
            </span>
            <LanguageToggle />
          </div>

          {/* Menu items */}
          <nav className="flex-1 overflow-y-auto p-3">
            <ul className="space-y-1">
              {menu.map((item, i) => {
                const isLast = i === menu.length - 1; // Login/Logout
                return (
                  <li key={i}>
                    {item.href ? (
                      <a
                        href={item.href}
                        onClick={() => setOpen(false)}
                        className={cn(
                          "flex items-center gap-3 rounded-lg px-3 py-3 text-start text-sm font-medium transition-colors",
                          isLast
                            ? "mt-2 bg-primary/10 text-primary hover:bg-primary/15"
                            : "text-foreground hover:bg-secondary",
                        )}
                      >
                        <item.icon className="h-5 w-5 shrink-0" />
                        <span className="flex-1">{item.label}</span>
                        <ChevronRight className="h-4 w-4 shrink-0 opacity-50 rtl:rotate-180" />
                      </a>
                    ) : (
                      <button
                        onClick={() => handleItemClick(item)}
                        className={cn(
                          "flex w-full items-center gap-3 rounded-lg px-3 py-3 text-start text-sm font-medium transition-colors",
                          isLast
                            ? "mt-2 bg-primary/10 text-primary hover:bg-primary/15"
                            : "text-foreground hover:bg-secondary",
                        )}
                      >
                        <item.icon className="h-5 w-5 shrink-0" />
                        <span className="flex-1">{item.label}</span>
                        <ChevronRight className="h-4 w-4 shrink-0 opacity-50 rtl:rotate-180" />
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          </nav>

          {/* Footer of drawer — brand mark + tagline */}
          <div className="border-t border-border px-4 py-4 text-center text-[10px] text-muted-foreground">
            <p>© {new Date().getFullYear()} MuscleHub</p>
            <p className="mt-0.5">
              {isAr ? "كوتش أحمد زكي" : "Coach Ahmed Zake"}
            </p>
          </div>
        </aside>
      </div>
    </>
  );
}
