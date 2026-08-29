"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Salad, Dumbbell, FileText, Download, Printer, RefreshCw, Loader2, Info } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/hooks/use-auth";
import { useNav } from "@/hooks/use-nav";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { listPlans, getPlanFileUrl, getSwapUsage } from "@/lib/data";
import { enqueueAiJobClient, getAiJob } from "@/lib/ai-jobs-client";
import { resolveExerciseImage, getExerciseImage, getExerciseImages, getFallbackSVG } from "@/lib/exercise-images";
import { EXERCISES } from "@/lib/exercises";
import { ImageWithFallback } from "@/components/ui/image-with-fallback";
import { toast } from "sonner";

// M53 fix: escape HTML to prevent XSS in print window
function escapeHtml(str: string | undefined | null): string {
 if (!str) return "";
 return String(str)
 .replace(/&/g, "&amp;")
 .replace(/</g, "&lt;")
 .replace(/>/g, "&gt;")
 .replace(/"/g, "&quot;")
 .replace(/'/g, "&#039;");
}

/* ── OWNER DIRECTIVE 2026-08-27: swaps execute on GitHub Actions ─────────
 * A click enqueues an ai_jobs row and returns instantly; a resilient
 * watcher (surviving page reloads via localStorage) applies the result
 * to local plan state as soon as the worker finishes.
 * ───────────────────────────────────────────────────────────────────── */
type PendingSwap = {
 id: string;
 planId: string;
 kind: "meal" | "exercise";
 i1: number; // meal index | day index
 i2?: number; // exercise index
 createdAt: number;
};
const AI_PENDING_KEY = "mhe:pending-swaps";
const AI_SWAP_TTL_MS = 24 * 60 * 60_000;

function readPendingSwaps(): PendingSwap[] {
 try {
 const raw = localStorage.getItem(AI_PENDING_KEY);
 const list = raw ? (JSON.parse(raw) as PendingSwap[]) : [];
 return Array.isArray(list) ? list.filter((e) => Date.now() - e.createdAt < AI_SWAP_TTL_MS) : [];
 } catch {
 return [];
 }
}

function writePendingSwaps(list: PendingSwap[]): void {
 try {
 localStorage.setItem(AI_PENDING_KEY, JSON.stringify(list.slice(-40)));
 } catch {
 /* storage full/blocked — watching still works in-session */
 }
}

export function PlansView() {
 const { t } = useI18n();
 const { profile } = useAuth();
 const [plans, setPlans] = useState<any[]>([]);
 const [loading, setLoading] = useState(true);
 const [active, setActive] = useState<any | null>(null);
 const [swapLoading, setSwapLoading] = useState<string | null>(null);
 const [swapUsage, setSwapUsage] = useState<any>({ meal: { used: 0, limit: 2, remaining: 2 }, exercise: { used: 0, limit: 2, remaining: 2 } });
 const activeWatchers = useRef<Set<string>>(new Set());

 const refreshUsage = useCallback(async () => {
 if (!profile) return;
 try {
 const u = await getSwapUsage(profile.id);
 setSwapUsage(u);
 } catch {
 /* keep last known usage */
 }
 }, [profile]);

 const removePendingSwap = useCallback((id: string) => {
 writePendingSwaps(readPendingSwaps().filter((e) => e.id !== id));
 }, []);

 /** Applies a finished job's replacement to local plan state. */
 const applySwapToPlans = useCallback(
 (entry: PendingSwap, replacement: any) => {
 const mutate = (content: any): any => {
 if (entry.kind === "meal") {
 const meals = [...(content.meals || [])];
 if (meals[entry.i1] !== undefined) meals[entry.i1] = replacement;
 return { ...content, meals };
 }
 const days = [...(content.days || [])];
 const day = { ...(days[entry.i1] || {}) };
 day.exercises = [...(day.exercises || [])];
 if (day.exercises[entry.i2!] !== undefined) day.exercises[entry.i2!] = replacement;
 days[entry.i1] = day;
 return { ...content, days };
 };
 setPlans((prev) => prev.map((p) => (p.id === entry.planId ? { ...p, content: mutate(p.content) } : p)));
 setActive((prevActive) =>
 prevActive && prevActive.id === entry.planId
 ? { ...prevActive, content: mutate(prevActive.content) }
 : prevActive,
 );
 },
 [],
 );

 /** Polls one job every 20s up to ~26 min, then applies/cleans. */
 const watchSwapJob = useCallback(
 async (entry: PendingSwap) => {
 if (activeWatchers.current.has(entry.id)) return;
 activeWatchers.current.add(entry.id);
 try {
 const deadline = Date.now() + 26 * 60_000;
 while (Date.now() < deadline) {
 await new Promise((r) => setTimeout(r, 20_000));
 let job: any = null;
 try {
 job = await getAiJob(entry.id);
 } catch {
 continue; // transient network error — keep waiting
 }
 if (job?.status === "done") {
 applySwapToPlans(entry, job.result?.replacement);
 removePendingSwap(entry.id);
 await refreshUsage();
 toast.success("تم استبدال العنصر من الذكاء الاصطناعي ✅");
 return;
 }
 if (job?.status === "failed") {
 removePendingSwap(entry.id);
 toast.error(job.error_message || "فشل الاستبدال.");
 return;
 }
 }
 removePendingSwap(entry.id);
 toast.error("انتهت مهلة انتظار الاستبدال — حاول مرة أخرى.");
 } finally {
 activeWatchers.current.delete(entry.id);
 }
 },
 [applySwapToPlans, removePendingSwap, refreshUsage],
 );

 // Resume watching swaps that were queued before a page reload.
 useEffect(() => {
 readPendingSwaps().forEach((entry) => void watchSwapJob(entry));
 }, [watchSwapJob]);

 useEffect(() => {
 if (!profile) return;
 (async () => {
 try {
 const [data, usage] = await Promise.all([
 listPlans(profile.id),
 getSwapUsage(profile.id),
 ]);
 setPlans(data);
 setSwapUsage(usage);
 } catch (e: any) {
 console.error("[PlansView] load failed:", e?.message);
 } finally {
 setLoading(false);
 }
 })();
 }, [profile]);

 if (loading) return <div className="text-muted-foreground">{t("common.loading")}</div>;

 const meal = plans.filter((p) => p.type === "meal");
 const workout = plans.filter((p) => p.type === "workout");

 const openFile = async (bucket: string, filePath: string) => {
 const url = await getPlanFileUrl(bucket, filePath);
 if (url) window.open(url, "_blank");
 };

 const swapMeal = async (planId: string, mealIndex: number) => {
 if (!profile) return;
 // Check remaining quota client-side first — the server enforces too.
 if (swapUsage.meal.remaining <= 0) {
 toast.error(`${t("plans.swaps.mealExhausted")} (${swapUsage.meal.limit}/${swapUsage.meal.limit})`);
 return;
 }
 setSwapLoading(`meal-${planId}-${mealIndex}`);
 try {
 const plan = plans.find((p) => p.id === planId);
 if (!plan?.content?.meals?.[mealIndex]) throw new Error("Meal not found");
 const mealItem = plan.content.meals[mealIndex];
 // OWNER DIRECTIVE 2026-08-27: generation runs on GitHub Actions — this
 // click only enqueues the job (tier limit is enforced server-side now).
 const jobId = await enqueueAiJobClient("meal_regenerate", {
 meal: mealItem,
 clientContext: { name: profile?.full_name },
 });
 const pendingEntry: PendingSwap = {
 id: jobId,
 planId,
 kind: "meal",
 i1: mealIndex,
 createdAt: Date.now(),
 };
 writePendingSwaps([...readPendingSwaps(), pendingEntry]);
 await refreshUsage(); // server recorded the swap at enqueue time
 void watchSwapJob(pendingEntry);
 toast.info("تم إرسال طلب الاستبدال 🚀 النتيجة هتتطبق تلقائيًا خلال ~10 دقائق حتى لو قفلت الصفحة.");
 } catch (e: any) {
 toast.error(e.message || t("common.error"));
 } finally {
 setSwapLoading(null);
 }
 };

 const swapExercise = async (planId: string, dayIndex: number, exIndex: number) => {
 if (!profile) return;
 if (swapUsage.exercise.remaining <= 0) {
 toast.error(`${t("plans.swaps.exerciseExhausted")} (${swapUsage.exercise.limit}/${swapUsage.exercise.limit})`);
 return;
 }
 setSwapLoading(`ex-${planId}-${dayIndex}-${exIndex}`);
 try {
 const plan = plans.find((p) => p.id === planId);
 if (!plan?.content?.days?.[dayIndex]?.exercises?.[exIndex]) throw new Error("Exercise not found");
 const exercise = plan.content.days[dayIndex].exercises[exIndex];
 const focus = plan.content.days[dayIndex].focus;
 // Library-filtered, injury-safe substitution on GitHub Actions.
 const jobId = await enqueueAiJobClient("exercise_regenerate", {
 exercise: { ...exercise, focus },
 clientContext: { name: profile?.full_name },
 });
 const pendingEntry: PendingSwap = {
 id: jobId,
 planId,
 kind: "exercise",
 i1: dayIndex,
 i2: exIndex,
 createdAt: Date.now(),
 };
 writePendingSwaps([...readPendingSwaps(), pendingEntry]);
 await refreshUsage();
 void watchSwapJob(pendingEntry);
 toast.info("تم إرسال طلب استبدال التمرين 🚀 البديل الآمن هيظهر خلال ~10 دقائق.");
 } catch (e: any) {
 toast.error(e.message || t("common.error"));
 } finally {
 setSwapLoading(null);
 }
 };

 const printPlan = (plan: any) => {
 const w = window.open("", "_blank", "width=820,height=1040");
 if (!w) return;
 const content = plan.content;
 const isWorkout = plan.type === "workout";
 let html = `<!doctype html><html dir="rtl" lang="ar"><head><meta charset="utf-8"><title>${plan.title}</title>
<link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800&display=swap" rel="stylesheet">
<style>
 *{box-sizing:border-box}
 body{font-family:'Cairo',sans-serif;padding:32px;color:#141414;margin:0;line-height:1.7}
 h1{font-size:24px;margin:0 0 6px;color:#1F8FFF}
 h2{font-size:18px;margin:20px 0 10px;border-bottom:2px solid #1F8FFF;padding-bottom:4px}
 h3{font-size:15px;margin:14px 0 6px}
 p{color:#333}
 table{width:100%;border-collapse:collapse;margin:8px 0 16px;font-size:13px}
 th,td{border:1px solid #e2e2e2;padding:8px 10px;text-align:right}
 th{background:#f4f9ff;color:#1F8FFF;font-weight:700}
 tr:nth-child(even){background:#fafafa}
 .brand{display:flex;align-items:center;gap:8px;margin-bottom:16px;border-bottom:3px solid #1F8FFF;padding-bottom:12px}
 .brand-logo{width:36px;height:36px;background:#1F8FFF;border-radius:8px;display:flex;align-items:center;justify-content:center;color:white;font-weight:800;font-size:14px}
 .brand-name{font-size:18px;font-weight:800;color:#1F8FFF}
 .brand-tag{font-size:11px;color:#666;margin-top:2px}
 .stats{display:flex;flex-wrap:wrap;gap:8px;margin:12px 0}
 .stat{background:#f0f7ff;padding:10px 18px;border-radius:10px;font-weight:700;text-align:center;min-width:80px}
 .stat-label{font-size:10px;color:#666;display:block;font-weight:400}
 .stat-value{font-size:18px;color:#1F8FFF}
 .analysis{background:#f9f9f9;border-radius:10px;padding:14px;margin:12px 0;font-size:12px}
 .analysis-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:6px}
 .analysis-item{padding:4px 0}
 .analysis-label{color:#666}
 .supplement{background:#fff;border:1px solid #e2e2e2;border-radius:8px;padding:10px;margin:6px 0;font-size:12px}
 .supplement-name{font-weight:700;color:#1F8FFF}
 .health-note{display:flex;gap:6px;margin:4px 0;font-size:12px}
 .health-note:before{content:"•";color:#1F8FFF}
 .meal-total{background:#f0f7ff;font-weight:700}
 .meal-total td{border-top:2px solid #1F8FFF}
 .rest-day{background:#fff3cd;text-align:center;padding:20px;font-style:italic;color:#856404}
 .footer{margin-top:30px;border-top:1px solid #e2e2e2;padding-top:12px;font-size:11px;color:#999;text-align:center}
 @media print{body{padding:20px}}
</style></head><body>
<div class="brand">
 <div class="brand-logo">MH</div>
 <div>
 <div class="brand-name">Musclehubeg</div>
 <div class="brand-tag">كوتش أونلاين للتغذية واللياقة | musclehubeg.vercel.app</div>
 </div>
</div>
<h1>${escapeHtml(plan.title)}</h1>`;
 if (content) {
 if (content.overview) html += `<p style="white-space:pre-line">${escapeHtml(content.overview)}</p>`;

 if (!isWorkout) {
 // Data analysis
 if (content.data_analysis) {
 const da = content.data_analysis;
 html += `<h2> تحليل البيانات</h2><div class="analysis"><div class="analysis-grid">`;
 const fields = [
 ["الجنس", da.gender], ["الوزن", da.weight], ["الطول", da.height],
 ["العمر", da.age], ["الرقبة", da.neck], ["الخصر", da.waist],
 ["الورك", da.hip], ["النشاط", da.activity], ["الصحة", da.health],
 ["نسبة الدهون", da.body_fat_pct],
 ];
 for (const [label, val] of fields) {
 if (val) html += `<div class="analysis-item"><span class="analysis-label">${label}:</span> ${val}</div>`;
 }
 if (da.bmr) html += `<div class="analysis-item"><span class="analysis-label">BMR:</span> ~${da.bmr} سعرة</div>`;
 if (da.tdee) html += `<div class="analysis-item"><span class="analysis-label">TDEE:</span> ~${da.tdee} سعرة</div>`;
 html += `</div></div>`;
 }

 // Macros
 if (content.daily_calories || content.macros) {
 html += `<h2> السعرات والماكروز</h2><div class="stats">`;
 if (content.daily_calories) html += `<div class="stat"><span class="stat-label">السعرات اليومية</span><span class="stat-value">${content.daily_calories}</span></div>`;
 if (content.macros?.protein_g) html += `<div class="stat"><span class="stat-label">بروتين</span><span class="stat-value">${content.macros.protein_g}جم</span></div>`;
 if (content.macros?.carbs_g) html += `<div class="stat"><span class="stat-label">كارب</span><span class="stat-value">${content.macros.carbs_g}جم</span></div>`;
 if (content.macros?.fat_g) html += `<div class="stat"><span class="stat-label">دهون</span><span class="stat-value">${content.macros.fat_g}جم</span></div>`;
 html += `</div>`;
 }

 // Supplements
 if (content.supplements?.length > 0) {
 html += `<h2> المكملات والتوصيات الصحية</h2>`;
 for (const s of content.supplements) {
 html += `<div class="supplement"><div class="supplement-name">${s.name}</div>`;
 if (s.dose) html += `<div>الجرعة: ${s.dose}</div>`;
 if (s.timing) html += `<div>الموعد: ${s.timing}</div>`;
 if (s.purpose) html += `<div>الهدف: ${s.purpose}</div>`;
 html += `</div>`;
 }
 }

 // Health notes
 if (content.health_notes?.length > 0) {
 html += `<h2> توصيات صحية خاصة</h2>`;
 for (const n of content.health_notes) {
 html += `<div class="health-note">${n}</div>`;
 }
 }

 // Water target
 if (content.water_target) {
 html += `<h2> استهلاك الماء</h2><p>${content.water_target}</p>`;
 }

 // Meals
 if (content.meals) {
 html += `<h2> النظام الغذائي</h2>`;
 for (const m of content.meals) {
 html += `<h3>${escapeHtml(m.name)}${m.time ? ` <span style="font-size:11px;color:#666;font-weight:400">${escapeHtml(m.time)}</span>` : ""}</h3>`;
 html += `<table><tr><th style="width:30px">#</th><th>المكون</th><th>الكمية</th><th>السعرات</th><th>البدائل</th></tr>`;
 (m.items || []).forEach((it: any, i: number) => {
 html += `<tr><td>${i + 1}</td><td>${escapeHtml(it.food)}</td><td>${escapeHtml(it.amount)}</td><td>${escapeHtml(String(it.calories))}</td><td style="font-size:11px;color:#666">${escapeHtml(it.alternatives) || "—"}</td></tr>`;
 });
 if (m.total_calories || m.total_protein_g) {
 html += `<tr class="meal-total"><td colspan="3">إجمالي الوجبة: ~${m.total_calories || (m.items || []).reduce((s: number, i: any) => s + (i.calories || 0), 0)} سعرة</td><td>${m.total_protein_g || ""} ${m.total_protein_g ? "جم بروتين" : ""}</td><td></td></tr>`;
 }
 html += `</table>`;
 if (m.notes) html += `<p style="font-size:12px;color:#666"> ${m.notes}</p>`;
 }
 }
 } else if (isWorkout && content.days) {
 // Workout volume + progression
 if (content.weekly_volume || content.progression) {
 html += `<h2> الحجم والتقدم</h2>`;
 if (content.weekly_volume) html += `<p><strong>الحجم الأسبوعي:</strong> ${content.weekly_volume}</p>`;
 if (content.progression) html += `<p><strong>طريقة التقدم:</strong> ${content.progression}</p>`;
 }
 html += `<h2> البرنامج الأسبوعي</h2>`;
 for (const d of content.days) {
 if (d.isRest) {
 html += `<h3>${d.day} — راحة </h3><div class="rest-day">يوم راحة — استشفِ وارتاح. اشرب ماء كافي ونم 7-9 ساعات.</div>`;
 } else {
 html += `<h3>${d.day} — ${d.focus || ""}</h3>`;
 html += `<table><tr><th style="width:30px">#</th><th>التمرين</th><th>مجموعات</th><th>تكرارات</th><th>راحة</th></tr>`;
 (d.exercises || []).forEach((ex: any, i: number) => {
 // Find exercise in library for images
 const exLib = EXERCISES.find((e) => e.slug === ex.exerciseSlug || e.nameEn === ex.name || e.nameEn?.toLowerCase() === ex.name?.toLowerCase());
 const exImages = exLib ? getExerciseImages(exLib.imageKey) : [];
 let imgHtml = "";
 if (exImages.length > 0) {
 imgHtml = `<div style="display:flex;gap:4px;margin-bottom:4px">`;
 exImages.slice(0, 2).forEach((url: string) => {
 imgHtml += `<img src="${url}" alt="${escapeHtml(ex.name)}" style="width:60px;height:60px;object-fit:contain;border:1px solid #e2e2e2;border-radius:6px;background:#fafafa" onerror="this.style.display='none'">`;
 });
 imgHtml += `</div>`;
 }
 html += `<tr><td>${i + 1}</td><td>${imgHtml}<strong>${escapeHtml(ex.name)}</strong>${ex.notes ? `<br><span style="font-size:11px;color:#666">${escapeHtml(ex.notes)}</span>` : ""}</td><td style="color:#0071e3;font-weight:700">${escapeHtml(String(ex.sets))}</td><td style="color:#34c759;font-weight:700">${escapeHtml(String(ex.reps))}</td><td style="color:#ff9500;font-weight:700">${escapeHtml(ex.rest)}</td></tr>`;
 });
 html += `</table>`;
 }
 }
 }
 }
 html += `<div class="footer">© ${new Date().getFullYear()} Musclehubeg | musclehubeg.vercel.app<br>هذا التقرير مُعد لأغراض إرشادية — يُرجى استشارة طبيب مختص قبل بدء أي نظام غذائي أو تناول مكملات.</div>`;
 html += `</body></html>`;
 w.document.write(html);
 w.document.close();
 w.focus();
 setTimeout(() => w.print(), 500);
 };

 return (
 <div className="space-y-8">
 <div>
 <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">{t("plans.title")}</h1>
 <p className="mt-2 text-base font-normal text-[#6e6e73] md:text-lg">{t("plans.subtitle")}</p>
 </div>

 {/* Daily swap quota — Apple-style clean */}
 <div className="rounded-2xl bg-[#f5f5f7] px-5 py-4 text-sm font-normal text-[#6e6e73]">
 <span>{t("plans.swaps.mealDaily")} <strong className={swapUsage.meal.remaining > 0 ? "text-[#1d1d1f]" : "text-[#ff3b30]"}>{swapUsage.meal.remaining}</strong>/{swapUsage.meal.limit} {t("plans.swaps.remaining")}</span>
 <span className="mx-3 text-[#d2d2d7]">|</span>
 <span>{t("plans.swaps.exerciseDaily")} <strong className={swapUsage.exercise.remaining > 0 ? "text-[#1d1d1f]" : "text-[#ff3b30]"}>{swapUsage.exercise.remaining}</strong>/{swapUsage.exercise.limit} {t("plans.swaps.remaining")}</span>
 </div>

 <Tabs defaultValue="workout">
 <TabsList className="flex-wrap rounded-full bg-[#f5f5f7] p-1">
 <TabsTrigger value="workout" className="gap-2 rounded-full data-[state=active]:bg-white data-[state=active]:shadow-sm">
 {t("plans.workout")} ({workout.length})
 </TabsTrigger>
 <TabsTrigger value="meal" className="gap-2 rounded-full data-[state=active]:bg-white data-[state=active]:shadow-sm">
 {t("plans.meal")} ({meal.length})
 </TabsTrigger>
 </TabsList>

 <TabsContent value="workout" className="mt-6">
 {workout.length === 0 ? (
 <EmptyCard text={t("plans.empty")} />
 ) : (
 <div className="grid gap-4 sm:grid-cols-2">
 {workout.map((p) => (
 <PlanCard key={p.id} plan={p} onClick={() => setActive(p)} />
 ))}
 </div>
 )}
 </TabsContent>

 <TabsContent value="meal" className="mt-6">
 {meal.length === 0 ? (
 <EmptyCard text={t("plans.empty")} />
 ) : (
 <div className="grid gap-4 sm:grid-cols-2">
 {meal.map((p) => (
 <PlanCard key={p.id} plan={p} onClick={() => setActive(p)} />
 ))}
 </div>
 )}
 </TabsContent>
 </Tabs>

 {/* Plan Detail Modal */}
 {active && (
 <PlanDetailModal
 plan={active}
 onClose={() => setActive(null)}
 onSwapMeal={(i) => swapMeal(active.id, i)}
 onSwapExercise={(d, e) => swapExercise(active.id, d, e)}
 swapLoading={swapLoading}
 onPrint={() => printPlan(active)}
 onOpenFile={(path) => openFile(active.type === "meal" ? "meal-plans" : "workout-plans", path)}
 />
 )}
 </div>
 );
}

function EmptyCard({ text }: { text: string }) {
 const { t, lang } = useI18n();
 const isAr = lang === "ar";
 const { navigate } = useNav();
 return (
 <div className="rounded-2xl bg-[#f5f5f7] p-12 text-center">
 <p className="text-base font-normal text-[#6e6e73]">{text}</p>
 <p className="mt-2 text-sm font-normal text-[#6e6e73]">
 {isAr ? "املأ استبيانك ليتمكن الكوتش من تجهيز خطتك المخصصة." : "Fill out your questionnaire so the coach can prepare your personalized plan."}
 </p>
 <button
 onClick={() => navigate("questionnaires")}
 className="mt-4 rounded-full bg-[#0071e3] px-5 py-2 text-sm font-normal text-white transition-opacity hover:opacity-90"
 >
 {isAr ? "املأ الاستبيان ›" : "Fill questionnaire ›"}
 </button>
 </div>
 );
}

function PlanCard({ plan, onClick }: { plan: any; onClick: () => void }) {
 const { t, lang } = useI18n();
 const isAr = lang === "ar";
 return (
 <Card className="group cursor-pointer p-5 shadow-card transition-all hover:shadow-glow" onClick={onClick}>
 <div className="flex items-start justify-between gap-3">
 <div className="min-w-0">
 <div className="flex items-center gap-2">
 {plan.type === "meal" ? <Salad className="h-5 w-5 text-primary" /> : <Dumbbell className="h-5 w-5 text-primary" />}
 <h3 className="truncate font-semibold">{plan.title}</h3>
 </div>
 <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{plan.notes || "—"}</p>
 </div>
 <Button size="sm" variant="ghost" className="shrink-0 opacity-0 transition-opacity group-hover:opacity-100">
 {t("plans.view")}
 </Button>
 </div>
 {plan.content?.daily_calories && (
 <div className="mt-3 flex gap-2 text-xs">
 <Badge variant="secondary">{plan.content.daily_calories} cal</Badge>
 {plan.content.macros && (
 <Badge variant="outline">P:{plan.content.macros.protein_g}g</Badge>
 )}
 </div>
 )}
 {plan.content?.days && (
 <div className="mt-3 text-xs text-muted-foreground">
 {plan.content.days.length} {isAr ? "أيام" : "days"}
 </div>
 )}
 </Card>
 );
}

function PlanDetailModal({
 plan,
 onClose,
 onSwapMeal,
 onSwapExercise,
 swapLoading,
 onPrint,
 onOpenFile,
}: {
 plan: any;
 onClose: () => void;
 onSwapMeal: (i: number) => void;
 onSwapExercise: (d: number, e: number) => void;
 swapLoading: string | null;
 onPrint: () => void;
 onOpenFile: (path: string) => void;
}) {
 const { t } = useI18n();
 const content = plan.content;

 return (
 <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
 <div
 className="max-h-[85vh] w-full max-w-2xl overflow-y-auto scrollbar-thin rounded-3xl bg-card p-6 shadow-card"
 onClick={(e) => e.stopPropagation()}
 >
 <div className="mb-4 flex items-center justify-between gap-3">
 <div className="flex items-center gap-2">
 {plan.type === "meal" ? <Salad className="h-5 w-5 text-primary" /> : <Dumbbell className="h-5 w-5 text-primary" />}
 <h2 className="text-lg font-bold">{plan.title}</h2>
 </div>
 <div className="flex gap-2">
 <Button size="sm" variant="outline" className="gap-2" onClick={onPrint}>
 <Printer className="h-4 w-4" />
 <span className="hidden sm:inline">{t("plan.print")}</span>
 </Button>
 {plan.file_url && (
 <Button size="sm" variant="outline" className="gap-2" onClick={() => onOpenFile(plan.file_url)}>
 <Download className="h-4 w-4" />
 <span className="hidden sm:inline">{t("common.download")}</span>
 </Button>
 )}
 <Button size="sm" variant="ghost" onClick={onClose}></Button>
 </div>
 </div>

 {plan.type === "meal" && content ? (
 <MealContent content={content} onSwap={onSwapMeal} swapLoading={swapLoading} planId={plan.id} />
 ) : plan.type === "workout" && content?.days ? (
 <WorkoutContent content={content} onSwap={onSwapExercise} swapLoading={swapLoading} planId={plan.id} />
 ) : (
 <div className="text-sm text-muted-foreground">
 {plan.notes || "—"}
 {plan.file_url && (
 <a href="#" onClick={(e) => { e.preventDefault(); onOpenFile(plan.file_url); }} className="mt-3 flex items-center gap-1 text-primary hover:underline">
 <Download className="h-4 w-4" /> {t("common.download")}
 </a>
 )}
 </div>
 )}
 </div>
 </div>
 );
}

function MealContent({ content, onSwap, swapLoading, planId }: any) {
 const { t } = useI18n();
 return (
 <div className="space-y-4">
 {content.overview && <p className="whitespace-pre-line text-sm text-muted-foreground">{content.overview}</p>}

 {/* PDF-style data analysis section */}
 {content.data_analysis && (
 <div className="rounded-xl border border-border bg-muted/30 p-4">
 <h4 className="mb-2 text-sm font-bold"> تحليل البيانات</h4>
 <div className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-3">
 {content.data_analysis.gender && <div><span className="text-muted-foreground">الجنس:</span> {content.data_analysis.gender}</div>}
 {content.data_analysis.weight && <div><span className="text-muted-foreground">الوزن:</span> {content.data_analysis.weight}</div>}
 {content.data_analysis.height && <div><span className="text-muted-foreground">الطول:</span> {content.data_analysis.height}</div>}
 {content.data_analysis.age && <div><span className="text-muted-foreground">العمر:</span> {content.data_analysis.age}</div>}
 {content.data_analysis.activity && <div><span className="text-muted-foreground">النشاط:</span> {content.data_analysis.activity}</div>}
 {content.data_analysis.health && <div><span className="text-muted-foreground">الصحة:</span> {content.data_analysis.health}</div>}
 {content.data_analysis.body_fat_pct && <div><span className="text-muted-foreground">نسبة الدهون:</span> {content.data_analysis.body_fat_pct}</div>}
 {content.data_analysis.bmr && <div><span className="text-muted-foreground">BMR:</span> ~{content.data_analysis.bmr} سعرة</div>}
 {content.data_analysis.tdee && <div><span className="text-muted-foreground">TDEE:</span> ~{content.data_analysis.tdee} سعرة</div>}
 </div>
 </div>
 )}

 {/* Macros summary */}
 {content.daily_calories && (
 <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
 <Stat label={t("plan.calories")} value={content.daily_calories} />
 <Stat label={t("plan.protein")} value={`${content.macros?.protein_g || 0}g`} />
 <Stat label={t("plan.carbs")} value={`${content.macros?.carbs_g || 0}g`} />
 <Stat label={t("plan.fat")} value={`${content.macros?.fat_g || 0}g`} />
 </div>
 )}

 {/* Supplements & health notes */}
 {(content.supplements?.length > 0 || content.health_notes?.length > 0 || content.water_target) && (
 <div className="rounded-xl border border-border bg-muted/30 p-4 space-y-3">
 {content.supplements?.length > 0 && (
 <div>
 <h4 className="mb-2 text-sm font-bold"> المكملات والتوصيات الصحية</h4>
 <div className="space-y-2">
 {content.supplements.map((s: any, i: number) => (
 <div key={i} className="rounded-lg border border-border bg-background p-2 text-xs">
 <div className="font-semibold">{s.name}</div>
 <div className="text-muted-foreground">
 {s.dose && <span>الجرعة: {s.dose}</span>}
 {s.timing && <span> | الموعد: {s.timing}</span>}
 </div>
 {s.purpose && <div className="mt-0.5 text-muted-foreground">الهدف: {s.purpose}</div>}
 </div>
 ))}
 </div>
 </div>
 )}
 {content.health_notes?.length > 0 && (
 <div>
 <h4 className="mb-2 text-sm font-bold"> توصيات صحية خاصة</h4>
 <ul className="space-y-1 text-xs text-muted-foreground">
 {content.health_notes.map((n: string, i: number) => (
 <li key={i} className="flex items-start gap-1.5">
 <span className="text-primary">•</span>
 <span>{n}</span>
 </li>
 ))}
 </ul>
 </div>
 )}
 {content.water_target && (
 <div className="text-xs">
 <span className="font-bold"> استهلاك الماء:</span> {content.water_target}
 </div>
 )}
 </div>
 )}

 {/* Meals — PDF-style with numbered items, alternatives, and per-meal totals */}
 {content.meals?.map((m: any, i: number) => (
 <div key={i} className="rounded-xl border border-border p-4">
 <div className="mb-2 flex items-center justify-between gap-2">
 <div>
 <h4 className="font-semibold"> {m.name}</h4>
 {m.time && <p className="text-xs text-muted-foreground">{m.time}</p>}
 </div>
 <Button
 size="sm"
 variant="ghost"
 className="h-7 gap-1 px-2 text-xs text-primary hover:bg-primary/10"
 onClick={() => onSwap(i)}
 disabled={swapLoading === `meal-${planId}-${i}`}
 >
 {swapLoading === `meal-${planId}-${i}` ? (
 <Loader2 className="h-3.5 w-3.5 animate-spin" />
 ) : (
 <RefreshCw className="h-3.5 w-3.5" />
 )}
 {t("plan.swap")}
 </Button>
 </div>
 <table className="w-full text-sm">
 <thead>
 <tr className="text-start">
 <th className="p-2 text-start font-medium text-muted-foreground w-8">#</th>
 <th className="p-2 text-start font-medium text-muted-foreground">{t("plan.food")}</th>
 <th className="p-2 text-start font-medium text-muted-foreground">{t("plan.amount")}</th>
 <th className="p-2 text-start font-medium text-muted-foreground">{t("plan.calories")}</th>
 <th className="p-2 text-start font-medium text-muted-foreground hidden md:table-cell">البدائل</th>
 </tr>
 </thead>
 <tbody>
 {m.items?.map((it: any, j: number) => (
 <tr key={j} className="border-t border-border/60">
 <td className="p-2 text-muted-foreground">{j + 1}</td>
 <td className="p-2 font-medium">{it.food}</td>
 <td className="p-2">{it.amount}</td>
 <td className="p-2">
 {it.calories}
 {it.protein_g && <span className="block text-[10px] text-muted-foreground"> {it.protein_g}جم</span>}
 </td>
 <td className="p-2 text-xs text-muted-foreground hidden md:table-cell">{it.alternatives || "—"}</td>
 </tr>
 ))}
 </tbody>
 {(m.total_calories || m.total_protein_g) && (
 <tfoot>
 <tr className="border-t-2 border-primary/30 bg-primary/5">
 <td colSpan={3} className="p-2 text-end font-semibold text-primary">
 {typeof m.total_calories === "number"
 ? `~${m.total_calories}`
 : `~${m.items?.reduce((s: number, i: any) => s + (i.calories || 0), 0) || 0}`} سعرة حرارية
 </td>
 <td className="p-2 font-semibold text-success">
 {m.total_protein_g ? `${m.total_protein_g} جم بروتين` : ""}
 </td>
 <td className="p-2 hidden md:table-cell"></td>
 </tr>
 </tfoot>
 )}
 </table>
 {m.notes && <p className="mt-1 text-xs text-muted-foreground"> {m.notes}</p>}
 </div>
 ))}
 </div>
 );
}

function WorkoutContent({ content, onSwap, swapLoading, planId }: any) {
 const { t } = useI18n();
 return (
 <div className="space-y-4">
 {content.overview && <p className="text-sm text-muted-foreground">{content.overview}</p>}
 {content.days?.map((d: any, i: number) => (
 <div key={i} className="rounded-xl border border-border">
 <div className="flex items-center justify-between border-b border-border bg-muted/40 px-4 py-2">
 <span className="font-semibold">{d.day}</span>
 <Badge variant="secondary">{d.focus}</Badge>
 </div>
 {/* Exercise list — card layout (responsive mobile + desktop) */}
 <div className="space-y-3">
 {d.exercises?.map((ex: any, j: number) => {
 // Find exercise in library to get both images
 const exLib = EXERCISES.find((e) => e.slug === ex.exerciseSlug || e.nameEn === ex.name || e.nameEn.toLowerCase() === ex.name?.toLowerCase());
 const exImages = exLib ? getExerciseImages(exLib.imageKey) : (ex.image ? [ex.image] : []);
 const exHref = ex.exerciseSlug ? `/exercises/${ex.exerciseSlug}` : (exLib ? `/exercises/${exLib.slug}` : null);
 return (
 <div key={j} className="rounded-2xl border border-border/60 bg-card p-3">
 {/* Two images ABOVE the text — like exercise library */}
 {exImages.length > 0 && (
 <div className="mb-3 grid grid-cols-2 gap-2">
 {exImages.slice(0, 2).map((url: string, idx: number) => (
 <div key={idx} className="relative aspect-square overflow-hidden rounded-xl bg-muted">
 <ImageWithFallback
 src={url}
 alt={`${ex.name} ${idx + 1}`}
 fill
 className="object-contain"
 fallbackSrc={getFallbackSVG(exLib?.category || "default")}
 />
 </div>
 ))}
 </div>
 )}
 {/* Exercise name + notes */}
 <div className="mb-2">
 <p className="font-medium text-base">
 {exHref ? (
 <a href={exHref} className="text-primary hover:underline">{ex.name}</a>
 ) : ex.name}
 </p>
 {ex.notes && <p className="text-xs text-muted-foreground mt-0.5">{ex.notes}</p>}
 </div>
 {/* Sets / Reps / Rest — colored badges */}
 <div className="flex flex-wrap items-center gap-2">
 <span className="rounded-lg bg-[#0071e3]/10 px-3 py-1 text-sm font-semibold text-[#0071e3]">
 {ex.sets} {t("plan.sets")}
 </span>
 <span className="rounded-lg bg-[#34c759]/10 px-3 py-1 text-sm font-semibold text-[#34c759]">
 {ex.reps} {t("plan.reps")}
 </span>
 {ex.rest && (
 <span className="rounded-lg bg-[#ff9500]/10 px-3 py-1 text-sm font-semibold text-[#ff9500]">
 {ex.rest}
 </span>
 )}
 <Button
 size="sm"
 variant="ghost"
 className="ml-auto h-7 gap-1 px-2 text-xs text-primary hover:bg-primary/10"
 onClick={() => onSwap(i, j)}
 disabled={swapLoading === `ex-${planId}-${i}-${j}`}
 >
 {swapLoading === `ex-${planId}-${i}-${j}` ? (
 <Loader2 className="h-3.5 w-3.5 animate-spin" />
 ) : (
 <RefreshCw className="h-3.5 w-3.5" />
 )}
 </Button>
 </div>
 </div>
 );
 })}
 </div>
 </div>
 ))}
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
