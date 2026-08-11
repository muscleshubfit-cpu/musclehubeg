"use client";

import { useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
 TrendingDown,
 TrendingUp,
 Minus,
 Activity,
 Heart,
 Scale,
 Percent,
 Ruler,
 Zap,
 Target,
 Droplet,
} from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Health Metrics Dashboard — Apple Health-style overview of the client's
 * key health indicators, with baseline + current + progress indicators.
 *
 * Inputs:
 * - progress: progress_entries[] (sorted by created_at asc — oldest first)
 * - questionnaire: nutrition questionnaire data (gender, height, weight, neck, waist, hip)
 *
 * Calculates:
 * - BMI (body mass index)
 * - Body fat % (US Navy formula — different for male/female)
 * - Lean body mass
 * - Weight progress (baseline → current → delta)
 * - Body fat progress
 * - Measurements progress (waist, chest, hips, arm, neck)
 * - Health score (composite 0-100)
 * - Adherence + energy trends
 *
 * All metrics show:
 * - Baseline value (first entry)
 * - Current value (latest entry)
 * - Delta (with up/down arrow — green if improved, red if worsened)
 * - Progress bar (baseline → target → current)
 */

type ProgressEntry = {
 id: string;
 weight?: number | null;
 waist?: number | null;
 chest?: number | null;
 hips?: number | null;
 arm?: number | null;
 neck?: number | null;
 energy?: number | null;
 adherence?: number | null;
 notes?: string | null;
 created_at: string;
};

type QuestionnaireData = {
 gender?: string;
 height?: string | number;
 weight?: string | number;
 age?: string | number;
 neck?: string | number;
 waist?: string | number;
 hip?: string | number;
 target_weight?: string | number;
 target?: string | number;
};

