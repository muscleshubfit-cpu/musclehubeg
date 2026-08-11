"use client";

import { use } from "react";
import { useAuth } from "@/hooks/use-auth";
import { CoachClientView } from "@/components/views/CoachClientView";
import { CoachView } from "@/components/views/CoachView";
import { DashboardView } from "@/components/views/DashboardView";

export default function Page({ params }: { params: Promise<{ clientId: string }> }) {
 const { clientId } = use(params);
 const { isCoach } = useAuth();
 if (!isCoach) return <DashboardView />;
 if (!clientId) return <CoachView />;
 return <CoachClientView clientId={clientId} />;
}
