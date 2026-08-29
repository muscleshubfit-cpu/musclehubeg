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
  getCoachClientListOptimized,
} from "@/lib/data";
import { getTier } from "@/lib/plans";
import { MEMBERSHIPS } from "@/lib/memberships";
import { toast } from "sonner";
import { NotificationForm } from "@/components/NotificationForm";
import { cn } from "@/lib/utils";

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
  // multi-coach assignment (0030A — admin reassignment UI, Phase 2B)
  assigned_coach_id: string | null;
  assigned_coach_name: string | null;
};

type StaffMember = { id: string; full_name: string | null; email: string | null; role: string };

export function CoachView() {
  const { t, lang } = useI18n();
  const isAr = lang === "ar";
  const { profile, isAdmin } = useAuth();
  const { navigate } = useNav();
  const [clients, setClients] = useState<ClientWithMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<FilterTab>("all");
  const [pendingRequests, setPendingRequests] = useState<any[]>([]);
  // Admin reassignment (Phase 2B): staff dropdown + per-row saving state
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [reassigning, setReassigning] = useState<string | null>(null);

  // OWNER DIRECTIVE (2026-08-30) — «فصل بين عملاء المدربين وعملاء الموقع»:
  // admin-only top-level segment above the status tabs. «عملاء المدربين» =
  // clients with a coach_assignments row (assigned_coach_id from the
  // get_coach_client_list RPC); «عملاء الموقع» = clients with no coach.
  const [clientSegment, setClientSegment] = useState<"all" | "coach" | "site">("all");

  // Broadcast notification state
  const [showBroadcast, setShowBroadcast] = useState(false);

  // COACH-INVITES-CLIENT (0033, owner answer 1 «الطريقتين»): the coach
  // brings clients either via his landing page or by personal invite.
  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteName, setInviteName] = useState("");
  const [inviting, setInviting] = useState(false);
  const [broadcastTarget, setBroadcastTarget] = useState<"all" | "selected" | "single">("all");
  const [selectedClientIds, setSelectedClientIds] = useState<Set<string>>(new Set());
  const [selectedSingleId, setSelectedSingleId] = useState("");

  useEffect(() => {
    (async () => {
      try {
        // Decision 1 fix: try the optimized RPC first (1 query instead of 2N+3)
        const optimized = await getCoachClientListOptimized();

        if (optimized && optimized.length >= 0) {
          // RPC returned data — build client list from the single query result
          const now = Date.now();
          const enriched: ClientWithMeta[] = optimized.map((row: any) => {
            const sub = row.sub_tier
              ? {
                  tier: row.sub_tier,
                  status: row.sub_status,
                  end_date: row.sub_end_date,
                  months: row.sub_months,
                  client_id: row.client_id,
                }
              : undefined;
            const isActive =
              sub && sub.status === "active" && sub.end_date && new Date(sub.end_date).getTime() > now;
            const isExpiring =
              isActive && sub.end_date && new Date(sub.end_date).getTime() - now < 14 * 864e5;
            const isExpired =
              sub && (sub.status !== "active" || (sub.end_date && new Date(sub.end_date).getTime() <= now));
            const hasSub = !!sub;

            return {
              id: row.client_id,
              full_name: row.client_full_name,
              email: row.client_email,
              phone: row.client_phone,
              created_at: row.client_created_at,
              sub,
              isActive: !!isActive,
              isExpiring: !!isExpiring,
              isExpired: !!isExpired,
              hasSub,
              hasNutriQ: !!row.nutri_q_status,
              hasFitQ: !!row.fit_q_status,
              hasPendingPayment: (row.pending_payments || 0) > 0,
              assigned_coach_id: row.assigned_coach_id ?? null,
              assigned_coach_name: row.assigned_coach_name ?? null,
            } as ClientWithMeta;
          });
          setClients(enriched);
          // Still need pending requests for the payments UI
          const reqs = await listSubscriptionRequests("pending");
          setPendingRequests(reqs as any[]);
          setLoading(false);
          return;
        }

        // Fallback: old N+1 path (RPC not available or failed)
        const [c, s, reqs] = await Promise.all([
          listAllClients(),
          listAllSubscriptions(),
          listSubscriptionRequests("pending"),
        ]);

        const enrichedFallback = await Promise.all(
          (c as any[]).map(async (client) => {
            const sub = (s as any[]).find((x) => x.client_id === client.id);
            const isActive =
              sub && sub.status === "active" && new Date(sub.end_date).getTime() > now;
            const isExpiring =
              isActive && new Date(sub.end_date).getTime() - now < 14 * 864e5;
            const isExpired =
              sub && (sub.status !== "active" || new Date(sub.end_date).getTime() <= now);
            const hasSub = !!sub;

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
              assigned_coach_id: null,
              assigned_coach_name: null,
            } as ClientWithMeta;
          }),
        );

        setClients(enrichedFallback);
        setPendingRequests(reqs as any[]);
      } catch (e) {
        console.error("[CoachView] load failed", e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Admin reassignment (Phase 2B): load the staff list once for the dropdown
  useEffect(() => {
    if (!isAdmin) return;
    (async () => {
      try {
        const res = await fetch("/api/admin/assignments");
        if (res.ok) {
          const json = await res.json();
          setStaff(json.staff ?? []);
        }
      } catch {
        // dropdown stays empty — the column still shows current names
      }
    })();
  }, [isAdmin]);

  async function reassignClient(clientId: string, coachId: string) {
    if (!coachId) return;
    setReassigning(clientId);
    try {
      const res = await fetch("/api/admin/assignments", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ client_id: clientId, coach_id: coachId }),
      });
      if (res.ok) {
        const target = staff.find((x) => x.id === coachId);
        setClients((prev) =>
          prev.map((c) =>
            c.id === clientId
              ? { ...c, assigned_coach_id: coachId, assigned_coach_name: target?.full_name || "—" }
              : c,
          ),
        );
      }
    } finally {
      setReassigning(null);
    }
  }

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
      // Owner directive: admin split — coach clients vs site clients
      coach_clients: clients.filter((c) => !!c.assigned_coach_id).length,
      site_clients: clients.filter((c) => !c.assigned_coach_id).length,
    };
  }, [clients]);

  // Apply search + active filter
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return clients.filter((c) => {
      // Admin segment filter (owner directive: coach clients ≠ site clients).
      // Coaches are unaffected — the RPC already scopes their list.
      if (isAdmin && clientSegment === "coach" && !c.assigned_coach_id) return false;
      if (isAdmin && clientSegment === "site" && c.assigned_coach_id) return false;
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
  }, [clients, search, activeTab, isAdmin, clientSegment]);

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
    // Membership tier filters — group by plan. OWNER BOUNDARY (2026-08-30):
    // «المدرب شايف اشتراك العميل فى الموقع نفسه ده خطأ» — premium/pro are
    // SITE memberships; the coach never sees them. Admin-only pills.
    ...(isAdmin
      ? ([
          { id: "premium", labelAr: "بريميوم", labelEn: "Premium", count: counts.premium, color: "#0071e3" },
          { id: "pro", labelAr: "برو", labelEn: "Pro", count: counts.pro, color: "#1d1d1f" },
        ] as const)
      : []),
    { id: "coaching", labelAr: "كوتشينج", labelEn: "Coaching", count: counts.coaching, color: "#8b5cf6" },
  ];

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

  async function inviteClient() {
    const email = inviteEmail.trim();
    if (!email) {
      toast.error(isAr ? "اكتب بريد العميل أولًا" : "Enter the client's email first");
      return;
    }
    setInviting(true);
    try {
      const res = await fetch("/api/coach/clients/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, full_name: inviteName.trim() || undefined }),
      });
      const json = await res.json().catch(() => ({}));
      if (res.ok) {
        toast.success(
          isAr
            ? `تم إرسال دعوة إلى ${email} — هيظهر عندك هنا أول ما يسجّل`
            : `Invite sent to ${email} — he will appear here once he signs up`,
          { duration: 7000 },
        );
        setInviteEmail("");
        setInviteName("");
        setShowInvite(false);
      } else {
        toast.error(json.message || json.error || (isAr ? "فشل إرسال الدعوة" : "Invite failed"));
      }
    } finally {
      setInviting(false);
    }
  }

  // Build sendMode for NotificationForm
  const notifSendMode =
    broadcastTarget === "all"
      ? { kind: "all" as const, totalCount: clients.length }
      : broadcastTarget === "selected"
        ? { kind: "selected" as const, userIds: Array.from(selectedClientIds) }
        : { kind: "single" as const, userId: selectedSingleId };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">{t("coach.title")}</h1>
        <p className="mt-2 text-base font-normal text-[#6e6e73] md:text-lg">{t("coach.subtitle")}</p>
        {!isAdmin && (
          <p className="mt-2 inline-block rounded-full bg-[#0071e3]/10 px-4 py-1.5 text-xs font-medium text-[#0071e3]">
            {isAr
              ? "عملاؤك الخاصون فقط — جيب عملاءك عبر صفحتك العامة أو ادعُهم بإيميل"
              : "Your private clients only — bring clients via your public page or invite them by email"}
          </p>
        )}
      </div>

      {/* Actions: broadcast + invite client */}
      <div className="flex flex-wrap items-center gap-3">
        <button
          onClick={() => setShowBroadcast(!showBroadcast)}
          className="rounded-full bg-[#1d1d1f] px-5 py-2.5 text-sm font-normal text-white transition-opacity hover:opacity-90"
        >
          {isAr ? "إرسال إشعار للعملاء" : "Send notification to clients"}
        </button>
        {!isAdmin && (
          <button
            onClick={() => setShowInvite(!showInvite)}
            className="rounded-full bg-[#0071e3] px-5 py-2.5 text-sm font-normal text-white transition-opacity hover:opacity-90"
          >
            {showInvite
              ? (isAr ? "إغلاق الدعوة" : "Close invite")
              : (isAr ? "+ دعوة عميل" : "+ Invite a client")}
          </button>
        )}
        {selectedClientIds.size > 0 && (
          <span className="rounded-full bg-[#0071e3]/10 px-3 py-1 text-xs font-medium text-[#0071e3]">
            {selectedClientIds.size} {isAr ? "عميل محدد" : "selected"}
          </span>
        )}
      </div>

      {/* Invite-client form (coach brings his own clients — 0033) */}
      {showInvite && !isAdmin && (
        <div className="rounded-3xl border border-[#0071e3]/20 bg-[#0071e3]/[0.04] p-6">
          <p className="text-sm font-medium">
            {isAr ? "دعوة عميل جديد بالبريد" : "Invite a new client by email"}
          </p>
          <p className="mt-1 text-xs font-normal text-[#6e6e73]">
            {isAr
              ? "هيوصله دعوة على إيميله يحدد منها كلمة المرور — وبمجرد ما يسجّل يبقى عميلك وتشوف بياناته هنا."
              : "He receives an invite email to set his own password — once he signs up he becomes your client and you see his data here."}
          </p>
          <div className="mt-4 flex flex-col gap-3 sm:flex-row">
            <input
              type="email"
              dir="ltr"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder="client@example.com"
              className="flex-1 rounded-xl border border-[#d2d2d7] bg-white px-4 py-2.5 text-sm outline-none focus:border-[#0071e3]"
            />
            <input
              value={inviteName}
              onChange={(e) => setInviteName(e.target.value)}
              placeholder={isAr ? "الاسم (اختياري)" : "Name (optional)"}
              className="flex-1 rounded-xl border border-[#d2d2d7] bg-white px-4 py-2.5 text-sm outline-none focus:border-[#0071e3]"
            />
            <button
              onClick={inviteClient}
              disabled={inviting}
              className="rounded-xl bg-[#0071e3] px-6 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {inviting
                ? (isAr ? "جارٍ الإرسال…" : "Sending…")
                : (isAr ? "إرسال الدعوة" : "Send invite")}
            </button>
          </div>
        </div>
      )}

      {/* Broadcast form */}
      {showBroadcast && (
        <div className="rounded-3xl border border-[#d2d2d7] bg-[#f5f5f7] p-6">
          {/* Target type buttons */}
          <div className="mb-5">
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
                {isAr ? "عملاء محددون" : "Selected clients"}
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
            <div className="mb-5">
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

          {/* Selected clients hint */}
          {broadcastTarget === "selected" && (
            <div className="mb-5">
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

          {/* Shared notification form */}
          <NotificationForm
            lang={lang}
            sendMode={notifSendMode}
            showClose
            onClose={() => setShowBroadcast(false)}
            visible
            onSent={() => {
              setShowBroadcast(false);
              setSelectedClientIds(new Set());
              setSelectedSingleId("");
            }}
            onSelectAll={selectVisibleClients}
            onClearSelection={clearSelection}
          />
        </div>
      )}

      {/* Stats
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

      {/* Pending payment requests — actionable banner (0043: ADMIN ONLY).
          SITE membership requests are B2C/admin business per the
          terminology law — coaches' lists return 0 pending from the RPC
          and the admin gets the review link to /admin/payments. */}
      {isAdmin && pendingRequests.length > 0 && (
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
              onClick={() => navigate("admin-payments")}
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

        {/* Admin segment control — «فصل بين عملاء المدربين وعملاء الموقع»
            (owner directive). Coach clients have a coach_assignments row;
            site clients came to the site directly with no coach. */}
        {isAdmin && (
          <div className="mb-5 flex flex-wrap gap-2">
            {(
              [
                {
                  id: "all" as const,
                  labelAr: "كل العملاء",
                  labelEn: "All clients",
                  count: counts.all,
                },
                {
                  id: "coach" as const,
                  labelAr: "عملاء المدربين",
                  labelEn: "Coach clients",
                  count: counts.coach_clients,
                },
                {
                  id: "site" as const,
                  labelAr: "عملاء الموقع",
                  labelEn: "Site clients",
                  count: counts.site_clients,
                },
              ]
            ).map((seg) => {
              const active = clientSegment === seg.id;
              return (
                <button
                  key={seg.id}
                  onClick={() => setClientSegment(seg.id)}
                  className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-all ${
                    active
                      ? "bg-[#1d1d1f] text-white"
                      : "border border-[#d2d2d7] bg-white text-[#1d1d1f] hover:bg-white/80"
                  }`}
                >
                  {isAr ? seg.labelAr : seg.labelEn}
                  <span
                    className={`grid h-5 min-w-5 place-items-center rounded-full px-1 text-[10px] font-bold ${
                      active ? "bg-white/20 text-white" : "bg-[#f5f5f7] text-[#6e6e73]"
                    }`}
                  >
                    {seg.count}
                  </span>
                </button>
              );
            })}
          </div>
        )}

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
                  {isAdmin && (
                    <th className="p-3 text-start text-xs font-normal uppercase tracking-wide text-[#6e6e73]">
                      {isAr ? "المدرب" : "Coach"}
                    </th>
                  )}
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
                      {isAdmin && (
                        <td className="p-3">
                          <select
                            value={c.assigned_coach_id ?? ""}
                            disabled={reassigning === c.id || staff.length === 0}
                            onChange={(e) => reassignClient(c.id, e.target.value)}
                            className="max-w-[11rem] rounded-lg border border-[#d2d2d7] bg-white px-2 py-1.5 text-xs outline-none focus:border-[#0071e3] disabled:opacity-50"
                          >
                            {staff.map((s) => (
                              <option key={s.id} value={s.id}>
                                {(s.full_name || s.email || s.id) + (s.role === "admin" ? (isAr ? " (أدمن)" : " (admin)") : "")}
                              </option>
                            ))}
                          </select>
                        </td>
                      )}
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