export function HealthMetricsDashboard({
 progress,
 questionnaire,
}: {
 progress: ProgressEntry[];
 questionnaire?: QuestionnaireData | null;
}) {
 const data = useMemo(() => computeMetrics(progress, questionnaire), [progress, questionnaire]);

 if (progress.length === 0 && !questionnaire) {
 return (
 <Card className="p-6 text-center text-sm text-muted-foreground">
 <Activity className="mx-auto h-8 w-8 opacity-50" />
 <p className="mt-2">لا توجد بيانات كافية لعرض المؤشرات الصحية. ابدأ بإضافة قياسات للعميل.</p>
 </Card>
 );
 }

 return (
 <div className="space-y-4">
 {/* Header — Health Score */}
 <Card className="overflow-hidden border-primary/30 bg-gradient-to-br from-primary/10 to-card p-5 shadow-card">
 <div className="flex items-center justify-between gap-4">
 <div>
 <div className="flex items-center gap-2">
 <Heart className="h-5 w-5 text-primary" />
 <h3 className="font-display text-lg font-bold">المؤشرات الصحية</h3>
 </div>
 <p className="mt-0.5 text-xs text-muted-foreground">
 مؤشر شامل لتتبع تقدم العميل — يحسب من الوزن، نسبة الدهون، الالتزام، والطاقة
 </p>
 </div>
 {/* Health Score Ring */}
 <div className="relative grid h-20 w-20 shrink-0 place-items-center">
 <svg className="absolute inset-0 -rotate-90" viewBox="0 0 80 80">
 <circle cx="40" cy="40" r="34" fill="none" stroke="currentColor" strokeWidth="6" className="text-muted/30" />
 <circle
 cx="40"
 cy="40"
 r="34"
 fill="none"
 stroke="currentColor"
 strokeWidth="6"
 strokeLinecap="round"
 className={cn(
 data.healthScore >= 70 ? "text-success" : data.healthScore >= 40 ? "text-warning" : "text-destructive",
 )}
 style={{ strokeDasharray: `${(data.healthScore / 100) * 213.6} 213.6` }}
 />
 </svg>
 <div className="text-center">
 <div className={cn("font-display text-xl font-bold", data.healthScore >= 70 ? "text-success" : data.healthScore >= 40 ? "text-warning" : "text-destructive")}>
 {data.healthScore}
 </div>
 <div className="text-[9px] text-muted-foreground">/ 100</div>
 </div>
 </div>
 </div>
 </Card>

 {/* Key metrics grid */}
 <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
 <MetricCard
 icon={<Scale className="h-4 w-4" />}
 label="الوزن"
 baseline={data.baseline.weight}
 current={data.current.weight}
 delta={data.delta.weight}
 unit="كجم"
 lowerIsBetter={data.targetDirection === "loss"}
 progress={data.weightProgress}
 />
 <MetricCard
 icon={<Percent className="h-4 w-4" />}
 label="نسبة الدهون"
 baseline={data.baseline.bodyFat}
 current={data.current.bodyFat}
 delta={data.delta.bodyFat}
 unit="%"
 lowerIsBetter={true}
 progress={data.bodyFatProgress}
 />
 <MetricCard
 icon={<Activity className="h-4 w-4" />}
 label="BMI"
 baseline={data.baseline.bmi}
 current={data.current.bmi}
 delta={data.delta.bmi}
 unit=""
 lowerIsBetter={data.targetDirection === "loss"}
 progress={data.bmiProgress}
 status={data.bmiStatus}
 />
 <MetricCard
 icon={<Target className="h-4 w-4" />}
 label="الكتلة العضلية"
 baseline={data.baseline.leanMass}
 current={data.current.leanMass}
 delta={data.delta.leanMass}
 unit="كجم"
 lowerIsBetter={false}
 progress={data.leanMassProgress}
 />
 </div>

 {/* Measurements row */}
 <Card className="p-4 shadow-card">
 <h4 className="mb-3 flex items-center gap-2 text-sm font-bold">
 <Ruler className="h-4 w-4 text-primary" />
 المقاسات (سم)
 </h4>
 <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
 <MeasurementCard label="الخصر" baseline={data.baseline.waist} current={data.current.waist} delta={data.delta.waist} lowerIsBetter={true} />
 <MeasurementCard label="الصدر" baseline={data.baseline.chest} current={data.current.chest} delta={data.delta.chest} lowerIsBetter={false} />
 <MeasurementCard label="الورك" baseline={data.baseline.hips} current={data.current.hips} delta={data.delta.hips} lowerIsBetter={true} />
 <MeasurementCard label="الذراع" baseline={data.baseline.arm} current={data.current.arm} delta={data.delta.arm} lowerIsBetter={false} />
 <MeasurementCard label="الرقبة" baseline={data.baseline.neck} current={data.current.neck} delta={data.delta.neck} lowerIsBetter={false} />
 </div>
 </Card>

 {/* Energy + Adherence */}
 <div className="grid gap-3 sm:grid-cols-2">
 <MetricCard
 icon={<Zap className="h-4 w-4" />}
 label="مستوى الطاقة"
 baseline={data.baseline.energy}
 current={data.current.energy}
 delta={data.delta.energy}
 unit="/10"
 lowerIsBetter={false}
 progress={data.energyProgress}
 />
 <MetricCard
 icon={<Target className="h-4 w-4" />}
 label="الالتزام بالنظام"
 baseline={data.baseline.adherence}
 current={data.current.adherence}
 delta={data.delta.adherence}
 unit="/10"
 lowerIsBetter={false}
 progress={data.adherenceProgress}
 />
 </div>

 {/* Water target */}
 {data.waterTarget && (
 <Card className="flex items-center gap-3 p-4 shadow-card">
 <Droplet className="h-5 w-5 text-primary" />
 <div>
 <span className="text-sm font-bold">هدف الماء اليومي: </span>
 <span className="text-sm text-muted-foreground">{data.waterTarget}</span>
 </div>
 </Card>
 )}

 {/* Baseline summary */}
 <Card className="p-4 shadow-card">
 <h4 className="mb-3 text-sm font-bold"> نقطة البداية vs الحالي</h4>
 <div className="grid gap-3 sm:grid-cols-3">
 <div className="rounded-lg border border-border bg-muted/30 p-3 text-center">
 <div className="text-xs text-muted-foreground">البداية</div>
 <div className="mt-1 font-display text-lg font-bold">
 {data.baseline.weight ? `${data.baseline.weight} كجم` : "—"}
 </div>
 <div className="text-[10px] text-muted-foreground">
 {data.baseline.date ? new Date(data.baseline.date).toLocaleDateString("ar-EG", { day: "numeric", month: "short" }) : ""}
 </div>
 </div>
 <div className="rounded-lg border border-border bg-muted/30 p-3 text-center">
 <div className="text-xs text-muted-foreground">الحالي</div>
 <div className="mt-1 font-display text-lg font-bold">
 {data.current.weight ? `${data.current.weight} كجم` : "—"}
 </div>
 <div className="text-[10px] text-muted-foreground">
 {data.current.date ? new Date(data.current.date).toLocaleDateString("ar-EG", { day: "numeric", month: "short" }) : ""}
 </div>
 </div>
 <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 text-center">
 <div className="text-xs text-muted-foreground">إجمالي التغير</div>
 <div className={cn(
 "mt-1 font-display text-lg font-bold flex items-center justify-center gap-1",
 data.delta.weight === null ? "text-muted-foreground" :
 (data.delta.weight < 0 ? "text-success" : data.delta.weight > 0 ? "text-warning" : "text-muted-foreground"),
 )}>
 {data.delta.weight === null ? "—" : (
 <>
 {data.delta.weight > 0 ? "+" : ""}{data.delta.weight} كجم
 {data.delta.weight < 0 ? <TrendingDown className="h-4 w-4" /> : data.delta.weight > 0 ? <TrendingUp className="h-4 w-4" /> : <Minus className="h-4 w-4" />}
 </>
 )}
 </div>
 <div className="text-[10px] text-muted-foreground">
 {data.delta.weight !== null && data.baseline.weight ? `${Math.abs(Math.round((data.delta.weight / data.baseline.weight) * 100))}% من البداية` : ""}
 </div>
 </div>
 </div>
 </Card>
 </div>
 );
}

