"use client";

import { useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/lib/supabase/client";

/**
 * MULTI-COACH PHASE 2B — client "my coach" card.
 * Reads the client's OWN coach_assignments row (RLS: client_id =
 * auth.uid()) + the assigned coach's profile row (profiles select
 * policy grants the client his assigned coach — migration 0031).
 * Renders nothing while unassigned / before migrations / on error.
 */

type CoachInfo = {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  role: string | null;
};

export function MyCoachCard() {
  const { lang } = useI18n();
  const isAr = lang === "ar";
  const { profile } = useAuth();
  const [coach, setCoach] = useState<CoachInfo | null>(null);

  useEffect(() => {
    if (!profile || !supabase) return;
    let cancelled = false;
    (async () => {
      try {
        const { data, error } = await supabase
          .from("coach_assignments")
          .select("coach:profiles!coach_assignments_coach_id_fkey(id, full_name, avatar_url, role)")
          .eq("client_id", profile.id)
          .maybeSingle();

        const row = data as { coach: CoachInfo | null } | null;
        if (!cancelled && !error && row?.coach) {
          setCoach(row.coach);
        }
      } catch {
        // table/policy not migrated yet — the card simply stays hidden
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [profile]);

  if (!coach) return null;

  const initial = (coach.full_name || "?").trim().charAt(0);

  return (
    <div className="flex items-center gap-4 rounded-2xl bg-[#f5f5f7] p-6">
      {coach.avatar_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={coach.avatar_url}
          alt={coach.full_name || "coach"}
          className="h-14 w-14 rounded-full object-cover ring-2 ring-white"
        />
      ) : (
        <div className="grid h-14 w-14 place-items-center rounded-full bg-[#0071e3]/10 text-xl font-semibold text-[#0071e3]">
          {initial}
        </div>
      )}
      <div className="min-w-0 flex-1">
        <p className="text-xs font-normal uppercase tracking-wide text-[#6e6e73]">
          {isAr ? "مدربك الخاص" : "Your coach"}
        </p>
        <p className="mt-0.5 truncate text-base font-medium">{coach.full_name || "—"}</p>
        <p className="text-xs font-normal text-[#6e6e73]">
          {isAr
            ? "يتابع خطتك ونتائجك ويجيب على استفساراتك داخل الموقع"
            : "Follows your plan and results, and answers your questions in-app"}
        </p>
      </div>
    </div>
  );
}
