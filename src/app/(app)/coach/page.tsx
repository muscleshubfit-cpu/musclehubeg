"use client";

import { useAuth } from "@/hooks/use-auth";
import { CoachView } from "@/components/views/CoachView";
import { DashboardView } from "@/components/views/DashboardView";

export default function Page() {
  const { isCoach } = useAuth();
  return isCoach ? <CoachView /> : <DashboardView />;
}