/* ----------------------------- Metric Card ----------------------------- */

function MetricCard({
 icon,
 label,
 baseline,
 current,
 delta,
 unit,
 lowerIsBetter,
 progress,
 status,
}: {
 icon: React.ReactNode;
 label: string;
 baseline: number | null;
 current: number | null;
 delta: number | null;
 unit: string;
 lowerIsBetter: boolean;
 progress?: number; // 0-100
 status?: { label: string; color: string };
}) {
 const improved = delta !== null && delta !== 0
 ? lowerIsBetter ? delta < 0 : delta > 0
 : null;

 return (
 <Card className="p-4 shadow-card">
 <div className="flex items-center justify-between">
 <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
 {icon}
 {label}
 </span>
 {status && (
 <Badge variant="outline" className={cn("text-[10px]", status.color)}>
 {status.label}
 </Badge>
 )}
 </div>
 <div className="mt-2 flex items-baseline gap-1.5">
 <span className="font-display text-2xl font-bold">
 {current !== null ? current : "—"}
 </span>
 {unit && <span className="text-xs text-muted-foreground">{unit}</span>}
 </div>
 {/* Delta indicator */}
 {delta !== null && delta !== 0 && (
 <div className={cn(
 "mt-1 flex items-center gap-1 text-xs font-medium",
 improved === true ? "text-success" : improved === false ? "text-destructive" : "text-muted-foreground",
 )}>
 {improved === true ? <TrendingDown className="h-3 w-3" /> : <TrendingUp className="h-3 w-3" />}
 {delta > 0 ? "+" : ""}{Math.abs(delta).toFixed(1)}{unit}
 <span className="text-muted-foreground">من {baseline ?? "—"}</span>
 </div>
 )}
 {/* Progress bar */}
 {progress !== undefined && progress > 0 && (
 <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
 <div
 className={cn(
 "h-full transition-all",
 improved === true ? "bg-success" : improved === false ? "bg-destructive" : "bg-primary",
 )}
 style={{ width: `${Math.min(100, progress)}%` }}
 />
 </div>
 )}
 </Card>
 );
}

