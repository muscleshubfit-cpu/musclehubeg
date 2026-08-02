"use client";

import { useEffect } from "react";
import { I18nProvider } from "@/lib/i18n";
import { AuthProvider, useAuth } from "@/hooks/use-auth";
import { NavProvider, useNav, type View } from "@/hooks/use-nav";
import { LandingView } from "@/components/views/LandingView";
import { PricingView } from "@/components/views/PricingView";
import { AuthView } from "@/components/views/AuthView";
import { CheckoutView } from "@/components/views/CheckoutView";
import { DashboardView } from "@/components/views/DashboardView";
import { QuestionnairesView } from "@/components/views/QuestionnairesView";
import { ProgressView } from "@/components/views/ProgressView";
import { PlansView } from "@/components/views/PlansView";
import { ChatView } from "@/components/views/ChatView";
import { SupportView } from "@/components/views/SupportView";
import { CoachView } from "@/components/views/CoachView";
import { CoachClientView } from "@/components/views/CoachClientView";
import { CoachSupportView } from "@/components/views/CoachSupportView";
import { CoachPaymentsView } from "@/components/views/CoachPaymentsView";
import { ReferralView } from "@/components/views/ReferralView";
import { BlogView } from "@/components/views/BlogView";
import { AppLayout } from "@/components/AppLayout";
import { getTier } from "@/lib/plans";
import type { TierId, Duration } from "@/lib/plans";

function Router() {
  const { view, params, navigate } = useNav();
  const { profile, loading, isCoach } = useAuth();

  // Auto-redirect logged-in users away from /auth (but NOT /landing —
  // the landing page now shows a "Go to Dashboard" button for logged-in
  // users, which is better UX than forcing a redirect).
  useEffect(() => {
    if (loading || !profile) return;
    if (view === "auth") {
      navigate(isCoach ? "coach" : "dashboard");
    }
  }, [loading, profile, isCoach, view, navigate]);

  // Handle OAuth error from /auth/callback (e.g., PKCE verifier mismatch).
  // Show a toast so the user knows what happened.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    const authError = url.searchParams.get("auth_error");
    if (authError) {
      // Clean the URL
      window.history.replaceState({}, document.title, url.pathname);
      // Show error via toast (import dynamically to avoid SSR issues)
      import("sonner").then(({ toast }) => {
        toast.error(authError === "server-config"
          ? "Server configuration error. Please contact support."
          : `Login failed: ${authError}`);
      });
    }
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  // Public views
  if (view === "landing") return <LandingView />;
  if (view === "pricing") return <PricingView />;
  if (view === "auth") return <AuthView mode={(params.mode as "login" | "signup") || "login"} />;
  if (view === "blog") return <BlogView />;
  if (view === "checkout") {
    const tier = (params.tier as TierId) || "essential";
    const months = (params.months as Duration) || 6;
    if (!getTier(tier)) return <LandingView />;
    return <CheckoutView tier={tier} months={months} />;
  }

  // Protected views
  if (!profile) {
    return <AuthView mode="login" />;
  }

  // Coach-only views
  if (view === "coach") {
    return isCoach ? (
      <AppLayout>
        <CoachView />
      </AppLayout>
    ) : (
      <AppLayout>
        <DashboardView />
      </AppLayout>
    );
  }
  if (view === "coach-support") {
    return isCoach ? (
      <AppLayout>
        <CoachSupportView />
      </AppLayout>
    ) : (
      <AppLayout>
        <DashboardView />
      </AppLayout>
    );
  }
  if (view === "coach-payments") {
    return isCoach ? (
      <AppLayout>
        <CoachPaymentsView />
      </AppLayout>
    ) : (
      <AppLayout>
        <DashboardView />
      </AppLayout>
    );
  }
  if (view === "coach-client") {
    if (!isCoach) {
      return (
        <AppLayout>
          <DashboardView />
        </AppLayout>
      );
    }
    const clientId = params.clientId as string;
    if (!clientId) {
      return (
        <AppLayout>
          <CoachView />
        </AppLayout>
      );
    }
    return (
      <AppLayout>
        <CoachClientView clientId={clientId} />
      </AppLayout>
    );
  }

  // Client views (also default for coach when navigating to client views)
  return (
    <AppLayout>
      {view === "dashboard" && <DashboardView />}
      {view === "questionnaires" && <QuestionnairesView />}
      {view === "progress" && <ProgressView />}
      {view === "plans" && <PlansView />}
      {view === "chat" && <ChatView />}
      {view === "support" && <SupportView />}
      {view === "referral" && <ReferralView />}
      {view === "pricing" && <PricingView />}
    </AppLayout>
  );
}

/**
 * AppRoot — shared SPA shell.
 *
 * `initialView` lets a real Next.js route (e.g. /pricing, /blog) deep-link
 * straight into a specific view on first paint, so:
 *   - Search engines and social previews see real, crawlable URLs
 *   - Direct links / bookmarks / shares land on the right screen
 *   - In-app client-side navigation (useNav().navigate(...)) keeps working
 *     exactly as before for everything else (dashboard, chat, coach views…)
 */
export default function AppRoot({ initialView = "landing" }: { initialView?: View }) {
  return (
    <I18nProvider>
      <AuthProvider>
        <NavProvider initialView={initialView}>
          <Router />
        </NavProvider>
      </AuthProvider>
    </I18nProvider>
  );
}
