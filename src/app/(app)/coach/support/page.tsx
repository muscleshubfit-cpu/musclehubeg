"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { CoachSupportView } from "@/components/views/CoachSupportView";

export default function Page() {
 const { isCoach } = useAuth();
 const router = useRouter();

 useEffect(() => {
   if (!isCoach) {
     router.replace("/dashboard");
   }
 }, [isCoach, router]);

 if (!isCoach) return null;
 return <CoachSupportView />;
}