function MeasurementCard({
 label,
 baseline,
 current,
 delta,
 lowerIsBetter,
}: {
 label: string;
 baseline: number | null;
 current: number | null;
 delta: number | null;
 lowerIsBetter: boolean;
}) {
 const improved = delta !== null && delta !== 0
 ? lowerIsBetter ? delta < 0 : delta > 0
 : null;
 return (
 <div className="rounded-lg border border-border bg-background p-3 text-center">
 <div className="text-xs text-muted-foreground">{label}</div>
 <div className="mt-1 font-display text-lg font-bold">
 {current !== null ? current : "—"}
 </div>
 {delta !== null && delta !== 0 && (
 <div className={cn(
 "mt-0.5 flex items-center justify-center gap-0.5 text-[10px] font-medium",
 improved === true ? "text-success" : improved === false ? "text-destructive" : "text-muted-foreground",
 )}>
 {improved === true ? <TrendingDown className="h-2.5 w-2.5" /> : <TrendingUp className="h-2.5 w-2.5" />}
 {delta > 0 ? "+" : ""}{Math.abs(delta).toFixed(1)}
 </div>
 )}
 </div>
 );
}

/* ----------------------------- Calculations ----------------------------- */

type Metrics = {
 baseline: {
 weight: number | null;
 bodyFat: number | null;
 bmi: number | null;
 leanMass: number | null;
 waist: number | null;
 chest: number | null;
 hips: number | null;
 arm: number | null;
 neck: number | null;
 energy: number | null;
 adherence: number | null;
 date: string | null;
 };
 current: {
 weight: number | null;
 bodyFat: number | null;
 bmi: number | null;
 leanMass: number | null;
 waist: number | null;
 chest: number | null;
 hips: number | null;
 arm: number | null;
 neck: number | null;
 energy: number | null;
 adherence: number | null;
 date: string | null;
 };
 delta: {
 weight: number | null;
 bodyFat: number | null;
 bmi: number | null;
 leanMass: number | null;
 waist: number | null;
 chest: number | null;
 hips: number | null;
 arm: number | null;
 neck: number | null;
 energy: number | null;
 adherence: number | null;
 };
 healthScore: number; // 0-100
 targetDirection: "loss" | "gain" | "maintain";
 weightProgress: number;
 bodyFatProgress: number;
 bmiProgress: number;
 leanMassProgress: number;
 energyProgress: number;
 adherenceProgress: number;
 bmiStatus?: { label: string; color: string };
 waterTarget: string | null;
};

