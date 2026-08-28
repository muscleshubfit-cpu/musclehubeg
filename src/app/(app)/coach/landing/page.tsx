"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { CoachLandingEditor } from "@/components/views/CoachLandingEditor";

export default function Page() {
  const { isCoach } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isCoach) {
      router.replace("/dashboard");
    }
  }, [isCoach, router]);

  if (!isCoach) return null;
  return <CoachLandingEditor />;
}
