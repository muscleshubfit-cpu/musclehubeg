"use client";

import { useEffect, useState, useMemo } from "react";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/hooks/use-auth";
import { useNav } from "@/hooks/use-nav";
import {
  listAllClients,
  listAllSubscriptions,
  listSubscriptionRequests,
  getQuestionnaire,
} from "@/lib/data";
import { toast } from "sonner";
import { getTier } from "@/lib/plans";
import { MEMBERSHIPS } from "@/lib/memberships";

type FilterTab =
  | "all"
  | "active"
  | "expiring"
  | "no_plan"
  | "no_questionnaire"
  | "pending_payment"
  | "expired"
  | "premium"
  | "pro"
  | "coaching";

type ClientWithMeta = {
  id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  created_at: string;
  // subscription info
  sub?: any;
  isActive: boolean;
  isExpiring: boolean;
  isExpired: boolean;
  hasSub: boolean;
  // questionnaire info
  hasNutriQ: boolean;
  hasFitQ: boolean;
  // payment request info
  hasPendingPayment: boolean;
};

export function CoachView() {
  const { t, lang } = useI18n();
  const isAr = lang === "ar";
  const { profile } = useAuth();
  const { navigate } = useNav();
  const [clients, setClients] = useState<ClientWithMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<FilterTab>("all");
  const [pendingRequests, setPendingRequests] = useState<any[]>([]);

  // Broadcast notification state
  const [showBroadcast, setShowBroadcast] = useState(false);
  const [broadcastTitle, setBroadcastTitle] = useState("");
  const [broadcastBody, setBroadcastBody] = useState("");
  const [broadcastTarget, setBroadcastTarget] = useState<"all" | "selected" | "single">("all");
  const [broadcastLink, setBroadcastLink] = useState("/dashboard");
  const [broadcasting, setBroadcasting] = useState(false);
  const [selectedClientIds, setSelectedClientIds] = useState<Set<string>>(new Set());
  const [selectedSingleId, setSelectedSingleId] = useState("");
  const [activeTemplate, setActiveTemplate] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const [c, s, reqs] = await Promise.all([
          listAllClients(),
          listAllSubscriptions(),
          listSubscriptionRequests("pending"),
        ]);

        // Fetch questionnaire + plan status for each client (parallel)
        const enriched = await Promise.all(
          (c as any[]).map(async (client) => {
            const sub = (s as any[]).find((x) => x.client_id === client.id);
            const now = Date.now();
            const isActive =
              sub && sub.status === "active" && new Date(sub.end_date).getTime() > now;
            const isExpiring =
              isActive && new Date(sub.end_date).getTime() - now < 14 * 864e5;
            const isExpired =
              sub && (sub.status !== "active" || new Date(sub.end_date).getTime() <= now);
            const hasSub = !!sub;

            // Fetch questionnaires (parallel)
            const [nutriQ, fitQ] = await Promise.all([
              getQuestionnaire(client.id, "nutrition").catch(() => null),
              getQuestionnaire(client.id, "fitness").catch(() => null),
            ]);

            const hasPendingPayment = (reqs as any[]).some(
              (r) => r.user_id === client.id && r.status === "pending",
            );

            return {
              id: client.id,
              full_name: client.full_name,
              email: client.email,
              phone: client.phone,
              created_at: client.created_at,
              sub,
              isActive: !!isActive,
              isExpiring: !!isExpiring,
              isExpired: !!isExpired,
              hasSub,
              hasNutriQ: !!nutriQ,
              hasFitQ: !!fitQ,
              hasPendingPayment,
            } as ClientWithMeta;
          }),
        );

        setClients(enriched);
        setPendingRequests(reqs as any[]);
      } catch (e) {
        console.error("[CoachView] load failed", e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Compute counts for each filter tab
  const counts = useMemo(() => {
    return {
      all: clients.length,
      active: clients.filter((c) => c.isActive).length,
      expiring: clients.filter((c) => c.isExpiring).length,
      no_plan: clients.filter((c) => !c.hasSub).length,
      no_questionnaire: clients.filter((c) => !c.hasNutriQ && !c.hasFitQ).length,
      pending_payment: clients.filter((c) => c.hasPendingPayment).length,
      expired: clients.filter((c) => c.isExpired).length,
      premium: clients.filter((c) => c.sub?.tier === "premium").length,
      pro: clients.filter((c) => c.sub?.tier === "pro").length,
      coaching: clients.filter((c) => c.sub?.tier === "coaching").length,
    };
  }, [clients]);

  // Apply search + active filter
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return clients.filter((c) => {
      // Search filter
      if (q) {
        const matches =
          (c.full_name || "").toLowerCase().includes(q) ||
          (c.email || "").toLowerCase().includes(q) ||
          (c.phone || "").toLowerCase().includes(q);
        if (!matches) return false;
      }
      // Tab filter
      switch (activeTab) {
        case "active":
          return c.isActive;
        case "expiring":
          return c.isExpiring;
        case "no_plan":
          return !c.hasSub;
        case "no_questionnaire":
          return !c.hasNutriQ && !c.hasFitQ;
        case "pending_payment":
          return c.hasPendingPayment;
        case "expired":
          return c.isExpired;
        case "premium":
          return c.sub?.tier === "premium";
        case "pro":
          return c.sub?.tier === "pro";
        case "coaching":
          return c.sub?.tier === "coaching";
        default:
          return true;
      }
    });
  }, [clients, search, activeTab]);

  if (loading)
    return (
      <div className="py-20 text-center text-base font-normal text-[#6e6e73]">
        {t("common.loading")}
      </div>
    );

  const now = Date.now();
  const activeSubs = clients.filter((c) => c.isActive);
  const expiringSoon = clients.filter((c) => c.isExpiring);

  // Helper: get membership tier name from old or new system
  const tierName = (subTier: string) => {
    const m = MEMBERSHIPS.find((x) => x.id === subTier);
    if (m) return isAr ? m.nameAr : m.nameEn;
    const legacy = getTier(subTier as any);
    if (legacy) return t(legacy.nameKey);
    return subTier || "—";
  };

  const tabs: Array<{ id: FilterTab; labelAr: string; labelEn: string; count: number; color: string }> = [
    { id: "all", labelAr: "الكل", labelEn: "All", count: counts.all, color: "#1d1d1f" },
    { id: "active", labelAr: "نشط", labelEn: "Active", count: counts.active, color: "#34c759" },
    { id: "expiring", labelAr: "ينتهي قريباً", labelEn: "Expiring", count: counts.expiring, color: "#ff9500" },
    { id: "no_plan", labelAr: "بدون اشتراك", labelEn: "No subscription", count: counts.no_plan, color: "#6e6e73" },
    { id: "no_questionnaire", labelAr: "بدون استبيان", labelEn: "No questionnaire", count: counts.no_questionnaire, color: "#ff3b30" },
    { id: "pending_payment", labelAr: "بانتظار الدفع", labelEn: "Pending payment", count: counts.pending_payment, color: "#0071e3" },
    { id: "expired", labelAr: "منتهي", labelEn: "Expired", count: counts.expired, color: "#8b5cf6" },
    // Membership tier filters — group by plan
    { id: "premium", labelAr: "بريميوم", labelEn: "Premium", count: counts.premium, color: "#0071e3" },
    { id: "pro", labelAr: "برو", labelEn: "Pro", count: counts.pro, color: "#1d1d1f" },
    { id: "coaching", labelAr: "كوتشينج", labelEn: "Coaching", count: counts.coaching, color: "#8b5cf6" },
  ];

  // Notification templates
  const templates = [
    { id: "questionnaire", icon: "📋", titleAr: "تذكير بملء الاستبيان", titleEn: "Questionnaire reminder", bodyAr: "يرجى ملء استبيان التغذية واللياقة البدنية حتى نتمكن من تجهيز برنامجك المخصص.", bodyEn: "Please fill out the nutrition and fitness questionnaire so we can prepare your personalized program.", link: "/questionnaires" },
    { id: "plan_updated", icon: "✅", titleAr: "تم تحديث خطتك", titleEn: "Your plan has been updated", bodyAr: "تم تحديث خطتك التدريبية/الغذائية. تفضل بمراجعتها من قسم الخطط.", bodyEn: "Your workout/nutrition plan has been updated. Check it in the Plans section.", link: "/plans" },
    { id: "followup", icon: "📅", titleAr: "موعد المتابعة", titleEn: "Follow-up reminder", bodyAr: "حان موعد متابعتك الدورية. يرجى تحديث بيانات التقدم ورفع الصور الحديثة.", bodyEn: "It's time for your follow-up. Please update your progress data and upload recent photos.", link: "/progress" },
    { id: "workout", icon: "💪", titleAr: "تذكير بالتمارين", titleEn: "Workout reminder", bodyAr: "لا تنسَ تمارينك اليوم! الالتزام بالبرنامج هو مفتاح النتائج.", bodyEn: "Don't forget your workout today! Consistency is key to results.", link: "/plans" },
    { id: "nutrition", icon: "🥗", titleAr: "تذكير بالتغذية", titleEn: "Nutrition reminder", bodyAr: "تذكر متابعة نظامك الغذائي وتسجيل وجباتك في متتبع الوجبات.", bodyEn: "Remember to follow your nutrition plan and log your meals in the meal planner.", link: "/meal-planner" },
    { id: "payment_reminder", icon: "💳", titleAr: "تذكير بالتجديد", titleEn: "Renewal reminder", bodyAr: "اشتراكك على وشك الانتهاء. تجدد الآن للحفاظ على وصولك لكل الميزات.", bodyEn: "Your subscription is ending soon. Renew now to keep access to all features.", link: "/memberships" },
  ];

  const applyTemplate = (tplId: string) => {
    const tpl = templates.find((t) => t.id === tplId);
    if (!tpl) return;
    if (activeTemplate === tplId) {
      // Deselect template
      setActiveTemplate(null);
      setBroadcastTitle("");
      setBroadcastBody("");
      setBroadcastLink("/dashboard");
    } else {
      setActiveTemplate(tplId);
      setBroadcastTitle(isAr ? tpl.titleAr : tpl.titleEn);
      setBroadcastBody(isAr ? tpl.bodyAr : tpl.bodyEn);
      setBroadcastLink(tpl.link);
    }
  };

  const sendBroadcast = async () => {
    if (!broadcastTitle.trim() || !broadcastBody.trim()) return;
    setBroadcasting(true);
    try {
      const payload: any = {
        target: broadcastTarget,
        title: broadcastTitle.trim(),
        body: broadcastBody.trim(),
        link: broadcastLink,
      };
      if (broadcastTarget === "single") payload.userId = selectedSingleId;
      if (broadcastTarget === "selected") payload.userIds = Array.from(selectedClientIds);

      const res = await fetch("/api/notifications/broadcast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(
          isAr
            ? `تم إرسال الإشعار إلى ${data.sent} عميل ✅`
            : `Notification sent to ${data.sent} client(s) ✅`,
        );
        setShowBroadcast(false);
        setBroadcastTitle("");
        setBroadcastBody("");
        setActiveTemplate(null);
        setSelectedClientIds(new Set());
        setSelectedSingleId("");
      } else {
        toast.error(data.error || "Failed");
      }
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setBroadcasting(false);
    }
  };

  const toggleClientSelection = (id: string) => {
    setSelectedClientIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectVisibleClients = () => {
    setSelectedClientIds(new Set(filtered.map((c) => c.id)));
  };

  const clearSelection = () => {
    setSelectedClientIds(new Set());
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">{t("coach.title")}</h1>
        <p className="mt-2 text-base font-normal text-[#6e6e73] md:text-lg">{t("coach.subtitle")}</p>
      </div>

      {/* Broadcast notification button */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => setShowBroadcast(!showBroadcast)}
          className="rounded-full bg-[#1d1d1f] px-5 py-2.5 text-sm font-normal text-white transition-opacity hover:opacity-90"
        >
          {isAr ? "إرسال إشعار للعملاء" : "Send notification to clients"}
        </button>
        {selectedClientIds.size > 0 && (
          <span className="rounded-full bg-[#0071e3]/10 px-3 py-1 text-xs font-medium text-[#0071e3]">
            {selectedClientIds.size} {isAr ? "عميل محدد" : "selected"}
          </span>
        )}
      </div>

      {/* Broadcast form */}
      {showBroadcast && (
        <div className="rounded-3xl border border-[#d2d2d7] bg-[#f5f5f7] p-6 space-y-5">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">{isAr ? "إرسال إشعار" : "Send notification"}</h3>
            <button onClick={() => setShowBroadcast(false)} className="text-sm text-[#6e6e73] hover:text-[#1d1d1f]">✕</button>
          </div>

          {/* Target selector */}
          <div>
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-[#6e6e73]">
              {isAr ? "المرسل إليه" : "Recipients"}
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => { setBroadcastTarget("all"); clearSelection(); setSelectedSingleId(""); }}
                className={`rounded-full px-4 py-2 text-xs font-medium transition-all ${broadcastTarget === "all" ? "bg-[#1d1d1f] text-white" : "bg-white text-[#6e6e73] hover:bg-white/80"}`}
              >
                {isAr ? "جميع العملاء" : "All clients"}
                <span className="ms-1 opacity-60">({clients.length})</span>
              </button>
              <button
                onClick={() => { setBroadcastTarget("selected"); setSelectedSingleId(""); }}
                className={`rounded-full px-4 py-2 text-xs font-medium transition-all ${broadcastTarget === "selected" ? "bg-[#1d1d1f] text-white" : "bg-white text-[#6e6e73] hover:bg-white/80"}`}
              >
                {isAr ? "عملاء محددين" : "Selected clients"}
              </button>
              <button
                onClick={() => { setBroadcastTarget("single"); clearSelection(); }}
                className={`rounded-full px-4 py-2 text-xs font-medium transition-all ${broadcastTarget === "single" ? "bg-[#1d1d1f] text-white" : "bg-white text-[#6e6e73] hover:bg-white/80"}`}
              >
                {isAr ? "عميل واحد" : "Single client"}
              </button>
            </div>
          </div>

          {/* Single client dropdown */}
          {broadcastTarget === "single" && (
            <div>
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-[#6e6e73]">
                {isAr ? "اختر العميل" : "Select client"}
              </p>
              <select
                value={selectedSingleId}
                onChange={(e) => setSelectedSingleId(e.target.value)}
                className="w-full rounded-xl border border-[#d2d2d7] bg-white px-4 py-2.5 text-sm outline-none focus:border-[#0071e3]"
              >
                <option value="">{isAr ? "— اختر عميل —" : "— Select a client —"}</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.full_name || c.email || c.id}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Selected clients bar */}
          {broadcastTarget === "selected" && (
            <div>
              <div className="mb-2 flex items-center justify-between">
                <p className="text-xs font-medium uppercase tracking-wide text-[#6e6e73]">
                  {isAr ? "اختر العملاء من القائمة بالأسفل" : "Select clients from the list below"}
                </p>
                <div className="flex gap-2">
                  <button onClick={selectVisibleClients} className="text-xs font-medium text-[#0071e3] hover:underline">
                    {isAr ? "تحديد الكل" : "Select all"}
                  </button>
                  <button onClick={clearSelection} className="text-xs font-medium text-[#6e6e73] hover:underline">
                    {isAr ? "إلغاء التحديد" : "Clear"}
                  </button>
                </div>
              </div>
              {selectedClientIds.size > 0 && (
                <p className="rounded-xl bg-[#0071e3]/5 px-3 py-2 text-xs font-medium text-[#0071e3]">
                  {selectedClientIds.size} {isAr ? "عميل محدد" : "client(s) selected"}
                </p>
              )}
            </div>
          )}

          {/* Quick templates */}
          <div>
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-[#6e6e73]">
              {isAr ? "قوالب جاهزة" : "Quick templates"}
            </p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {templates.map((tpl) => (
                <button
                  key={tpl.id}
                  onClick={() => applyTemplate(tpl.id)}
                  className={`rounded-xl border px-3 py-2.5 text-start text-xs transition-all ${
                    activeTemplate === tpl.id
                      ? "border-[#0071e3] bg-[#0071e3]/5"
                      : "border-[#d2d2d7] bg-white hover:bg-white/80"
                  }`}
                >
                  <span className="text-base">{tpl.icon}</span>
                  <span className="mt-0.5 block font-medium">{isAr ? tpl.titleAr : tpl.titleEn}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Custom message */}
          <div className={activeTemplate ? "opacity-60" : ""}>
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-[#6e6e73]">
              {isAr ? "رسالة مخصصة" : "Custom message"}
              {activeTemplate && ` (${isAr ? "عدّل القالب أو اختر آخر" : "edit template or pick another"})`}
            </p>
            <input
              value={broadcastTitle}
              onChange={(e) => { setBroadcastTitle(e.target.value); setActiveTemplate(null); }}
              placeholder={isAr ? "عنوان الإشعار" : "Notification title"}
              className="w-full rounded-xl border border-[#d2d2d7] bg-white px-4 py-2.5 text-sm outline-none focus:border-[#0071e3]"
            />
            <textarea
              value={broadcastBody}
              onChange={(e) => { setBroadcastBody(e.target.value); setActiveTemplate(null); }}
              placeholder={isAr ? "نص الإشعار" : "Notification body"}
              rows={3}
              className="mt-2 w-full rounded-xl border border-[#d2d2d7] bg-white px-4 py-2.5 text-sm outline-none focus:border-[#0071e3]"
            />
          </div>

          {/* Link selector */}
          <div>
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-[#6e6e73]">
              {isAr ? "رابط الإشعار" : "Notification link"}
            </p>
            <select
              value={broadcastLink}
              onChange={(e) => setBroadcastLink(e.target.value)}
              className="w-full rounded-xl border border-[#d2d2d7] bg-white px-4 py-2.5 text-sm outline-none focus:border-[#0071e3]"
            >
              <option value="/dashboard">{isAr ? "لوحة التحكم" : "Dashboard"}</option>
              <option value="/plans">{isAr ? "الخطط" : "Plans"}</option>
              <option value="/questionnaires">{isAr ? "الاستبيانات" : "Questionnaires"}</option>
              <option value="/progress">{isAr ? "التقدم" : "Progress"}</option>
              <option value="/meal-planner">{isAr ? "مخطط الوجبات" : "Meal Planner"}</option>
              <option value="/memberships">{isAr ? "العضويات" : "Memberships"}</option>
              <option value="/support">{isAr ? "الدعم" : "Support"}</option>
            </select>
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <button
              onClick={sendBroadcast}
              disabled={
                broadcasting ||
                !broadcastTitle.trim() ||
                !broadcastBody.trim() ||
                (broadcastTarget === "single" && !selectedSingleId) ||
                (broadcastTarget === "selected" && selectedClientIds.size === 0)
              }
              className="rounded-full bg-[#0071e3] px-5 py-2.5 text-sm font-normal text-white transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {broadcasting
                ? "..."
                : broadcastTarget === "all"
                  ? isAr ? `إرسال للجميع (${clients.length})` : `Send to all (${clients.length})`
                  : broadcastTarget === "selected"
                    ? isAr ? `إرسال لـ ${selectedClientIds.size} عميل` : `Send to ${selectedClientIds.size} client(s)`
                    : isAr ? "إرسال" : "Send"}
            </button>
            <button
              onClick={() => setShowBroadcast(false)}
              className="rounded-full border border-[#d2d2d7] bg-white px-5 py-2.5 text-sm font-normal text-[#6e6e73] transition-colors hover:bg-[#f5f5f7]"
            >
              {isAr ? "إلغاء" : "Cancel"}
            </button>
          </div>
        </div>
      )}

      {/* Stats — Apple-style large numbers */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl bg-[#f5f5f7] p-6">
          <p className="text-3xl font-semibold tracking-tight">{clients.length}</p>
          <p className="mt-1 text-xs font-normal text-[#6e6e73]">{t("coach.totalClients")}</p>
        </div>
        <div className="rounded-2xl bg-[#f5f5f7] p-6">
          <p className="text-3xl font-semibold tracking-tight text-[#34c759]">{activeSubs.length}</p>
          <p className="mt-1 text-xs font-normal text-[#6e6e73]">{t("coach.activeSubs")}</p>
        </div>
        <div className="rounded-2xl bg-[#f5f5f7] p-6">
          <p className="text-3xl font-semibold tracking-tight text-[#ff9500]">{expiringSoon.length}</p>
          <p className="mt-1 text-xs font-normal text-[#6e6e73]">{t("coach.expiringSoon")}</p>
        </div>
      </div>

      {/* Pending payment requests — actionable banner */}
      {pendingRequests.length > 0 && (
        <div className="rounded-3xl border border-[#0071e3]/20 bg-[#0071e3]/5 p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <h3 className="text-base font-semibold text-[#0071e3]">
                {isAr
                  ? `${pendingRequests.length} طلب دفع بانتظار المراجعة`
                  : `${pendingRequests.length} payment request${pendingRequests.length > 1 ? "s" : ""} pending review`}
              </h3>
              <p className="mt-1 text-sm font-normal text-[#6e6e73]">
                {isAr
                  ? "عملاء رفعوا إيصالات الدفع وينتظرون التفعيل"
                  : "Clients who uploaded payment receipts and await activation"}
              </p>
            </div>
            <button
              onClick={() => navigate("coach-payments")}
              className="shrink-0 rounded-full bg-[#0071e3] px-5 py-2.5 text-sm font-normal text-white transition-opacity hover:opacity-90"
            >
              {isAr ? "مراجعة الطلبات ›" : "Review requests ›"}
            </button>
          </div>
        </div>
      )}

      {/* Clients list with filter tabs */}
      <div className="rounded-3xl bg-[#f5f5f7] p-6 md:p-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <h2 className="text-xl font-semibold tracking-tight">{t("coach.clients")}</h2>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("coach.searchClients")}
            className="w-full max-w-xs rounded-full border border-[#d2d2d7] bg-white px-5 py-2.5 text-sm font-normal outline-none focus:border-[#0071e3]"
          />
        </div>

        {/* Filter tabs */}
        <div className="mb-6 flex flex-wrap gap-2">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-medium transition-all ${
                  isActive
                    ? "bg-[#1d1d1f] text-white"
                    : "bg-white text-[#6e6e73] hover:bg-white/80"
                }`}
              >
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: isActive ? tab.color : "#d2d2d7" }}
                />
                {isAr ? tab.labelAr : tab.labelEn}
                <span
                  className={`grid h-5 min-w-5 place-items-center rounded-full px-1 text-[10px] font-bold ${
                    isActive ? "bg-white/20 text-white" : "bg-[#f5f5f7] text-[#6e6e73]"
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Client list */}
        {filtered.length === 0 ? (
          <p className="py-12 text-center text-base font-normal text-[#6e6e73]">{t("coach.noClients")}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#d2d2d7]">
                  {broadcastTarget === "selected" && (
                    <th className="w-10 p-3">
                      <input
                        type="checkbox"
                        checked={filtered.length > 0 && filtered.every((c) => selectedClientIds.has(c.id))}
                        onChange={() => filtered.every((c) => selectedClientIds.has(c.id)) ? clearSelection() : selectVisibleClients()}
                        className="h-4 w-4 rounded accent-[#0071e3]"
                      />
                    </th>
                  )}
                  <th className="p-3 text-start text-xs font-normal uppercase tracking-wide text-[#6e6e73]">
                    {t("coach.client")}
                  </th>
                  <th className="p-3 text-start text-xs font-normal uppercase tracking-wide text-[#6e6e73]">
                    {isAr ? "الحالة" : "Status"}
                  </th>
                  <th className="p-3 text-start text-xs font-normal uppercase tracking-wide text-[#6e6e73]">
                    {isAr ? "الاستبيان" : "Questionnaire"}
                  </th>
                  <th className="p-3 text-start text-xs font-normal uppercase tracking-wide text-[#6e6e73]">
                    {isAr ? "العضوية" : "Membership"}
                  </th>
                  <th className="p-3 text-start text-xs font-normal uppercase tracking-wide text-[#6e6e73]">
                    {t("coach.expiry")}
                  </th>
                  <th className="p-3 text-start text-xs font-normal uppercase tracking-wide text-[#6e6e73]">
                    {t("coach.manage")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((c) => {
                  return (
                    <tr key={c.id} className={cn("border-b border-[#d2d2d7]/60 hover:bg-white/50", selectedClientIds.has(c.id) && "bg-[#0071e3]/5")}>
                      {broadcastTarget === "selected" && (
                        <td className="p-3">
                          <input
                            type="checkbox"
                            checked={selectedClientIds.has(c.id)}
                            onChange={() => toggleClientSelection(c.id)}
                            className="h-4 w-4 rounded accent-[#0071e3]"
                          />
                        </td>
                      )}
                      <td className="p-3">
                        <div className="font-medium">{c.full_name || "—"}</div>
                        <div className="text-xs font-normal text-[#6e6e73]">{c.email || c.phone || "—"}</div>
                      </td>
                      <td className="p-3">
                        <div className="flex flex-wrap gap-1">
                          {c.hasPendingPayment && (
                            <span className="rounded-full bg-[#0071e3]/10 px-2 py-0.5 text-[10px] font-medium text-[#0071e3]">
                              {isAr ? "بانتظار الدفع" : "Pending payment"}
                            </span>
                          )}
                          {c.isActive && !c.isExpiring && (
                            <span className="rounded-full bg-[#34c759]/10 px-2 py-0.5 text-[10px] font-medium text-[#34c759]">
                              {isAr ? "نشط" : "Active"}
                            </span>
                          )}
                          {c.isExpiring && (
                            <span className="rounded-full bg-[#ff9500]/10 px-2 py-0.5 text-[10px] font-medium text-[#ff9500]">
                              {isAr ? "ينتهي قريباً" : "Expiring"}
                            </span>
                          )}
                          {c.isExpired && (
                            <span className="rounded-full bg-[#8b5cf6]/10 px-2 py-0.5 text-[10px] font-medium text-[#8b5cf6]">
                              {isAr ? "منتهي" : "Expired"}
                            </span>
                          )}
                          {!c.hasSub && (
                            <span className="rounded-full bg-[#6e6e73]/10 px-2 py-0.5 text-[10px] font-medium text-[#6e6e73]">
                              {isAr ? "بدون اشتراك" : "No sub"}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="p-3">
                        <div className="flex flex-wrap gap-1">
                          {c.hasNutriQ ? (
                            <span className="rounded-full bg-[#34c759]/10 px-2 py-0.5 text-[10px] font-medium text-[#34c759]">
                              {isAr ? "تغذية ✓" : "Nutri ✓"}
                            </span>
                          ) : (
                            <span className="rounded-full bg-[#ff3b30]/10 px-2 py-0.5 text-[10px] font-medium text-[#ff3b30]">
                              {isAr ? "تغذية ✗" : "Nutri ✗"}
                            </span>
                          )}
                          {c.hasFitQ ? (
                            <span className="rounded-full bg-[#34c759]/10 px-2 py-0.5 text-[10px] font-medium text-[#34c759]">
                              {isAr ? "لياقة ✓" : "Fit ✓"}
                            </span>
                          ) : (
                            <span className="rounded-full bg-[#ff3b30]/10 px-2 py-0.5 text-[10px] font-medium text-[#ff3b30]">
                              {isAr ? "لياقة ✗" : "Fit ✗"}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="p-3">
                        {c.sub?.tier ? (
                          <div className="flex flex-col gap-1">
                            <span
                              className={`inline-block w-fit rounded-full px-2.5 py-0.5 text-xs font-medium ${
                                c.sub.tier === "premium"
                                  ? "bg-[#0071e3]/10 text-[#0071e3]"
                                  : c.sub.tier === "pro"
                                    ? "bg-[#1d1d1f]/10 text-[#1d1d1f]"
                                    : c.sub.tier === "coaching"
                                      ? "bg-[#8b5cf6]/10 text-[#8b5cf6]"
                                      : "bg-[#f5f5f7] text-[#6e6e73]"
                              }`}
                            >
                              {tierName(c.sub.tier)}
                            </span>
                            {/* Confirmation status badge */}
                            {c.sub?.status && (
                              <span
                                className={`inline-block w-fit rounded-full px-2 py-0.5 text-[10px] font-normal ${
                                  c.sub.status === "active"
                                    ? "bg-[#34c759]/10 text-[#34c759]"
                                    : c.sub.status === "pending"
                                      ? "bg-[#ff9500]/10 text-[#ff9500]"
                                      : "bg-[#6e6e73]/10 text-[#6e6e73]"
                                }`}
                              >
                                {c.sub.status === "active"
                                  ? isAr ? "مؤكد" : "Confirmed"
                                  : c.sub.status === "pending"
                                    ? isAr ? "بانتظار التأكيد" : "Pending"
                                    : c.sub.status}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs font-normal text-[#6e6e73]">—</span>
                        )}
                      </td>
                      <td className="p-3 font-normal text-[#6e6e73]">
                        {c.sub?.end_date ? new Date(c.sub.end_date).toLocaleDateString() : "—"}
                      </td>
                      <td className="p-3">
                        <button
                          onClick={() => navigate("coach-client", { clientId: c.id })}
                          className="text-sm font-normal text-[#0071e3] transition-opacity hover:opacity-70"
                        >
                          {t("coach.manage")} ›
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