function computeMetrics(progress: ProgressEntry[], q?: QuestionnaireData | null): Metrics {
 // Sort progress by date ascending (oldest first)
 const sorted = [...progress].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
 const first = sorted[0];
 const last = sorted[sorted.length - 1];

 // Helper to safely get a number from questionnaire or progress entry
 const num = (v: any): number | null => {
 if (v === null || v === undefined || v === "") return null;
 const n = typeof v === "number" ? v : parseFloat(v);
 return isNaN(n) ? null : n;
 };

 // Get height (from questionnaire — doesn't change)
 const height = num(q?.height); // cm
 const heightM = height ? height / 100 : null;
 const gender = (q?.gender || "male").toLowerCase();
 const isFemale = gender === "female" || gender === "أنثى" || gender === "انثى";

 // Get neck/waist/hip from questionnaire as fallback for first entry
 const qNeck = num(q?.neck);
 const qWaist = num(q?.waist);
 const qHip = num(q?.hip);
 const qWeight = num(q?.weight);

 // Baseline values (first progress entry, falling back to questionnaire)
 const baselineWeight = num(first?.weight) ?? qWeight;
 const baselineWaist = num(first?.waist) ?? qWaist;
 const baselineNeck = num(first?.neck) ?? qNeck;
 const baselineHip = num(first?.hips) ?? qHip;
 const baselineChest = num(first?.chest);
 const baselineArm = num(first?.arm);
 const baselineEnergy = num(first?.energy);
 const baselineAdherence = num(first?.adherence);
 const baselineDate = first?.created_at || null;

 // Current values (last progress entry)
 const currentWeight = num(last?.weight) ?? baselineWeight;
 const currentWaist = num(last?.waist) ?? baselineWaist;
 const currentNeck = num(last?.neck) ?? baselineNeck;
 const currentHip = num(last?.hips) ?? baselineHip;
 const currentChest = num(last?.chest) ?? baselineChest;
 const currentArm = num(last?.arm) ?? baselineArm;
 const currentEnergy = num(last?.energy) ?? baselineEnergy;
 const currentAdherence = num(last?.adherence) ?? baselineAdherence;
 const currentDate = last?.created_at || baselineDate;

 // Calculate body fat % (US Navy formula)
 const calcBodyFat = (weight: number | null, waist: number | null, neck: number | null, hip: number | null): number | null => {
 if (!waist || !neck || !height) return null;
 try {
 let bf: number;
 if (isFemale) {
 if (!hip) return null;
 // US Navy female: 163.205 * log10(waist + hip - neck) - 97.684 * log10(height) - 78.387
 bf = 163.205 * Math.log10(waist + hip - neck) - 97.684 * Math.log10(height) - 78.387;
 } else {
 // US Navy male: 86.010 * log10(waist - neck) - 70.041 * log10(height) + 36.76
 if (waist <= neck) return null;
 bf = 86.010 * Math.log10(waist - neck) - 70.041 * Math.log10(height) + 36.76;
 }
 return Math.max(5, Math.min(60, Math.round(bf * 10) / 10)); // clamp 5-60%
 } catch {
 return null;
 }
 };

 const baselineBodyFat = calcBodyFat(baselineWeight, baselineWaist, baselineNeck, baselineHip);
 const currentBodyFat = calcBodyFat(currentWeight, currentWaist, currentNeck, currentHip);

 // Calculate BMI
 const calcBMI = (weight: number | null): number | null => {
 if (!weight || !heightM) return null;
 return Math.round((weight / (heightM * heightM)) * 10) / 10;
 };
 const baselineBMI = calcBMI(baselineWeight);
 const currentBMI = calcBMI(currentWeight);

 // Calculate lean mass
 const calcLeanMass = (weight: number | null, bodyFat: number | null): number | null => {
 if (!weight || bodyFat === null) return null;
 return Math.round((weight * (1 - bodyFat / 100)) * 10) / 10;
 };
 const baselineLeanMass = calcLeanMass(baselineWeight, baselineBodyFat);
 const currentLeanMass = calcLeanMass(currentWeight, currentBodyFat);

 // Deltas
 const delta = (a: number | null, b: number | null): number | null => {
 if (a === null || b === null) return null;
 return Math.round((b - a) * 10) / 10;
 };

 // Target direction — from questionnaire target weight
 const targetWeight = num(q?.target_weight ?? q?.target);
 let targetDirection: "loss" | "gain" | "maintain" = "maintain";
 if (targetWeight && baselineWeight) {
 if (targetWeight < baselineWeight - 2) targetDirection = "loss";
 else if (targetWeight > baselineWeight + 2) targetDirection = "gain";
 } else if (baselineWeight && currentWeight) {
 // Infer from the trend
 if (currentWeight < baselineWeight - 1) targetDirection = "loss";
 else if (currentWeight > baselineWeight + 1) targetDirection = "gain";
 }

 // BMI status
 let bmiStatus: { label: string; color: string } | undefined;
 if (currentBMI !== null) {
 if (currentBMI < 18.5) bmiStatus = { label: "نحافة", color: "border-warning text-warning" };
 else if (currentBMI < 25) bmiStatus = { label: "طبيعي", color: "border-success text-success" };
 else if (currentBMI < 30) bmiStatus = { label: "زيادة وزن", color: "border-warning text-warning" };
 else bmiStatus = { label: "سمنة", color: "border-destructive text-destructive" };
 }

 // Health score (0-100) — composite of:
 // - Adherence (40%)
 // - Energy (20%)
 // - Progress toward goal (40%)
 let healthScore = 50; // neutral start
 if (currentAdherence !== null) healthScore = (healthScore + currentAdherence * 4) / 2;
 if (currentEnergy !== null) healthScore = (healthScore + currentEnergy * 2 + 30) / 2;
 // Progress bonus
 if (targetDirection === "loss" && delta(baselineWeight, currentWeight) !== null) {
 const w = delta(baselineWeight, currentWeight)!;
 if (w < 0) healthScore = Math.min(100, healthScore + Math.abs(w) * 5);
 else healthScore = Math.max(0, healthScore - Math.abs(w) * 3);
 } else if (targetDirection === "gain" && delta(baselineWeight, currentWeight) !== null) {
 const w = delta(baselineWeight, currentWeight)!;
 if (w > 0) healthScore = Math.min(100, healthScore + w * 5);
 else healthScore = Math.max(0, healthScore - Math.abs(w) * 3);
 }
 healthScore = Math.round(Math.max(0, Math.min(100, healthScore)));

 // Progress percentages (toward target)
 const calcProgress = (baseline: number | null, current: number | null, target: number | null, lowerIsBetter: boolean): number => {
 if (baseline === null || current === null || target === null) return 0;
 const totalChange = Math.abs(target - baseline);
 if (totalChange === 0) return 100;
 const currentChange = Math.abs(current - baseline);
 const pct = (currentChange / totalChange) * 100;
 // Check if moving in the right direction
 const movingRight = lowerIsBetter
 ? (current < baseline && target < baseline)
 : (current > baseline && target > baseline);
 return movingRight ? Math.min(100, pct) : 0;
 };

 const weightProgress = calcProgress(baselineWeight, currentWeight, targetWeight, targetDirection === "loss");

 return {
 baseline: {
 weight: baselineWeight,
 bodyFat: baselineBodyFat,
 bmi: baselineBMI,
 leanMass: baselineLeanMass,
 waist: baselineWaist,
 chest: baselineChest,
 hips: baselineHip,
 arm: baselineArm,
 neck: baselineNeck,
 energy: baselineEnergy,
 adherence: baselineAdherence,
 date: baselineDate,
 },
 current: {
 weight: currentWeight,
 bodyFat: currentBodyFat,
 bmi: currentBMI,
 leanMass: currentLeanMass,
 waist: currentWaist,
 chest: currentChest,
 hips: currentHip,
 arm: currentArm,
 neck: currentNeck,
 energy: currentEnergy,
 adherence: currentAdherence,
 date: currentDate,
 },
 delta: {
 weight: delta(baselineWeight, currentWeight),
 bodyFat: delta(baselineBodyFat, currentBodyFat),
 bmi: delta(baselineBMI, currentBMI),
 leanMass: delta(baselineLeanMass, currentLeanMass),
 waist: delta(baselineWaist, currentWaist),
 chest: delta(baselineChest, currentChest),
 hips: delta(baselineHip, currentHip),
 arm: delta(baselineArm, currentArm),
 neck: delta(baselineNeck, currentNeck),
 energy: delta(baselineEnergy, currentEnergy),
 adherence: delta(baselineAdherence, currentAdherence),
 },
 healthScore,
 targetDirection,
 weightProgress,
 bodyFatProgress: calcProgress(baselineBodyFat, currentBodyFat, baselineBodyFat ? baselineBodyFat - 5 : null, true),
 bmiProgress: calcProgress(baselineBMI, currentBMI, baselineBMI ? (targetDirection === "loss" ? baselineBMI - 2 : baselineBMI + 2) : null, targetDirection === "loss"),
 leanMassProgress: calcProgress(baselineLeanMass, currentLeanMass, baselineLeanMass ? baselineLeanMass + 2 : null, false),
 energyProgress: calcProgress(baselineEnergy, currentEnergy, baselineEnergy ? Math.min(10, baselineEnergy + 2) : null, false),
 adherenceProgress: calcProgress(baselineAdherence, currentAdherence, baselineAdherence ? Math.min(10, baselineAdherence + 2) : null, false),
 bmiStatus,
 waterTarget: null, // set by the parent if available
 };
}
