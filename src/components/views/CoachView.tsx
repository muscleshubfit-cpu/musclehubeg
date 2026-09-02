"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/hooks/use-auth";
import { useNav } from "@/hooks/use-nav";
import {
  listAllClients,
  listAllSubscriptions,
  listSubscriptionRequests,
  getQuestionnaire,
  getCoachClientListOptimized,
  getCoachClientListPaged,
  getCoachClientStats,
  type CoachClientStats,
} from "@/lib/data";
import type { SubscriptionRequest } from "@/lib/supabase/types";
import { getTier, type TierId } from "@/lib/plans";
import { MEMBERSHIPS } from "@/lib/memberships";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { NotificationForm } from "@/components/NotificationForm";
import { Pagination } from "@/components/Pagination";
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
  // subscription info (RPC view from enrichClientRow OR full Subscription row)
  sub?: ClientSubInfo;
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

/** Subscription info attached to a client row (RPC view or full row). */
type ClientSubInfo = {
  tier?: string | null;
  status?: string | null;
  end_date?: string | null;
  months?: number | null;
  client_id?: string;
};

type StaffMember = { id: string; full_name: string | null; email: string | null; role: string };

type ClientPickerHit = Pick<ClientWithMeta, "id" | "full_name" | "email" | "phone">;

/** Row shape shared by get_coach_client_list_paged + get_coach_client_list (0043 columns). */
type CoachClientRpcRow = {
  client_id: string;
  client_full_name: string | null;
  client_email: string | null;
  client_phone: string | null;
  client_created_at: string;
  sub_tier: string | null;
  sub_status: string | null;
  sub_end_date: string | null;
  sub_months: number | null;
  pending_payments: number | null;
  nutri_q_status: string | null;
  fit_q_status: string | null;
  assigned_coach_id: string | null;
  assigned_coach_name: string | null;
  total_count?: number | string;
};

function fmtNum(n: number, isAr: boolean) {
  return n.toLocaleString(isAr ? "ar-EG" : "en-US");
}

/**
 * Phase 52: one mapper shared by the paged RPC (0047) and the legacy
 * optimized RPC — both return the same row shape (0043 columns).
 */
function enrichClientRow(row: CoachClientRpcRow): ClientWithMeta {
  const now = Date.now();
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
    hasSub: !!sub,
    hasNutriQ: !!row.nutri_q_status,
    hasFitQ: !!row.fit_q_status,
    hasPendingPayment: (row.pending_payments || 0) > 0,
    assigned_coach_id: row.assigned_coach_id ?? null,
    assigned_coach_name: row.assigned_coach_name ?? null,
  } as ClientWithMeta;
}

