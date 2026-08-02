"use client";

import { useEffect, useState } from "react";
import {
  ArrowLeft,
  User as UserIcon,
  CreditCard,
  Salad,
  Dumbbell,
  Upload,
  LineChart as LineChartIcon,
  Trash2,
  Sparkles,
  Wand2,
  Loader2,
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { useI18n } from "@/lib/i18n";
import { useNav } from "@/hooks/use-nav";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  listAllSubscriptions,
  upsertSubscription,
  listProgress,
  listPlans,
  addPlan,
  deletePlan,
  getQuestionnaire,
  fetchProfile,
} from "@/lib/data";
import { TIERS, getTier, formatEgp, type Duration } from "@/lib/plans";
import { toast } from "sonner";

export function CoachClientView({ clientId }: { clientId: string }) {
  const { t, dir, lang } = useI18n();
  const { navigate } = useNav();
  const [client, setClient] = useState<any | null>(null);
  const [sub, setSub] = useState<any | null>(null);
  const [progress, setProgress] = useState<any[]>([]);
  const [plans, setPlans] = useState<any[]>([]);
  const [nutriQ, setNutriQ] = useState<any | null>(null);
  const [fitQ, setFitQ] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"overview" | "subscription" | "plans" | "ai-plans" | "questionnaires" | "progress">("overview");

  // Subscription form
  const [tier, setTier] = useState<string>("essential");
  const [months, setMonths] = useState<Duration>(6);
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [savingSub, setSavingSub] = useState(false);

  // Plan upload form
  const [planType, setPlanType] = useState<"meal" | "workout">("meal");
  const [planTitle, setPlanTitle] = useState("");
  const [planNotes, setPlanNotes] = useState("");
  const [uploading, setUploading] = useState(false);

  // AI plan generation
  const [generating, setGenerating] = useState<"workout" | "nutrition" | null>(null);

  useEffect(() => {
    (async () => {
      const [c, subs, p, pl, n, f] = await Promise.all([
        fetchProfile(clientId),
        listAllSubscriptions(),
        listProgress(clientId),
        listPlans(clientId),
        getQuestionnaire(clientId, "nutrition"),
        getQuestionnaire(clientId, "fitness"),
      ]);
      setClient(c);
      const s = subs.find((x) => x.client_id === clientId);
      setSub(s);
      setProgress(p);
      setPlans(pl);
      setNutriQ(n);
      setFitQ(f);
      if (s) {
        setTier(s.tier);
        setMonths(s.months);
        setStartDate(s.start_date ? s.start_date.slice(0, 10) : "");
        setEndDate(s.end_date ? s.end_date.slice(0, 10) : "");
      }
      setLoading(false);
    })();
  }, [clientId]);

  const updateSub = async () => {
    setSavingSub(true);
    try {
      const start = startDate ? new Date(startDate).toISOString() : new Date().toISOString();
      const end = endDate ? new Date(endDate).toISOString() : new Date(Date.now() + months * 30 * 864e5).toISOString();
      await upsertSubscription(clientId, tier, months, start, end);
      toast.success(t("coach.subUpdated"));
    } catch (e: any) {
      toast.error(e.message || t("common.error"));
    } finally {
      setSavingSub(false);
    }
  };

  const uploadPlan = async () => {
    if (!planTitle.trim()) return;
    setUploading(true);
    try {
      await addPlan({
        client_id: clientId,
        type: planType,
        title: planTitle.trim(),
        notes: planNotes.trim() || null,
        file_url: null,
        content: null,
      });
      setPlanTitle("");
      setPlanNotes("");
      const data = await listPlans(clientId);
      setPlans(data);
      toast.success(t("coach.planUploaded"));
    } catch (e: any) {
      toast.error(e.message || t("common.error"));
    } finally {
      setUploading(false);
    }
  };

  const removePlan = async (id: string) => {
    if (!confirm(t("coach.deletePlanConfirm"))) return;
    await deletePlan(id);
    const data = await listPlans(clientId);
    setPlans(data);
  };

  if (loading) return <div className="text-muted-foreground">{t("common.loading")}</div>;

  const chartData = progress
    .filter((e) => e.weight != null)
    .map((e) => ({
      date: new Date(e.created_at).toLocaleDateString(lang === "ar" ? "ar-EG" : "en-US", { month: "short", day: "numeric" }),
      weight: e.weight,
    }));

  const tabs = [
    { id: "overview", label: t("coach.overview") },
    { id: "subscription", label: t("coach.subscriptionMgmt") },
    { id: "plans", label: t("coach.plansSection") },
    { id: "ai-plans", label: t("coach.aiPlans") },
    { id: "questionnaires", label: t("coach.questionnairesSection") },
    { id: "progress", label: t("coach.clientProgress") },
  ] as const;

  const generateAIPlan = async (planType: "workout" | "nutrition") => {
    setGenerating(planType);
    try {
      // Build client context from questionnaires + profile + progress
      const clientContext = {
        name: client?.full_name || "العميل",
        nutrition: nutriQ?.data || null,
        fitness: fitQ?.data || null,
        recent_measurements: progress.slice(-3).map((p) => ({
          weight: p.weight,
          waist: p.waist,
          date: p.created_at,
        })),
      };

      const res = await fetch("/api/ai/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId, planType, clientContext }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to generate plan");
      }

      const { title, content } = await res.json();

      // Save the generated plan to the database
      await addPlan({
        client_id: clientId,
        type: planType === "workout" ? "workout" : "meal",
        title,
        notes: "Generated by AI",
        file_url: null,
        content,
      });

      // Refresh plans
      const refreshed = await listPlans(clientId);
      setPlans(refreshed);

      toast.success(planType === "workout" ? "تم توليد برنامج التمارين بنجاح!" : "تم توليد خطة التغذية بنجاح!");
    } catch (e: any) {
      toast.error(e.message || t("coach.genFailed"));
    } finally {
      setGenerating(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" className="gap-1" onClick={() => navigate("coach")}>
          <ArrowLeft className="h-4 w-4 rtl:rotate-180" />
          {t("coach.backToList")}
        </Button>
      </div>

      <div>
        <h1 className="text-2xl font-bold md:text-3xl">{client?.full_name || t("coach.client")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{client?.email || client?.phone || "—"}</p>
      </div>

      <div className="flex flex-wrap gap-1 rounded-full border border-border bg-card p-1">
        {tabs.map((tb) => (
          <button
            key={tb.id}
            onClick={() => setTab(tb.id)}
            className={cn(
              "rounded-full px-4 py-1.5 text-sm font-medium transition-all",
              tab === tb.id ? "bg-gradient-primary text-primary-foreground shadow-glow" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {tb.label}
          </button>
        ))}
      </div>

      {tab === "overview" && (
        <div className="grid gap-4 sm:grid-cols-3">
          <Card className="p-5 shadow-card">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{t("coach.subscription")}</span>
              <CreditCard className="h-4 w-4 text-primary" />
            </div>
            {sub ? (
              <>
                <p className="mt-3 font-display text-lg font-bold">{t(getTier(sub.tier as any)?.nameKey || "")}</p>
                <p className="text-xs text-muted-foreground">
                  {sub.end_date ? `${t("dash.expiresOn")} ${new Date(sub.end_date).toLocaleDateString()}` : "—"}
                </p>
              </>
            ) : (
              <p className="mt-3 text-sm text-muted-foreground">—</p>
            )}
          </Card>
          <Card className="p-5 shadow-card">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{t("dash.latestWeight")}</span>
              <LineChartIcon className="h-4 w-4 text-primary" />
            </div>
            <p className="mt-3 font-display text-lg font-bold">
              {progress[progress.length - 1]?.weight ? `${progress[progress.length - 1].weight} ${t("common.kg")}` : "—"}
            </p>
          </Card>
          <Card className="p-5 shadow-card">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{t("dash.checkins")}</span>
              <UserIcon className="h-4 w-4 text-primary" />
            </div>
            <p className="mt-3 font-display text-lg font-bold">{progress.length}</p>
          </Card>
        </div>
      )}

      {tab === "subscription" && (
        <Card className="p-6 shadow-card">
          <h2 className="text-lg font-semibold">{t("coach.subscriptionMgmt")}</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <Label>{t("checkout.plan")}</Label>
              <div className="mt-1.5 grid grid-cols-2 gap-2">
                {TIERS.map((tierObj) => (
                  <button
                    key={tierObj.id}
                    onClick={() => setTier(tierObj.id)}
                    className={cn(
                      "rounded-xl border p-3 text-sm font-medium transition-colors",
                      tier === tierObj.id ? "border-primary bg-secondary text-primary" : "border-border hover:border-primary/40",
                    )}
                  >
                    {t(tierObj.nameKey)}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <Label>{t("checkout.duration")}</Label>
              <div className="mt-1.5 grid grid-cols-3 gap-2">
                {([3, 6, 12] as Duration[]).map((d) => (
                  <button
                    key={d}
                    onClick={() => setMonths(d)}
                    className={cn(
                      "rounded-xl border p-3 text-sm font-medium transition-colors",
                      months === d ? "border-primary bg-secondary text-primary" : "border-border hover:border-primary/40",
                    )}
                  >
                    {d} {t("pricing.months")}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <Label htmlFor="start">{t("coach.setStart")}</Label>
              <Input id="start" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="mt-1.5" />
            </div>
            <div>
              <Label htmlFor="end">{t("coach.setExpiry")}</Label>
              <Input id="end" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="mt-1.5" />
            </div>
          </div>
          <Button className="mt-5" onClick={updateSub} disabled={savingSub}>
            {savingSub ? t("common.saving") : t("coach.updateSub")}
          </Button>
        </Card>
      )}

      {tab === "plans" && (
        <div className="space-y-6">
          <Card className="p-6 shadow-card">
            <h2 className="flex items-center gap-2 text-lg font-semibold">
              <Upload className="h-4 w-4 text-primary" />
              {t("coach.uploadMeal")} / {t("coach.uploadWorkout")}
            </h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <Label>{t("coach.planTitle")}</Label>
                <Input
                  value={planTitle}
                  onChange={(e) => setPlanTitle(e.target.value)}
                  className="mt-1.5"
                  placeholder={t("coach.planTitle")}
                />
              </div>
              <div>
                <Label>{t("checkout.plan")}</Label>
                <div className="mt-1.5 grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setPlanType("meal")}
                    className={cn(
                      "flex items-center justify-center gap-2 rounded-xl border p-3 text-sm font-medium transition-colors",
                      planType === "meal" ? "border-primary bg-secondary text-primary" : "border-border hover:border-primary/40",
                    )}
                  >
                    <Salad className="h-4 w-4" /> {t("plans.meal")}
                  </button>
                  <button
                    onClick={() => setPlanType("workout")}
                    className={cn(
                      "flex items-center justify-center gap-2 rounded-xl border p-3 text-sm font-medium transition-colors",
                      planType === "workout" ? "border-primary bg-secondary text-primary" : "border-border hover:border-primary/40",
                    )}
                  >
                    <Dumbbell className="h-4 w-4" /> {t("plans.workout")}
                  </button>
                </div>
              </div>
              <div className="sm:col-span-2">
                <Label htmlFor="plan-notes">{t("coach.planNotes")}</Label>
                <Textarea
                  id="plan-notes"
                  value={planNotes}
                  onChange={(e) => setPlanNotes(e.target.value)}
                  className="mt-1.5"
                />
              </div>
            </div>
            <Button className="mt-4 gap-2" onClick={uploadPlan} disabled={uploading || !planTitle.trim()}>
              <Upload className="h-4 w-4" />
              {uploading ? t("common.uploading") : t("common.upload")}
            </Button>
          </Card>

          <div className="space-y-3">
            {plans.map((p) => (
              <Card key={p.id} className="flex items-center justify-between gap-3 p-4 shadow-card">
                <div className="flex items-center gap-3">
                  {p.type === "meal" ? <Salad className="h-5 w-5 text-primary" /> : <Dumbbell className="h-5 w-5 text-primary" />}
                  <div>
                    <div className="font-medium">{p.title}</div>
                    <div className="text-xs text-muted-foreground">{new Date(p.created_at).toLocaleDateString()}</div>
                  </div>
                </div>
                <Button size="sm" variant="ghost" onClick={() => removePlan(p.id)} className="text-destructive hover:text-destructive">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </Card>
            ))}
            {plans.length === 0 && (
              <p className="text-sm text-muted-foreground">{t("plans.empty")}</p>
            )}
          </div>
        </div>
      )}

      {tab === "ai-plans" && (
        <div className="space-y-6">
          <Card className="overflow-hidden border-primary/30 bg-gradient-to-br from-secondary/40 to-card p-6 shadow-card">
            <div className="flex items-start gap-4">
              <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-gradient-primary text-primary-foreground shadow-glow">
                <Sparkles className="h-6 w-6" />
              </div>
              <div className="flex-1">
                <h2 className="flex items-center gap-2 text-lg font-bold">
                  {t("coach.aiPlans")}
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">{t("coach.aiHint")}</p>

                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  <button
                    onClick={() => generateAIPlan("nutrition")}
                    disabled={generating !== null}
                    className="group flex items-center justify-between gap-3 rounded-2xl border border-border bg-background p-4 text-start transition-all hover:border-primary/40 hover:shadow-glow disabled:opacity-50"
                  >
                    <div className="flex items-center gap-3">
                      <span className="grid h-10 w-10 place-items-center rounded-xl bg-secondary text-primary">
                        {generating === "nutrition" ? (
                          <Loader2 className="h-5 w-5 animate-spin" />
                        ) : (
                          <Salad className="h-5 w-5" />
                        )}
                      </span>
                      <div>
                        <div className="font-semibold">{t("coach.genNutrition")}</div>
                        <div className="text-xs text-muted-foreground">{t("coach.aiHint")}</div>
                      </div>
                    </div>
                    <Wand2 className="h-4 w-4 text-muted-foreground transition-colors group-hover:text-primary" />
                  </button>

                  <button
                    onClick={() => generateAIPlan("workout")}
                    disabled={generating !== null}
                    className="group flex items-center justify-between gap-3 rounded-2xl border border-border bg-background p-4 text-start transition-all hover:border-primary/40 hover:shadow-glow disabled:opacity-50"
                  >
                    <div className="flex items-center gap-3">
                      <span className="grid h-10 w-10 place-items-center rounded-xl bg-secondary text-primary">
                        {generating === "workout" ? (
                          <Loader2 className="h-5 w-5 animate-spin" />
                        ) : (
                          <Dumbbell className="h-5 w-5" />
                        )}
                      </span>
                      <div>
                        <div className="font-semibold">{t("coach.genWorkout")}</div>
                        <div className="text-xs text-muted-foreground">{t("coach.aiHint")}</div>
                      </div>
                    </div>
                    <Wand2 className="h-4 w-4 text-muted-foreground transition-colors group-hover:text-primary" />
                  </button>
                </div>

                {generating && (
                  <div className="mt-4 flex items-center gap-2 rounded-xl bg-primary/5 px-4 py-2 text-sm text-primary">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {t("coach.generating")}
                  </div>
                )}
              </div>
            </div>
          </Card>

          {/* Show all plans (including AI-generated) */}
          <div>
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              {t("coach.plansSection")} ({plans.length})
            </h3>
            {plans.length === 0 ? (
              <Card className="border-dashed p-8 text-center text-sm text-muted-foreground">
                {t("coach.noDrafts")}
              </Card>
            ) : (
              <div className="space-y-3">
                {plans.map((p) => (
                  <Card key={p.id} className="flex items-center justify-between gap-3 p-4 shadow-card">
                    <div className="flex items-center gap-3">
                      {p.type === "meal" ? <Salad className="h-5 w-5 text-primary" /> : <Dumbbell className="h-5 w-5 text-primary" />}
                      <div>
                        <div className="font-medium">{p.title}</div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span>{new Date(p.created_at).toLocaleDateString()}</span>
                          {p.notes === "Generated by AI" && (
                            <Badge variant="outline" className="border-primary/30 bg-primary/5 text-primary">
                              <Sparkles className="me-1 h-3 w-3" /> AI
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    <Button size="sm" variant="ghost" onClick={() => removePlan(p.id)} className="text-destructive hover:text-destructive">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {tab === "questionnaires" && (
        <div className="grid gap-4 md:grid-cols-2">
          <QuestionnaireCard title={t("coach.nutritionQ")} data={nutriQ} t={t} />
          <QuestionnaireCard title={t("coach.fitnessQ")} data={fitQ} t={t} />
        </div>
      )}

      {tab === "progress" && (
        <Card className="p-6 shadow-card">
          <h2 className="text-lg font-semibold">{t("prog.weightChart")}</h2>
          <div className="mt-4 h-64">
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="clientWeight" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#1F8FFF" stopOpacity={0.5} />
                      <stop offset="100%" stopColor="#1F8FFF" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                  <XAxis dataKey="date" tick={{ fontSize: 12, fill: "#475569" }} />
                  <YAxis tick={{ fontSize: 12, fill: "#475569" }} domain={["auto", "auto"]} />
                  <Tooltip />
                  <Area type="monotone" dataKey="weight" stroke="#1F8FFF" strokeWidth={2.5} fill="url(#clientWeight)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                {t("prog.noEntries")}
              </div>
            )}
          </div>
        </Card>
      )}
    </div>
  );
}

function QuestionnaireCard({ title, data, t }: { title: string; data: any; t: (k: string) => string }) {
  const status = data?.status as string | undefined;
  return (
    <Card className="p-5 shadow-card">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="font-semibold">{title}</h3>
        {status && (
          <Badge variant="outline">
            {t(`q.status.${status}`)}
          </Badge>
        )}
      </div>
      {!data ? (
        <p className="text-sm text-muted-foreground">{t("coach.noQ")}</p>
      ) : (
        <div className="space-y-2 text-sm">
          {Object.entries(data.data || {}).map(([k, v]: [string, any]) => (
            <div key={k} className="flex justify-between gap-3 border-b border-border/60 pb-1.5">
              <span className="text-muted-foreground">{k}</span>
              <span className="font-medium text-end">{String(v) || "—"}</span>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
