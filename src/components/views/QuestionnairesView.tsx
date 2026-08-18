"use client";

import { useEffect, useState, useRef } from "react";
import { Salad, Dumbbell, Lock, Send, ImagePlus, X, Loader2, Check, ChevronLeft, ChevronRight } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/hooks/use-auth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { getQuestionnaire, upsertQuestionnaire } from "@/lib/data";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type QType = "nutrition" | "fitness";
type Step = 1 | 2 | 3; // 1 = nutrition, 2 = fitness, 3 = review

const ACTIVITY_OPTIONS = [
  "sedentary",
  "light",
  "moderate",
  "active",
  "very_active",
  "extra_active",
] as const;

export function QuestionnairesView() {
  const { t, lang } = useI18n();
  const isAr = lang === "ar";
  const { profile } = useAuth();
  const [step, setStep] = useState<Step>(1);
  const [nutrition, setNutrition] = useState<any>(null);
  const [fitness, setFitness] = useState<any>(null);
  const [nutritionForm, setNutritionForm] = useState<Record<string, any>>({});
  const [fitnessForm, setFitnessForm] = useState<Record<string, any>>({});
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
        setNutritionForm((n?.data as Record<string, any>) ?? {});
        setFitnessForm((f?.data as Record<string, any>) ?? {});
        // Auto-detect starting step: go to first incomplete, or review if both have data
        const nHas = n?.data && Object.keys(n.data as object).length > 0;
        const fHas = f?.data && Object.keys(f.data as object).length > 0;
        if (nHas && fHas) {
          setStep(3); // Both have data — show review
        } else if (nHas) {
          setStep(2); // Nutrition done — go to fitness
        } else {
          setStep(1);
        }
      } finally {
        setLoading(false);
      }
    })();
  }, [profile]);

  // Editing always available — clients can update at any time and re-submit
  const nutritionStatus = nutrition?.status as "draft" | "submitted" | "approved" | "needs_info" | undefined;
  const fitnessStatus = fitness?.status as "draft" | "submitted" | "approved" | "needs_info" | undefined;
  const nutritionLocked = false;
  const fitnessLocked = false;

  const saveQuestionnaire = async (type: QType, newStatus: "draft" | "submitted") => {
    if (!profile) return;
    setSaving(true);
    try {
      const formData = type === "nutrition" ? nutritionForm : fitnessForm;
      const row = await upsertQuestionnaire(profile.id, type, formData, newStatus);
      if (type === "nutrition") setNutrition(row);
      else setFitness(row);
      return row;
    } catch (e: any) {
      toast.error(e.message || t("common.error"));
      return null;
    } finally {
      setSaving(false);
    }
  };

  // Navigate between steps with validation & auto-save
  const goToStep = async (target: Step) => {
    // Going from nutrition (step 1) → fitness (step 2)
    if (target === 2) {
      if (!nutritionLocked && !validateNutrition()) {
        toast.error(t("q.fillBasicInfo"));
        return;
      }
      if (!nutritionLocked) {
        const row = await saveQuestionnaire("nutrition", "draft");
        if (!row) return;
      }
    }
    // Going from fitness (step 2) → review (step 3)
    if (target === 3) {
      if (!fitnessLocked && !validateFitness()) {
        toast.error(t("q.fillFitnessBasic"));
        return;
      }
      if (!fitnessLocked) {
        const row = await saveQuestionnaire("fitness", "draft");
        if (!row) return;
      }
    }
    setStep(target);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Submit both questionnaires (final submission)
  const submitAll = async () => {
    setSaving(true);
    try {
      if (!validateNutrition() || !validateFitness()) {
        toast.error(t("q.fillBasicInfo"));
        return;
      }
      // Submit both in parallel — notification is fire-and-forget inside upsert
      const [nRow, fRow] = await Promise.all([
        upsertQuestionnaire(profile!.id, "nutrition", nutritionForm, "submitted"),
        upsertQuestionnaire(profile!.id, "fitness", fitnessForm, "submitted"),
      ]);
      if (nRow) setNutrition(nRow);
      if (fRow) setFitness(fRow);
      toast.success(t("q.allSubmitted"));
      setStep(1);
    } catch (e: any) {
      console.error("[submitAll] Error:", e);
      toast.error(e.message || t("common.error"));
    } finally {
      setSaving(false);
    }
  };

  // Photo upload
  const handlePhotoUpload = async (file: File) => {
    if (!profile) return;
    if ((nutritionForm.photos?.length || 0) >= 3) {
      toast.error(isAr ? "بحد أقصى 3 صور." : "Max 3 photos.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error(isAr ? "الصورة كبيرة جداً (الحد 5 ميجا)." : "Image too large (max 5MB).");
      return;
    }
    setUploadingPhoto(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("bucket", "questionnaire-photos");
      formData.append("path", `${profile.id}/${Date.now()}-${file.name}`);

      let url: string | null = null;
      try {
        const res = await fetch("/api/upload", { method: "POST", body: formData });
        if (res.ok) {
          const data = await res.json();
          url = data.url;
        }
      } catch {
        // fall through to data URL
      }

      if (!url) {
        url = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
      }

      setNutritionForm((prev) => ({
        ...prev,
        photos: [...(prev.photos || []), url],
      }));
      toast.success(isAr ? "تم رفع الصورة!" : "Photo uploaded!");
    } catch (e: any) {
      toast.error(e.message || (isAr ? "فشل رفع الصورة" : "Upload failed"));
    } finally {
      setUploadingPhoto(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const removePhoto = (idx: number) => {
    setNutritionForm((prev) => ({
      ...prev,
      photos: (prev.photos || []).filter((_: any, i: number) => i !== idx),
    }));
  };

  // ---- Field definitions ----
  // required: true = must fill before "Next" / "Submit"
  // required: false = optional (measurements, photos, notes)
  const nutritionFields = [
    { key: "gender", label: t("q.n.gender"), type: "gender" as const, required: true },
    { key: "age", label: t("q.n.age"), type: "number" as const, required: true },
    { key: "height", label: t("q.n.height"), type: "number" as const, required: true },
    { key: "weight", label: t("q.n.weight"), type: "number" as const, required: true },
    { key: "target_weight", label: t("q.n.target"), type: "number" as const, required: true },
    { key: "waist", label: t("q.n.waist"), type: "number" as const, required: false },
    { key: "neck", label: t("q.n.neck"), type: "number" as const, required: false },
    { key: "hip", label: t("q.n.hip"), type: "number" as const, required: false },
    { key: "diet", label: t("q.n.diet"), placeholder: t("q.n.diet.ph"), type: "text" as const, required: false },
    { key: "allergies", label: t("q.n.allergies"), type: "text" as const, required: false },
    { key: "disliked", label: t("q.n.disliked"), type: "text" as const, required: false },
    { key: "meals", label: t("q.n.meals"), type: "number" as const, required: false },
    { key: "water", label: t("q.n.water"), type: "number" as const, required: false },
    { key: "medical", label: t("q.n.medical"), type: "text" as const, required: false },
    { key: "supplements", label: t("q.n.supplements"), type: "text" as const, required: false },
  ];

  const fitnessFields = [
    { key: "goal", label: t("q.f.goal"), placeholder: t("q.f.goal.ph"), type: "text" as const, required: true },
    { key: "activity", label: t("q.f.activity"), type: "select" as const, options: ACTIVITY_OPTIONS, optionPrefix: "q.f.activity." as const, required: true },
    { key: "days", label: t("q.f.days"), type: "number" as const, required: true },
    { key: "location", label: t("q.f.location"), placeholder: t("q.f.location.ph"), type: "text" as const, required: false },
    { key: "experience", label: t("q.f.experience"), type: "text" as const, required: false },
    { key: "injuries", label: t("q.f.injuries"), type: "text" as const, required: false },
    { key: "preferred", label: t("q.f.preferred"), type: "text" as const, required: false },
    { key: "equipment", label: t("q.f.equipment"), type: "text" as const, required: false },
    { key: "sleep", label: t("q.f.sleep"), type: "number" as const, required: false },
  ];

  // Validation: check required fields are filled
  const validateNutrition = (): boolean => {
    if (!nutritionForm.gender) return false;
    if (!nutritionForm.age) return false;
    if (!nutritionForm.height) return false;
    if (!nutritionForm.weight) return false;
    if (!nutritionForm.target_weight) return false;
    return true;
  };

  const validateFitness = (): boolean => {
    if (!fitnessForm.goal) return false;
    if (!fitnessForm.activity) return false;
    if (!fitnessForm.days) return false;
    return true;
  };

  const renderField = (
    f: typeof nutritionFields[number] | typeof fitnessFields[number],
    form: Record<string, any>,
    setForm: (updater: (prev: Record<string, any>) => Record<string, any>) => void,
    locked: boolean,
  ) => {
    // Label with required/optional badge
    const fieldLabel = (
      <div className="flex items-center gap-2">
        <Label htmlFor={f.key}>{f.label}</Label>
        {f.required ? (
          <span className="rounded-full bg-[#ff3b30]/10 px-1.5 py-0.5 text-[10px] font-medium text-[#ff3b30]">
            {t("q.required")}
          </span>
        ) : (
          <span className="rounded-full bg-[#6e6e73]/10 px-1.5 py-0.5 text-[10px] font-medium text-[#6e6e73]">
            {t("q.optional")}
          </span>
        )}
      </div>
    );

    if (f.type === "gender") {
      return (
        <div key={f.key}>
          {fieldLabel}
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
          {fieldLabel}
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
        {fieldLabel}
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
  };

  if (loading) return <div className="text-muted-foreground">{t("common.loading")}</div>;

  // If both are locked, show a "both submitted" state
  const bothLocked = nutritionLocked && fitnessLocked;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">{t("q.title")}</h1>
        <p className="mt-2 text-base font-normal text-[#6e6e73] md:text-lg">{t("q.subtitle")}</p>
      </div>

      {/* Stepper */}
      <div className="flex items-center justify-center gap-2 sm:gap-4">
          {[
            { num: 1, label: t("q.step1"), icon: Salad },
            { num: 2, label: t("q.step2"), icon: Dumbbell },
            { num: 3, label: isAr ? "مراجعة" : "Review", icon: Check },
          ].map((s, i) => {
            const isActive = step === s.num;
            const isDone = step > s.num;
            const Icon = s.icon;
            return (
              <div key={s.num} className="flex items-center gap-2 sm:gap-4">
                <button
                  onClick={() => (isDone || isActive) && setStep(s.num as Step)}
                  disabled={!isDone && !isActive}
                  className={cn(
                    "flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-medium transition-all sm:px-4 sm:py-2",
                    isActive && "bg-[#0071e3] text-white",
                    isDone && "bg-[#34c759]/10 text-[#34c759] cursor-pointer hover:bg-[#34c759]/20",
                    !isActive && !isDone && "bg-[#f5f5f7] text-[#6e6e73]",
                  )}
                >
                  <span className={cn(
                    "grid h-6 w-6 place-items-center rounded-full text-xs font-semibold",
                    isActive && "bg-white/20",
                    isDone && "bg-[#34c759] text-white",
                    !isActive && !isDone && "bg-white text-[#6e6e73]",
                  )}>
                    {isDone ? <Check className="h-3.5 w-3.5" /> : s.num}
                  </span>
                  <span className="hidden sm:inline">{s.label}</span>
                  <Icon className="h-4 w-4 sm:hidden" />
                </button>
                {i < 2 && (
                  <div className={cn(
                    "h-px w-6 sm:w-12",
                    step > s.num ? "bg-[#34c759]" : "bg-[#d2d2d7]",
                  )} />
                )}
              </div>
            );
          })}
        </div>      

      {/* Status badges */}
      {(nutritionStatus || fitnessStatus) && (
        <div className="flex flex-wrap items-center gap-3">
          {nutritionStatus && (
            <span className={cn(
              "rounded-full px-3 py-1 text-xs font-normal",
              nutritionStatus === "approved" && "bg-[#0071e3]/10 text-[#0071e3]",
              nutritionStatus === "submitted" && "bg-[#0071e3]/10 text-[#0071e3]",
              nutritionStatus === "needs_info" && "bg-[#ff9500]/10 text-[#ff9500]",
              nutritionStatus === "draft" && "bg-[#6e6e73]/10 text-[#6e6e73]",
            )}>
              {isAr ? "التغذية: " : "Nutrition: "}{t(`q.status.${nutritionStatus}`)}
            </span>
          )}
          {fitnessStatus && (
            <span className={cn(
              "rounded-full px-3 py-1 text-xs font-normal",
              fitnessStatus === "approved" && "bg-[#0071e3]/10 text-[#0071e3]",
              fitnessStatus === "submitted" && "bg-[#0071e3]/10 text-[#0071e3]",
              fitnessStatus === "needs_info" && "bg-[#ff9500]/10 text-[#ff9500]",
              fitnessStatus === "draft" && "bg-[#6e6e73]/10 text-[#6e6e73]",
            )}>
              {isAr ? "اللياقة: " : "Fitness: "}{t(`q.status.${fitnessStatus}`)}
            </span>
          )}
          {bothLocked && (
            <span className="text-xs font-normal text-[#6e6e73]">{t("q.lockedNotice")}</span>
          )}
          {(nutritionStatus === "needs_info" || fitnessStatus === "needs_info") && (
            <span className="text-xs font-normal text-[#ff9500]">{t("q.needsInfoNotice")}</span>
          )}
        </div>
      )}

      {/* Step 1: Nutrition */}
      {step === 1 && (
        <div className="rounded-3xl bg-[#f5f5f7] p-6 md:p-8">
          <div className="mb-6 flex items-center gap-3">
            <span className="grid h-12 w-12 place-items-center rounded-2xl bg-[#34c759]/10 text-[#34c759]">
              <Salad className="h-6 w-6" />
            </span>
            <div>
              <h2 className="text-xl font-semibold tracking-tight">{t("q.step1")}</h2>
              <p className="text-sm font-normal text-[#6e6e73]">{t("q.step1.desc")}</p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {nutritionFields.map((f) => renderField(f, nutritionForm, setNutritionForm, nutritionLocked))}
            <div className="sm:col-span-2">
              <Label htmlFor="notes">{t("q.n.notes")}</Label>
              <Textarea
                id="notes"
                disabled={nutritionLocked}
                value={nutritionForm.notes ?? ""}
                onChange={(e) => setNutritionForm((prev) => ({ ...prev, notes: e.target.value }))}
                className="mt-1.5 min-h-24"
              />
            </div>
          </div>

          {/* Photo upload */}
          <div className="mt-6 rounded-xl border border-border bg-muted/30 p-4">
            <div className="flex items-center justify-between gap-2">
              <div>
                <Label className="text-sm font-semibold">{t("q.n.photos")}</Label>
                <p className="mt-0.5 text-xs text-muted-foreground">{t("q.n.photos.hint")}</p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-1.5"
                disabled={nutritionLocked || uploadingPhoto || (nutritionForm.photos?.length || 0) >= 3}
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
            {nutritionForm.photos?.length > 0 && (
              <div className="mt-3 grid grid-cols-3 gap-2">
                {nutritionForm.photos.map((url: string, i: number) => (
                  <div key={i} className="group relative aspect-square overflow-hidden rounded-lg border border-border">
                    <img src={url} alt={`Progress ${i + 1}`} className="h-full w-full object-cover" />
                    {!nutritionLocked && (
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

          {/* Navigation: Next */}
          <div className="mt-6 flex flex-wrap gap-3">
            <button
              onClick={() => goToStep(2)}
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-full bg-[#0071e3] px-5 py-2.5 text-sm font-normal text-white transition-opacity hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? t("common.saving") : t("q.next")}
              {isAr ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Fitness */}
      {step === 2 && (
        <div className="rounded-3xl bg-[#f5f5f7] p-6 md:p-8">
          <div className="mb-6 flex items-center gap-3">
            <span className="grid h-12 w-12 place-items-center rounded-2xl bg-[#0071e3]/10 text-[#0071e3]">
              <Dumbbell className="h-6 w-6" />
            </span>
            <div>
              <h2 className="text-xl font-semibold tracking-tight">{t("q.step2")}</h2>
              <p className="text-sm font-normal text-[#6e6e73]">{t("q.step2.desc")}</p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {fitnessFields.map((f) => renderField(f, fitnessForm, setFitnessForm, fitnessLocked))}
            <div className="sm:col-span-2">
              <Label htmlFor="f-notes">{t("q.f.notes")}</Label>
              <Textarea
                id="f-notes"
                disabled={fitnessLocked}
                value={fitnessForm.notes ?? ""}
                onChange={(e) => setFitnessForm((prev) => ({ ...prev, notes: e.target.value }))}
                className="mt-1.5 min-h-24"
              />
            </div>
          </div>

          {/* Navigation: Back + Next */}
          <div className="mt-6 flex flex-wrap gap-3">
            <button
              onClick={() => goToStep(1)}
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-normal text-[#1d1d1f] border border-[#d2d2d7] transition-opacity hover:opacity-90"
            >
              {isAr ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
              {t("q.back")}
            </button>
            <button
              onClick={() => goToStep(3)}
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-full bg-[#0071e3] px-5 py-2.5 text-sm font-normal text-white transition-opacity hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? t("common.saving") : t("q.next")}
              {isAr ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Review */}
      {step === 3 && (
        <div className="space-y-4">
          <div className="rounded-3xl bg-[#f5f5f7] p-6 md:p-8">
            <div className="mb-6 text-center">
              <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-[#0071e3]/10 text-[#0071e3]">
                <Check className="h-7 w-7" />
              </span>
              <h2 className="mt-4 text-2xl font-semibold tracking-tight">{t("q.reviewTitle")}</h2>
              <p className="mt-1 text-sm font-normal text-[#6e6e73]">{t("q.reviewDesc")}</p>
            </div>

            {/* Nutrition summary */}
            <div className="rounded-2xl bg-white p-5">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="flex items-center gap-2 text-base font-semibold">
                  <Salad className="h-4 w-4 text-[#34c759]" />
                  {t("q.step1")}
                </h3>
                <button
                  onClick={() => setStep(1)}
                  className="text-xs font-normal text-[#0071e3] hover:underline"
                >
                  {isAr ? "تعديل" : "Edit"}
                </button>
              </div>
              <div className="grid gap-2 text-sm">
                {nutritionFields
                  .filter((f) => nutritionForm[f.key])
                  .map((f) => (
                    <div key={f.key} className="flex justify-between gap-4">
                      <span className="text-[#6e6e73]">{f.label}</span>
                      <span className="font-medium text-end" dir="auto">
                        {f.type === "gender"
                          ? t(`q.n.gender.${nutritionForm[f.key]}`)
                          : nutritionForm[f.key]}
                      </span>
                    </div>
                  ))}
                {nutritionForm.notes && (
                  <div className="flex justify-between gap-4">
                    <span className="text-[#6e6e73]">{t("q.n.notes")}</span>
                    <span className="max-w-[60%] text-end font-medium" dir="auto">
                      {nutritionForm.notes}
                    </span>
                  </div>
                )}
                {nutritionForm.photos?.length > 0 && (
                  <div className="flex justify-between gap-4">
                    <span className="text-[#6e6e73]">{t("q.n.photos")}</span>
                    <span className="font-medium">
                      {nutritionForm.photos.length} {isAr ? "صور" : "photos"}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Fitness summary */}
            <div className="mt-4 rounded-2xl bg-white p-5">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="flex items-center gap-2 text-base font-semibold">
                  <Dumbbell className="h-4 w-4 text-[#0071e3]" />
                  {t("q.step2")}
                </h3>
                <button
                  onClick={() => setStep(2)}
                  className="text-xs font-normal text-[#0071e3] hover:underline"
                >
                  {isAr ? "تعديل" : "Edit"}
                </button>
              </div>
              <div className="grid gap-2 text-sm">
                {fitnessFields
                  .filter((f) => fitnessForm[f.key])
                  .map((f) => (
                    <div key={f.key} className="flex justify-between gap-4">
                      <span className="text-[#6e6e73]">{f.label}</span>
                      <span className="font-medium text-end" dir="auto">
                        {f.type === "select" && f.optionPrefix
                          ? t(`${f.optionPrefix}${fitnessForm[f.key]}`)
                          : fitnessForm[f.key]}
                      </span>
                    </div>
                  ))}
                {fitnessForm.notes && (
                  <div className="flex justify-between gap-4">
                    <span className="text-[#6e6e73]">{t("q.f.notes")}</span>
                    <span className="max-w-[60%] text-end font-medium" dir="auto">
                      {fitnessForm.notes}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Navigation: Back + Submit (only if not both locked) */}
            <div className="mt-6 flex flex-wrap gap-3">
              <button
                onClick={() => goToStep(2)}
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-normal text-[#1d1d1f] border border-[#d2d2d7] transition-opacity hover:opacity-90"
              >
                {isAr ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
                {t("q.back")}
              </button>
              {!bothLocked && (
                <button
                  onClick={submitAll}
                  disabled={saving}
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-[#0071e3] px-5 py-2.5 text-sm font-normal text-white transition-opacity hover:opacity-90"
                >
                  {saving ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      {t("common.saving")}
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4" />
                      {t("q.submitAll")}
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
