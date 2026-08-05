"use client";

import { useAuth } from "@/hooks/use-auth";
import { CoachPaymentsView } from "@/components/views/CoachPaymentsView";
import { DashboardView } from "@/components/views/DashboardView";

export default function Page() {
  const { isCoach } = useAuth();
  return isCoach ? <CoachPaymentsView /> : <DashboardView />;
}
