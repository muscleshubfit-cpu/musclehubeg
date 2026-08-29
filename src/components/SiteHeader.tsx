"use client";

import { useState, useEffect } from "react";
import { openEvoFloatingChat } from "@/lib/evo-chat-context";
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
  ChevronDown,
  Bell,
  User,
  Sparkles,
  Bookmark,
  Users,
  Globe,
  Droplet,
  Target,
  Activity,
  Pizza,
  Megaphone,
  ShieldQuestion,
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
  const { profile, isCoach, isAdmin, signOutAsync } = useAuth();
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

  // Blog link: admin manages the CMS (/admin/blog); everyone else —
  // including future coach accounts — reads the public blog.
  const blogHref = isAdmin ? "/admin/blog" : isAr ? "/ar/blog" : "/blog";

  // ─── Menu data model (grouped) ─────────────────────────────────────────
  // The drawer is organised into clear sections:
  //   1. Home
  //   2. Paid Services (Coaching + Memberships + EVO AI Coach) — premium offerings
  //   3. Affiliate Program — monetization for promoters
  //   4. Tools (expandable dropdown) — 6 free calculators + meal planner
  //   5. Resources — content libraries (Exercises, Programs, Foods, Blog)
  //   6. Authenticated-only items (Dashboard, My Plans, etc.) — appended below
  //   7. Coach-only items — appended when isCoach
  //
  // Legal & basic pages (Privacy, Terms, About, FAQ, Contact) are intentionally
  // NOT in the header — they live in the footer only (per Owner directive
  // 2026-08-25). Visitors scanning the header should see the product offering
  // first; legal/contact pages are secondary.

  type MenuItem = {
    label: string;
    icon: any;
    href?: string;
    onClick?: () => void;
  };

  type MenuGroup = {
    id: string;
    title: string;
    items: MenuItem[];
  };

  const groups: MenuGroup[] = [];

  // Group 1: Home
  groups.push({
    id: "home",
    title: "",
    items: [
      {
        label: isAr ? "الرئيسية" : "Home",
        icon: Home,
        onClick: () => navigate("landing"),
      },
    ],
  });

  // Group 2: Paid Services (Coaching + Memberships + EVO AI Coach)
  // ROLE SURFACE LAW (2026-08-29): hidden from platform staff — the
  // owner/coach must not browse his own sales funnel in the header.
  if (!isCoach) {
    groups.push({
      id: "paid-services",
      title: isAr ? "الخدمات المدفوعة" : "Paid Services",
      items: [
        {
          label: isAr ? "الكوتشينج" : "Coaching",
          icon: Users,
          href: "/coaching",
        },
        {
          label: isAr ? "العضويات" : "Memberships",
          icon: Sparkles,
          href: "/memberships",
        },
        {
          label: "EVO AI Coach",
          icon: Bot,
          href: "/evo",
        },
      ],
    });
  }

  // Group 3: Affiliate Program (public marketing page) — staff never see it
  if (!isCoach) {
    groups.push({
      id: "affiliate",
      title: isAr ? "الأفلييت" : "Affiliate",
      items: [
        {
          label: isAr ? "برنامج الأفلييت" : "Affiliate Program",
          icon: Gift,
          href: "/affiliate",
        },
      ],
    });
  }

  // Group 4: Tools (dropdown — expandable to show all 6 tools + meal planner)
  // Per Owner directive 2026-08-25: tools must be a dropdown menu showing all
  // individual tools, NOT a single link to /tools.
  groups.push({
    id: "tools",
    title: isAr ? "الأدوات" : "Tools",
    items: [
      {
        label: isAr ? "حاسبة BMI" : "BMI Calculator",
        icon: Activity,
        href: "/tools/bmi-calculator",
      },
      {
        label: isAr ? "حاسبة الدهون" : "Body Fat Calculator",
        icon: Target,
        href: "/tools/body-fat-calculator",
      },
      {
        label: isAr ? "حاسبة السعرات" : "Calorie Calculator",
        icon: Calculator,
        href: "/tools/calorie-calculator",
      },
      {
        label: isAr ? "حاسبة الماكروز" : "Macro Calculator",
        icon: Calculator,
        href: "/tools/macro-calculator",
      },
      {
        label: isAr ? "متتبع الماء" : "Water Tracker",
        icon: Droplet,
        href: "/tools/water-tracker",
      },
      {
        label: isAr ? "مخطط الوجبات" : "Meal Planner",
        icon: Pizza,
        href: "/meal-planner",
      },
    ],
  });

  // Group 5: Resources (content libraries — exercises / programs / foods / blog)
  groups.push({
    id: "resources",
    title: isAr ? "المحتوى" : "Resources",
    items: [
      {
        label: isAr ? "مكتبة التمارين" : "Exercises",
        icon: Dumbbell,
        href: "/exercises",
      },
      {
        label: isAr ? "برامج التدريب" : "Programs",
        icon: ClipboardList,
        href: "/programs",
      },
      {
        label: isAr ? "مكتبة الأكلات" : "Foods",
        icon: Utensils,
        href: "/foods",
      },
      {
        label: isAr ? "المدونة" : "Blog",
        icon: FileText,
        href: blogHref,
      },
    ],
  });

  // Group 6: Account (authenticated items)
  if (isLoggedIn && !isCoach) {
    groups.push({
      id: "account",
      title: isAr ? "حسابي" : "My Account",
      items: [
        { label: isAr ? "لوحة التحكم" : "Dashboard", icon: LayoutDashboard, onClick: () => navigate("dashboard") },
        { label: isAr ? "خططي" : "My Plans", icon: FileText, onClick: () => navigate("plans") },
        { label: isAr ? "تقدمي" : "My Progress", icon: LineChart, onClick: () => navigate("progress") },
        // EVO CHAT SURFACE LAW: opens the floating widget — never a /chat page.
        { label: isAr ? "كوتش EVO" : "EVO Coach", icon: Bot, onClick: () => openEvoFloatingChat() },
        { label: isAr ? "الاستبيانات" : "Questionnaires", icon: ClipboardList, onClick: () => navigate("questionnaires") },
        { label: isAr ? "الإحالات" : "Referrals", icon: Gift, onClick: () => navigate("referral") },
        { label: isAr ? "الدعم" : "Support", icon: LifeBuoy, onClick: () => navigate("support") },
      ],
    });
  }

  // Group 7a: Coach (staff work items — coach | admin)
  if (isLoggedIn && isCoach) {
    groups.push({
      id: "coach",
      title: isAr ? "إدارة الكوتش" : "Coach Admin",
      items: [
        { label: isAr ? "لوحة الكوتش" : "Coach Dashboard", icon: LayoutDashboard, onClick: () => navigate("coach") },
        { label: isAr ? "المدفوعات" : "Payments", icon: Crown, onClick: () => navigate("coach-payments") },
        { label: isAr ? "دعم العملاء" : "Client Support", icon: LifeBuoy, onClick: () => navigate("coach-support") },
        { label: isAr ? "صفحتي العامة" : "My Public Page", icon: Globe, onClick: () => navigate("coach-landing") },
        // 0037 — «أعلن معنا» + the dedicated coach→site support channel
        { label: isAr ? "أعلن معنا" : "Advertise with us", icon: Megaphone, onClick: () => navigate("coach-ads") },
        { label: isAr ? "دعم المدربين" : "Coach Support", icon: ShieldQuestion, onClick: () => navigate("coach-help") },
      ],
    });
  }

  // Group 7b: Admin-exclusive items (owner directive 2026-08-29 — Q6:
  // leads / saved results / blog CMS / referrals admin are admin-only).
  if (isLoggedIn && isAdmin) {
    groups.push({
      id: "admin",
      title: isAr ? "إدارة المنصة" : "Platform Admin",
      items: [
        { label: isAr ? "أدوات Leads" : "Tool Leads", icon: Calculator, href: "/admin/leads" },
        { label: isAr ? "النتائج المحفوظة" : "Saved Results", icon: Bookmark, href: "/admin/saved-results" },
        { label: isAr ? "الإحالات" : "Referrals", icon: Gift, onClick: () => navigate("admin-referrals") },
        { label: isAr ? "إدارة المدونة" : "Blog Admin", icon: FileText, href: "/admin/blog" },
      ],
    });
  }

  // Expandable group state (only Tools is expandable by default)
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(
    new Set(["tools"]), // Tools group is open by default so users see all tools
  );

  const toggleGroup = (groupId: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(groupId)) next.delete(groupId);
      else next.add(groupId);
      return next;
    });
  };

  const handleItemClick = (item: MenuItem) => {
    setOpen(false);
    if (item.onClick) item.onClick();
  };

  return (
    <>
      {/* G1: backdrop-saturate-150 for richer frosted-glass effect (Apple style) */}
      <header className="sticky top-0 z-40 w-full border-b border-[#d2d2d7] bg-white/80 backdrop-blur-xl backdrop-saturate-150">
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

          {/* Menu items — grouped layout */}
          <nav className="flex-1 overflow-y-auto p-3" aria-label={isAr ? "القائمة الرئيسية" : "Main menu"}>
            {groups.map((group, gi) => {
              const isExpanded = expandedGroups.has(group.id);
              const canCollapse = group.id === "tools"; // Only Tools is collapsible (others always show items)
              const showHeader = group.title !== "";
              return (
                <section key={group.id} className={gi > 0 ? "mt-4" : ""}>
                  {showHeader && (
                    <button
                      type="button"
                      onClick={() => canCollapse && toggleGroup(group.id)}
                      className={
                        "mb-1 flex w-full items-center justify-between px-3 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-[#8e8e93] " +
                        (canCollapse ? "cursor-pointer hover:text-[#1d1d1f]" : "cursor-default")
                      }
                      aria-expanded={canCollapse ? isExpanded : undefined}
                      disabled={!canCollapse}
                    >
                      <span>{group.title}</span>
                      {canCollapse && (
                        <ChevronDown
                          className={"h-3.5 w-3.5 transition-transform " + (isExpanded ? "rotate-180" : "")}
                          aria-hidden="true"
                        />
                      )}
                    </button>
                  )}
                  {(!canCollapse || isExpanded) && (
                    <ul className="space-y-0.5">
                      {group.items.map((item, i) => {
                        return (
                          <li key={`${group.id}-${i}`}>
                            {item.href ? (
                              <a
                                href={item.href}
                                onClick={() => setOpen(false)}
                                className={"flex items-center gap-3 rounded-lg px-3 py-2.5 text-start text-sm font-normal transition-colors text-[#1d1d1f] hover:bg-[#f5f5f7] " + (canCollapse ? "ps-6" : "")}
                              >
                                <item.icon className="h-4 w-4 shrink-0 text-[#6e6e73]" aria-hidden="true" />
                                <span className="flex-1">{item.label}</span>
                                <ChevronRight className="h-4 w-4 shrink-0 opacity-30 rtl:rotate-180" aria-hidden="true" />
                              </a>
                            ) : (
                              <button
                                onClick={() => handleItemClick(item)}
                                className={"flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-start text-sm font-normal transition-colors text-[#1d1d1f] hover:bg-[#f5f5f7] " + (canCollapse ? "ps-6" : "")}
                              >
                                <item.icon className="h-4 w-4 shrink-0 text-[#6e6e73]" aria-hidden="true" />
                                <span className="flex-1">{item.label}</span>
                                <ChevronRight className="h-4 w-4 shrink-0 opacity-30 rtl:rotate-180" aria-hidden="true" />
                              </button>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </section>
              );
            })}
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