export function CoachView() {
  const { t, lang } = useI18n();
  const isAr = lang === "ar";
  const { profile, isAdmin } = useAuth();
  const { navigate } = useNav();
  const [clients, setClients] = useState<ClientWithMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<FilterTab>("all");
  const [pendingRequests, setPendingRequests] = useState<SubscriptionRequest[]>([]);
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

  // ─── Phase 52 — «تخيل لو فى ١٠٠٠٠٠٠٠ مستخدم مسجل»: server-side paging.
  // pagedMode=true → one page per fetch via get_coach_client_list_paged
  // (0047). If that RPC is missing (migration not applied yet) the legacy
  // full-list path takes over and the UI slices it instead — nothing breaks.
  const [pagedMode, setPagedMode] = useState(true);
  const [stats, setStats] = useState<CoachClientStats | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [totalCount, setTotalCount] = useState(0);
  const [sort, setSort] = useState<"newest" | "oldest" | "name" | "expiry">("newest");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const firstLoad = useRef(true);
  // Single-client broadcast picker — a full <select> is unusable at scale;
  // type to search name/email/phone instead.
  const [singleQuery, setSingleQuery] = useState("");
  const [singleResults, setSingleResults] = useState<ClientPickerHit[]>([]);
  const [singleChosen, setSingleChosen] = useState<{ id: string; label: string } | null>(null);

  // Stats + pending payment requests — one small load, independent of paging.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [st, reqs] = await Promise.all([
          getCoachClientStats(),
          listSubscriptionRequests("pending").catch(() => []),
        ]);
        if (!cancelled) {
          setStats(st);
          setPendingRequests(reqs);
        }
      } catch {
        /* stats stay null → tab pills count the loaded page/list instead */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // PAGED path (0047): the DB applies search/segment/tab/sort and returns
  // ONE page + total_count. If the RPC is missing (migration not applied
  // yet) we flip to the legacy full-list path below — nothing breaks.
  useEffect(() => {
    if (!pagedMode) return;
    let cancelled = false;
    if (firstLoad.current) setLoading(true);
    else setRefreshing(true);
    (async () => {
      const rows = await getCoachClientListPaged({
        limit: pageSize,
        offset: (page - 1) * pageSize,
        search: debouncedSearch,
        filter: activeTab,
        segment: isAdmin ? clientSegment : "all",
        sort,
      });
      if (cancelled) return;
      if (rows === null) {
        // 0047 RPC not applied → legacy full-list mode takes over.
        firstLoad.current = true;
        setPagedMode(false);
        return;
      }
      setClients(rows.map(enrichClientRow));
      setTotalCount(rows.length ? Number(rows[0].total_count) || 0 : 0);
      firstLoad.current = false;
      setLoading(false);
      setRefreshing(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [pagedMode, page, pageSize, debouncedSearch, activeTab, clientSegment, sort, isAdmin]);

  // Reset to page 1 whenever the query shape changes.
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, activeTab, clientSegment, sort, pageSize]);

  // Debounce the search box (350ms) so typing doesn't hammer the DB.
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 350);
    return () => clearTimeout(t);
  }, [search]);

  // Single-client picker search — paged mode asks the DB for the first 8
  // matches; legacy filters the in-memory list. Debounced 300ms.
  useEffect(() => {
    const q = singleQuery.trim();
    if (broadcastTarget !== "single" || !q) {
      setSingleResults([]);
      return;
    }
    const t = setTimeout(async () => {
      if (pagedMode) {
        const rows = await getCoachClientListPaged({
          limit: 8,
          offset: 0,
          search: q,
          filter: "all",
          segment: isAdmin ? clientSegment : "all",
          sort: "newest",
        });
        setSingleResults(
          rows
            ? rows.map((r) => ({
                id: r.client_id,
                full_name: r.client_full_name,
                email: r.client_email,
                phone: r.client_phone,
              }))
            : [],
        );
      } else {
        const ql = q.toLowerCase();
        setSingleResults(
          clients
            .filter(
              (c) =>
                (c.full_name || "").toLowerCase().includes(ql) ||
                (c.email || "").toLowerCase().includes(ql) ||
                (c.phone || "").toLowerCase().includes(ql),
            )
            .slice(0, 8)
            .map((c) => ({ id: c.id, full_name: c.full_name, email: c.email, phone: c.phone })),
        );
      }
    }, 300);
    return () => clearTimeout(t);
  }, [singleQuery, broadcastTarget, pagedMode, isAdmin, clientSegment, clients]);

  // LEGACY path (0047 RPC not applied, or local dev without Supabase):
  // the old full-list load — unchanged behavior, the UI still paginates by
  // slicing it locally. Kept as the graceful fallback so the owner can
  // apply the migration whenever he is ready.
  useEffect(() => {
    if (pagedMode) return;
    let cancelled = false;
    (async () => {
      try {
        // Decision 1 fix: try the optimized RPC first (1 query instead of 2N+3)
        const optimized = await getCoachClientListOptimized();

        if (optimized && optimized.length >= 0) {
          setClients(optimized.map(enrichClientRow));
          setLoading(false);
          return;
        }

        // Fallback: old N+1 path (RPC not available or failed)
        const [c, s, reqs] = await Promise.all([
          listAllClients(),
          listAllSubscriptions(),
          listSubscriptionRequests("pending"),
        ]);

        const now = Date.now();
        const enrichedFallback = await Promise.all(
          c.map(async (client) => {
            const sub = s.find((x) => x.client_id === client.id);
            const isActive =
              sub && sub.status === "active" && new Date(sub.end_date ?? 0).getTime() > now;
            const isExpiring =
              isActive && new Date(sub.end_date ?? 0).getTime() - now < 14 * 864e5;
            const isExpired =
              sub && (sub.status !== "active" || new Date(sub.end_date ?? 0).getTime() <= now);
            const hasSub = !!sub;

            const [nutriQ, fitQ] = await Promise.all([
              getQuestionnaire(client.id, "nutrition").catch(() => null),
              getQuestionnaire(client.id, "fitness").catch(() => null),
            ]);

            const hasPendingPayment = reqs.some(
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

        if (!cancelled) {
          setClients(enrichedFallback);
          setPendingRequests(reqs);
        }
      } catch (e) {
        console.error("[CoachView] load failed", e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [pagedMode]);

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

  // Tab counts — paged mode reads them from get_coach_client_stats()
  // (computed by the DB over the WHOLE scope, not just the loaded page);
  // legacy mode counts the in-memory full list.
  const counts = useMemo(() => {
    if (pagedMode && stats) {
      return {
        all: stats.total,
        active: stats.active,
        expiring: stats.expiring,
        no_plan: stats.no_plan,
        no_questionnaire: stats.no_questionnaire,
        pending_payment: stats.pending_payment,
        expired: stats.expired,
        premium: stats.premium,
        pro: stats.pro,
        coaching: stats.coaching,
        coach_clients: stats.coach_clients,
        site_clients: stats.site_clients,
      };
    }
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
  }, [clients, stats, pagedMode]);

  // Paged mode: the server already applied search+segment+tab — the loaded
  // page IS the result set. Legacy: filter + sort client-side (unchanged,
  // plus a client-side sort so the sort box works before 0047 is applied).
  const filtered = useMemo(() => {
    if (pagedMode) return clients;
    const q = search.trim().toLowerCase();
    const rows = clients.filter((c) => {
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
    const sorted = [...rows];
    sorted.sort((a, b) => {
      switch (sort) {
        case "oldest":
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        case "name":
          return (a.full_name || a.email || "").localeCompare(
            b.full_name || b.email || "",
            isAr ? "ar" : "en",
          );
        case "expiry": {
          const ax = a.sub?.end_date ? new Date(a.sub.end_date).getTime() : Infinity;
          const bx = b.sub?.end_date ? new Date(b.sub.end_date).getTime() : Infinity;
          return ax - bx;
        }
        default:
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
    });
    return sorted;
  }, [clients, search, activeTab, isAdmin, clientSegment, pagedMode, sort, isAr]);

  // What the pager counts + the rows of the current page. Paged mode:
  // server rows as-is. Legacy: slice the filtered list locally.
  const pagerTotal = pagedMode ? totalCount : filtered.length;
  const pageRows = useMemo(
    () => (pagedMode ? filtered : filtered.slice((page - 1) * pageSize, page * pageSize)),
    [filtered, pagedMode, page, pageSize],
  );

  if (loading)
    return (
      <div className="py-20 text-center text-base font-normal text-[#6e6e73]">
        {t("common.loading")}
      </div>
    );

  const tierName = (subTier: string) => {
    const m = MEMBERSHIPS.find((x) => x.id === subTier);
    if (m) return isAr ? m.nameAr : m.nameEn;
    // Legacy tier ids (starter/elite) — only they can ever match getTier,
    // which returns undefined for everything else (Phase 90 cast pattern).
    const legacy = getTier(subTier as TierId);
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
    setSelectedClientIds(new Set(pageRows.map((c) => c.id)));
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
      ? { kind: "all" as const, totalCount: counts.all }
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

      {/* Actions: broadcast + invite client + public-page/personal shortcuts */}
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
        {/* Phase 51 (owner: «صفحته العامة مش موجودة فى الداشبورد» + «زرار
            الصفحة الشخصية») — the coach's public-page editor and his
            member-style personal page, one tap away from his console. */}
        <button
          onClick={() => navigate("coach-landing")}
          className="rounded-full border border-[#0071e3]/40 bg-[#0071e3]/5 px-5 py-2.5 text-sm font-normal text-[#0071e3] transition-colors hover:bg-[#0071e3]/10"
        >
          {isAr ? "🌐 صفحتي العامة" : "🌐 My public page"}
        </button>
        <a
          href="/profile"
          className="rounded-full border border-[#d2d2d7] bg-white px-5 py-2.5 text-sm font-normal text-[#1d1d1f] transition-colors hover:bg-[#f5f5f7]"
        >
          {isAr ? "الصفحة الشخصية" : "Personal page"}
        </a>
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
                onClick={() => { setBroadcastTarget("all"); clearSelection(); setSelectedSingleId(""); setSingleChosen(null); }}
                className={`rounded-full px-4 py-2 text-xs font-medium transition-all ${broadcastTarget === "all" ? "bg-[#1d1d1f] text-white" : "bg-white text-[#6e6e73] hover:bg-white/80"}`}
              >
                {isAr ? "جميع العملاء" : "All clients"}
                <span className="ms-1 opacity-60">({counts.all})</span>
              </button>
              <button
                onClick={() => { setBroadcastTarget("selected"); setSelectedSingleId(""); setSingleChosen(null); }}
                className={`rounded-full px-4 py-2 text-xs font-medium transition-all ${broadcastTarget === "selected" ? "bg-[#1d1d1f] text-white" : "bg-white text-[#6e6e73] hover:bg-white/80"}`}
              >
                {isAr ? "عملاء محددون" : "Selected clients"}
              </button>
              <button
                onClick={() => { setBroadcastTarget("single"); clearSelection(); setSingleChosen(null); }}
                className={`rounded-full px-4 py-2 text-xs font-medium transition-all ${broadcastTarget === "single" ? "bg-[#1d1d1f] text-white" : "bg-white text-[#6e6e73] hover:bg-white/80"}`}
              >
                {isAr ? "عميل واحد" : "Single client"}
              </button>
            </div>
          </div>

          {/* Single client picker — searchable (Phase 52: a full <select>
              is unusable at scale; type to search name/email/phone) */}
          {broadcastTarget === "single" && (
            <div className="mb-5">
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-[#6e6e73]">
                {isAr ? "اختر العميل" : "Select client"}
              </p>
              {selectedSingleId && singleChosen ? (
                <span className="inline-flex items-center gap-2 rounded-full bg-[#0071e3]/10 px-4 py-2 text-sm font-medium text-[#0071e3]">
                  {singleChosen.label}
                  <button
                    onClick={() => { setSelectedSingleId(""); setSingleChosen(null); }}
                    aria-label={isAr ? "إلغاء الاختيار" : "Clear selection"}
                    className="text-[#0071e3]/70 transition-opacity hover:text-[#0071e3]"
                  >
                    ×
                  </button>
                </span>
              ) : (
                <div className="relative">
                  <input
                    value={singleQuery}
                    onChange={(e) => setSingleQuery(e.target.value)}
                    placeholder={isAr ? "اكتب اسم أو بريد أو رقم العميل…" : "Type a name, email or phone…"}
                    className="w-full rounded-xl border border-[#d2d2d7] bg-white px-4 py-2.5 text-sm outline-none focus:border-[#0071e3]"
                  />
                  {singleResults.length > 0 && (
                    <div className="absolute inset-x-0 z-10 mt-1 max-h-56 overflow-y-auto rounded-2xl border border-[#d2d2d7] bg-white p-1 shadow-lg shadow-black/5">
                      {singleResults.map((r) => (
                        <button
                          key={r.id}
                          onClick={() => {
                            setSelectedSingleId(r.id);
                            setSingleChosen({ id: r.id, label: r.full_name || r.email || r.id });
                            setSingleQuery("");
                            setSingleResults([]);
                          }}
                          className="flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2 text-start text-sm transition-colors hover:bg-[#f5f5f7]"
                        >
                          <span className="font-medium">{r.full_name || "—"}</span>
                          <span className="truncate text-xs font-normal text-[#6e6e73]" dir="ltr">
                            {r.email || r.phone || ""}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                  {singleQuery.trim() && singleResults.length === 0 && (
                    <p className="mt-1 px-1 text-xs text-[#86868b]">
                      {isAr ? "مفيش نتايج مطابقة" : "No matches"}
                    </p>
                  )}
                </div>
              )}
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
              setSingleChosen(null);
            }}
            onSelectAll={selectVisibleClients}
            onClearSelection={clearSelection}
          />
        </div>
      )}

      {/* Stats — Apple-style large numbers (paged mode: DB-wide counts) */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl bg-[#f5f5f7] p-6">
          <p className="text-3xl font-semibold tracking-tight">{fmtNum(counts.all, isAr)}</p>
          <p className="mt-1 text-xs font-normal text-[#6e6e73]">{t("coach.totalClients")}</p>
        </div>
        <div className="rounded-2xl bg-[#f5f5f7] p-6">
          <p className="text-3xl font-semibold tracking-tight text-[#34c759]">{fmtNum(counts.active, isAr)}</p>
          <p className="mt-1 text-xs font-normal text-[#6e6e73]">{t("coach.activeSubs")}</p>
        </div>
        <div className="rounded-2xl bg-[#f5f5f7] p-6">
          <p className="text-3xl font-semibold tracking-tight text-[#ff9500]">{fmtNum(counts.expiring, isAr)}</p>
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
          <h2 className="flex items-center gap-2 text-xl font-semibold tracking-tight">
            {t("coach.clients")}
            {refreshing && <Loader2 className="h-4 w-4 animate-spin text-[#86868b]" />}
          </h2>
          <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("coach.searchClients")}
              className="w-full max-w-xs rounded-full border border-[#d2d2d7] bg-white px-5 py-2.5 text-sm font-normal outline-none focus:border-[#0071e3]"
            />
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as "newest" | "oldest" | "name" | "expiry")}
              aria-label={isAr ? "الترتيب" : "Sort"}
              className="rounded-full border border-[#d2d2d7] bg-white px-4 py-2.5 text-sm font-normal outline-none focus:border-[#0071e3]"
            >
              <option value="newest">{isAr ? "الأحدث تسجيلًا" : "Newest"}</option>
              <option value="oldest">{isAr ? "الأقدم تسجيلًا" : "Oldest"}</option>
              <option value="name">{isAr ? "الاسم" : "Name"}</option>
              <option value="expiry">{isAr ? "الأقرب انتهاءً" : "Expiring first"}</option>
            </select>
          </div>
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
                        checked={pageRows.length > 0 && pageRows.every((c) => selectedClientIds.has(c.id))}
                        onChange={() => pageRows.every((c) => selectedClientIds.has(c.id)) ? clearSelection() : selectVisibleClients()}
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
                {pageRows.map((c) => {
                  // Phase 54 (owner: «الضغط فى اى مكان فى الصف لكل عميل
                  // لفتح ادارة العميل») — the WHOLE row opens the client
                  // manager. In broadcast-selection mode the row toggles
                  // the checkbox instead (navigating away mid-selection
                  // would be hostile). Interactive children stopPropagation.
                  const onRowClick = () => {
                    if (broadcastTarget === "selected") toggleClientSelection(c.id);
                    else navigate("coach-client", { clientId: c.id });
                  };
                  return (
                    <tr
                      key={c.id}
                      onClick={onRowClick}
                      title={broadcastTarget === "selected" ? undefined : isAr ? "افتح إدارة العميل" : "Open client manager"}
                      className={cn(
                        "cursor-pointer border-b border-[#d2d2d7]/60 transition-colors hover:bg-[#f5f5f7]/70",
                        selectedClientIds.has(c.id) && "bg-[#0071e3]/5",
                      )}
                    >
                      {broadcastTarget === "selected" && (
                        <td className="p-3">
                          <input
                            type="checkbox"
                            checked={selectedClientIds.has(c.id)}
                            onChange={() => toggleClientSelection(c.id)}
                            onClick={(e) => e.stopPropagation()}
                            className="h-4 w-4 cursor-pointer rounded accent-[#0071e3]"
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
                            onClick={(e) => e.stopPropagation()}
                            onChange={(e) => reassignClient(c.id, e.target.value)}
                            className="max-w-[11rem] cursor-pointer rounded-lg border border-[#d2d2d7] bg-white px-2 py-1.5 text-xs outline-none focus:border-[#0071e3] disabled:opacity-50"
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
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate("coach-client", { clientId: c.id });
                          }}
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

        {/* Pager — server-side in paged mode (0047), local slicing in legacy.
            Renders nothing when the list is empty. */}
        <Pagination
          page={page}
          pageSize={pageSize}
          total={pagerTotal}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
          sizes={[25, 50, 100]}
          isAr={isAr}
          busy={refreshing}
          className="mt-6 border-t border-[#d2d2d7]/60 pt-4"
        />
      </div>
    </div>
  );
}
