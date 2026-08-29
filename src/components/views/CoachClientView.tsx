"use client";

import Image from "next/image";
import { ImageWithFallback } from "@/components/ui/image-with-fallback";
import { useEffect, useState, useMemo, useRef, useCallback } from "react";
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
 Check,
 Eye,
 Pencil,
 Plus,
 RefreshCw,
 ChevronDown,
 Download,
} from "lucide-react";
// #5 fix: lazy-load recharts (~600KB) — only loaded when progress tab is opened
import dynamic from "next/dynamic";
const ClientWeightChart = dynamic(
  () => import("@/components/ClientWeightChart").then((m) => m.ClientWeightChart),
  { ssr: false, loading: () => null },
);
import { useI18n } from "@/lib/i18n";
import { useNav } from "@/hooks/use-nav";
import { useAuth } from "@/hooks/use-auth";
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
 listSubscriptionsForClient,
 listProgress,
 listPlans,
 listAllClientPlans,
 addPlan,
 deletePlan,
 activatePlan,
 getQuestionnaire,
 fetchProfile,
} from "@/lib/data";
import { TIERS, getTier, type Duration } from "@/lib/plans";
import { MEMBERSHIPS } from "@/lib/memberships";
import { resolveExerciseImage, getExerciseImage, getExerciseImages, getFallbackSVG } from "@/lib/exercise-images";
import { EXERCISES } from "@/lib/exercises";
import { HealthMetricsDashboard } from "@/components/HealthMetricsDashboard";
import { toast } from "sonner";
import { runAiJob, enqueueAiJobClient, getAiJob } from "@/lib/ai-jobs-client";
import {
 addPendingPlanJob,
 removePendingPlanJob,
 readPendingPlanJobs,
 readSavedPlanJobIds,
 addSavedPlanJobId,
 selectRecoverablePlanJobs,
 planJobTypeToKind,
 type PendingPlanJob,
} from "@/lib/plan-jobs";
import { NotificationForm } from "@/components/NotificationForm";
import { isSupabaseConfigured } from "@/lib/data/helpers";
import {
 COACH_AI_PLAN_LIMIT,
 COACH_CLIENT_PACKAGES,
 COACH_PAYMENT_METHODS,
 coachPaymentMethodLabel,
 type CoachPaymentMethod,
} from "@/lib/coach-limits";

// Unified tier list — combines new membership tiers (Premium, Pro, Coaching)
// with legacy tiers (Starter, Elite) for backward compatibility. Used in the
// subscription form so the coach can pick ANY tier.
const ALL_TIERS: Array<{ id: string; nameAr: string; nameEn: string }> = [
  ...MEMBERSHIPS.filter((m) => m.id !== "free").map((m) => ({
    id: m.id,
    nameAr: m.nameAr,
    nameEn: m.nameEn,
  })),
  ...TIERS.map((t) => ({
    id: t.id,
    nameAr: t.id === "starter" ? "ستارتر" : "إيليت",
    nameEn: t.id === "starter" ? "Starter" : "Elite",
  })),
];

