"use client";

import { useEffect, useState } from "react";
import { Plus, TrendingDown, TrendingUp } from "lucide-react";
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
import { useAuth } from "@/hooks/use-auth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { listProgress, addProgress } from "@/lib/data";
import { toast } from "sonner";

export function ProgressView() {
  const { t, lang } = useI18n();
  const { profile } = useAuth();
  const [entries, setEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<Record<string, string>>({});

  const load = async () => {
    if (!profile) return;
    setLoading(true);
    const data = await listProgress(profile.id);
    setEntries(data);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, [profile]);

  const submit = async () => {
    if (!profile) return;
    setSaving(true);
    try {
      const entry: any = { client_id: profile.id };
      for (const k of ["weight", "waist", "chest", "hips", "arm", "neck", "energy", "adherence"]) {
        if (form[k]) entry[k] = Number(form[k]);
      }
      if (form.notes) entry.notes = form.notes;
      await addProgress(entry);
      await load();
      setForm({});
      setOpen(false);
      toast.success(t("prog.entrySaved"));
    } catch (e: any) {
      toast.error(e.message || t("common.error"));
    } finally {
      setSaving(false);
    }
  };

  const chartData = entries
    .filter((e) => e.weight != null)
    .map((e) => ({
      date: new Date(e.created_at).toLocaleDateString(lang === "ar" ? "ar-EG" : "en-US", { month: "short", day: "numeric" }),
      weight: e.weight,
    }));

  const latest = entries[entries.length - 1];
  const first = entries[0];
  const change = latest?.weight && first?.weight ? Number(latest.weight) - Number(first.weight) : null;

  if (loading) return <div className="text-muted-foreground">{t("common.loading")}</div>;

  const fields = [
    { key: "weight", label: t("prog.weight") },
    { key: "waist", label: t("prog.waist") },
    { key: "chest", label: t("prog.chest") },
    { key: "hips", label: t("prog.hips") },
    { key: "arm", label: t("prog.arm") },
    { key: "neck", label: t("prog.neck") },
    { key: "energy", label: t("prog.energy") },
    { key: "adherence", label: t("prog.adherence") },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold md:text-3xl">{t("prog.title")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t("prog.subtitle")}</p>
        </div>
        <Button className="gap-2" onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4" />
          {t("prog.addEntry")}
        </Button>
      </div>

      {/* Chart */}
      <Card className="p-6 shadow-card">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">{t("prog.weightChart")}</h2>
          {change !== null && change !== 0 && (
            <Badge variant="outline" className={change < 0 ? "border-success text-success" : "border-warning text-warning"}>
              {change < 0 ? <TrendingDown className="me-1 h-3 w-3" /> : <TrendingUp className="me-1 h-3 w-3" />}
              {Math.abs(change).toFixed(1)} {t("common.kg")}
            </Badge>
          )}
        </div>
        <div className="mt-4 h-64">
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="weightGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#1F8FFF" stopOpacity={0.5} />
                    <stop offset="100%" stopColor="#1F8FFF" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis dataKey="date" tick={{ fontSize: 12, fill: "#475569" }} />
                <YAxis tick={{ fontSize: 12, fill: "#475569" }} domain={["auto", "auto"]} />
                <Tooltip
                  contentStyle={{
                    borderRadius: 12,
                    border: "1px solid #E2E8F0",
                    boxShadow: "0 10px 30px -16px rgba(15,23,42,0.2)",
                  }}
                />
                <Area type="monotone" dataKey="weight" stroke="#1F8FFF" strokeWidth={2.5} fill="url(#weightGradient)" />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
              {t("prog.noEntries")}
            </div>
          )}
        </div>
      </Card>

      {/* History */}
      <Card className="p-6 shadow-card">
        <h2 className="text-lg font-semibold">{t("prog.history")}</h2>
        {entries.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">{t("prog.noEntries")}</p>
        ) : (
          <div className="mt-4 max-h-96 overflow-y-auto scrollbar-thin">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-card">
                <tr className="border-b border-border text-start">
                  <th className="p-2 text-start font-medium text-muted-foreground">{t("common.date")}</th>
                  <th className="p-2 text-start font-medium text-muted-foreground">{t("prog.weight")}</th>
                  <th className="p-2 text-start font-medium text-muted-foreground">{t("prog.waist")}</th>
                  <th className="p-2 text-start font-medium text-muted-foreground">{t("prog.energy")}</th>
                  <th className="p-2 text-start font-medium text-muted-foreground">{t("common.notes")}</th>
                </tr>
              </thead>
              <tbody>
                {[...entries].reverse().map((e) => (
                  <tr key={e.id} className="border-b border-border/60">
                    <td className="p-2">{new Date(e.created_at).toLocaleDateString()}</td>
                    <td className="p-2">{e.weight ?? "—"}</td>
                    <td className="p-2">{e.waist ?? "—"}</td>
                    <td className="p-2">{e.energy ?? "—"}</td>
                    <td className="p-2 max-w-32 truncate text-muted-foreground">{e.notes || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{t("prog.newEntry")}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 sm:grid-cols-2">
            {fields.map((f) => (
              <div key={f.key}>
                <Label htmlFor={f.key}>{f.label}</Label>
                <Input
                  id={f.key}
                  type="number"
                  value={form[f.key] ?? ""}
                  onChange={(e) => setForm((p) => ({ ...p, [f.key]: e.target.value }))}
                  className="mt-1.5"
                />
              </div>
            ))}
            <div className="sm:col-span-2">
              <Label htmlFor="notes">{t("prog.notes")}</Label>
              <Textarea
                id="notes"
                value={form.notes ?? ""}
                onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
                className="mt-1.5"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setOpen(false)}>{t("common.cancel")}</Button>
            <Button onClick={submit} disabled={saving}>
              {saving ? t("common.saving") : t("common.save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
