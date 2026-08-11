"use client";

import { useEffect, useState } from "react";
import {
 Dumbbell,
 Salad,
 ClipboardList,
 LineChart,
 ArrowRight,
 Calendar,
 TrendingDown,
 TrendingUp,
} from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/hooks/use-auth";
import { useNav } from "@/hooks/use-nav";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { listProgress, listPlans, listAllSubscriptions } from "@/lib/data";
import { getTier } from "@/lib/plans";

export function DashboardView() {
 const { t } = useI18n();
 const { profile } = useAuth();
 const { navigate } = useNav();
 const [progress, setProgress] = useState<any[]>([]);
 const [plans, setPlans] = useState<any[]>([]);
 const [sub, setSub] = useState<any | null>(null);
 const [loading, setLoading] = useState(true);

 useEffect(() => {
 if (!profile) return;
 (async () => {
 try {
 const [p, pl, subs] = await Promise.all([
 listProgress(profile.id),
 listPlans(profile.id),
 listAllSubscriptions(),
 ]);
 setProgress(p);
 setPlans(pl);
 setSub(subs.find((s: any) => s.client_id === profile.id) ?? null);
 } finally {
 setLoading(false);
 }
 })();
 }, [profile]);

 if (loading) return <div className="text-muted-foreground">{t("common.loading")}</div>;

 const latest = progress[progress.length - 1];
 const first = progress[0];
 const weightChange = latest?.weight && first?.weight ? latest.weight - first.weight : null;
 const daysLeft = sub?.end_date
 ? Math.max(0, Math.ceil((new Date(sub.end_date).getTime() - Date.now()) / 864e5))
 : null;
 const tierName = sub?.tier ? getTier(sub.tier as any)?.nameKey : null;

 return (
 <div className="space-y-6">
 <div>
 <h1 className="text-2xl font-bold md:text-3xl">
 {t("dash.greeting")}, {profile?.full_name || t("common.welcome")}
 </h1>
 <p className="mt-1 text-sm text-muted-foreground">{t("dash.statsOverview")}</p>
 </div>

 {/* Stat cards */}
 <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
 <Card className="p-5 shadow-card">
 <div className="flex items-center justify-between">
 <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
 {t("dash.subscription")}
 </span>
 {tierName && <Badge className="bg-gradient-primary">{t(tierName)}</Badge>}
 </div>
 <div className="mt-3">
 {sub ? (
 <>
 <p className="font-display text-2xl font-bold">
 {daysLeft} <span className="text-base font-normal text-muted-foreground">{t("dash.daysLeft")}</span>
 </p>
 <p className="mt-1 text-xs text-muted-foreground">
 {t("dash.expiresOn")} {new Date(sub.end_date).toLocaleDateString()}
 </p>
 </>
 ) : (
 <>
 <p className="font-display text-lg font-semibold">{t("dash.notSet")}</p>
 <Button size="sm" className="mt-2" onClick={() => navigate("pricing")}>
 {t("pricing.cta")}
 </Button>
 </>
 )}
 </div>
 </Card>

 <Card className="p-5 shadow-card">
 <div className="flex items-center justify-between">
 <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
 {t("dash.latestWeight")}
 </span>
 <LineChart className="h-4 w-4 text-primary" />
 </div>
 {latest?.weight ? (
 <>
 <p className="mt-3 font-display text-2xl font-bold">
 {latest.weight} <span className="text-base font-normal text-muted-foreground">{t("common.kg")}</span>
 </p>
 {weightChange !== null && weightChange !== 0 && (
 <p className={`mt-1 flex items-center gap-1 text-xs ${weightChange < 0 ? "text-success" : "text-warning"}`}>
 {weightChange < 0 ? <TrendingDown className="h-3 w-3" /> : <TrendingUp className="h-3 w-3" />}
 {Math.abs(weightChange).toFixed(1)} {t("common.kg")} {t("dash.change")}
 </p>
 )}
 </>
 ) : (
 <p className="mt-3 text-sm text-muted-foreground">{t("dash.noWeight")}</p>
 )}
 </Card>

 <Card className="p-5 shadow-card">
 <div className="flex items-center justify-between">
 <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
 {t("dash.mealPlans")}
 </span>
 <Salad className="h-4 w-4 text-primary" />
 </div>
 <p className="mt-3 font-display text-2xl font-bold">
 {plans.filter((p) => p.type === "meal").length}
 </p>
 <button className="mt-1 text-xs text-primary hover:underline" onClick={() => navigate("plans")}>
 {t("dash.viewPlans")}
 </button>
 </Card>

 <Card className="p-5 shadow-card">
 <div className="flex items-center justify-between">
 <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
 {t("dash.workoutPlans")}
 </span>
 <Dumbbell className="h-4 w-4 text-primary" />
 </div>
 <p className="mt-3 font-display text-2xl font-bold">
 {plans.filter((p) => p.type === "workout").length}
 </p>
 <button className="mt-1 text-xs text-primary hover:underline" onClick={() => navigate("plans")}>
 {t("dash.viewPlans")}
 </button>
 </Card>
 </div>

 {/* Quick actions */}
 <div>
 <h2 className="mb-3 text-lg font-semibold">{t("dash.quickActions")}</h2>
 <div className="grid gap-3 sm:grid-cols-3">
 <button
 onClick={() => navigate("progress")}
 className="group flex items-center justify-between rounded-2xl border border-border bg-card p-4 shadow-card transition-colors hover:border-primary/40"
 >
 <span className="flex items-center gap-3">
 <span className="grid h-10 w-10 place-items-center rounded-xl bg-secondary text-primary">
 <LineChart className="h-5 w-5" />
 </span>
 <span className="font-medium">{t("dash.logProgress")}</span>
 </span>
 <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-1 rtl:rotate-180" />
 </button>
 <button
 onClick={() => navigate("questionnaires")}
 className="group flex items-center justify-between rounded-2xl border border-border bg-card p-4 shadow-card transition-colors hover:border-primary/40"
 >
 <span className="flex items-center gap-3">
 <span className="grid h-10 w-10 place-items-center rounded-xl bg-secondary text-primary">
 <ClipboardList className="h-5 w-5" />
 </span>
 <span className="font-medium">{t("dash.fillQuestionnaires")}</span>
 </span>
 <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-1 rtl:rotate-180" />
 </button>
 <button
 onClick={() => navigate("plans")}
 className="group flex items-center justify-between rounded-2xl border border-border bg-card p-4 shadow-card transition-colors hover:border-primary/40"
 >
 <span className="flex items-center gap-3">
 <span className="grid h-10 w-10 place-items-center rounded-xl bg-secondary text-primary">
 <Calendar className="h-5 w-5" />
 </span>
 <span className="font-medium">{t("dash.viewPlans")}</span>
 </span>
 <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-1 rtl:rotate-180" />
 </button>
 </div>
 </div>
 </div>
 );
}
