"use client";

import { useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n";
import { getCoachPresence } from "@/lib/data";

export function CoachPresenceBadge() {
  const { lang } = useI18n();
  const [status, setStatus] = useState<"online" | "offline">("offline");
  const isAr = lang === "ar";

  useEffect(() => {
    let interval: any;
    const check = async () => {
      const p = await getCoachPresence();
      setStatus(p.status as "online" | "offline");
    };
    check();
    interval = setInterval(check, 30000); // refresh every 30s
    return () => clearInterval(interval);
  }, []);

  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-2.5 py-1 text-xs font-medium">
      <span className={`relative flex h-2 w-2`}>
        {status === "online" && (
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-75" />
        )}
        <span className={`relative inline-flex h-2 w-2 rounded-full ${status === "online" ? "bg-success" : "bg-muted-foreground"}`} />
      </span>
      <span className={status === "online" ? "text-success" : "text-muted-foreground"}>
        {status === "online" ? (isAr ? "الكوتش متصل" : "Coach online") : (isAr ? "غير متصل" : "Offline")}
      </span>
    </span>
  );
}