export function CoachClientView({ clientId }: { clientId: string }) {
 const { t, dir, lang } = useI18n();
 const isAr = lang === "ar";
 const { navigate } = useNav();
 // OWNER BOUNDARY (2026-08-30): admins manage everything; coaches must
 // NEVER see site memberships (premium/pro) — only their coaching product.
 const { isAdmin } = useAuth();
 const [client, setClient] = useState<any | null>(null);
 const [sub, setSub] = useState<any | null>(null);
 const [allSubs, setAllSubs] = useState<any[]>([]);
 const [progress, setProgress] = useState<any[]>([]);
 const [plans, setPlans] = useState<any[]>([]);
 const [nutriQ, setNutriQ] = useState<any | null>(null);
 const [fitQ, setFitQ] = useState<any | null>(null);
 const [loading, setLoading] = useState(true);
 const [tab, setTab] = useState<"overview" | "subscription" | "plans" | "ai-plans" | "questionnaires" | "progress" | "notifications">("overview");

 // Subscription form — coaching is the coach's ONLY product; admins may
 // still pick any tier (manual override).
 const [tier, setTier] = useState<string>("coaching");
 const [months, setMonths] = useState<Duration>(1);
 // 0043 OWNER FIX: the manual start/end date inputs are GONE — the server
 // (extend_subscription, 0018 math) computes dates from the selected
 // duration; the UI now only PREVIEWS that computation. Manual editing
 // was always silently ignored by the API and misled staff.
 const [savingSub, setSavingSub] = useState(false);
 // 0034: offline-payment fields — the coach collects OUTSIDE the site
 // (cash / Vodafone Cash / InstaPay) then records it with the activation.
 const [payAmount, setPayAmount] = useState<string>("");
 const [payMethod, setPayMethod] = useState<CoachPaymentMethod>("cash");
 const [payNote, setPayNote] = useState<string>("");

 // Plan upload form
 const [planType, setPlanType] = useState<"meal" | "workout">("meal");
 const [planTitle, setPlanTitle] = useState("");
 const [planNotes, setPlanNotes] = useState("");
 const [uploading, setUploading] = useState(false);

 // AI plan generation
 const [generating, setGenerating] = useState<"workout" | "nutrition" | null>(null);
 const [approving, setApproving] = useState<string | null>(null);
 const [viewingPlan, setViewingPlan] = useState<any | null>(null);
 // 0034: per-client AI quota readout (4 nutrition + 4 workout per client)
 type AiUsage = { unlimited: boolean; limit: number; nutrition: { used: number; limit: number }; workout: { used: number; limit: number } };
 const [aiUsage, setAiUsage] = useState<AiUsage | null>(null);

 // ── OWNER DECREE (2026-08-30): «المدرب قدر يولد خطط للعميل بدون ما يدفع
 // او يفعل اشتراك العميل» — plan generation (AI + manual) is a PAID
 // feature: it requires an ACTIVE coaching subscription for this client
 // ($6/$16 wallet activation). Admins bypass (staff semantics). Enforced
 // here for UX AND server-side in /api/ai/jobs + /api/plans/normalize.
 const hasActiveCoaching = useMemo(
 () =>
 allSubs.some(
 (s: any) =>
 s.tier === "coaching" &&
 s.status === "active" &&
 (!s.end_date || new Date(s.end_date).getTime() > Date.now()),
 ),
 [allSubs],
 );
 const planGateOpen = isAdmin || hasActiveCoaching;
 const planGateMessage = isAr
 ? "توليد الخطط مقفول لحد ما تفعّل اشتراك العميل — من تبويب الاشتراك (شهر 6$ — ٣ شهور 16$ بتخصم من محفظتك)."
 : "Plan generation is locked until you activate this client's subscription — from the Subscription tab (1 month $6 — 3 months $16 debited from your wallet).";

 // T-4PILLAR-COMPLETE (2026-08-28): plan jobs are queued on GitHub Actions
 // (~10 min), so a blocking poll that dies with the tab used to STRAND the
 // finished result in ai_jobs — no draft was ever saved. Mirrors the client
 // swap watcher: a localStorage registry re-attaches watchers on every
 // mount, and finished-but-unsaved jobs surface in a recovery card.
 const [pendingPlanJobs, setPendingPlanJobs] = useState<PendingPlanJob[]>([]);
 const [recoverableJobs, setRecoverableJobs] = useState<any[]>([]);
 const [recoveringId, setRecoveringId] = useState<string | null>(null);
 const activePlanWatchers = useRef<Set<string>>(new Set());

 // M18 fix: error states for invalid clientId
 const [notFound, setNotFound] = useState(false);
 const [notClient, setNotClient] = useState(false);

 useEffect(() => {
 (async () => {
 const [c, subs, p, pl, n, f] = await Promise.all([
 fetchProfile(clientId),
 listAllSubscriptions(),
 listProgress(clientId),
 listAllClientPlans(clientId),
 getQuestionnaire(clientId, "nutrition"),
 getQuestionnaire(clientId, "fitness"),
 ]);
 // M18 fix: handle non-existent or non-client clientId
 if (!c) {
 setLoading(false);
 setNotFound(true);
 return;
 }
 if (c.role !== "client") {
 setLoading(false);
 setNotClient(true);
 return;
 }
 setClient(c);
 // Get ALL subs for this client (multiple allowed now)
 const clientSubs = subs.filter((x) => x.client_id === clientId);
 // OWNER BOUNDARY (2026-08-30): the coach sees ONLY the coaching-tier
 // subscription — site memberships (premium/pro) are the site's business,
 // never his. Admins keep the full picture.
 const visibleSubs: any[] = isAdmin
 ? clientSubs
 : clientSubs.filter((x: any) => x.tier === "coaching");
 setAllSubs(visibleSubs);
 // Set the primary sub — separate coaching from memberships
 // Pick best MEMBERSHIP tier (pro > premium). If only coaching, pick coaching.
 const hasCoaching = visibleSubs.some((s: any) => s.tier === "coaching");
 const membershipSubs = visibleSubs.filter((s: any) => ["premium", "pro"].includes(s.tier));
 let s: any = null;
 if (membershipSubs.length > 0) {
 const priority = (tier: string) => {
 if (tier === "pro") return 3;
 if (tier === "premium") return 2;
 return 0;
 };
 const sorted = [...membershipSubs].sort((a, b) => priority(b.tier) - priority(a.tier));
 s = sorted[0];
 } else if (hasCoaching) {
 s = clientSubs.find((sub: any) => sub.tier === "coaching");
 }
 setSub(s);
 setProgress(p);
 setPlans(pl);
 setNutriQ(n);
 setFitQ(f);
 if (s) {
 setTier(s.tier);
 setMonths(s.months);
 // 0043: no manual date prefill — dates are computed/previewed only.
 }
 setLoading(false);
 })();
 }, [clientId]);

 /* ── T-4PILLAR-COMPLETE: registry-backed plan-job pipeline ──────────
  * enqueue → register → watch (survives reloads) → materialize draft.
  * A finished job becomes a DRAFT plan row even if the coach closed the
  * tab minutes earlier; regeneration deletes the old plan only AFTER the
  * replacement exists and only if it is still an unapproved draft.
  * ───────────────────────────────────────────────────────────────── */
 const scanRecoverableJobs = useCallback(async () => {
 try {
 const res = await fetch("/api/ai/jobs?limit=20");
 if (!res.ok) return;
 const data = await res.json().catch(() => null);
 const picked = selectRecoverablePlanJobs(
 data?.jobs ?? [],
 new Set(readSavedPlanJobIds()),
 new Set(readPendingPlanJobs().map((e) => e.id)),
 );
 setRecoverableJobs(picked);
 } catch {
 /* queue visibility is best-effort */
 }
 }, []);

 useEffect(() => {
 void scanRecoverableJobs();
 }, [scanRecoverableJobs]);

 // 0034: live AI-quota readout for THIS client (4 nutrition + 4 workout
 // per client; failed generations never burn quota; admins unlimited).
 const refreshAiUsage = useCallback(async () => {
 if (!isSupabaseConfigured) return;
 try {
 const res = await fetch(`/api/coach/ai-usage?clientId=${encodeURIComponent(clientId)}`);
 if (!res.ok) return;
 const data = await res.json().catch(() => null);
 if (data) setAiUsage(data);
 } catch {
 /* best-effort */
 }
 }, [clientId]);

 useEffect(() => {
 void refreshAiUsage();
 }, [refreshAiUsage]);

 const materializePlanDraft = useCallback(
 async (entry: PendingPlanJob, result: any) => {
 const { title, content } = (result ?? {}) as { title: string; content: any };
 if (!title || !content) throw new Error("نتيجة التوليد غير مكتملة");
 await addPlan({
 client_id: entry.clientId,
 type: entry.kind === "workout" ? "workout" : "meal",
 title,
 notes: "Generated by AI",
 file_url: null,
 content,
 status: "draft",
 is_current: false,
 });
 addSavedPlanJobId(entry.id);
 removePendingPlanJob(entry.id);
 setPendingPlanJobs(readPendingPlanJobs());
 // Regeneration: swap old draft out ONLY if it still exists and was
 // never approved in the meantime (otherwise we would delete a live plan).
 if (entry.replacePlanId) {
 try {
 const fresh = await listAllClientPlans(entry.clientId);
 const old = fresh.find((p: any) => p.id === entry.replacePlanId);
 if (old && old.status === "draft") await deletePlan(old.id);
 } catch {
 /* old draft cleanup is best-effort */
 }
 }
 if (entry.clientId === clientId) {
 setPlans(await listAllClientPlans(clientId));
 }
 void refreshAiUsage();
 void scanRecoverableJobs();
 },
 [clientId, scanRecoverableJobs, refreshAiUsage],
 );

 const watchPlanJob = useCallback(
 async (entry: PendingPlanJob) => {
 if (activePlanWatchers.current.has(entry.id)) return;
 activePlanWatchers.current.add(entry.id);
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
 try {
 await materializePlanDraft(entry, job.result);
 toast.success(
 entry.kind === "workout"
 ? "وصل برنامج التمارين وتم حفظه كمسودة ✅ راجعه ثم وافق عليه لإرساله للعميل."
 : "وصلت خطة التغذية وتم حفظها كمسودة ✅ راجعها ثم وافق عليها لإرسالها للعميل.",
 );
 } catch (e: any) {
 toast.error(e?.message || "وصلت الخطة لكن فشل حفظ المسودة — استخدم بطاقة الاسترجاع.");
 }
 return;
 }
 if (job?.status === "failed") {
 removePendingPlanJob(entry.id);
 setPendingPlanJobs(readPendingPlanJobs());
 toast.error(job.error_message || "فشل توليد الخطة. حاول مرة أخرى.");
 return;
 }
 }
 // Timeout: the job may STILL finish later — keep the registry entry
 // so the next mount re-watches and the recovery card can pick it up.
 toast.info("الخطة لسه بتتولد في الخلفية — هتتطبق تلقائيًا أول ما تفتح صفحة العميل تاني.");
 } finally {
 activePlanWatchers.current.delete(entry.id);
 }
 },
 [materializePlanDraft],
 );

 /** Re-attach watchers to unfinished jobs after reload/remount. */
 useEffect(() => {
 const pending = readPendingPlanJobs();
 setPendingPlanJobs(pending);
 pending.forEach((entry) => void watchPlanJob(entry));
 }, [watchPlanJob]);

 const recoverPlanJob = async (job: any) => {
 setRecoveringId(job.id);
 try {
 const full = await getAiJob(job.id); // single GET carries result
 if (full?.status !== "done" || !full?.result?.title || !full?.result?.content) {
 throw new Error("النتيجة غير متاحة لهذه المهمة");
 }
 const kind = planJobTypeToKind(job.job_type);
 if (!kind) throw new Error("نوع مهمة غير معروف");
 await materializePlanDraft(
 { id: job.id, clientId: job.payload?.clientId, kind, createdAt: Date.now() },
 full.result,
 );
 toast.success("تم استرجاع الخطة وحفظها كمسودة ✅");
 } catch (e: any) {
 toast.error(e?.message || "فشل الاسترجاع");
 } finally {
 setRecoveringId(null);
 }
 };

 /** Enqueue a plan job and register a resilient watcher for it. */
 const queuePlanJob = async (
 planType: "workout" | "nutrition",
 clientContext: any,
 overrides?: any,
 replacePlan?: any,
 ) => {
 if (!planGateOpen) {
 toast.error(planGateMessage);
 return;
 }
 setGenerating(planType);
 try {
 const jobId = await enqueueAiJobClient(
 planType === "workout" ? "plan_workout" : "plan_nutrition",
 { clientId, clientContext, overrides },
 );
 const entry: PendingPlanJob = {
 id: jobId,
 clientId,
 kind: planType,
 createdAt: Date.now(),
 replacePlanId: replacePlan?.id,
 };
 addPendingPlanJob(entry);
 setPendingPlanJobs(readPendingPlanJobs());
 void watchPlanJob(entry);
 toast.info(
 planType === "workout"
 ? "تم إرسال طلب التوليد 🚀 البرنامج هيوصل خلال ~10 دقائق ويتم حفظه كمسودة تلقائيًا حتى لو قفلت الصفحة."
 : "تم إرسال طلب التوليد 🚀 الخطة هتوصل خلال ~10 دقائق ويتم حفظها كمسودة تلقائيًا حتى لو قفلت الصفحة.",
 );
 } catch (e: any) {
 toast.error(e.message || t("coach.genFailed"));
 } finally {
 setGenerating(null);
 }
 };

 const updateSub = async () => {
 setSavingSub(true);
 try {
 if (isSupabaseConfigured) {
 // 0034: activation goes through the server route — extend_subscription
 // (service role, 0034-guarded) + coach_payments ledger + client notification.
 const res = await fetch("/api/coach/subscriptions/activate", {
 method: "POST",
 headers: { "Content-Type": "application/json" },
 body: JSON.stringify({
 client_id: clientId,
 tier,
 months,
 amount: payAmount.trim() === "" ? null : Number(payAmount),
 method: payMethod,
 note: payNote.trim() || null,
 }),
 });
 const json = await res.json().catch(() => null);
 if (!res.ok) throw new Error(json?.message || json?.error || t("common.error"));
 setPayAmount("");
 setPayNote("");
 toast.success(
 isAr
 ? `تم تفعيل الاشتراك ✅ العميل وصل إشعار — والدفع اتسجل في سجل تفعيلات المدربين.`
 : `Subscription activated ✅ — the client was notified and the payment was logged.`,
 );
 } else {
 // Demo/local fallback — direct write, no ledger. Dates computed the
 // same way the server does (0043: no manual date inputs anymore).
 const start = new Date();
 const end = new Date();
 end.setMonth(end.getMonth() + months);
 await upsertSubscription(clientId, tier, months, start.toISOString(), end.toISOString());
 toast.success(t("coach.subUpdated"));
 }
 // Reload all subscriptions to show the updated list
 const updatedSubs = await listSubscriptionsForClient(clientId);
 // OWNER BOUNDARY: same visibility rule as the loader — coach sees only
 // his coaching product; admins see everything.
 const visibleUpdated: any[] = isAdmin
 ? updatedSubs
 : updatedSubs.filter((x: any) => x.tier === "coaching");
 setAllSubs(visibleUpdated);
 // Update primary sub — separate coaching from memberships
 const hasCoaching = visibleUpdated.some((s: any) => s.tier === "coaching");
 const membershipSubs = visibleUpdated.filter((s: any) => ["premium", "pro"].includes(s.tier));
 let s: any = null;
 if (membershipSubs.length > 0) {
 const priority = (t: string) => {
 if (t === "pro") return 3;
 if (t === "premium") return 2;
 return 0;
 };
 const sorted = [...membershipSubs].sort((a, b) => priority(b.tier) - priority(a.tier));
 s = sorted[0];
 } else if (hasCoaching) {
 s = updatedSubs.find((sub: any) => sub.tier === "coaching");
 }
 setSub(s);
 } catch (e: any) {
 toast.error(e.message || t("common.error"));
 } finally {
 setSavingSub(false);
 }
 };

 const uploadPlan = async () => {
 if (!planTitle.trim()) return;
 if (!planGateOpen) {
 toast.error(planGateMessage);
 return;
 }
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

 // Normalize a coach-pasted plan — converts free text (e.g. from a PDF or
 // notes) into the structured JSON format used by AI-generated plans. The
 // structured plan gets the same editable table UI + per-meal regenerate
 // button as AI plans.
 const [normalizing, setNormalizing] = useState(false);
 const normalizeAndUpload = async () => {
 if (!planTitle.trim() || !planNotes.trim()) {
 toast.error("اكتب عنوان الخطة والصق محتواها في حقل الملاحظات أولاً.");
 return;
 }
 if (!planGateOpen) {
 toast.error(planGateMessage);
 return;
 }
 setNormalizing(true);
 try {
 const res = await fetch("/api/plans/normalize", {
 method: "POST",
 headers: { "Content-Type": "application/json" },
 body: JSON.stringify({ text: planNotes, planType, clientId }),
 });
 if (!res.ok) {
 const err = await res.json().catch(() => ({}));
 throw new Error(err.error || "Failed to normalize plan");
 }
 const { content, source } = await res.json();
 await addPlan({
 client_id: clientId,
 type: planType,
 title: planTitle.trim(),
 notes: "Coach-added (structured)",
 file_url: null,
 content,
 });
 setPlanTitle("");
 setPlanNotes("");
 const data = await listPlans(clientId);
 setPlans(data);
 toast.success(`تم تنسيق الخطة وإضافتها! (${source})`);
 } catch (e: any) {
 toast.error(e.message || "فشل التنسيق");
 } finally {
 setNormalizing(false);
 }
 };

 const removePlan = async (id: string) => {
 if (!confirm(t("coach.deletePlanConfirm"))) return;
 await deletePlan(id);
 const data = await listPlans(clientId);
 setPlans(data);
 };





 if (loading) return <div className="text-muted-foreground">{t("common.loading")}</div>;

 // M18 fix: render clear error states for invalid clientId
 if (notFound) {
 return (
 <div className="py-20 text-center">
 <h2 className="text-xl font-semibold">{isAr ? "العميل غير موجود" : "Client not found"}</h2>
 <p className="mt-2 text-sm text-[#6e6e73]">{isAr ? "هذا العميل غير موجود أو تم حذفه." : "This client does not exist or has been deleted."}</p>
 <a href="/coach" className="mt-4 inline-block rounded-full bg-[#0071e3] px-5 py-2 text-sm text-white">{isAr ? "العودة لقائمة العملاء" : "Back to client list"}</a>
 </div>
 );
 }
 if (notClient) {
 return (
 <div className="py-20 text-center">
 <h2 className="text-xl font-semibold">{isAr ? "هذا المستخدم ليس عميلاً" : "This user is not a client"}</h2>
 <p className="mt-2 text-sm text-[#6e6e73]">{isAr ? "لا يمكن عرض بيانات مدرب آخر." : "Cannot view another coach's data."}</p>
 <a href="/coach" className="mt-4 inline-block rounded-full bg-[#0071e3] px-5 py-2 text-sm text-white">{isAr ? "العودة لقائمة العملاء" : "Back to client list"}</a>
 </div>
 );
 }

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
 { id: "notifications", label: lang === "ar" ? "إشعارات" : "Notifications" },
 { id: "questionnaires", label: t("coach.questionnairesSection") },
 { id: "progress", label: t("coach.clientProgress") },
 ] as const;

 const generateAIPlan = async (planType: "workout" | "nutrition", overrides?: any) => {
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

 // T-4PILLAR-COMPLETE: enqueue + resilient registry watcher instead of a
 // blocking poll — the draft materializes even if the coach leaves.
 await queuePlanJob(planType, clientContext, overrides);
 };

 const handleApprovePlan = async (planId: string) => {
 setApproving(planId);
 try {
 await activatePlan(planId, clientId);
 const refreshed = await listAllClientPlans(clientId);
 setPlans(refreshed);
 toast.success("تمت الموافقة على الخطة وإرسالها للعميل! ");
 } catch (e: any) {
 toast.error(e.message || t("common.error"));
 } finally {
 setApproving(null);
 }
 };

 // Regenerate a plan — queue the replacement, delete the old draft only
 // AFTER the new plan arrives (and only if it was never approved meanwhile).
 const handleRegeneratePlan = async (plan: any) => {
 if (!confirm("هل تريد إعادة توليد هذه الخطة؟ سيتم توليد واحدة جديدة وستحل محل المسودة الحالية عند وصولها.")) return;
 setViewingPlan(null);
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
 const planType = plan.type === "workout" ? "workout" : "nutrition";
 await queuePlanJob(planType, clientContext, undefined, plan);
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
 <div className="space-y-4">
 {/* Quick stats row */}
 <div className="grid gap-4 sm:grid-cols-3">
 <Card className="p-5 shadow-card">
 <div className="flex items-center justify-between">
 <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{t("coach.subscription")}</span>
 <CreditCard className="h-4 w-4 text-primary" />
 </div>
 {sub ? (
 <>
 <p className="mt-3 font-display text-lg font-bold">
 {/* Try new MEMBERSHIPS table first, fall back to legacy TIERS */}
 {(() => {
 const m = MEMBERSHIPS.find((x) => x.id === sub.tier);
 if (m) return lang === "ar" ? m.nameAr : m.nameEn;
 const legacy = getTier(sub.tier as any);
 if (legacy) return t(legacy.nameKey);
 return sub.tier || "—";
 })()}
 </p>
 {/* Show subscription status badge */}
 {sub.status && (
 <span
 className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-medium ${
 sub.status === "active"
 ? "bg-[#34c759]/10 text-[#34c759]"
 : sub.status === "pending"
 ? "bg-[#ff9500]/10 text-[#ff9500]"
 : "bg-[#6e6e73]/10 text-[#6e6e73]"
 }`}
 >
 {sub.status === "active"
 ? lang === "ar" ? "مؤكد" : "Confirmed"
 : sub.status === "pending"
 ? lang === "ar" ? "بانتظار التأكيد" : "Pending"
 : sub.status}
 </span>
 )}
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

 {/* Apple Health-style metrics dashboard */}
 <HealthMetricsDashboard
 progress={progress}
 questionnaire={nutriQ?.data}
 />
 </div>
 )}

 {tab === "subscription" && (
 <>
 {/* All subscriptions list — shows every sub the client has */}
 <Card className="mb-4 p-6 shadow-card">
 <div className="flex items-center justify-between">
 <h2 className="text-lg font-semibold">
 {lang === "ar" ? "كل الاشتراكات" : "All Subscriptions"}
 </h2>
 <span className="rounded-full bg-[#f5f5f7] px-3 py-1 text-xs font-normal text-[#6e6e73]">
 {allSubs.length} {lang === "ar" ? "اشتراك" : "subscriptions"}
 </span>
 </div>

 {allSubs.length === 0 ? (
 <p className="mt-4 text-sm text-muted-foreground">
 {lang === "ar" ? "مفيش اشتراكات بعد." : "No subscriptions yet."}
 </p>
 ) : (
 <div className="mt-4 space-y-3">
 {allSubs.map((s) => {
 const tierInfo = MEMBERSHIPS.find((m) => m.id === s.tier);
 const tierAr = tierInfo?.nameAr || s.tier;
 const tierEn = tierInfo?.nameEn || s.tier;
 const isActive = s.status === "active" && (!s.end_date || new Date(s.end_date).getTime() > Date.now());
 return (
 <div key={s.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-[#f5f5f7] p-4">
 <div className="min-w-0 flex-1">
 <div className="flex items-center gap-2">
 <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
 s.tier === "premium" ? "bg-[#0071e3]/10 text-[#0071e3]"
 : s.tier === "pro" ? "bg-[#1d1d1f]/10 text-[#1d1d1f]"
 : s.tier === "coaching" ? "bg-[#8b5cf6]/10 text-[#8b5cf6]"
 : "bg-[#f5f5f7] text-[#6e6e73]"
 }`}>
 {lang === "ar" ? tierAr : tierEn}
 </span>
 <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
 isActive ? "bg-[#34c759]/10 text-[#34c759]"
 : "bg-[#6e6e73]/10 text-[#6e6e73]"
 }`}>
 {isActive
 ? (lang === "ar" ? "مؤكد" : "Active")
 : s.status === "pending"
 ? (lang === "ar" ? "بانتظار" : "Pending")
 : (lang === "ar" ? "منتهي" : "Expired")}
 </span>
 </div>
 <p className="mt-1 text-xs font-normal text-[#6e6e73]" dir="ltr">
 {s.start_date ? new Date(s.start_date).toLocaleDateString() : "—"} → {s.end_date ? new Date(s.end_date).toLocaleDateString() : "—"}
 </p>
 </div>
 <div className="text-end">
 <p className="text-sm font-medium">{s.months} {lang === "ar" ? "شهر" : "months"}</p>
 </div>
 </div>
 );
 })}
 </div>
 )}
 </Card>

 {/* Add / update subscription form */}
 <Card className="p-6 shadow-card">
 <h2 className="text-lg font-semibold">{t("coach.subscriptionMgmt")}</h2>
 <p className="mt-1 text-sm font-normal text-[#6e6e73]">
 {lang === "ar"
 ? "حصّل من العميل بره الموقع (كاش / فودافون كاش / انستاباي) ثم فعّل اشتراكه من هنا — التفعيل هيخصم رسوم العميل من محفظتك (شهر 6$ — ٣ شهور 16$، اشحنها من صفحة محفظتي)، والعميل هيوصل إشعار فورًا."
 : "Collect from the client outside the site (cash / Vodafone Cash / InstaPay), then activate here — activation debits the per-client fee from your wallet (1 month $6 — 3 months $16; top up from My Wallet), and the client is notified instantly."}
 </p>
 <p className="mt-1 text-sm font-normal text-[#6e6e73]">
 {lang === "ar"
 ? "لو العميل عنده اشتراك بنفس النوع، المدة هتتجمع على المتبقي. لو نوع مختلف، هيتضاف كاشتراك جديد."
 : "Same tier extends the remaining days; a different tier is added as a new subscription."}
 </p>
 <div className="mt-4 grid gap-4 sm:grid-cols-2">
 <div>
 <Label>{t("checkout.plan")}</Label>
 <div className="mt-1.5 grid grid-cols-2 gap-2 sm:grid-cols-3">
 {/* OWNER BOUNDARY: the coach sells ONLY his coaching package —
 premium/pro are SITE memberships. Admins keep the full picker. */}
 {(isAdmin ? ALL_TIERS : ALL_TIERS.filter((tierObj) => tierObj.id === "coaching")).map((tierObj) => (
 <button
 key={tierObj.id}
 onClick={() => setTier(tierObj.id)}
 className={cn(
 "rounded-xl border p-3 text-sm font-medium transition-colors",
 tier === tierObj.id ? "border-primary bg-secondary text-primary" : "border-border hover:border-primary/40",
 )}
 >
 {lang === "ar" ? tierObj.nameAr : tierObj.nameEn}
 </button>
 ))}
 </div>
 </div>
 <div>
 <Label>{t("checkout.duration")}</Label>
 {/* OWNER PRICING (2026-08-30, GLOBAL USD): $6 / client-month,
 $16 for 3 months — package prices shown on the buttons. */}
 <div className="mt-1.5 grid grid-cols-2 gap-2">
 {([1, 3] as Duration[]).map((d) => {
 const pkg = COACH_CLIENT_PACKAGES.find((p) => p.months === d);
 return (
 <button
 key={d}
 onClick={() => setMonths(d)}
 className={cn(
 "rounded-xl border p-3 text-sm font-medium transition-colors",
 months === d ? "border-primary bg-secondary text-primary" : "border-border hover:border-primary/40",
 )}
 >
 {d} {t("pricing.months")}
 {pkg && (
 <span className="mt-0.5 block text-xs font-normal text-[#6e6e73]" dir="ltr">
 {pkg.priceUsd}$
 </span>
 )}
 </button>
 );
 })}
 </div>
 </div>
 {/* 0043 OWNER FIX — computed dates preview (replaces the two manual
     date inputs). Mirrors extend_subscription (0018): an ACTIVE same-tier
     subscription stacks the new months on its remaining end_date;
     otherwise the subscription starts now and ends now + months. */}
 <div className="sm:col-span-2">
 <Label>{t("coach.datesAutoTitle")}</Label>
 <div className="mt-1.5 rounded-xl border border-border bg-[#f5f5f7] p-4 text-sm">
 <p className="font-medium text-[#1d1d1f]" dir="ltr">
 {(() => {
 const activeSameTier = allSubs.find(
 (x: any) =>
 x.tier === tier &&
 x.status === "active" &&
 x.end_date &&
 new Date(x.end_date).getTime() > Date.now(),
 );
 const base = activeSameTier ? new Date(activeSameTier.end_date) : new Date();
 const end = new Date(base);
 end.setMonth(end.getMonth() + months);
 const endStr = end.toLocaleDateString(isAr ? "ar-EG" : "en-US");
 return activeSameTier
 ? (isAr
 ? `اشتراك شغال بنفس النوع — المدة بتتجمع على المتبقي، الجديد هينتهي: ${endStr}`
 : `Same-tier subscription active — months stack on the remaining time; new end: ${endStr}`)
 : (isAr
 ? `هيبدأ: اليوم → هينتهي: ${endStr}`
 : `Starts today → ends: ${endStr}`);
 })()}
 </p>
 <p className="mt-1 text-xs font-normal text-[#6e6e73]">
 {t("coach.datesAutoHint")}
 </p>
 </div>
 </div>
 <div>
 <Label htmlFor="pay-amount">{isAr ? "المبلغ اللي اتاخد من العميل (اختياري)" : "Amount collected (optional)"}</Label>
 <Input
 id="pay-amount"
 type="number"
 min="0"
 step="1"
 dir="ltr"
 value={payAmount}
 onChange={(e) => setPayAmount(e.target.value)}
 placeholder="0"
 className="mt-1.5"
 />
 </div>
 <div>
 <Label htmlFor="pay-method">{isAr ? "طريقة الدفع" : "Payment method"}</Label>
 <select
 id="pay-method"
 value={payMethod}
 onChange={(e) => setPayMethod(e.target.value as CoachPaymentMethod)}
 className="mt-1.5 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
 >
 {COACH_PAYMENT_METHODS.map((m) => (
 <option key={m.id} value={m.id}>
 {isAr ? m.ar : m.en}
 </option>
 ))}
 </select>
 </div>
 <div className="sm:col-span-2">
 <Label htmlFor="pay-note">{isAr ? "ملاحظة (اختياري)" : "Note (optional)"}</Label>
 <Input
 id="pay-note"
 value={payNote}
 onChange={(e) => setPayNote(e.target.value)}
 maxLength={500}
 className="mt-1.5"
 placeholder={isAr ? "مثال: دفعة أولى — باقي ٥٠٠" : "e.g. first installment — 500 remaining"}
 />
 </div>
 </div>
 <Button className="mt-5" onClick={updateSub} disabled={savingSub}>
 {savingSub ? t("common.saving") : t("coach.updateSub")}
 </Button>
 </Card>
 </>
 )}

 {tab === "plans" && (
 <div className="space-y-6">
 {!planGateOpen && (
 <div className="rounded-xl border border-[#ff9500]/30 bg-[#ff9500]/10 p-4 text-sm font-medium text-[#b45309]">
 {planGateMessage}
 </div>
 )}
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
 <div className="mt-4 flex flex-wrap gap-2">
 <Button className="gap-2" onClick={uploadPlan} disabled={uploading || normalizing || !planTitle.trim()}>
 <Upload className="h-4 w-4" />
 {uploading ? t("common.uploading") : t("common.upload")}
 </Button>
 <Button
 variant="outline"
 className="gap-2 border-primary/30 text-primary"
 onClick={normalizeAndUpload}
 disabled={normalizing || uploading || !planTitle.trim() || !planNotes.trim()}
 title="حوّل النص اللي كتبته/لصقته في حقل الملاحظات إلى خطة منظمة قابلة للتعديل وإعادة توليد الوجبات"
 >
 {normalizing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
 {normalizing ? "جارٍ التنسيق..." : "تنسيق وترتيب تلقائي"}
 </Button>
 </div>
 <p className="mt-2 text-[11px] text-muted-foreground">
 <strong>تنسيق وترتيب تلقائي:</strong> لو عندك خطة مكتوبة (من PDF أو وورد)، الصقها في حقل الملاحظات واضغط الزر — هتتحوّل لجدول منظّم قابل للتعديل، والعميل هيقدر يبدّل الوجبات.
 </p>
 </Card>

 <div className="space-y-3">
 {plans.map((p) => (
 <Card key={p.id} className="flex items-center justify-between gap-3 p-4 shadow-card">
 <div className="flex items-center gap-3">
 {p.type === "meal" ? <Salad className="h-5 w-5 text-primary" /> : <Dumbbell className="h-5 w-5 text-primary" />}
 <div>
 <div className="font-medium">{p.title}</div>
 <div className="flex items-center gap-2 text-xs text-muted-foreground">
 <span>{new Date(p.created_at).toLocaleDateString()}</span>
 {p.status === "draft" && <Badge variant="outline" className="border-warning text-warning">مسودة</Badge>}
 {p.is_current && <Badge variant="outline" className="border-success text-success">مُفعّلة</Badge>}
 {p.notes === "Generated by AI" && <Badge variant="outline" className="border-primary/30 bg-primary/5 text-primary"><Sparkles className="me-1 h-3 w-3" />AI</Badge>}
 </div>
 </div>
 </div>
 <div className="flex items-center gap-2">
 <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setViewingPlan(p)}>
 <Eye className="h-3.5 w-3.5" />
 عرض
 </Button>
 <Button size="sm" variant="ghost" onClick={() => removePlan(p.id)} className="text-destructive hover:text-destructive">
 <Trash2 className="h-4 w-4" />
 </Button>
 </div>
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
 {!planGateOpen && (
 <div className="rounded-xl border border-[#ff9500]/30 bg-[#ff9500]/10 p-4 text-sm font-medium text-[#b45309]">
 {planGateMessage}
 </div>
 )}
 <CoachAIPlanGenerator
 generating={generating}
 onGenerate={generateAIPlan}
 t={t}
 quota={aiUsage}
 lang={lang}
 />

 {/* T-4PILLAR-COMPLETE: live status of queued plan jobs for THIS client.
     Results materialize automatically — even after a reload. */}
 {pendingPlanJobs.filter((e) => e.clientId === clientId).length > 0 && (
 <Card className="border-primary/30 bg-primary/5 p-4 shadow-card">
 <div className="flex items-center gap-2 text-sm font-semibold">
 <Loader2 className="h-4 w-4 animate-spin text-primary" />
 خطط قيد التوليد في الخلفية
 </div>
 <div className="mt-3 space-y-2">
 {pendingPlanJobs
 .filter((e) => e.clientId === clientId)
 .map((e) => (
 <div key={e.id} className="flex items-center justify-between gap-3 rounded-xl border border-border bg-background px-3 py-2 text-sm">
 <div className="flex items-center gap-2">
 {e.kind === "workout" ? <Dumbbell className="h-4 w-4 text-primary" /> : <Salad className="h-4 w-4 text-primary" />}
 <span>{e.kind === "workout" ? "برنامج تمارين" : "خطة تغذية"}</span>
 {e.replacePlanId && (
 <Badge variant="outline" className="border-warning/40 text-warning">إعادة توليد</Badge>
 )}
 </div>
 <span className="text-xs text-muted-foreground">
 منذ {Math.max(1, Math.round((Date.now() - e.createdAt) / 60000))} دقيقة — تُحفظ تلقائيًا كمسودة عند الوصول
 </span>
 </div>
 ))}
 </div>
 </Card>
 )}

 {/* T-4PILLAR-COMPLETE: stranded-jobs recovery — finished plan jobs that
     never materialized (lost watcher / tab closed before the fix). */}
 {recoverableJobs.filter((j) => j.payload?.clientId === clientId).length > 0 && (
 <Card className="border-warning/40 bg-warning/5 p-4 shadow-card">
 <div className="flex items-center justify-between gap-3">
 <div className="flex items-center gap-2 text-sm font-semibold text-warning">
 <Sparkles className="h-4 w-4" />
 خطط جاهزة لم تُحفظ — استرجاع بنقرة
 </div>
 <Button size="sm" variant="ghost" onClick={() => void scanRecoverableJobs()} className="h-7 text-xs">
 تحديث
 </Button>
 </div>
 <div className="mt-3 space-y-2">
 {recoverableJobs
 .filter((j) => j.payload?.clientId === clientId)
 .map((j) => (
 <div key={j.id} className="flex items-center justify-between gap-3 rounded-xl border border-border bg-background px-3 py-2 text-sm">
 <div className="flex items-center gap-2">
 {planJobTypeToKind(j.job_type) === "workout" ? <Dumbbell className="h-4 w-4 text-primary" /> : <Salad className="h-4 w-4 text-primary" />}
 <span>{planJobTypeToKind(j.job_type) === "workout" ? "برنامج تمارين" : "خطة تغذية"}</span>
 <span className="text-xs text-muted-foreground">
 وصلت {new Date(j.finished_at || j.created_at).toLocaleString(isAr ? "ar-EG" : "en-US", { hour: "2-digit", minute: "2-digit", day: "numeric", month: "short" })}
 </span>
 </div>
 <Button
 size="sm"
 className="gap-1.5"
 disabled={recoveringId === j.id}
 onClick={() => recoverPlanJob(j)}
 >
 {recoveringId === j.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
 حفظ كمسودة
 </Button>
 </div>
 ))}
 </div>
 </Card>
 )}

 {/* Show all plans (drafts + approved + archived) */}
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
 {plans.map((p) => {
 const isDraft = p.status === "draft";
 const isCurrent = p.is_current;
 return (
 <Card key={p.id} className={cn(
 "flex items-center justify-between gap-3 p-4 shadow-card",
 isDraft && "border-warning/40 bg-warning/5",
 isCurrent && "border-success/40",
 )}>
 <div className="flex items-center gap-3">
 {p.type === "meal" ? <Salad className="h-5 w-5 text-primary" /> : <Dumbbell className="h-5 w-5 text-primary" />}
 <div>
 <div className="font-medium">{p.title}</div>
 <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
 <span>{new Date(p.created_at).toLocaleDateString()}</span>
 {p.notes === "Generated by AI" && (
 <Badge variant="outline" className="border-primary/30 bg-primary/5 text-primary">
 <Sparkles className="me-1 h-3 w-3" /> AI
 </Badge>
 )}
 {isDraft && (
 <Badge variant="outline" className="border-warning text-warning">
 مسودة — بانتظار المراجعة
 </Badge>
 )}
 {isCurrent && (
 <Badge variant="outline" className="border-success text-success">
 مُفعّلة للعميل
 </Badge>
 )}
 {p.status === "archived" && (
 <Badge variant="outline" className="text-muted-foreground">
 أرشيف
 </Badge>
 )}
 </div>
 </div>
 </div>
 <div className="flex items-center gap-2">
 <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setViewingPlan(p)}>
 <Eye className="h-3.5 w-3.5" />
 عرض
 </Button>
 {isDraft && (
 <Button
 size="sm"
 className="gap-1.5"
 disabled={approving === p.id}
 onClick={() => handleApprovePlan(p.id)}
 >
 {approving === p.id ? (
 <Loader2 className="h-3.5 w-3.5 animate-spin" />
 ) : (
 <Check className="h-3.5 w-3.5" />
 )}
 موافقة وإرسال
 </Button>
 )}
 <Button size="sm" variant="ghost" onClick={() => removePlan(p.id)} className="text-destructive hover:text-destructive">
 <Trash2 className="h-4 w-4" />
 </Button>
 </div>
 </Card>
 );
 })}
 </div>
 )}
 </div>
 </div>
 )}

 {tab === "questionnaires" && (
 <div className="grid gap-4 md:grid-cols-2">
 <QuestionnaireCard
 title={t("coach.nutritionQ")}
 type="nutrition"
 data={nutriQ}
 clientId={clientId}
 t={t}
 onChanged={(row) => setNutriQ(row)}
 />
 <QuestionnaireCard
 title={t("coach.fitnessQ")}
 type="fitness"
 data={fitQ}
 clientId={clientId}
 t={t}
 onChanged={(row) => setFitQ(row)}
 />
 </div>
 )}

 {/* Quick notification button at top of notifications tab */}
 {tab === "notifications" && (
 <NotificationForm
   lang={lang}
   sendMode={{ kind: "single", userId: clientId }}
   className="rounded-3xl border border-[#d2d2d7] bg-[#f5f5f7] p-6"
   visible
 />
 )}

 {tab === "progress" && (
 <Card className="p-6 shadow-card">
 <h2 className="text-lg font-semibold">{t("prog.weightChart")}</h2>
 <div className="mt-4 h-64">
 {chartData.length > 0 ? (
 <ClientWeightChart data={chartData} />
 ) : (
 <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
 {t("prog.noEntries")}
 </div>
 )}
 </div>
 </Card>
 )}

 {/* Plan Detail Modal — shows full plan content (meals/exercises) */}
 {viewingPlan && (
 <PlanViewerModal
 plan={viewingPlan}
 onClose={() => setViewingPlan(null)}
 onRegenerate={() => handleRegeneratePlan(viewingPlan)}
 />
 )}
 </div>
 );
}

function QuestionnaireCard({
 title,
 type,
 data,
 clientId,
 t,
 onChanged,
}: {
 title: string;
 type: "nutrition" | "fitness";
 data: any;
 clientId: string;
 t: (k: string) => string;
 onChanged: (row: any) => void;
}) {
 const status = data?.status as string | undefined;
 const [editMode, setEditMode] = useState(false);
 const [form, setForm] = useState<Record<string, any>>(data?.data || {});
 const [saving, setSaving] = useState(false);

 // Sync form when data changes externally
 useEffect(() => {
 setForm(data?.data || {});
 }, [data]);

 const handleSave = async () => {
 setSaving(true);
 try {
 const { upsertQuestionnaire } = await import("@/lib/data");
 // Coach edits keep the current status (don't downgrade "approved" to "draft")
 const row = await upsertQuestionnaire(clientId, type, form, data?.status || "draft");
 onChanged(row);
 setEditMode(false);
 toast.success("تم حفظ التعديلات!");
 } catch (e: any) {
 toast.error(e.message || "فشل الحفظ");
 } finally {
 setSaving(false);
 }
 };

 // Field definitions — matches the client QuestionnairesView
 const isNutrition = type === "nutrition";
 const nutritionFields = [
 { key: "gender", label: "الجنس", type: "gender" as const },
 { key: "age", label: "العمر", type: "number" as const },
 { key: "height", label: "الطول (سم)", type: "number" as const },
 { key: "weight", label: "الوزن (كجم)", type: "number" as const },
 { key: "target_weight", label: "الوزن المستهدف", type: "number" as const },
 { key: "waist", label: "محيط الخصر", type: "number" as const },
 { key: "neck", label: "محيط الرقبة", type: "number" as const },
 { key: "hip", label: "محيط الورك", type: "number" as const },
 { key: "diet", label: "النظام الغذائي", type: "text" as const },
 { key: "allergies", label: "حساسية", type: "text" as const },
 { key: "disliked", label: "أطعمة غير مرغوبة", type: "text" as const },
 { key: "meals", label: "وجبات/يوم", type: "number" as const },
 { key: "water", label: "ماء (لتر/يوم)", type: "number" as const },
 { key: "medical", label: "حالات طبية", type: "text" as const },
 { key: "supplements", label: "مكملات", type: "text" as const },
 ];
 const fitnessFields = [
 { key: "goal", label: "الهدف", type: "text" as const },
 { key: "activity", label: "مستوى النشاط", type: "select" as const, options: ["sedentary","light","moderate","active","very_active","extra_active"] as const },
 { key: "days", label: "أيام التدريب", type: "number" as const },
 { key: "location", label: "مكان التدريب", type: "text" as const },
 { key: "experience", label: "الخبرة", type: "text" as const },
 { key: "injuries", label: "إصابات", type: "text" as const },
 { key: "preferred", label: "نوع التدريب المفضل", type: "text" as const },
 { key: "equipment", label: "المعدات", type: "text" as const },
 { key: "sleep", label: "النوم (ساعات)", type: "number" as const },
 ];
 const fields = isNutrition ? nutritionFields : fitnessFields;
 const activityLabels: Record<string, string> = {
 sedentary: "خامل", light: "خفيف", moderate: "متوسط",
 active: "نشط", very_active: "نشط جداً", extra_active: "فوق العادي",
 };

 return (
 <Card className="p-5 shadow-card">
 <div className="mb-3 flex items-center justify-between gap-2">
 <h3 className="font-semibold">{title}</h3>
 <div className="flex items-center gap-2">
 {status && (
 <Badge variant="outline">
 {t(`q.status.${status}`)}
 </Badge>
 )}
 {!editMode ? (
 <Button size="sm" variant="outline" className="gap-1.5 h-7" onClick={() => setEditMode(true)}>
 <Pencil className="h-3 w-3" /> تعديل
 </Button>
 ) : (
 <>
 <Button size="sm" className="gap-1.5 h-7" onClick={handleSave} disabled={saving}>
 {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />} حفظ
 </Button>
 <Button size="sm" variant="ghost" className="h-7" onClick={() => { setEditMode(false); setForm(data?.data || {}); }}>
 إلغاء
 </Button>
 </>
 )}
 </div>
 </div>
 {!data && !editMode ? (
 <p className="text-sm text-muted-foreground">{t("coach.noQ")}</p>
 ) : editMode ? (
 <div className="grid gap-3 sm:grid-cols-2">
 {fields.map((f) => {
 if (f.type === "gender") {
 return (
 <div key={f.key}>
 <Label className="text-xs text-muted-foreground">{f.label}</Label>
 <div className="mt-1 grid grid-cols-2 gap-1.5">
 <button
 type="button"
 onClick={() => setForm((p) => ({ ...p, [f.key]: "male" }))}
 className={`rounded-lg border p-2 text-xs font-medium ${form[f.key] === "male" ? "border-primary bg-secondary text-primary" : "border-border"}`}
 > ذكر</button>
 <button
 type="button"
 onClick={() => setForm((p) => ({ ...p, [f.key]: "female" }))}
 className={`rounded-lg border p-2 text-xs font-medium ${form[f.key] === "female" ? "border-primary bg-secondary text-primary" : "border-border"}`}
 > أنثى</button>
 </div>
 </div>
 );
 }
 if (f.type === "select") {
 return (
 <div key={f.key} className="sm:col-span-2">
 <Label className="text-xs text-muted-foreground">{f.label}</Label>
 <select
 value={form[f.key] ?? ""}
 onChange={(e) => setForm((p) => ({ ...p, [f.key]: e.target.value }))}
 className="mt-1 w-full rounded-lg border border-border bg-card px-2 py-1.5 text-sm h-8"
 >
 <option value="">— اختر —</option>
 {f.options.map((opt) => (
 <option key={opt} value={opt}>{activityLabels[opt] || opt}</option>
 ))}
 </select>
 </div>
 );
 }
 return (
 <div key={f.key}>
 <Label className="text-xs text-muted-foreground">{f.label}</Label>
 <Input
 type={f.type === "number" ? "number" : "text"}
 value={form[f.key] ?? ""}
 onChange={(e) => setForm((p) => ({ ...p, [f.key]: e.target.value }))}
 className="mt-1 h-8 text-sm"
 />
 </div>
 );
 })}
 <div className="sm:col-span-2">
 <Label className="text-xs text-muted-foreground">ملاحظات</Label>
 <Textarea
 value={form.notes ?? ""}
 onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
 className="mt-1 min-h-[60px] text-sm"
 />
 </div>
 {/* Show photos (read-only — coach can view but not upload from here) */}
 {isNutrition && form.photos?.length > 0 && (
 <div className="sm:col-span-2">
 <Label className="text-xs text-muted-foreground">صور العميل</Label>
 <div className="mt-1 grid grid-cols-3 gap-2">
 {form.photos.map((url: string, i: number) => (
 <a key={i} href={url} target="_blank" rel="noreferrer" className="relative aspect-square overflow-hidden rounded-lg border border-border">
 <Image src={url} alt={`صورة ${i + 1}`} fill className="object-cover" />
 </a>
 ))}
 </div>
 </div>
 )}
 </div>
 ) : (
 <div className="space-y-2 text-sm">
 {Object.entries(data?.data || {}).filter(([k]) => k !== "photos").map(([k, v]: [string, any]) => {
 // Friendlier labels for known keys
 const labelMap: Record<string, string> = {
 gender: "الجنس", age: "العمر", height: "الطول", weight: "الوزن",
 target_weight: "الوزن المستهدف", waist: "الخصر", neck: "الرقبة", hip: "الورك",
 diet: "النظام الغذائي", allergies: "حساسية", disliked: "غير مرغوب",
 meals: "وجبات/يوم", water: "ماء", medical: "حالات طبية", supplements: "مكملات",
 notes: "ملاحظات", goal: "الهدف", activity: "النشاط", days: "أيام التدريب",
 location: "المكان", experience: "الخبرة", injuries: "إصابات",
 preferred: "التدريب المفضل", equipment: "المعدات", sleep: "النوم",
 };
 const displayValue = k === "gender" ? (v === "male" ? "ذكر" : v === "female" ? "أنثى" : v)
 : k === "activity" ? (activityLabels[v] || v)
 : String(v) || "—";
 return (
 <div key={k} className="flex justify-between gap-3 border-b border-border/60 pb-1.5">
 <span className="text-muted-foreground">{labelMap[k] || k}</span>
 <span className="font-medium text-end">{displayValue}</span>
 </div>
 );
 })}
 {/* Show photos */}
 {isNutrition && data?.data?.photos?.length > 0 && (
 <div className="pt-2">
 <span className="text-muted-foreground">صور العميل:</span>
 <div className="mt-2 grid grid-cols-3 gap-2">
 {data.data.photos.map((url: string, i: number) => (
 <a key={i} href={url} target="_blank" rel="noreferrer" className="relative aspect-square overflow-hidden rounded-lg border border-border">
 <Image src={url} alt={`صورة ${i + 1}`} fill className="object-cover" />
 </a>
 ))}
 </div>
 </div>
 )}
 </div>
 )}
 </Card>
 );
}


function PlanViewerModal({ plan, onClose, onRegenerate }: { plan: any; onClose: () => void; onRegenerate?: () => void }) {
 const { t } = useI18n();
 const [editMode, setEditMode] = useState(false);
 const [title, setTitle] = useState(plan.title);
 const [notes, setNotes] = useState(plan.notes || "");
 const [content, setContent] = useState<any>(plan.content ? JSON.parse(JSON.stringify(plan.content)) : null);
 const [saving, setSaving] = useState(false);
 const isWorkout = plan.type === "workout";

 // T-4PILLAR-COMPLETE: per-exercise AI swap inside the coach editor —
 // same injury-safe library-filtered job the client side uses, wired
 // through runAiJob (blocking is fine here: the modal is the destination).
 const [regeneratingExKey, setRegeneratingExKey] = useState<string | null>(null);
 const swapExerciseAI = async (dayIdx: number, exIdx: number, focus?: string) => {
 const ex = content?.days?.[dayIdx]?.exercises?.[exIdx];
 if (!ex) return;
 setRegeneratingExKey(`${dayIdx}-${exIdx}`);
 try {
 // Swaps run on the GitHub Actions queue; the sanitized payload
 // carries name/sets/reps/rest/focus only.
 const { result } = await runAiJob("exercise_regenerate", {
 exercise: { name: ex.name, sets: ex.sets, reps: ex.reps, rest: ex.rest, focus },
 });
 const rep = result?.replacement;
 if (!rep?.name) throw new Error("لم يتم إرجاع بديل صالح من الذكاء الاصطناعي");
 const newContent = { ...content };
 newContent.days = [...newContent.days];
 newContent.days[dayIdx] = { ...newContent.days[dayIdx] };
 newContent.days[dayIdx].exercises = [...newContent.days[dayIdx].exercises];
 newContent.days[dayIdx].exercises[exIdx] = { ...newContent.days[dayIdx].exercises[exIdx], ...rep };
 setContent(newContent);
 toast.success("تم استبدال التمرين ببديل آمن ✅ — اضغط \"حفظ\" لتثبيت التعديل.");
 } catch (e: any) {
 toast.error(e.message || "فشل استبدال التمرين");
 } finally {
 setRegeneratingExKey(null);
 }
 };

 const handleSave = async () => {
 setSaving(true);
 try {
 const { updatePlan } = await import("@/lib/data");
 await updatePlan(plan.id, { title, notes, content });
 // Mutating a prop is forbidden by react-hooks/immutability — use a local
 // copy so the UI updates without modifying the source object.
 const updated = { ...plan, title, notes, content };
 Object.assign(plan, updated);
 toast.success("تم حفظ التعديلات بنجاح!");
 setEditMode(false);
 } catch (e: any) {
 toast.error(e.message || "فشل الحفظ");
 } finally {
 setSaving(false);
 }
 };

 // Download plan as PDF — opens a print-optimized window with the full
 // plan content rendered in the PDF reference style. The browser's print
 // dialog lets the user save as PDF.
 const downloadPlanPDF = () => {
 const w = window.open("", "_blank", "width=820,height=1040");
 if (!w) {
 toast.error("المتصفح حظر النافذة المنبثقة. اسمح بالنوافذ المنبثقة ثم حاول مرة أخرى.");
 return;
 }
 const c = content;
 const isWorkout = plan.type === "workout";
 let html = `<!doctype html><html dir="rtl" lang="ar"><head><meta charset="utf-8"><title>${title}</title>
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
<h1>${title}</h1>`;

 // Overview
 if (c?.overview) {
 html += `<p style="white-space:pre-line">${c.overview}</p>`;
 }

 if (!isWorkout && c) {
 // Data analysis
 if (c.data_analysis) {
 const da = c.data_analysis;
 html += `<h2> تحليل البيانات</h2><div class="analysis"><div class="analysis-grid">`;
 if (da.gender) html += `<div class="analysis-item"><span class="analysis-label">الجنس:</span> ${da.gender}</div>`;
 if (da.weight) html += `<div class="analysis-item"><span class="analysis-label">الوزن:</span> ${da.weight}</div>`;
 if (da.height) html += `<div class="analysis-item"><span class="analysis-label">الطول:</span> ${da.height}</div>`;
 if (da.age) html += `<div class="analysis-item"><span class="analysis-label">العمر:</span> ${da.age}</div>`;
 if (da.neck) html += `<div class="analysis-item"><span class="analysis-label">الرقبة:</span> ${da.neck}</div>`;
 if (da.waist) html += `<div class="analysis-item"><span class="analysis-label">الخصر:</span> ${da.waist}</div>`;
 if (da.hip) html += `<div class="analysis-item"><span class="analysis-label">الورك:</span> ${da.hip}</div>`;
 if (da.activity) html += `<div class="analysis-item"><span class="analysis-label">النشاط:</span> ${da.activity}</div>`;
 if (da.health) html += `<div class="analysis-item"><span class="analysis-label">الصحة:</span> ${da.health}</div>`;
 if (da.body_fat_pct) html += `<div class="analysis-item"><span class="analysis-label">نسبة الدهون:</span> ${da.body_fat_pct}</div>`;
 if (da.bmr) html += `<div class="analysis-item"><span class="analysis-label">BMR:</span> ~${da.bmr} سعرة</div>`;
 if (da.tdee) html += `<div class="analysis-item"><span class="analysis-label">TDEE:</span> ~${da.tdee} سعرة</div>`;
 html += `</div></div>`;
 }

 // Macros
 if (c.daily_calories || c.macros) {
 html += `<h2> السعرات والماكروز</h2><div class="stats">`;
 if (c.daily_calories) html += `<div class="stat"><span class="stat-label">السعرات اليومية</span><span class="stat-value">${c.daily_calories}</span></div>`;
 if (c.macros?.protein_g) html += `<div class="stat"><span class="stat-label">بروتين</span><span class="stat-value">${c.macros.protein_g}جم</span></div>`;
 if (c.macros?.carbs_g) html += `<div class="stat"><span class="stat-label">كارب</span><span class="stat-value">${c.macros.carbs_g}جم</span></div>`;
 if (c.macros?.fat_g) html += `<div class="stat"><span class="stat-label">دهون</span><span class="stat-value">${c.macros.fat_g}جم</span></div>`;
 html += `</div>`;
 }

 // Supplements
 if (c.supplements?.length > 0) {
 html += `<h2> المكملات والتوصيات الصحية</h2>`;
 for (const s of c.supplements) {
 html += `<div class="supplement"><div class="supplement-name">${s.name}</div>`;
 if (s.dose) html += `<div>الجرعة: ${s.dose}</div>`;
 if (s.timing) html += `<div>الموعد: ${s.timing}</div>`;
 if (s.purpose) html += `<div>الهدف: ${s.purpose}</div>`;
 html += `</div>`;
 }
 }

 // Health notes
 if (c.health_notes?.length > 0) {
 html += `<h2> توصيات صحية خاصة</h2>`;
 for (const n of c.health_notes) {
 html += `<div class="health-note">${n}</div>`;
 }
 }

 // Water target
 if (c.water_target) {
 html += `<h2> استهلاك الماء</h2><p>${c.water_target}</p>`;
 }

 // Meals
 if (c.meals?.length > 0) {
 html += `<h2> النظام الغذائي</h2>`;
 for (const m of c.meals) {
 html += `<h3>${m.name}${m.time ? ` <span style="font-size:11px;color:#666;font-weight:400">${m.time}</span>` : ""}</h3>`;
 html += `<table><tr><th style="width:30px">#</th><th>المكون</th><th>الكمية</th><th>السعرات</th><th>البدائل</th></tr>`;
 (m.items || []).forEach((it: any, i: number) => {
 html += `<tr><td>${i + 1}</td><td>${it.food}</td><td>${it.amount}</td><td>${it.calories}</td><td style="font-size:11px;color:#666">${it.alternatives || "—"}</td></tr>`;
 });
 if (m.total_calories || m.total_protein_g) {
 html += `<tr class="meal-total"><td colspan="3">إجمالي الوجبة: ~${m.total_calories || (m.items || []).reduce((s: number, i: any) => s + (i.calories || 0), 0)} سعرة</td><td>${m.total_protein_g || ""} ${m.total_protein_g ? "جم بروتين" : ""}</td><td></td></tr>`;
 }
 html += `</table>`;
 if (m.notes) html += `<p style="font-size:12px;color:#666"> ${m.notes}</p>`;
 }
 }
 } else if (isWorkout && c?.days) {
 // Workout volume + progression
 if (c.weekly_volume || c.progression) {
 html += `<h2> الحجم والتقدم</h2>`;
 if (c.weekly_volume) html += `<p><strong>الحجم الأسبوعي:</strong> ${c.weekly_volume}</p>`;
 if (c.progression) html += `<p><strong>طريقة التقدم:</strong> ${c.progression}</p>`;
 }
 // Days
 html += `<h2> البرنامج الأسبوعي</h2>`;
 for (const d of c.days) {
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
 imgHtml += `<img src="${url}" alt="${ex.name}" style="width:60px;height:60px;object-fit:contain;border:1px solid #e2e2e2;border-radius:6px;background:#fafafa" onerror="this.style.display='none'">`;
 });
 imgHtml += `</div>`;
 }
 html += `<tr><td>${i + 1}</td><td>${imgHtml}<strong>${ex.name}</strong>${ex.notes ? `<br><span style="font-size:11px;color:#666">${ex.notes}</span>` : ""}</td><td style="color:#0071e3;font-weight:700">${ex.sets}</td><td style="color:#34c759;font-weight:700">${ex.reps}</td><td style="color:#ff9500;font-weight:700">${ex.rest}</td></tr>`;
 });
 html += `</table>`;
 }
 }
 }

 // General notes
 if (notes && notes !== "Generated by AI" && notes !== "Coach-added (structured)") {
 html += `<h2> ملاحظات عامة</h2><p>${notes}</p>`;
 }

 html += `<div class="footer">© ${new Date().getFullYear()} Musclehubeg | musclehubeg.vercel.app<br>هذا التقرير مُعد لأغراض إرشادية — يُرجى استشارة طبيب مختص قبل بدء أي نظام غذائي أو تناول مكملات.</div>`;
 html += `</body></html>`;
 w.document.write(html);
 w.document.close();
 w.focus();
 setTimeout(() => w.print(), 500);
 };


 // Helper to update nested content fields
 const updateField = (path: string, value: any) => {
 const newContent = { ...content };
 const keys = path.split(".");
 let obj = newContent;
 for (let i = 0; i < keys.length - 1; i++) {
 obj[keys[i]] = { ...obj[keys[i]] };
 obj = obj[keys[i]];
 }
 obj[keys[keys.length - 1]] = value;
 setContent(newContent);
 };

 // Update meal item — auto-calculates calories from the food database when
 // the coach edits the food name or amount. This keeps totals consistent
 // with the system even for manual edits.
 const updateMealItem = async (mealIdx: number, itemIdx: number, field: string, value: string) => {
 const newContent = { ...content };
 newContent.meals = [...newContent.meals];
 newContent.meals[mealIdx] = { ...newContent.meals[mealIdx] };
 newContent.meals[mealIdx].items = [...newContent.meals[mealIdx].items];
 newContent.meals[mealIdx].items[itemIdx] = { ...newContent.meals[mealIdx].items[itemIdx] };

 if (field === "calories") {
 newContent.meals[mealIdx].items[itemIdx][field] = parseInt(value) || 0;
 } else {
 newContent.meals[mealIdx].items[itemIdx][field] = value;
 // Auto-calc calories when food or amount changes
 if (field === "food" || field === "amount") {
 try {
 const res = await fetch(`/api/food-search?q=${encodeURIComponent(newContent.meals[mealIdx].items[itemIdx].food || "")}`);
 if (res.ok) {
 const data = await res.json();
 const match = data.results?.[0];
 if (match) {
 const grams = parseInt(newContent.meals[mealIdx].items[itemIdx].amount?.replace(/[^0-9]/g, "") || "100") || 100;
 const factor = grams / 100;
 newContent.meals[mealIdx].items[itemIdx].calories = Math.round(match.per100g.calories * factor);
 newContent.meals[mealIdx].items[itemIdx].protein_g = Math.round(match.per100g.protein * factor);
 newContent.meals[mealIdx].items[itemIdx].carbs_g = Math.round(match.per100g.carbs * factor);
 newContent.meals[mealIdx].items[itemIdx].fat_g = Math.round(match.per100g.fat * factor);
 }
 }
 } catch {
 // food-search failed — skip auto-calc
 }
 }
 }

 // === Recompute meal totals (calories + protein + carbs + fat) ===
 const mealItems = newContent.meals[mealIdx].items;
 newContent.meals[mealIdx].total_calories = mealItems.reduce((s, i) => s + (i.calories || 0), 0);
 newContent.meals[mealIdx].total_protein_g = mealItems.reduce((s, i) => s + (i.protein_g || 0), 0);
 newContent.meals[mealIdx].total_carbs_g = mealItems.reduce((s, i) => s + (i.carbs_g || 0), 0);
 newContent.meals[mealIdx].total_fat_g = mealItems.reduce((s, i) => s + (i.fat_g || 0), 0);

 // === Recompute plan totals (daily_calories + macros) ===
 const allMeals = newContent.meals;
 newContent.daily_calories = allMeals.reduce((s, m) => s + (m.total_calories || 0), 0);
 if (newContent.macros) {
 newContent.macros.protein_g = allMeals.reduce((s, m) => s + (m.total_protein_g || 0), 0);
 newContent.macros.carbs_g = allMeals.reduce((s, m) => s + (m.total_carbs_g || 0), 0);
 newContent.macros.fat_g = allMeals.reduce((s, m) => s + (m.total_fat_g || 0), 0);
 newContent.macros.protein_cal = newContent.macros.protein_g * 4;
 newContent.macros.carbs_cal = newContent.macros.carbs_g * 4;
 newContent.macros.fat_cal = newContent.macros.fat_g * 9;
 }

 setContent(newContent);
 };

 // Regenerate a single meal — queues meal_regenerate on GitHub Actions, then updates
 // the meal in-place. Available to the coach for ALL plans (AI-generated
 // AND manually-added), so the coach can quickly vary a meal without
 // regenerating the whole plan.
 const [regeneratingMealIdx, setRegeneratingMealIdx] = useState<number | null>(null);
 const regenerateSingleMeal = async (mealIdx: number) => {
 if (!content?.meals?.[mealIdx]) return;
 setRegeneratingMealIdx(mealIdx);
 try {
 const meal = content.meals[mealIdx];
 // OWNER DIRECTIVE 2026-08-27: meal regeneration is a queued AI job
 // (GitHub Actions worker) returning the replacement + 3 suggestions.
 const { result } = await runAiJob("meal_regenerate", {
 meal,
 targetCalories:
 (meal as any).total_calories ||
 ((meal as any).items || []).reduce((s: number, i: any) => s + (i.calories || 0), 0),
 });
 const newMeal = result.replacement;
 const newContent = { ...content };
 newContent.meals = [...newContent.meals];
 newContent.meals[mealIdx] = { ...newMeal };

 // === Recompute meal totals for the regenerated meal ===
 const mealItems = newMeal.items || [];
 newContent.meals[mealIdx].total_calories = mealItems.reduce((s, i) => s + (i.calories || 0), 0);
 newContent.meals[mealIdx].total_protein_g = mealItems.reduce((s, i) => s + (i.protein_g || 0), 0);
 newContent.meals[mealIdx].total_carbs_g = mealItems.reduce((s, i) => s + (i.carbs_g || 0), 0);
 newContent.meals[mealIdx].total_fat_g = mealItems.reduce((s, i) => s + (i.fat_g || 0), 0);

 // === Recompute plan totals (daily_calories + macros) ===
 newContent.daily_calories = newContent.meals.reduce((s, m) => s + (m.total_calories || 0), 0);
 if (newContent.macros) {
 newContent.macros.protein_g = newContent.meals.reduce((s, m) => s + (m.total_protein_g || 0), 0);
 newContent.macros.carbs_g = newContent.meals.reduce((s, m) => s + (m.total_carbs_g || 0), 0);
 newContent.macros.fat_g = newContent.meals.reduce((s, m) => s + (m.total_fat_g || 0), 0);
 newContent.macros.protein_cal = newContent.macros.protein_g * 4;
 newContent.macros.carbs_cal = newContent.macros.carbs_g * 4;
 newContent.macros.fat_cal = newContent.macros.fat_g * 9;
 }

 setContent(newContent);
 toast.success("تم إعادة توليد الوجبة!");
 } catch (e: any) {
 toast.error(e.message || "فشل إعادة التوليد");
 } finally {
 setRegeneratingMealIdx(null);
 }
 };

 // Update exercise
 const updateExercise = (dayIdx: number, exIdx: number, field: string, value: string) => {
 const newContent = { ...content };
 newContent.days = [...newContent.days];
 newContent.days[dayIdx] = { ...newContent.days[dayIdx] };
 newContent.days[dayIdx].exercises = [...newContent.days[dayIdx].exercises];
 newContent.days[dayIdx].exercises[exIdx] = { ...newContent.days[dayIdx].exercises[exIdx] };
 if (field === "sets") {
 newContent.days[dayIdx].exercises[exIdx][field] = parseInt(value) || 0;
 } else {
 newContent.days[dayIdx].exercises[exIdx][field] = value;
 }
 setContent(newContent);
 };

 // Add meal item
 // Helper: recompute meal + plan totals after any change to items
 const recomputeTotals = (newContent: any) => {
 for (let i = 0; i < newContent.meals.length; i++) {
 const items = newContent.meals[i].items || [];
 newContent.meals[i].total_calories = items.reduce((s, it) => s + (it.calories || 0), 0);
 newContent.meals[i].total_protein_g = items.reduce((s, it) => s + (it.protein_g || 0), 0);
 newContent.meals[i].total_carbs_g = items.reduce((s, it) => s + (it.carbs_g || 0), 0);
 newContent.meals[i].total_fat_g = items.reduce((s, it) => s + (it.fat_g || 0), 0);
 }
 newContent.daily_calories = newContent.meals.reduce((s, m) => s + (m.total_calories || 0), 0);
 if (newContent.macros) {
 newContent.macros.protein_g = newContent.meals.reduce((s, m) => s + (m.total_protein_g || 0), 0);
 newContent.macros.carbs_g = newContent.meals.reduce((s, m) => s + (m.total_carbs_g || 0), 0);
 newContent.macros.fat_g = newContent.meals.reduce((s, m) => s + (m.total_fat_g || 0), 0);
 newContent.macros.protein_cal = newContent.macros.protein_g * 4;
 newContent.macros.carbs_cal = newContent.macros.carbs_g * 4;
 newContent.macros.fat_cal = newContent.macros.fat_g * 9;
 }
 return newContent;
 };

 const addMealItem = (mealIdx: number) => {
 const newContent = { ...content };
 newContent.meals = [...newContent.meals];
 newContent.meals[mealIdx] = { ...newContent.meals[mealIdx] };
 newContent.meals[mealIdx].items = [...newContent.meals[mealIdx].items, { food: "", amount: "", calories: 0 }];
 recomputeTotals(newContent);
 setContent(newContent);
 };

 // Remove meal item
 const removeMealItem = (mealIdx: number, itemIdx: number) => {
 const newContent = { ...content };
 newContent.meals = [...newContent.meals];
 newContent.meals[mealIdx] = { ...newContent.meals[mealIdx] };
 newContent.meals[mealIdx].items = newContent.meals[mealIdx].items.filter((_: any, i: number) => i !== itemIdx);
 recomputeTotals(newContent);
 setContent(newContent);
 };

 // Add exercise
 const addExercise = (dayIdx: number) => {
 const newContent = { ...content };
 newContent.days[dayIdx].exercises = [...newContent.days[dayIdx].exercises, { name: "", sets: 3, reps: "10-12", rest: "90 ثانية", notes: "" }];
 setContent(newContent);
 };

 // Remove exercise
 const removeExercise = (dayIdx: number, exIdx: number) => {
 const newContent = { ...content };
 newContent.days[dayIdx].exercises = newContent.days[dayIdx].exercises.filter((_: any, i: number) => i !== exIdx);
 setContent(newContent);
 };

 // Editable cell component
 // EditCell — defined at module level to prevent focus loss on re-render
 // (inline function definitions cause React to remount the component on every keystroke)
 const EditCell = useMemo(() => {
   return ({ value, onChange, type = "text", className = "" }: { value: any; onChange: (v: string) => void; type?: string; className?: string }) => (
     editMode ? (
       <Input
         type={type}
         value={value ?? ""}
         onChange={(e) => onChange(e.target.value)}
         className={`h-8 text-sm ${className}`}
       />
     ) : (
       <span>{value ?? "—"}</span>
     )
   );
 }, [editMode]);

 return (
 <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
 <div
 className="max-h-[85vh] w-full max-w-2xl overflow-y-auto scrollbar-thin rounded-3xl border border-border bg-card p-6 shadow-card"
 onClick={(e) => e.stopPropagation()}
 >
 {/* Header */}
 <div className="mb-4 flex items-center justify-between gap-3">
 <div className="flex items-center gap-2">
 {isWorkout ? <Dumbbell className="h-5 w-5 text-primary" /> : <Salad className="h-5 w-5 text-primary" />}
 {editMode ? (
 <Input value={title} onChange={(e) => setTitle(e.target.value)} className="text-lg font-bold h-9" />
 ) : (
 <h2 className="text-lg font-bold">{title}</h2>
 )}
 </div>
 <div className="flex items-center gap-2">
 {plan.status === "draft" && <Badge variant="outline" className="border-warning text-warning">مسودة</Badge>}
 {plan.is_current && <Badge variant="outline" className="border-success text-success">مُفعّلة</Badge>}
 {plan.notes === "Generated by AI" && <Badge variant="outline" className="border-primary/30 bg-primary/5 text-primary"><Sparkles className="me-1 h-3 w-3" />AI</Badge>}
 {!editMode ? (
 <>
 {onRegenerate && (
 <Button size="sm" variant="outline" className="gap-1.5 border-primary/30 text-primary" onClick={onRegenerate}>
 <RefreshCw className="h-3.5 w-3.5" />
 إعادة توليد
 </Button>
 )}
 <Button size="sm" variant="outline" className="gap-1.5" onClick={() => downloadPlanPDF()} title="تحميل الخطة كـ PDF">
 <Download className="h-3.5 w-3.5" />
 <span className="hidden sm:inline">PDF</span>
 </Button>
 <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setEditMode(true)}>
 <Pencil className="h-3.5 w-3.5" />
 تعديل
 </Button>
 </>
 ) : (
 <>
 <Button size="sm" className="gap-1.5" onClick={handleSave} disabled={saving}>
 {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
 حفظ
 </Button>
 <Button size="sm" variant="ghost" onClick={() => { setEditMode(false); setTitle(plan.title); setNotes(plan.notes || ""); setContent(plan.content ? JSON.parse(JSON.stringify(plan.content)) : null); }}>
 إلغاء
 </Button>
 </>
 )}
 <Button size="sm" variant="ghost" onClick={onClose}></Button>
 </div>
 </div>

 {/* Content */}
 {content ? (
 <div className="space-y-4">
 {/* Overview */}
 <div>
 <Label className="text-xs text-muted-foreground">نظرة عامة</Label>
 {editMode ? (
 <Textarea
 value={content.overview || ""}
 onChange={(e) => updateField("overview", e.target.value)}
 className="mt-1 min-h-[60px] text-sm"
 />
 ) : (
 content.overview && <p className="mt-1 text-sm text-muted-foreground">{content.overview}</p>
 )}
 </div>

 {/* Nutrition: Macros */}
 {!isWorkout && (
 <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
 {[
 { key: "daily_calories", label: "السعرات", color: "text-primary", suffix: "" },
 { key: "macros.protein_g", label: "بروتين", color: "text-success", suffix: "g" },
 { key: "macros.carbs_g", label: "كارب", color: "text-warning", suffix: "g" },
 { key: "macros.fat_g", label: "دهون", color: "text-primary", suffix: "g" },
 ].map((stat) => {
 const val = stat.key.includes(".") ? content[stat.key.split(".")[0]]?.[stat.key.split(".")[1]] : content[stat.key];
 return (
 <div key={stat.key} className="rounded-xl border border-border bg-background p-3 text-center">
 {editMode ? (
 <Input
 type="number"
 value={val ?? 0}
 onChange={(e) => {
 if (stat.key.includes(".")) {
 const [parent, child] = stat.key.split(".");
 updateField(stat.key, parseInt(e.target.value) || 0);
 } else {
 updateField(stat.key, parseInt(e.target.value) || 0);
 }
 }}
 className={`h-8 text-center text-lg font-bold ${stat.color}`}
 />
 ) : (
 <div className={`font-display text-lg font-bold ${stat.color}`}>{val || 0}{stat.suffix}</div>
 )}
 <div className="text-xs text-muted-foreground">{stat.label}</div>
 </div>
 );
 })}
 </div>
 )}

 {/* PDF-style extras: data analysis + supplements + health notes + water target */}
 {!isWorkout && (content.data_analysis || content.supplements?.length || content.health_notes?.length || content.water_target) && (
 <div className="space-y-3 rounded-xl border border-border bg-muted/30 p-4">
 {content.data_analysis && (
 <div>
 <h4 className="mb-2 text-sm font-bold"> تحليل البيانات {editMode && <span className="text-xs font-normal text-muted-foreground">(قابل للتعديل)</span>}</h4>
 {editMode ? (
 <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
 {[
 { key: "gender", label: "الجنس", placeholder: "ذكر/أنثى" },
 { key: "weight", label: "الوزن", placeholder: "80 كجم" },
 { key: "height", label: "الطول", placeholder: "175 سم" },
 { key: "age", label: "العمر", placeholder: "25 سنة" },
 { key: "neck", label: "الرقبة", placeholder: "37 سم" },
 { key: "waist", label: "الخصر", placeholder: "85 سم" },
 { key: "hip", label: "الورك", placeholder: "95 سم" },
 { key: "activity", label: "النشاط", placeholder: "متوسط" },
 { key: "health", label: "الصحة", placeholder: "لا يوجد" },
 { key: "body_fat_pct", label: "نسبة الدهون", placeholder: "~20%" },
 { key: "bmr", label: "BMR", placeholder: "1700", type: "number" },
 { key: "tdee", label: "TDEE", placeholder: "2300", type: "number" },
 ].map((f) => (
 <div key={f.key}>
 <Label className="text-[10px] text-muted-foreground">{f.label}</Label>
 <Input
 type={f.type === "number" ? "number" : "text"}
 value={content.data_analysis[f.key] ?? ""}
 placeholder={f.placeholder}
 onChange={(e) => {
 const newContent = { ...content };
 newContent.data_analysis = { ...newContent.data_analysis, [f.key]: e.target.value };
 setContent(newContent);
 }}
 className="mt-0.5 h-8 text-xs"
 />
 </div>
 ))}
 </div>
 ) : (
 <div className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-3">
 {content.data_analysis.gender && <div><span className="text-muted-foreground">الجنس:</span> {content.data_analysis.gender}</div>}
 {content.data_analysis.weight && <div><span className="text-muted-foreground">الوزن:</span> {content.data_analysis.weight}</div>}
 {content.data_analysis.height && <div><span className="text-muted-foreground">الطول:</span> {content.data_analysis.height}</div>}
 {content.data_analysis.age && <div><span className="text-muted-foreground">العمر:</span> {content.data_analysis.age}</div>}
 {content.data_analysis.neck && <div><span className="text-muted-foreground">الرقبة:</span> {content.data_analysis.neck}</div>}
 {content.data_analysis.waist && <div><span className="text-muted-foreground">الخصر:</span> {content.data_analysis.waist}</div>}
 {content.data_analysis.hip && <div><span className="text-muted-foreground">الورك:</span> {content.data_analysis.hip}</div>}
 {content.data_analysis.activity && <div><span className="text-muted-foreground">النشاط:</span> {content.data_analysis.activity}</div>}
 {content.data_analysis.health && <div><span className="text-muted-foreground">الصحة:</span> {content.data_analysis.health}</div>}
 {content.data_analysis.body_fat_pct && <div><span className="text-muted-foreground">نسبة الدهون:</span> {content.data_analysis.body_fat_pct}</div>}
 {content.data_analysis.bmr && <div><span className="text-muted-foreground">BMR:</span> ~{content.data_analysis.bmr} سعرة</div>}
 {content.data_analysis.tdee && <div><span className="text-muted-foreground">TDEE:</span> ~{content.data_analysis.tdee} سعرة</div>}
 </div>
 )}
 </div>
 )}

 {content.supplements && content.supplements.length > 0 && (
 <div>
 <h4 className="mb-2 text-sm font-bold"> المكملات والتوصيات الصحية {editMode && <span className="text-xs font-normal text-muted-foreground">(قابل للتعديل)</span>}</h4>
 <div className="space-y-2">
 {content.supplements.map((s: any, i: number) => (
 <div key={i} className="rounded-lg border border-border bg-background p-2 text-xs">
 {editMode ? (
 <div className="space-y-1">
 <div className="grid grid-cols-2 gap-1.5">
 <Input
 value={s.name || ""}
 onChange={(e) => {
 const newContent = { ...content };
 newContent.supplements = [...newContent.supplements];
 newContent.supplements[i] = { ...newContent.supplements[i], name: e.target.value };
 setContent(newContent);
 }}
 placeholder="اسم المكمل"
 className="h-7 text-xs font-semibold"
 />
 <Input
 value={s.dose || ""}
 onChange={(e) => {
 const newContent = { ...content };
 newContent.supplements = [...newContent.supplements];
 newContent.supplements[i] = { ...newContent.supplements[i], dose: e.target.value };
 setContent(newContent);
 }}
 placeholder="الجرعة (مثلاً: 200-400 مج)"
 className="h-7 text-xs"
 />
 </div>
 <div className="grid grid-cols-2 gap-1.5">
 <Input
 value={s.timing || ""}
 onChange={(e) => {
 const newContent = { ...content };
 newContent.supplements = [...newContent.supplements];
 newContent.supplements[i] = { ...newContent.supplements[i], timing: e.target.value };
 setContent(newContent);
 }}
 placeholder="الموعد (مثلاً: قبل النوم)"
 className="h-7 text-xs"
 />
 <Input
 value={s.purpose || ""}
 onChange={(e) => {
 const newContent = { ...content };
 newContent.supplements = [...newContent.supplements];
 newContent.supplements[i] = { ...newContent.supplements[i], purpose: e.target.value };
 setContent(newContent);
 }}
 placeholder="الهدف"
 className="h-7 text-xs"
 />
 </div>
 <button
 onClick={() => {
 const newContent = { ...content };
 newContent.supplements = newContent.supplements.filter((_: any, j: number) => j !== i);
 setContent(newContent);
 }}
 className="text-destructive hover:text-destructive/80 text-[11px] flex items-center gap-1"
 >
 <Trash2 className="h-3 w-3" /> حذف المكمل
 </button>
 </div>
 ) : (
 <>
 <div className="font-semibold">{s.name}</div>
 <div className="text-muted-foreground">
 {s.dose && <span>الجرعة: {s.dose}</span>}
 {s.timing && <span> | الموعد: {s.timing}</span>}
 </div>
 {s.purpose && <div className="mt-0.5 text-muted-foreground">الهدف: {s.purpose}</div>}
 </>
 )}
 </div>
 ))}
 </div>
 {editMode && (
 <button
 onClick={() => {
 const newContent = { ...content };
 newContent.supplements = [...(newContent.supplements || []), { name: "", dose: "", timing: "", purpose: "" }];
 setContent(newContent);
 }}
 className="mt-2 flex items-center gap-1 text-xs text-primary hover:underline"
 >
 <Plus className="h-3 w-3" /> إضافة مكمل
 </button>
 )}
 </div>
 )}

 {content.health_notes && content.health_notes.length > 0 && (
 <div>
 <h4 className="mb-2 text-sm font-bold"> توصيات صحية خاصة {editMode && <span className="text-xs font-normal text-muted-foreground">(قابل للتعديل)</span>}</h4>
 {editMode ? (
 <div className="space-y-1.5">
 {content.health_notes.map((n: string, i: number) => (
 <div key={i} className="flex gap-1.5">
 <span className="text-primary mt-1.5">•</span>
 <Input
 value={n}
 onChange={(e) => {
 const newContent = { ...content };
 newContent.health_notes = [...newContent.health_notes];
 newContent.health_notes[i] = e.target.value;
 setContent(newContent);
 }}
 className="h-7 text-xs flex-1"
 />
 <button
 onClick={() => {
 const newContent = { ...content };
 newContent.health_notes = newContent.health_notes.filter((_: string, j: number) => j !== i);
 setContent(newContent);
 }}
 className="text-destructive hover:text-destructive/80 p-1"
 >
 <Trash2 className="h-3 w-3" />
 </button>
 </div>
 ))}
 <button
 onClick={() => {
 const newContent = { ...content };
 newContent.health_notes = [...(newContent.health_notes || []), ""];
 setContent(newContent);
 }}
 className="flex items-center gap-1 text-xs text-primary hover:underline"
 >
 <Plus className="h-3 w-3" /> إضافة توصية
 </button>
 </div>
 ) : (
 <ul className="space-y-1 text-xs text-muted-foreground">
 {content.health_notes.map((n: string, i: number) => (
 <li key={i} className="flex items-start gap-1.5">
 <span className="text-primary">•</span>
 <span>{n}</span>
 </li>
 ))}
 </ul>
 )}
 </div>
 )}

 {/* Water target — always show in edit mode so coach can add it */}
 {(content.water_target || editMode) && (
 <div className="text-xs">
 {editMode ? (
 <div className="flex items-center gap-2">
 <span className="font-bold"> استهلاك الماء:</span>
 <Input
 value={content.water_target || ""}
 onChange={(e) => updateField("water_target", e.target.value)}
 placeholder="مثلاً: 2.5 إلى 3 لتر يومياً"
 className="h-7 text-xs flex-1"
 />
 </div>
 ) : content.water_target ? (
 <div>
 <span className="font-bold"> استهلاك الماء:</span> {content.water_target}
 </div>
 ) : null}
 </div>
 )}
 </div>
 )}

 {/* Meals table — PDF-style with numbered items, alternatives, and per-meal totals */}
 {!isWorkout && content.meals?.map((m: any, mealIdx: number) => (
 <div key={mealIdx} className="rounded-xl border border-border p-4">
 <div className="mb-2 flex items-center justify-between gap-2">
 <div className="flex-1">
 {editMode ? (
 <Input
 value={m.name || ""}
 onChange={(e) => {
 const newContent = { ...content };
 newContent.meals[mealIdx] = { ...newContent.meals[mealIdx], name: e.target.value };
 setContent(newContent);
 }}
 className="h-8 font-semibold"
 />
 ) : (
 <h4 className="font-semibold"> {m.name}</h4>
 )}
 {m.time && !editMode && (
 <p className="text-xs text-muted-foreground">{m.time}</p>
 )}
 </div>
 {/* Per-meal regenerate button — works for ALL plans (AI + manual) */}
 {!editMode && (
 <Button
 size="sm"
 variant="outline"
 className="gap-1.5 border-primary/30 text-primary"
 onClick={() => regenerateSingleMeal(mealIdx)}
 disabled={regeneratingMealIdx !== null}
 >
 {regeneratingMealIdx === mealIdx ? (
 <Loader2 className="h-3.5 w-3.5 animate-spin" />
 ) : (
 <RefreshCw className="h-3.5 w-3.5" />
 )}
 <span className="hidden sm:inline">إعادة توليد الوجبة</span>
 <span className="sm:hidden">توليد</span>
 </Button>
 )}
 </div>
 <table className="w-full text-sm">
 <thead>
 <tr className="border-b border-border text-start">
 <th className="p-2 text-start font-medium text-muted-foreground w-8">#</th>
 <th className="p-2 text-start font-medium text-muted-foreground">المكون</th>
 <th className="p-2 text-start font-medium text-muted-foreground">الكمية</th>
 <th className="p-2 text-start font-medium text-muted-foreground">السعرات</th>
 <th className="p-2 text-start font-medium text-muted-foreground hidden md:table-cell">البدائل</th>
 {editMode && <th className="p-2 w-8"></th>}
 </tr>
 </thead>
 <tbody>
 {m.items?.map((it: any, itemIdx: number) => (
 <tr key={itemIdx} className="border-b border-border/60">
 <td className="p-2 text-muted-foreground">{itemIdx + 1}</td>
 <td className="p-2"><EditCell value={it.food} onChange={(v) => updateMealItem(mealIdx, itemIdx, "food", v)} className="font-medium" /></td>
 <td className="p-2"><EditCell value={it.amount} onChange={(v) => updateMealItem(mealIdx, itemIdx, "amount", v)} /></td>
 <td className="p-2">
 <EditCell value={it.calories} onChange={(v) => updateMealItem(mealIdx, itemIdx, "calories", v)} type="number" />
 {it.protein_g && !editMode && (
 <span className="text-[10px] text-muted-foreground"> {it.protein_g}جم</span>
 )}
 </td>
 <td className="p-2 text-xs text-muted-foreground hidden md:table-cell">
 {editMode ? (
 <Input
 value={it.alternatives || ""}
 onChange={(e) => updateMealItem(mealIdx, itemIdx, "alternatives", e.target.value)}
 placeholder="بدائل (اختياري)"
 className="h-8 text-xs"
 />
 ) : (
 it.alternatives && <span>{it.alternatives}</span>
 )}
 </td>
 {editMode && (
 <td className="p-2">
 <button onClick={() => removeMealItem(mealIdx, itemIdx)} className="text-destructive hover:text-destructive/80">
 <Trash2 className="h-3.5 w-3.5" />
 </button>
 </td>
 )}
 </tr>
 ))}
 </tbody>
 {/* Per-meal totals row — matches the PDF format */}
 {(m.total_calories || m.total_protein_g) && (
 <tfoot>
 <tr className="border-t-2 border-primary/30 bg-primary/5">
 <td colSpan={3} className="p-2 text-end font-semibold text-primary">
 {typeof m.total_calories === "number" ? `~${m.total_calories}` : `~${m.items?.reduce((s: number, i: any) => s + (i.calories || 0), 0) || 0}`} سعرة حرارية
 </td>
 <td className="p-2 font-semibold text-success">
 {typeof m.total_protein_g === "number" ? m.total_protein_g : ""} {m.total_protein_g ? "جم بروتين" : ""}
 </td>
 <td colSpan={editMode ? 2 : 1} className="p-2"></td>
 </tr>
 </tfoot>
 )}
 </table>
 {editMode && (
 <button onClick={() => addMealItem(mealIdx)} className="mt-2 flex items-center gap-1 text-xs text-primary hover:underline">
 <Plus className="h-3 w-3" /> إضافة صنف
 </button>
 )}
 {m.notes && !editMode && <p className="mt-1 text-xs text-muted-foreground"> {m.notes}</p>}
 {editMode && (
 <Input
 value={m.notes || ""}
 onChange={(e) => {
 const newContent = { ...content };
 newContent.meals[mealIdx] = { ...newContent.meals[mealIdx], notes: e.target.value };
 setContent(newContent);
 }}
 placeholder="ملاحظات الوجبة..."
 className="mt-2 h-8 text-xs"
 />
 )}
 </div>
 ))}

 {/* Workout volume + progression — editable */}
 {isWorkout && (content.weekly_volume || content.progression || editMode) && (
 <div className="grid gap-3 sm:grid-cols-2">
 {(content.weekly_volume || editMode) && (
 <div>
 <Label className="text-xs text-muted-foreground"> الحجم الأسبوعي</Label>
 {editMode ? (
 <Input
 value={content.weekly_volume || ""}
 onChange={(e) => updateField("weekly_volume", e.target.value)}
 placeholder="مثلاً: 20 مجموعة أسبوعياً"
 className="mt-1 h-8 text-sm"
 />
 ) : (
 <p className="mt-1 text-sm">{content.weekly_volume}</p>
 )}
 </div>
 )}
 {(content.progression || editMode) && (
 <div>
 <Label className="text-xs text-muted-foreground"> طريقة التقدم</Label>
 {editMode ? (
 <Input
 value={content.progression || ""}
 onChange={(e) => updateField("progression", e.target.value)}
 placeholder="مثلاً: زوّد الوزن 2.5 كجم أسبوعياً"
 className="mt-1 h-8 text-sm"
 />
 ) : (
 <p className="mt-1 text-sm">{content.progression}</p>
 )}
 </div>
 )}
 </div>
 )}

 {/* Workout days */}
 {isWorkout && content.days?.map((d: any, dayIdx: number) => (
 <div key={dayIdx} className={cn("rounded-xl border", d.isRest ? "border-muted/40 bg-muted/10" : "border-border")}>
 <div className="flex items-center justify-between border-b border-border bg-muted/40 px-4 py-2 gap-2">
 {editMode && !d.isRest ? (
 <>
 <Input
 value={d.day || ""}
 onChange={(e) => {
 const newContent = { ...content };
 newContent.days[dayIdx] = { ...newContent.days[dayIdx], day: e.target.value };
 setContent(newContent);
 }}
 className="h-8 font-semibold"
 />
 <Input
 value={d.focus || ""}
 onChange={(e) => {
 const newContent = { ...content };
 newContent.days[dayIdx] = { ...newContent.days[dayIdx], focus: e.target.value };
 setContent(newContent);
 }}
 className="h-8 w-32 text-center text-xs"
 placeholder="العضلة"
 />
 </>
 ) : (
 <>
 <span className="font-semibold">{d.day}</span>
 {d.isRest ? (
 <Badge variant="outline" className="border-muted-foreground/30 text-muted-foreground"> راحة</Badge>
 ) : (
 d.focus && <Badge variant="secondary">{d.focus}</Badge>
 )}
 </>
 )}
 </div>
 {d.isRest ? (
 <div className="p-6 text-center text-sm text-muted-foreground">
 يوم راحة — استشفِ وارتاح. اشرب ماء كافي ونم 7-9 ساعات.
 </div>
 ) : (
 <>
 <table className="w-full text-sm">
 <thead>
 <tr className="text-start">
 <th className="p-2 text-start font-medium text-muted-foreground">التمرين</th>
 <th className="p-2 text-start font-medium text-muted-foreground">مجموعات</th>
 <th className="p-2 text-start font-medium text-muted-foreground">تكرارات</th>
 <th className="p-2 text-start font-medium text-muted-foreground">راحة</th>
 {editMode && <th className="p-2 w-8"></th>}
 </tr>
 </thead>
 <tbody>
 {d.exercises?.map((ex: any, exIdx: number) => {
 // Find exercise in library for images
 const exLib = EXERCISES.find((e) => e.slug === ex.exerciseSlug || e.nameEn === ex.name || e.nameEn?.toLowerCase() === ex.name?.toLowerCase());
 const exImages = exLib ? getExerciseImages(exLib.imageKey) : [];
 return (
 <tr key={exIdx} className="border-t border-border/60">
 <td className="p-2">
 {/* Two images ABOVE the text — like exercise library */}
 {!editMode && exImages.length > 0 && (
 <div className="mb-2 grid grid-cols-2 gap-2">
 {exImages.slice(0, 2).map((url: string, imgIdx: number) => (
 <div key={imgIdx} className="relative aspect-square overflow-hidden rounded-lg bg-muted">
 <ImageWithFallback
 src={url}
 alt={`${ex.name} ${imgIdx + 1}`}
 fill
 className="object-contain"
 fallbackSrc={getFallbackSVG(exLib?.category || "default")}
 />
 </div>
 ))}
 </div>
 )}
 <div>
 <EditCell value={ex.name} onChange={(v) => updateExercise(dayIdx, exIdx, "name", v)} className="font-medium" />
 {editMode ? (
 <>
 <Input
 value={ex.notes || ""}
 onChange={(e) => updateExercise(dayIdx, exIdx, "notes", e.target.value)}
 placeholder="ملاحظات..."
 className="mt-1 h-7 text-xs"
 />
 <Input
 value={ex.image || ""}
 onChange={(e) => updateExercise(dayIdx, exIdx, "image", e.target.value)}
 placeholder="رابط صورة (اختياري — هتتولّد تلقائياً من اسم التمرين)"
 className="mt-1 h-7 text-xs font-mono"
 dir="ltr"
 />
 </>
 ) : (
 ex.notes && <p className="text-xs text-muted-foreground">{ex.notes}</p>
 )}
 </div>
 </td>
 <td className="p-2"><EditCell value={ex.sets} onChange={(v) => updateExercise(dayIdx, exIdx, "sets", v)} type="number" /></td>
 <td className="p-2"><EditCell value={ex.reps} onChange={(v) => updateExercise(dayIdx, exIdx, "reps", v)} /></td>
 <td className="p-2"><EditCell value={ex.rest} onChange={(v) => updateExercise(dayIdx, exIdx, "rest", v)} /></td>
 {editMode && (
 <td className="p-2">
 <div className="flex items-center gap-1.5">
 {/* T-4PILLAR-COMPLETE: AI exercise swap (injury-safe, library-filtered) */}
 <button
 onClick={() => swapExerciseAI(dayIdx, exIdx, d.focus)}
 disabled={regeneratingExKey !== null}
 title="استبدال بديل آمن بالذكاء الاصطناعي"
 className="text-primary hover:text-primary/80 disabled:opacity-50"
 >
 {regeneratingExKey === `${dayIdx}-${exIdx}` ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Wand2 className="h-3.5 w-3.5" />}
 </button>
 <button onClick={() => removeExercise(dayIdx, exIdx)} className="text-destructive hover:text-destructive/80">
 <Trash2 className="h-3.5 w-3.5" />
 </button>
 </div>
 </td>
 )}
 </tr>
 );
 })}
 </tbody>
 </table>
 {editMode && (
 <button onClick={() => addExercise(dayIdx)} className="m-2 flex items-center gap-1 text-xs text-primary hover:underline">
 <Plus className="h-3 w-3" /> إضافة تمرين
 </button>
 )}
 </>
 )}
 </div>
 ))}

 {/* Notes field */}
 <div>
 <Label className="text-xs text-muted-foreground">ملاحظات عامة</Label>
 {editMode ? (
 <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} className="mt-1 min-h-[40px] text-sm" />
 ) : (
 notes && notes !== "Generated by AI" && <p className="mt-1 text-sm text-muted-foreground">{notes}</p>
 )}
 </div>
 </div>
 ) : (
 <div className="py-8 text-center text-sm text-muted-foreground">
 لا يوجد محتوى لهذه الخطة
 </div>
 )}
 </div>
 </div>
 );
}

