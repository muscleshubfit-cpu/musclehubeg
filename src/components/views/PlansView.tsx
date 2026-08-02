"use client";

import { useEffect, useState } from "react";
import { Salad, Dumbbell, FileText, Download } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/hooks/use-auth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { listPlans } from "@/lib/data";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export function PlansView() {
  const { t } = useI18n();
  const { profile } = useAuth();
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState<any | null>(null);

  useEffect(() => {
    if (!profile) return;
    (async () => {
      const data = await listPlans(profile.id);
      setPlans(data);
      setLoading(false);
    })();
  }, [profile]);

  if (loading) return <div className="text-muted-foreground">{t("common.loading")}</div>;

  const meal = plans.filter((p) => p.type === "meal");
  const workout = plans.filter((p) => p.type === "workout");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold md:text-3xl">{t("plans.title")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("plans.subtitle")}</p>
      </div>

      <section>
        <div className="mb-3 flex items-center gap-2">
          <Salad className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">{t("plans.meal")}</h2>
          <Badge variant="secondary">{meal.length}</Badge>
        </div>
        {meal.length === 0 ? (
          <EmptyCard text={t("plans.empty")} />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {meal.map((p) => (
              <PlanCard key={p.id} plan={p} onClick={() => setActive(p)} />
            ))}
          </div>
        )}
      </section>

      <section>
        <div className="mb-3 flex items-center gap-2">
          <Dumbbell className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">{t("plans.workout")}</h2>
          <Badge variant="secondary">{workout.length}</Badge>
        </div>
        {workout.length === 0 ? (
          <EmptyCard text={t("plans.empty")} />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {workout.map((p) => (
              <PlanCard key={p.id} plan={p} onClick={() => setActive(p)} />
            ))}
          </div>
        )}
      </section>

      <Dialog open={!!active} onOpenChange={(o) => !o && setActive(null)}>
        <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto scrollbar-thin">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {active?.type === "meal" ? <Salad className="h-5 w-5 text-primary" /> : <Dumbbell className="h-5 w-5 text-primary" />}
              {active?.title}
            </DialogTitle>
          </DialogHeader>
          {active && <PlanContent plan={active} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function EmptyCard({ text }: { text: string }) {
  return (
    <Card className="border-dashed p-8 text-center text-sm text-muted-foreground">
      {text}
    </Card>
  );
}

function PlanCard({ plan, onClick }: { plan: any; onClick: () => void }) {
  const { t } = useI18n();
  return (
    <Card className="group cursor-pointer p-5 shadow-card transition-all hover:shadow-glow" onClick={onClick}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate font-semibold">{plan.title}</h3>
          <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{plan.notes || "—"}</p>
        </div>
        <Button size="sm" variant="ghost" className="shrink-0 opacity-0 transition-opacity group-hover:opacity-100">
          {t("plans.view")}
        </Button>
      </div>
      {plan.file_url && (
        <div className="mt-3 flex items-center gap-1 text-xs text-primary">
          <FileText className="h-3 w-3" />
          <a href={plan.file_url} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} className="hover:underline">
            {t("common.download")}
          </a>
        </div>
      )}
    </Card>
  );
}

function PlanContent({ plan }: { plan: any }) {
  const { t } = useI18n();
  const content = plan.content;

  if (plan.type === "meal" && content) {
    return (
      <div className="space-y-4">
        {content.calories && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat label={t("plan.calories")} value={content.calories} />
            <Stat label={t("plan.protein")} value={`${content.macros?.protein}g`} />
            <Stat label={t("plan.carbs")} value={`${content.macros?.carbs}g`} />
            <Stat label={t("plan.fat")} value={`${content.macros?.fat}g`} />
          </div>
        )}
        {content.meals && (
          <div>
            <h4 className="mb-2 text-sm font-semibold text-muted-foreground">{t("plan.meal")}</h4>
            <div className="overflow-hidden rounded-xl border border-border">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="p-3 text-start font-medium">{t("plan.meal")}</th>
                    <th className="p-3 text-start font-medium">{t("plan.food")}</th>
                    <th className="p-3 text-start font-medium">{t("plan.amount")}</th>
                  </tr>
                </thead>
                <tbody>
                  {content.meals.map((m: any, i: number) => (
                    <tr key={i} className="border-t border-border/60">
                      <td className="p-3 font-medium">{m.name}</td>
                      <td className="p-3">{m.food}</td>
                      <td className="p-3 text-muted-foreground">{m.amount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
        {plan.notes && (
          <div className="rounded-xl bg-muted/40 p-3 text-sm text-muted-foreground">{plan.notes}</div>
        )}
      </div>
    );
  }

  if (plan.type === "workout" && content?.days) {
    return (
      <div className="space-y-4">
        {content.days.map((d: any, i: number) => (
          <div key={i} className="rounded-xl border border-border">
            <div className="flex items-center justify-between border-b border-border bg-muted/40 px-4 py-2">
              <span className="font-semibold">{d.day}</span>
              <Badge variant="secondary">{d.focus}</Badge>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-start">
                    <th className="p-3 text-start font-medium text-muted-foreground">{t("plan.exercise")}</th>
                    <th className="p-3 text-start font-medium text-muted-foreground">{t("plan.sets")}</th>
                    <th className="p-3 text-start font-medium text-muted-foreground">{t("plan.reps")}</th>
                    <th className="p-3 text-start font-medium text-muted-foreground">{t("plan.rest")}</th>
                  </tr>
                </thead>
                <tbody>
                  {d.exercises.map((ex: any, j: number) => (
                    <tr key={j} className="border-t border-border/60">
                      <td className="p-3 font-medium">{ex.exercise}</td>
                      <td className="p-3">{ex.sets}</td>
                      <td className="p-3">{ex.reps}</td>
                      <td className="p-3 text-muted-foreground">{ex.rest}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}
        {plan.notes && (
          <div className="rounded-xl bg-muted/40 p-3 text-sm text-muted-foreground">{plan.notes}</div>
        )}
      </div>
    );
  }

  return (
    <div className="text-sm text-muted-foreground">
      {plan.notes || "—"}
      {plan.file_url && (
        <a href={plan.file_url} target="_blank" rel="noreferrer" className="mt-3 flex items-center gap-1 text-primary hover:underline">
          <Download className="h-4 w-4" /> {t("common.download")}
        </a>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: any }) {
  return (
    <div className="rounded-xl border border-border bg-card p-3 text-center">
      <div className="font-display text-lg font-bold text-gradient">{value}</div>
      <div className="mt-0.5 text-xs text-muted-foreground">{label}</div>
    </div>
  );
}
