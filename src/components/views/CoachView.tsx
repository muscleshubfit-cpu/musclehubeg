"use client";

import { useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/hooks/use-auth";
import { useNav } from "@/hooks/use-nav";
import { listAllClients, listAllSubscriptions } from "@/lib/data";
import { getTier } from "@/lib/plans";

export function CoachView() {
  const { t } = useI18n();
  const { profile } = useAuth();
  const { navigate } = useNav();
  const [clients, setClients] = useState<any[]>([]);
  const [subs, setSubs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    (async () => {
      const [c, s] = await Promise.all([listAllClients(), listAllSubscriptions()]);
      setClients(c);
      setSubs(s);
      setLoading(false);
    })();
  }, []);

  if (loading)
    return (
      <div className="py-20 text-center text-base font-normal text-[#6e6e73]">
        {t("common.loading")}
      </div>
    );

  const now = Date.now();
  const activeSubs = subs.filter((s) => s.status === "active" && new Date(s.end_date).getTime() > now);
  const expiringSoon = activeSubs.filter(
    (s) => new Date(s.end_date).getTime() - now < 14 * 864e5,
  );

  const filtered = clients.filter(
    (c) =>
      (c.full_name || "").toLowerCase().includes(search.toLowerCase()) ||
      (c.email || "").toLowerCase().includes(search.toLowerCase()),
  );

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
          <p className="text-3xl font-semibold tracking-tight">{activeSubs.length}</p>
          <p className="mt-1 text-xs font-normal text-[#6e6e73]">{t("coach.activeSubs")}</p>
        </div>
        <div className="rounded-2xl bg-[#f5f5f7] p-6">
          <p className="text-3xl font-semibold tracking-tight">{expiringSoon.length}</p>
          <p className="mt-1 text-xs font-normal text-[#6e6e73]">{t("coach.expiringSoon")}</p>
        </div>
      </div>

      {/* Clients list */}
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
                    {t("coach.status")}
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
                  const sub = subs.find((s) => s.client_id === c.id);
                  const isActive = sub && sub.status === "active" && new Date(sub.end_date).getTime() > now;
                  return (
                    <tr key={c.id} className="border-b border-[#d2d2d7]/60">
                      <td className="p-3">
                        <div className="font-medium">{c.full_name || "—"}</div>
                        <div className="text-xs font-normal text-[#6e6e73]">{c.email || c.phone || "—"}</div>
                      </td>
                      <td className="p-3">
                        {sub ? (
                          <span
                            className={`rounded-full px-2.5 py-0.5 text-xs font-normal ${
                              isActive ? "bg-[#0071e3]/10 text-[#0071e3]" : "bg-[#f5f5f7] text-[#6e6e73]"
                            }`}
                          >
                            {sub.tier ? t(getTier(sub.tier as any)?.nameKey || "") : "—"}
                          </span>
                        ) : (
                          <span className="text-xs font-normal text-[#6e6e73]">—</span>
                        )}
                      </td>
                      <td className="p-3 font-normal text-[#6e6e73]">
                        {sub?.end_date ? new Date(sub.end_date).toLocaleDateString() : "—"}
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

