"use client";

import { useCallback, useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

export type View =
 | "landing"
 | "memberships"
 | "auth"
 | "checkout"
 | "dashboard"
 | "questionnaires"
 | "progress"
 | "plans"
 | "chat"
 | "support"
 | "coach"
 | "coach-client"
 | "coach-support"
 | "admin-payments"
 | "coach-landing"
 | "coach-wallet"
 | "coach-affiliate"
 | "coach-ads"
 | "coach-help"
 | "referral"
 | "blog"
 | "about"
 | "contact"
 | "privacy"
 | "terms"
 | "faq"
 | "blog-admin"
 | "blog-editor"
 | "admin-referrals";

/**
 * Real, crawlable, back-button-friendly routing.
 *
 * This used to be a pure in-memory SPA router (view/params kept in React
 * state, URL always stayed at "/"). That broke the browser back button and
 * made every internal screen invisible to search engines. `useNav()` is now
 * a thin adapter over Next.js's router so every existing `navigate("x", {...})`
 * call site in the app keeps working unchanged, but each call now produces a
 * real URL + a real browser history entry.
 */
function pathForView(view: View, params: Record<string, any> = {}): string {
 switch (view) {
 case "landing":
 return "/";
 case "auth":
 return params.mode ? `/auth?mode=${encodeURIComponent(params.mode)}` : "/auth";
 case "memberships":
 return "/memberships";
 case "checkout": {
 const q = new URLSearchParams();
 if (params.tier) q.set("tier", String(params.tier));
 if (params.months) q.set("months", String(params.months));
 const qs = q.toString();
 return qs ? `/checkout?${qs}` : "/checkout";
 }
 case "coach-client":
 return params.clientId ? `/coach/${encodeURIComponent(params.clientId)}` : "/coach";
 // 0043 TERMINOLOGY: site-membership payment requests are reviewed by
 // the ADMIN only (site coaching = B2C/admin; coach system = B2B).
 case "admin-payments":
 return "/admin/payments";
 case "coach-wallet":
 return "/coach/wallet";
 case "coach-affiliate":
 return "/coach/affiliate";
 case "coach-ads":
 return "/coach/ads";
 case "coach-help":
 return "/coach/help";
 case "coach-support":
 return "/coach/support";
 case "coach-landing":
 return "/coach/landing";
 case "coach":
 return "/coach";
 case "blog-admin":
 return "/admin/blog";
 case "admin-referrals":
 return "/admin/referrals";
 case "blog-editor":
 // New article by default; if a postId is provided, edit that article.
 return params.postId ? `/admin/blog/${encodeURIComponent(params.postId)}` : "/admin/blog/new";
 default:
 return `/${view}`;
 }
}

/** Reverse mapping: current pathname -> View, used for active-tab highlighting. */
function viewForPath(pathname: string): View {
 if (pathname === "/" || pathname === "") return "landing";
 if (pathname.startsWith("/admin/payments")) return "admin-payments";
 if (pathname.startsWith("/coach/wallet")) return "coach-wallet";
 if (pathname.startsWith("/coach/affiliate")) return "coach-affiliate";
 if (pathname.startsWith("/coach/ads")) return "coach-ads";
 if (pathname.startsWith("/coach/help")) return "coach-help";
 if (pathname.startsWith("/coach/support")) return "coach-support";
 if (pathname.startsWith("/coach/landing")) return "coach-landing";
 if (pathname.startsWith("/coach/")) return "coach-client";
 if (pathname === "/coach") return "coach";
 if (pathname.startsWith("/admin/blog")) return "blog-admin";
 if (pathname.startsWith("/admin/referrals")) return "admin-referrals";
 const clean = pathname.replace(/^\//, "").split("/")[0];
 const known: View[] = [
 "memberships", "auth", "checkout", "dashboard", "questionnaires",
 "progress", "plans", "chat", "support", "referral", "blog",
 "about", "contact", "privacy", "terms", "faq",
 ];
 return (known as string[]).includes(clean) ? (clean as View) : "landing";
}

export function useNav() {
 const router = useRouter();
 const pathname = usePathname();
 const searchParams = useSearchParams();

 const view = useMemo(() => viewForPath(pathname || "/"), [pathname]);
 const params = useMemo(() => {
 const obj: Record<string, any> = {};
 searchParams?.forEach((value, key) => { obj[key] = value; });
 if (view === "coach-client") {
 obj.clientId = (pathname || "").split("/").filter(Boolean)[1];
 }
 return obj;
 }, [searchParams, pathname, view]);

 const navigate = useCallback(
 (v: View, p: Record<string, any> = {}) => {
 router.push(pathForView(v, p));
 // NOTE: Do NOT call window.scrollTo here.
 // The smooth-scroll on every navigation was causing a jarring "scroll
 // to top before page change" effect. The browser's default behavior
 // (instant jump on route change) is better — and Next.js App Router
 // already handles scroll restoration correctly for back/forward.
 },
 [router],
 );

 return { view, params, navigate };
}
