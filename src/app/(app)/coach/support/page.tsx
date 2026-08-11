"use client";

import { useAuth } from "@/hooks/use-auth";
import { CoachSupportView } from "@/components/views/CoachSupportView";
import { DashboardView } from "@/components/views/DashboardView";

export default function Page() {
 const { isCoach } = useAuth();
 return isCoach ? <CoachSupportView /> : <DashboardView />;
}
