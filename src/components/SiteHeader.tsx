"use client";

import { useState, useEffect } from "react";
import {
  Menu,
  X,
  Home,
  FileText,
  Crown,
  Calculator,
  Dumbbell,
  Utensils,
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
  Bell,
  User,
  Sparkles,
  Bookmark,
  Users,
} from "lucide-react";
import { LanguageToggle } from "@/components/LanguageToggle";
import { useI18n } from "@/lib/i18n";
import { useNav } from "@/hooks/use-nav";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";
import { NotificationBell } from "@/components/NotificationBell";
import { AdminNotificationBell } from "@/components/AdminNotificationBell";

// Wrapper for header — smaller bell icon
function NotificationBellHeader({ isAdmin = false }: { isAdmin?: boolean }) {
  return (
    <div className="NotificationBellHeader">
      {isAdmin ? <AdminNotificationBell /> : <NotificationBell />}
    </div>
  );
}

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

  // === PUBLIC NAVIGATION (visible to logged-out + logged-in visitors) ===
  // Order per project spec: Exercises → Programs → Foods → Tools → EVO → Blog → Coaching → Memberships → Pricing → Affiliate Program

  // 1. Exercises
  menu.push({
    label: isAr ? "مكتبة التمارين" : "Exercises",
    icon: Dumbbell,
    href: "/exercises",
  });

  // 2. Programs
  menu.push({
    label: isAr ? "برامج التدريب" : "Programs",
    icon: ClipboardList,
    href: "/programs",
  });

  // 3. Foods
  menu.push({
    label: isAr ? "مكتبة الأكلات" : "Foods",
    icon: Utensils,
    href: "/foods",
  });

  // 4. Tools (free calculators)
  menu.push({
    label: isAr ? "الأدوات المجانية" : "Free Tools",
    icon: Calculator,
    href: "/tools",
  });

  // 5. EVO AI Coach
  menu.push({
    label: "EVO",
    icon: Bot,
    href: "/evo",
  });

  // 6. Blog
  menu.push({
    label: isAr ? "المدونة" : "Blog",
    icon: FileText,
    href: blogHref,
  });

  // 7. Coaching
  menu.push({
    label: isAr ? "الكوتشينج" : "Coaching",
    icon: Users,
    href: "/coaching",
  });

  // 8. Memberships
  menu.push({
    label: isAr ? "العضويات" : "Memberships",
    icon: Sparkles,
    href: "/memberships",
  });

  // 9. Pricing (same destination as Memberships — kept as a separate label
  // per nav spec so visitors scanning the menu find "Pricing" by name).
  menu.push({
    label: isAr ? "الأسعار" : "Pricing",
    icon: Crown,
    href: "/memberships",
  });

  // 10. Affiliate Program — public marketing page (no login required).
  // Distinct from the authenticated "Referrals" dashboard item below.
  menu.push({
    label: isAr ? "برنامج الأفلييت" : "Affiliate Program",
    icon: Gift,
    href: "/affiliate",
  });

  // 4. Client pages
  if (isLoggedIn && !isCoach) {
    menu.push(
      { label: isAr ? "لوحة التحكم" : "Dashboard", icon: LayoutDashboard, onClick: () => navigate("dashboard") },
      { label: isAr ? "خططي" : "My Plans", icon: FileText, onClick: () => navigate("plans") },
      { label: isAr ? "تقدمي" : "My Progress", icon: LineChart, onClick: () => navigate("progress") },
      { label: isAr ? "كوتش EVO" : "EVO Coach", icon: Bot, onClick: () => navigate("chat") },
      { label: isAr ? "الاستبيانات" : "Questionnaires", icon: ClipboardList, onClick: () => navigate("questionnaires") },
      { label: isAr ? "الإحالات" : "Referrals", icon: Gift, onClick: () => navigate("referral") },
      { label: isAr ? "الدعم" : "Support", icon: LifeBuoy, onClick: () => navigate("support") },
    );
  }

  // 4b. Coach pages
  if (isLoggedIn && isCoach) {
    menu.push(
      { label: isAr ? "لوحة الكوتش" : "Coach Dashboard", icon: LayoutDashboard, onClick: () => navigate("coach") },
      { label: isAr ? "المدفوعات" : "Payments", icon: Crown, onClick: () => navigate("coach-payments") },
      { label: isAr ? "دعم العملاء" : "Client Support", icon: LifeBuoy, onClick: () => navigate("coach-support") },
      { label: isAr ? "أدوات Leads" : "Tool Leads", icon: Calculator, href: "/admin/leads" },
      { label: isAr ? "النتائج المحفوظة" : "Saved Results", icon: Bookmark, href: "/admin/saved-results" },
      { label: isAr ? "الإحالات" : "Referrals", icon: Gift, onClick: () => navigate("admin-referrals") },
      { label: isAr ? "المدونة" : "Blog Admin", icon: FileText, href: "/admin/blog" },
    );
  }

  // Note: Logout is now in the bottom section of the drawer (separate from menu items)

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
            aria-label="MuscleHubEG"
          >
            <img
              src="/logo.png"
              alt="MuscleHubEG"
              className="hidden h-9 w-auto object-contain md:block"
              loading="eager"
            />
            <img
              src="/icon-192.png"
              alt="MuscleHubEG"
              className="h-9 w-9 rounded-lg object-contain md:hidden"
              loading="eager"
            />
          </button>

          {/* Right side: Language + Notifications + Account + Menu */}
          <div className="flex items-center gap-2 md:gap-3">
            {/* Language toggle — always visible */}
            <LanguageToggle />

            {/* Notifications bell — only for logged in users.
                Coaches see AdminNotificationBell (admin_notifications table),
                regular users see NotificationBell (user notifications table). */}
            {isLoggedIn && (
              <NotificationBellHeader isAdmin={isCoach} />
            )}

            {/* Account icon — profile photo if logged in, generic icon if not */}
            {isLoggedIn ? (
              <a
                href="/profile"
                className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full ring-2 ring-[#0071e3]/20 transition-all hover:ring-[#0071e3]/40"
                aria-label={isAr ? "حسابي" : "My account"}
              >
                {profile?.avatar_url ? (
                  <img
                    src={profile.avatar_url}
                    alt={profile.full_name || "Profile"}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span className="flex h-full w-full items-center justify-center bg-[#0071e3] text-sm font-medium text-white">
                    {(profile?.full_name || "U")[0].toUpperCase()}
                  </span>
                )}
              </a>
            ) : (
              <button
                onClick={() => navigate("auth", { mode: "login" })}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-[#f5f5f7] text-[#1d1d1f] transition-colors hover:bg-[#e5e5e7]"
                aria-label={isAr ? "تسجيل الدخول" : "Log in"}
              >
                <User className="h-4 w-4" />
              </button>
            )}

            {/* Hamburger menu — opens drawer */}
            <button
              onClick={() => setOpen(true)}
              className="flex h-9 w-9 items-center justify-center rounded-lg text-[#1d1d1f] hover:bg-[#f5f5f7]"
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
            <span className="text-base font-semibold">MuscleHubEG</span>
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
                return (
                  <li key={i}>
                    {item.href ? (
                      <a
                        href={item.href}
                        onClick={() => setOpen(false)}
                        className="flex items-center gap-3 rounded-lg px-3 py-3 text-start text-sm font-normal transition-colors text-[#1d1d1f] hover:bg-[#f5f5f7]"
                      >
                        <span className="flex-1">{item.label}</span>
                        <ChevronRight className="h-4 w-4 shrink-0 opacity-30 rtl:rotate-180" />
                      </a>
                    ) : (
                      <button
                        onClick={() => handleItemClick(item)}
                        className="flex w-full items-center gap-3 rounded-lg px-3 py-3 text-start text-sm font-normal transition-colors text-[#1d1d1f] hover:bg-[#f5f5f7]"
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

          {/* Bottom section — account + logout */}
          <div className="border-t border-[#d2d2d7] p-3">
            {isLoggedIn ? (
              <>
                {/* Account link */}
                <a
                  href="/profile"
                  onClick={() => setOpen(false)}
                  className="mb-1 flex items-center gap-3 rounded-lg px-3 py-3 text-start text-sm font-normal transition-colors text-[#1d1d1f] hover:bg-[#f5f5f7]"
                >
                  {profile?.avatar_url ? (
                    <img
                      src={profile.avatar_url}
                      alt={profile.full_name || "Profile"}
                      className="h-7 w-7 rounded-full object-cover"
                    />
                  ) : (
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#0071e3] text-xs font-medium text-white">
                      {(profile?.full_name || "U")[0].toUpperCase()}
                    </span>
                  )}
                  <span className="flex-1 truncate">{profile?.full_name || (isAr ? "حسابي" : "My account")}</span>
                  <ChevronRight className="h-4 w-4 shrink-0 opacity-30 rtl:rotate-180" />
                </a>
                {/* Logout */}
                <button
                  onClick={async () => {
                    await signOutAsync();
                    navigate("landing");
                    setOpen(false);
                  }}
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-3 text-start text-sm font-normal transition-colors text-[#ff3b30] hover:bg-[#ff3b30]/5"
                >
                  <LogOut className="h-4 w-4" />
                  <span>{isAr ? "تسجيل الخروج" : "Logout"}</span>
                </button>
              </>
            ) : (
              <button
                onClick={() => {
                  navigate("auth", { mode: "login" });
                  setOpen(false);
                }}
                className="flex w-full items-center gap-3 rounded-lg px-3 py-3 text-start text-sm font-normal transition-colors text-[#0071e3] hover:bg-[#0071e3]/5"
              >
                <LogIn className="h-4 w-4" />
                <span>{isAr ? "تسجيل الدخول" : "Log in"}</span>
              </button>
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-[#d2d2d7] px-4 py-3 text-center text-xs font-normal text-[#6e6e73]">
            <p>© {new Date().getFullYear()} MuscleHubEG</p>
          </div>
        </aside>
      </div>
    </>
  );
}
