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
import { getTier } from "@/lib/plans";
import { MEMBERSHIPS } from "@/lib/memberships";

type FilterTab =
  | "all"
  | "active"
  | "expiring"
  | "no_plan"
  | "no_questionnaire"
  | "pending_payment"
  | "expired";

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
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">{t("coach.title")}</h1>
        <p className="mt-2 text-base font-normal text-[#6e6e73] md:text-lg">{t("coach.subtitle")}</p>
      </div>

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
                    <tr key={c.id} className="border-b border-[#d2d2d7]/60 hover:bg-white/50">
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
                          <span className="rounded-full bg-[#f5f5f7] px-2.5 py-0.5 text-xs font-normal">
                            {tierName(c.sub.tier)}
                          </span>
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
