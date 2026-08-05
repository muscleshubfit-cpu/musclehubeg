"use client";

import { useEffect, useState } from "react";
import { Users, Activity, CalendarClock, Search, ChevronLeft, ChevronRight } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/hooks/use-auth";
import { useNav } from "@/hooks/use-nav";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { listAllClients, listAllSubscriptions } from "@/lib/data";
import { getTier } from "@/lib/plans";

export function CoachView() {
  const { t, dir } = useI18n();
  const { profile } = useAuth();
  const { navigate } = useNav();
  const [clients, setClients] = useState<any[]>([]);
  const [subs, setSubs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    (async () => {
      const [c, s] = await Promise.all([listAllClients(), listAllSubscriptions()]);
      setClients(c);
      setSubs(s);
      setLoading(false);
    })();
  }, []);

  if (loading) return <div className="text-muted-foreground">{t("common.loading")}</div>;

  const now = Date.now();
  const activeSubs = subs.filter((s) => s.status === "active" && new Date(s.end_date).getTime() > now);
  const expiringSoon = activeSubs.filter(
    (s) => new Date(s.end_date).getTime() - now < 14 * 864e5,
  );

  const filtered = clients.filter((c) =>
    (c.full_name || "").toLowerCase().includes(search.toLowerCase()) ||
    (c.email || "").toLowerCase().includes(search.toLowerCase()),
  );

  const BackIcon = dir === "rtl" ? ChevronRight : ChevronLeft;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold md:text-3xl">{t("coach.title")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("coach.subtitle")}</p>
      </div>

      {/* Stat cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="p-5 shadow-card">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {t("coach.totalClients")}
            </span>
            <Users className="h-4 w-4 text-primary" />
          </div>
          <p className="mt-3 font-display text-3xl font-bold">{clients.length}</p>
        </Card>
        <Card className="p-5 shadow-card">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {t("coach.activeSubs")}
            </span>
            <Activity className="h-4 w-4 text-success" />
          </div>
          <p className="mt-3 font-display text-3xl font-bold">{activeSubs.length}</p>
        </Card>
        <Card className="p-5 shadow-card">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {t("coach.expiringSoon")}
            </span>
            <CalendarClock className="h-4 w-4 text-warning" />
          </div>
          <p className="mt-3 font-display text-3xl font-bold">{expiringSoon.length}</p>
        </Card>
      </div>

      {/* Clients list */}
      <Card className="p-5 shadow-card">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">{t("coach.clients")}</h2>
          <div className="relative w-full max-w-xs">
            <Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("coach.searchClients")}
              className="ps-9"
            />
          </div>
        </div>

        {filtered.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">{t("coach.noClients")}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-start">
                  <th className="p-3 text-start font-medium text-muted-foreground">{t("coach.client")}</th>
                  <th className="p-3 text-start font-medium text-muted-foreground">{t("coach.status")}</th>
                  <th className="p-3 text-start font-medium text-muted-foreground">{t("coach.expiry")}</th>
                  <th className="p-3 text-start font-medium text-muted-foreground">{t("coach.manage")}</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((c) => {
                  const sub = subs.find((s) => s.client_id === c.id);
                  const isActive = sub && sub.status === "active" && new Date(sub.end_date).getTime() > now;
                  return (
                    <tr key={c.id} className="border-b border-border/60">
                      <td className="p-3">
                        <div className="font-medium">{c.full_name || "—"}</div>
                        <div className="text-xs text-muted-foreground">{c.email || c.phone || "—"}</div>
                      </td>
                      <td className="p-3">
                        {sub ? (
                          <Badge variant="outline" className={isActive ? "border-success text-success" : "border-muted-foreground text-muted-foreground"}>
                            {sub.tier ? t(getTier(sub.tier as any)?.nameKey || "") : "—"}
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-muted-foreground">—</Badge>
                        )}
                      </td>
                      <td className="p-3 text-muted-foreground">
                        {sub?.end_date ? new Date(sub.end_date).toLocaleDateString() : "—"}
                      </td>
                      <td className="p-3">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="gap-1"
                          onClick={() => navigate("coach-client", { clientId: c.id })}
                        >
                          {t("coach.manage")}
                          <BackIcon className="h-3 w-3 rtl:rotate-0" />
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
