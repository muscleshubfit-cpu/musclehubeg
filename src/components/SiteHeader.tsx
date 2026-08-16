"use client";

import { useState, useEffect } from "react";
import {
  Menu,
  X,
  Home,
  FileText,
  Crown,
  Calculator,
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
import { LanguageToggle } from "@/components/LanguageToggle";
import { useI18n } from "@/lib/i18n";
import { useNav } from "@/hooks/use-nav";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";

/**
 * Site header — Apple-style clean bar.
 *
 * Layout: [LOGO] ........ [LANG] [LOGIN/LOGOUT] [MENU]
 *
 * Language toggle + Login/Logout are in the header bar (always visible).
 * The hamburger opens a slide-in drawer for full navigation.
 */
export function SiteHeader({ variant = "landing" }: { variant?: "landing" | "app" }) {
  const { t, lang } = useI18n();
  const { navigate } = useNav();
  const { profile, isCoach, signOutAsync } = useAuth();
  const isLoggedIn = !!profile;
  const isAr = lang === "ar";
  const [open, setOpen] = useState(false);

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

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open]);

  const blogHref = isCoach ? "/admin/blog" : isAr ? "/ar/blog" : "/blog";

  type MenuItem = {
    label: string;
    icon: any;
    href?: string;
    onClick?: () => void;
  };

  const menu: MenuItem[] = [];

  // 1. Home
  menu.push({
    label: isAr ? "الرئيسية" : "Home",
    icon: Home,
    onClick: () => navigate("landing"),
  });

  // 2. Blog
  menu.push({
    label: isAr ? "المدونة" : "Blog",
    icon: FileText,
    href: blogHref,
  });

  // 2b. Tools (free calculators)
  menu.push({
    label: isAr ? "الأدوات المجانية" : "Free Tools",
    icon: Calculator,
    href: "/tools",
  });

  // 3. Pricing
  menu.push({
    label: isAr ? "الأسعار" : "Pricing",
    icon: Crown,
    onClick: () => navigate("pricing"),
  });

  // 4. Client pages
  if (isLoggedIn && !isCoach) {
    menu.push(
      { label: isAr ? "لوحة التحكم" : "Dashboard", icon: LayoutDashboard, onClick: () => navigate("dashboard") },
      { label: isAr ? "خططي" : "My Plans", icon: FileText, onClick: () => navigate("plans") },
      { label: isAr ? "تقدمي" : "My Progress", icon: LineChart, onClick: () => navigate("progress") },
      { label: isAr ? "كوتش EVO" : "EVO Coach", icon: Bot, onClick: () => navigate("chat") },
      { label: isAr ? "الاستبيانات" : "Questionnaires", icon: ClipboardList, onClick: () => navigate("questionnaires") },
      { label: isAr ? "دعوة الأصدقاء" : "Referral", icon: Gift, onClick: () => navigate("referral") },
      { label: isAr ? "الدعم" : "Support", icon: LifeBuoy, onClick: () => navigate("support") },
    );
  }

  // 4b. Coach pages
  if (isLoggedIn && isCoach) {
    menu.push(
      { label: isAr ? "لوحة الكوتش" : "Coach Dashboard", icon: LayoutDashboard, onClick: () => navigate("coach") },
      { label: isAr ? "المدفوعات" : "Payments", icon: Crown, onClick: () => navigate("coach-payments") },
      { label: isAr ? "دعم العملاء" : "Client Support", icon: LifeBuoy, onClick: () => navigate("coach-support") },
      { label: isAr ? "الإحالات" : "Referrals", icon: Gift, onClick: () => navigate("admin-referrals") },
      { label: isAr ? "المدونة" : "Blog Admin", icon: FileText, href: "/admin/blog" },
    );
  }

  // 5. Logout — in drawer only (login is in header)
  if (isLoggedIn) {
    menu.push({
      label: isAr ? "تسجيل الخروج" : "Logout",
      icon: LogOut,
      onClick: async () => {
        await signOutAsync();
        navigate("landing");
        setOpen(false);
      },
    });
  }

  const handleItemClick = (item: MenuItem) => {
    setOpen(false);
    if (item.onClick) item.onClick();
  };

  return (
    <>
      <header className="sticky top-0 z-40 w-full border-b border-[#d2d2d7] bg-white/80 backdrop-blur-xl">
        <div
          className={cn(
            "mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6",
            variant === "app" && "max-w-6xl",
          )}
        >
          {/* Logo */}
          <button
            onClick={() => navigate("landing")}
            className="flex items-center gap-2"
            aria-label="MuscleHub"
          >
            <img
              src="/logo.png"
              alt="MuscleHub"
              className="hidden h-9 w-auto object-contain md:block"
              loading="eager"
            />
            <img
              src="/icon-192.png"
              alt="MuscleHub"
              className="h-9 w-9 rounded-lg object-contain md:hidden"
              loading="eager"
            />
          </button>

          {/* Right side: Language + Login/Logout + Menu */}
          <div className="flex items-center gap-3 md:gap-4">
            {/* Language toggle — always visible in header */}
            <LanguageToggle />

            {/* Login / Logout button — always visible in header */}
            {isLoggedIn ? (
              <button
                onClick={async () => {
                  await signOutAsync();
                  navigate("landing");
                }}
                className="rounded-full bg-[#f5f5f7] px-4 py-2 text-sm font-normal text-[#1d1d1f] transition-opacity hover:opacity-70"
              >
                {isAr ? "خروج" : "Logout"}
              </button>
            ) : (
              <button
                onClick={() => navigate("auth", { mode: "login" })}
                className="rounded-full bg-[#0071e3] px-5 py-2 text-sm font-normal text-white transition-opacity hover:opacity-90"
              >
                {isAr ? "دخول" : "Log in"}
              </button>
            )}

            {/* Hamburger menu — opens drawer */}
            <button
              onClick={() => setOpen(true)}
              className="flex h-10 w-10 items-center justify-center rounded-lg text-[#1d1d1f] hover:bg-[#f5f5f7]"
              aria-label={isAr ? "فتح القائمة" : "Open menu"}
            >
              <Menu className="h-5 w-5" />
            </button>
          </div>
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
        <div
          className={cn(
            "absolute inset-0 bg-black/20 backdrop-blur-sm transition-opacity duration-300",
            open ? "opacity-100" : "opacity-0",
          )}
          onClick={() => setOpen(false)}
        />

        <aside
          className={cn(
            "absolute inset-y-0 end-0 flex w-[85vw] max-w-sm flex-col border-s border-[#d2d2d7] bg-white shadow-2xl transition-transform duration-300 ease-out",
            open ? "translate-x-0" : "rtl:-translate-x-full ltr:translate-x-full",
          )}
          role="dialog"
          aria-modal="true"
          aria-label={isAr ? "القائمة الرئيسية" : "Main menu"}
        >
          {/* Drawer header */}
          <div className="flex h-16 items-center justify-between border-b border-[#d2d2d7] px-4">
            <span className="text-base font-semibold">MuscleHub</span>
            <button
              onClick={() => setOpen(false)}
              className="flex h-10 w-10 items-center justify-center rounded-lg text-[#1d1d1f] hover:bg-[#f5f5f7]"
              aria-label={isAr ? "إغلاق القائمة" : "Close menu"}
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Menu items */}
          <nav className="flex-1 overflow-y-auto p-3">
            <ul className="space-y-1">
              {menu.map((item, i) => {
                const isLogout = item.label.includes("خروج") || item.label.includes("Logout");
                return (
                  <li key={i}>
                    {item.href ? (
                      <a
                        href={item.href}
                        onClick={() => setOpen(false)}
                        className={cn(
                          "flex items-center gap-3 rounded-lg px-3 py-3 text-start text-sm font-normal transition-colors",
                          isLogout
                            ? "mt-2 text-[#ff3b30] hover:bg-[#ff3b30]/5"
                            : "text-[#1d1d1f] hover:bg-[#f5f5f7]",
                        )}
                      >
                        <span className="flex-1">{item.label}</span>
                        <ChevronRight className="h-4 w-4 shrink-0 opacity-30 rtl:rotate-180" />
                      </a>
                    ) : (
                      <button
                        onClick={() => handleItemClick(item)}
                        className={cn(
                          "flex w-full items-center gap-3 rounded-lg px-3 py-3 text-start text-sm font-normal transition-colors",
                          isLogout
                            ? "mt-2 text-[#ff3b30] hover:bg-[#ff3b30]/5"
                            : "text-[#1d1d1f] hover:bg-[#f5f5f7]",
                        )}
                      >
                        <span className="flex-1">{item.label}</span>
                        <ChevronRight className="h-4 w-4 shrink-0 opacity-30 rtl:rotate-180" />
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          </nav>

          {/* Footer */}
          <div className="border-t border-[#d2d2d7] px-4 py-4 text-center text-xs font-normal text-[#6e6e73]">
            <p>© {new Date().getFullYear()} MuscleHub</p>
            <p className="mt-0.5">{isAr ? "كوتش أحمد زكي" : "Coach Ahmed Zake"}</p>
          </div>
        </aside>
      </div>
    </>
  );
}