/**
 * Coach AI Plan Generator — wraps the two generate buttons with an
 * expandable "advanced options" panel where the coach can optionally
 * specify target calories, macros, preferred foods, and free-text notes.
 *
 * All fields are optional. If left blank, the AI calculates everything
 * automatically from the client's questionnaire data.
 */
function CoachAIPlanGenerator({
 generating,
 onGenerate,
 t,
 quota,
 lang,
}: {
 generating: string | null;
 onGenerate: (planType: "workout" | "nutrition", overrides?: any) => Promise<void>;
 t: (key: string) => string;
 quota: { unlimited: boolean; limit: number; nutrition: { used: number; limit: number }; workout: { used: number; limit: number } } | null;
 lang: "ar" | "en";
}) {
 const isAr = lang === "ar";
 const atCap = (k: "nutrition" | "workout") =>
 !!quota && !quota.unlimited && quota[k].used >= quota[k].limit;
 const usageLine = (k: "nutrition" | "workout") => {
 if (!quota || quota.unlimited) return null;
 return (
 <div className="mt-0.5 text-[11px] font-medium text-muted-foreground">
 {quota[k].used}/{quota[k].limit} {isAr ? "مستخدمة" : "used"}
 </div>
 );
 };
 const [showAdvanced, setShowAdvanced] = useState(false);
 const [targetCalories, setTargetCalories] = useState("");
 const [proteinG, setProteinG] = useState("");
 const [carbsG, setCarbsG] = useState("");
 const [fatG, setFatG] = useState("");
 const [foods, setFoods] = useState("");
 const [mealsCount, setMealsCount] = useState("");
 const [notes, setNotes] = useState("");

 const buildOverrides = () => {
 const ov: any = {};
 if (targetCalories.trim()) ov.targetCalories = parseInt(targetCalories);
 if (proteinG.trim() || carbsG.trim() || fatG.trim()) {
 ov.macros = {
 protein_g: parseInt(proteinG) || 0,
 carbs_g: parseInt(carbsG) || 0,
 fat_g: parseInt(fatG) || 0,
 };
 }
 if (foods.trim()) {
 ov.foods = foods.split(/[,،\n]/).map((s) => s.trim()).filter(Boolean);
 }
 if (mealsCount.trim()) ov.mealsCount = parseInt(mealsCount);
 if (notes.trim()) ov.notes = notes;
 return Object.keys(ov).length > 0 ? ov : undefined;
 };

 const handleGenerate = (planType: "workout" | "nutrition") => {
 onGenerate(planType, buildOverrides());
 };

 return (
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
 onClick={() => handleGenerate("nutrition")}
 disabled={generating !== null || atCap("nutrition")}
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
 {usageLine("nutrition") ?? (
 <div className="text-xs text-muted-foreground">{t("coach.aiHint")}</div>
 )}
 </div>
 </div>
 <Wand2 className="h-4 w-4 text-muted-foreground transition-colors group-hover:text-primary" />
 </button>

 <button
 onClick={() => handleGenerate("workout")}
 disabled={generating !== null || atCap("workout")}
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
 {usageLine("workout") ?? (
 <div className="text-xs text-muted-foreground">{t("coach.aiHint")}</div>
 )}
 </div>
 </div>
 <Wand2 className="h-4 w-4 text-muted-foreground transition-colors group-hover:text-primary" />
 </button>
 </div>

 {/* 0034 — cap hint: generation is limited per client, everything
 else (editing, manual upload) stays unlimited by owner decree. */}
 {(atCap("nutrition") || atCap("workout")) && (
 <p className="mt-3 rounded-xl border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-xs font-medium text-amber-600">
 {isAr
 ? "وصلت الحد الأقصى للتوليد بالذكاء الاصطناعي عند العميل ده — التعديل على الخطط والرفع اليدوي متاح بدون حدود."
 : "AI generation cap reached for this client — editing plans and manual uploads stay unlimited."}
 </p>
 )}

 {/* Advanced options toggle */}
 <button
 onClick={() => setShowAdvanced((s) => !s)}
 className="mt-4 flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"
 >
 <ChevronDown className={`h-3.5 w-3.5 transition-transform ${showAdvanced ? "rotate-180" : ""}`} />
 {showAdvanced ? "إخفاء الخيارات المتقدمة" : "خيارات متقدمة (اختياري) — حدد السعرات والماكروز والأطعمة"}
 </button>

 {showAdvanced && (
 <div className="mt-3 space-y-3 rounded-xl border border-border bg-background p-4">
 <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
 <div>
 <Label className="text-xs text-muted-foreground">السعرات المستهدفة (يومياً)</Label>
 <Input
 type="number"
 value={targetCalories}
 onChange={(e) => setTargetCalories(e.target.value)}
 placeholder="مثلاً: 1800"
 className="mt-1 h-8 text-sm"
 />
 </div>
 <div>
 <Label className="text-xs text-muted-foreground">البروتين (جم)</Label>
 <Input
 type="number"
 value={proteinG}
 onChange={(e) => setProteinG(e.target.value)}
 placeholder="مثلاً: 150"
 className="mt-1 h-8 text-sm"
 />
 </div>
 <div>
 <Label className="text-xs text-muted-foreground">الكارب (جم)</Label>
 <Input
 type="number"
 value={carbsG}
 onChange={(e) => setCarbsG(e.target.value)}
 placeholder="مثلاً: 200"
 className="mt-1 h-8 text-sm"
 />
 </div>
 <div>
 <Label className="text-xs text-muted-foreground">الدهون (جم)</Label>
 <Input
 type="number"
 value={fatG}
 onChange={(e) => setFatG(e.target.value)}
 placeholder="مثلاً: 60"
 className="mt-1 h-8 text-sm"
 />
 </div>
 </div>
 <div className="grid gap-3 sm:grid-cols-2">
 <div>
 <Label className="text-xs text-muted-foreground">عدد الوجبات (للتغذية) / أيام التدريب (للتمارين)</Label>
 <Input
 type="number"
 value={mealsCount}
 onChange={(e) => setMealsCount(e.target.value)}
 placeholder="مثلاً: 4"
 className="mt-1 h-8 text-sm"
 />
 </div>
 <div>
 <Label className="text-xs text-muted-foreground">أطعمة مطلوب تضمينها (افصل بفاصلة)</Label>
 <Input
 value={foods}
 onChange={(e) => setFoods(e.target.value)}
 placeholder="مثلاً: دجاج، أرز، تونة"
 className="mt-1 h-8 text-sm"
 />
 </div>
 </div>
 <div>
 <Label className="text-xs text-muted-foreground">ملاحظات إضافية للـ AI</Label>
 <Textarea
 value={notes}
 onChange={(e) => setNotes(e.target.value)}
 placeholder="مثلاً: العميل عنده أنيميا — ركّز على مصادر الحديد. أو: تجنب منتجات الألبان."
 className="mt-1 min-h-[60px] text-sm"
 />
 </div>
 <p className="text-[11px] text-muted-foreground">
 كل الحقول اختيارية — لو فضيتها، الـ AI بيحسب كل حاجة تلقائياً من بيانات العميل.
 </p>
 </div>
 )}

 {generating && (
 <div className="mt-4 flex items-center gap-2 rounded-xl bg-primary/5 px-4 py-2 text-sm text-primary">
 <Loader2 className="h-4 w-4 animate-spin" />
 {t("coach.generating")}
 </div>
 )}
 </div>
 </div>
 </Card>
 );
}
