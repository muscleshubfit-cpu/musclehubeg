"use client";

import { useEffect, useState, useRef } from "react";
import { Salad, Dumbbell, Lock, AlertCircle, Send, ImagePlus, X, Loader2 } from "lucide-react";
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

const ACTIVITY_OPTIONS = [
 "sedentary",
 "light",
 "moderate",
 "active",
 "very_active",
 "extra_active",
] as const;

export function QuestionnairesView() {
 const { t } = useI18n();
 const { profile } = useAuth();
 const [tab, setTab] = useState<QType>("nutrition");
 const [nutrition, setNutrition] = useState<any>(null);
 const [fitness, setFitness] = useState<any>(null);
 const [form, setForm] = useState<Record<string, any>>({});
 const [loading, setLoading] = useState(true);
 const [saving, setSaving] = useState(false);
 const [uploadingPhoto, setUploadingPhoto] = useState(false);
 const fileInputRef = useRef<HTMLInputElement>(null);

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
 setForm((current?.data as Record<string, any>) ?? {});
 } finally {
 setLoading(false);
 }
 })();
 }, [profile]);

 const switchTab = async (newTab: QType) => {
 setTab(newTab);
 const current = newTab === "nutrition" ? nutrition : fitness;
 setForm((current?.data as Record<string, any>) ?? {});
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

 // Photo upload — uploads to Supabase Storage (or data-URL fallback in demo
 // mode) and stores the URL in form.photos[].
 const handlePhotoUpload = async (file: File) => {
 if (!profile) return;
 if ((form.photos?.length || 0) >= 3) {
 toast.error("بحد أقصى 3 صور.");
 return;
 }
 if (file.size > 5 * 1024 * 1024) {
 toast.error("الصورة كبيرة جداً (الحد 5 ميجا).");
 return;
 }
 setUploadingPhoto(true);
 try {
 // Try uploading to /api/upload (Supabase Storage). If that fails (e.g.
 // demo mode without Supabase), fall back to a base64 data URL.
 const formData = new FormData();
 formData.append("file", file);
 formData.append("bucket", "questionnaire-photos");
 formData.append("path", `${profile.id}/${Date.now()}-${file.name}`);

 let url: string | null = null;
 try {
 const res = await fetch("/api/upload", {
 method: "POST",
 body: formData,
 });
 if (res.ok) {
 const data = await res.json();
 url = data.url;
 }
 } catch {
 // fall through to data URL
 }

 if (!url) {
 // Fallback: base64 data URL (works in demo mode, but large photos
 // will bloat the questionnaire JSON)
 url = await new Promise<string>((resolve, reject) => {
 const reader = new FileReader();
 reader.onload = () => resolve(reader.result as string);
 reader.onerror = reject;
 reader.readAsDataURL(file);
 });
 }

 setForm((prev) => ({
 ...prev,
 photos: [...(prev.photos || []), url],
 }));
 toast.success("تم رفع الصورة!");
 } catch (e: any) {
 toast.error(e.message || "فشل رفع الصورة");
 } finally {
 setUploadingPhoto(false);
 if (fileInputRef.current) fileInputRef.current.value = "";
 }
 };

 const removePhoto = (idx: number) => {
 setForm((prev) => ({
 ...prev,
 photos: (prev.photos || []).filter((_: any, i: number) => i !== idx),
 }));
 };

 // ---- Field definitions ----
 // Field types: "text" | "number" | "select" | "gender" | "photos"
 const nutritionFields = [
 { key: "gender", label: t("q.n.gender"), type: "gender" as const },
 { key: "age", label: t("q.n.age"), type: "number" as const },
 { key: "height", label: t("q.n.height"), type: "number" as const },
 { key: "weight", label: t("q.n.weight"), type: "number" as const },
 { key: "target_weight", label: t("q.n.target"), type: "number" as const },
 { key: "waist", label: t("q.n.waist"), type: "number" as const },
 { key: "neck", label: t("q.n.neck"), type: "number" as const },
 { key: "hip", label: t("q.n.hip"), type: "number" as const },
 { key: "diet", label: t("q.n.diet"), placeholder: t("q.n.diet.ph"), type: "text" as const },
 { key: "allergies", label: t("q.n.allergies"), type: "text" as const },
 { key: "disliked", label: t("q.n.disliked"), type: "text" as const },
 { key: "meals", label: t("q.n.meals"), type: "number" as const },
 { key: "water", label: t("q.n.water"), type: "number" as const },
 { key: "medical", label: t("q.n.medical"), type: "text" as const },
 { key: "supplements", label: t("q.n.supplements"), type: "text" as const },
 ];

 const fitnessFields = [
 { key: "goal", label: t("q.f.goal"), placeholder: t("q.f.goal.ph"), type: "text" as const },
 { key: "activity", label: t("q.f.activity"), type: "select" as const, options: ACTIVITY_OPTIONS, optionPrefix: "q.f.activity." as const },
 { key: "days", label: t("q.f.days"), type: "number" as const },
 { key: "location", label: t("q.f.location"), placeholder: t("q.f.location.ph"), type: "text" as const },
 { key: "experience", label: t("q.f.experience"), type: "text" as const },
 { key: "injuries", label: t("q.f.injuries"), type: "text" as const },
 { key: "preferred", label: t("q.f.preferred"), type: "text" as const },
 { key: "equipment", label: t("q.f.equipment"), type: "text" as const },
 { key: "sleep", label: t("q.f.sleep"), type: "number" as const },
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
 {fields.map((f) => {
 if (f.type === "gender") {
 return (
 <div key={f.key}>
 <Label htmlFor={f.key}>{f.label}</Label>
 <div className="mt-1.5 grid grid-cols-2 gap-2">
 <button
 type="button"
 disabled={locked}
 onClick={() => setForm((prev) => ({ ...prev, [f.key]: "male" }))}
 className={cn(
 "rounded-xl border p-3 text-sm font-medium transition-colors",
 form[f.key] === "male"
 ? "border-primary bg-secondary text-primary"
 : "border-border hover:border-primary/40",
 locked && "opacity-60 cursor-not-allowed",
 )}
 >
 {t("q.n.gender.male")}
 </button>
 <button
 type="button"
 disabled={locked}
 onClick={() => setForm((prev) => ({ ...prev, [f.key]: "female" }))}
 className={cn(
 "rounded-xl border p-3 text-sm font-medium transition-colors",
 form[f.key] === "female"
 ? "border-primary bg-secondary text-primary"
 : "border-border hover:border-primary/40",
 locked && "opacity-60 cursor-not-allowed",
 )}
 >
 {t("q.n.gender.female")}
 </button>
 </div>
 </div>
 );
 }
 if (f.type === "select" && f.options) {
 return (
 <div key={f.key} className="sm:col-span-2">
 <Label htmlFor={f.key}>{f.label}</Label>
 <select
 id={f.key}
 disabled={locked}
 value={form[f.key] ?? ""}
 onChange={(e) => setForm((prev) => ({ ...prev, [f.key]: e.target.value }))}
 className="mt-1.5 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm"
 >
 <option value="">{f.placeholder || t("q.f.activity.ph")}</option>
 {f.options.map((opt) => (
 <option key={opt} value={opt}>
 {t(`${f.optionPrefix}${opt}`)}
 </option>
 ))}
 </select>
 </div>
 );
 }
 return (
 <div key={f.key}>
 <Label htmlFor={f.key}>{f.label}</Label>
 <Input
 id={f.key}
 type={f.type === "number" ? "number" : "text"}
 disabled={locked}
 value={form[f.key] ?? ""}
 placeholder={f.placeholder}
 onChange={(e) => setForm((prev) => ({ ...prev, [f.key]: e.target.value }))}
 className="mt-1.5"
 />
 </div>
 );
 })}
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

 {/* Photo upload — only in nutrition questionnaire */}
 {tab === "nutrition" && (
 <div className="mt-6 rounded-xl border border-border bg-muted/30 p-4">
 <div className="flex items-center justify-between gap-2">
 <div>
 <Label className="text-sm font-semibold"> {t("q.n.photos")}</Label>
 <p className="mt-0.5 text-xs text-muted-foreground">{t("q.n.photos.hint")}</p>
 </div>
 <Button
 type="button"
 variant="outline"
 size="sm"
 className="gap-1.5"
 disabled={locked || uploadingPhoto || (form.photos?.length || 0) >= 3}
 onClick={() => fileInputRef.current?.click()}
 >
 {uploadingPhoto ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
 {t("q.n.photos.upload")}
 </Button>
 <input
 ref={fileInputRef}
 type="file"
 accept="image/*"
 className="hidden"
 onChange={(e) => {
 const f = e.target.files?.[0];
 if (f) handlePhotoUpload(f);
 }}
 />
 </div>
 {form.photos?.length > 0 && (
 <div className="mt-3 grid grid-cols-3 gap-2">
 {form.photos.map((url: string, i: number) => (
 <div key={i} className="group relative aspect-square overflow-hidden rounded-lg border border-border">
 <img src={url} alt={`Progress ${i + 1}`} className="h-full w-full object-cover" />
 {!locked && (
 <button
 type="button"
 onClick={() => removePhoto(i)}
 className="absolute end-1 top-1 grid h-6 w-6 place-items-center rounded-full bg-background/80 text-destructive opacity-0 transition-opacity group-hover:opacity-100"
 >
 <X className="h-3.5 w-3.5" />
 </button>
 )}
 </div>
 ))}
 </div>
 )}
 </div>
 )}

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
