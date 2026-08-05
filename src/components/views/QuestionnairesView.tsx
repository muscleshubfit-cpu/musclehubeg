"use client";

import { useEffect, useState } from "react";
import { Salad, Dumbbell, Lock, AlertCircle, Send } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/hooks/use-auth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { getQuestionnaire, upsertQuestionnaire } from "@/lib/data";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type QType = "nutrition" | "fitness";

export function QuestionnairesView() {
  const { t } = useI18n();
  const { profile } = useAuth();
  const [tab, setTab] = useState<QType>("nutrition");
  const [nutrition, setNutrition] = useState<any>(null);
  const [fitness, setFitness] = useState<any>(null);
  const [form, setForm] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!profile) return;
    (async () => {
      try {
        const [n, f] = await Promise.all([
          getQuestionnaire(profile.id, "nutrition"),
          getQuestionnaire(profile.id, "fitness"),
        ]);
        setNutrition(n);
        setFitness(f);
        const current = tab === "nutrition" ? n : f;
        setForm((current?.data as Record<string, string>) ?? {});
      } finally {
        setLoading(false);
      }
    })();
  }, [profile]);

  const switchTab = async (newTab: QType) => {
    setTab(newTab);
    const current = newTab === "nutrition" ? nutrition : fitness;
    setForm((current?.data as Record<string, string>) ?? {});
  };

  const current = tab === "nutrition" ? nutrition : fitness;
  const status = current?.status as "draft" | "submitted" | "approved" | "needs_info" | undefined;
  const locked = status === "submitted" || status === "approved";

  const save = async (newStatus: "draft" | "submitted") => {
    if (!profile) return;
    setSaving(true);
    try {
      const row = await upsertQuestionnaire(profile.id, tab, form, newStatus);
      if (tab === "nutrition") setNutrition(row);
      else setFitness(row);
      toast.success(newStatus === "submitted" ? t("q.submitted") : t("q.saved"));
    } catch (e: any) {
      toast.error(e.message || t("common.error"));
    } finally {
      setSaving(false);
    }
  };

  const nutritionFields = [
    { key: "age", label: t("q.n.age"), type: "number" },
    { key: "height", label: t("q.n.height"), type: "number" },
    { key: "weight", label: t("q.n.weight"), type: "number" },
    { key: "target_weight", label: t("q.n.target"), type: "number" },
    { key: "waist", label: t("q.n.waist"), type: "number" },
    { key: "neck", label: t("q.n.neck"), type: "number" },
    { key: "diet", label: t("q.n.diet"), placeholder: t("q.n.diet.ph") },
    { key: "allergies", label: t("q.n.allergies") },
    { key: "disliked", label: t("q.n.disliked") },
    { key: "meals", label: t("q.n.meals"), type: "number" },
    { key: "water", label: t("q.n.water"), type: "number" },
    { key: "medical", label: t("q.n.medical") },
    { key: "supplements", label: t("q.n.supplements") },
  ];

  const fitnessFields = [
    { key: "goal", label: t("q.f.goal"), placeholder: t("q.f.goal.ph") },
    { key: "activity", label: t("q.f.activity") },
    { key: "days", label: t("q.f.days"), type: "number" },
    { key: "location", label: t("q.f.location"), placeholder: t("q.f.location.ph") },
    { key: "experience", label: t("q.f.experience") },
    { key: "injuries", label: t("q.f.injuries") },
    { key: "preferred", label: t("q.f.preferred") },
    { key: "equipment", label: t("q.f.equipment") },
    { key: "sleep", label: t("q.f.sleep"), type: "number" },
  ];

  const fields = tab === "nutrition" ? nutritionFields : fitnessFields;

  if (loading) return <div className="text-muted-foreground">{t("common.loading")}</div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold md:text-3xl">{t("q.title")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("q.subtitle")}</p>
      </div>

      <div className="inline-flex rounded-full border border-border bg-card p-1">
        <button
          onClick={() => switchTab("nutrition")}
          className={cn(
            "flex items-center gap-2 rounded-full px-5 py-2 text-sm font-semibold transition-all",
            tab === "nutrition" ? "bg-gradient-primary text-primary-foreground shadow-glow" : "text-muted-foreground",
          )}
        >
          <Salad className="h-4 w-4" />
          {t("q.nutrition")}
        </button>
        <button
          onClick={() => switchTab("fitness")}
          className={cn(
            "flex items-center gap-2 rounded-full px-5 py-2 text-sm font-semibold transition-all",
            tab === "fitness" ? "bg-gradient-primary text-primary-foreground shadow-glow" : "text-muted-foreground",
          )}
        >
          <Dumbbell className="h-4 w-4" />
          {t("q.fitness")}
        </button>
      </div>

      {status && (
        <div className="flex items-center gap-2">
          <Badge variant="outline" className={cn(
            status === "approved" && "border-success text-success",
            status === "submitted" && "border-primary text-primary",
            status === "needs_info" && "border-warning text-warning",
          )}>
            {t(`q.status.${status}`)}
          </Badge>
          {locked && (
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <Lock className="h-3 w-3" /> {t("q.lockedNotice")}
            </span>
          )}
          {status === "needs_info" && (
            <span className="flex items-center gap-1 text-xs text-warning">
              <AlertCircle className="h-3 w-3" /> {t("q.needsInfoNotice")}
            </span>
          )}
        </div>
      )}

      <Card className="p-6 shadow-card">
        <div className="grid gap-4 sm:grid-cols-2">
          {fields.map((f) => (
            <div key={f.key} className={f.key === "notes" ? "sm:col-span-2" : ""}>
              <Label htmlFor={f.key}>{f.label}</Label>
              <Input
                id={f.key}
                type={f.type || "text"}
                disabled={locked}
                value={form[f.key] ?? ""}
                placeholder={f.placeholder}
                onChange={(e) => setForm((prev) => ({ ...prev, [f.key]: e.target.value }))}
                className="mt-1.5"
              />
            </div>
          ))}
          <div className="sm:col-span-2">
            <Label htmlFor="notes">{t("q.n.notes")}</Label>
            <Textarea
              id="notes"
              disabled={locked}
              value={form.notes ?? ""}
              onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
              className="mt-1.5 min-h-24"
            />
          </div>
        </div>

        {!locked && (
          <div className="mt-6 flex flex-wrap gap-3">
            <Button variant="secondary" onClick={() => save("draft")} disabled={saving}>
              {saving ? t("common.saving") : t("common.save")}
            </Button>
            <Button onClick={() => save("submitted")} disabled={saving} className="gap-2">
              {saving ? t("common.saving") : t("q.submit")}
              <Send className="h-4 w-4" />
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
}
