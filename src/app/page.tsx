"use client";

import { useEffect } from "react";
import { I18nProvider } from "@/lib/i18n";
import { AuthProvider, useAuth } from "@/hooks/use-auth";
import { NavProvider, useNav } from "@/hooks/use-nav";
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
import { AppLayout } from "@/components/AppLayout";
import { getTier } from "@/lib/plans";
import type { TierId, Duration } from "@/lib/plans";

const PUBLIC_VIEWS = ["landing", "pricing", "auth", "checkout"];

function Router() {
  const { view, params, navigate } = useNav();
  const { profile, loading, isCoach } = useAuth();

  // After Google OAuth redirect, the user lands back on the origin with a session.
  // If they're authenticated but still on a public view (landing/auth), send them to their dashboard.
  useEffect(() => {
    if (loading || !profile) return;
    if (view === "auth" || view === "landing") {
      navigate(isCoach ? "coach" : "dashboard");
    }
  }, [loading, profile, isCoach, view, navigate]);

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
      {view === "pricing" && <PricingView />}
    </AppLayout>
  );
}

export default function Home() {
  return (
    <I18nProvider>
      <AuthProvider>
        <NavProvider>
          <Router />
        </NavProvider>
      </AuthProvider>
    </I18nProvider>
  );
}
