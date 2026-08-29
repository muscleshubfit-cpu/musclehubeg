"use client";

import { useEffect, useMemo, useState } from "react";
import { useI18n } from "@/lib/i18n";
import { getCoachClientListOptimized } from "@/lib/data";
import { toast } from "sonner";

/**
 * MULTI-COACH PHASE 2B (follow-up) — DEDICATED admin assignments page
 * (owner feedback «مفيش لسة طريقة لتعيين المدربين»: the inline المدرب
 * column inside /coach was too easy to miss). This surface makes the
 * 1-client ↔ 1-coach assignment OBVIOUS:
 *
 *   1. Staff cards — every coach/admin + his assigned-client count.
 *   2. Client rows — search, current coach, and a picker that PATCHes
 *      /api/admin/assignments (admin-exclusive, DB mirrors via RLS).
 *
 * Mounted at /admin/assignments — the AdminGate layout bounces anyone
 * who is not role='admin'. Reached from the admin-only sidebar link
 * «تعيين المدربين».
 */

type Staff = { id: string; full_name: string | null; email: string | null; role: string };
type ClientRow = {
  id: string;
  name: string;
  email: string;
  coachId: string | null;
  coachName: string | null;
};

export function AdminAssignmentsView() {
  const { lang } = useI18n();
  const isAr = lang === "ar";

  const [staff, setStaff] = useState<Staff[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [clients, setClients] = useState<ClientRow[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [rpcFailed, setRpcFailed] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const [assignmentsRes, clientRows] = await Promise.all([
          fetch("/api/admin/assignments"),
          getCoachClientListOptimized(),
        ]);

        if (assignmentsRes.ok) {
          const json = await assignmentsRes.json();
          setStaff(json.staff ?? []);
          setCounts(json.counts ?? {});
        }

        if (clientRows && clientRows.length >= 0) {
          setClients(
            (clientRows as any[]).map((row) => ({
              id: row.client_id,
              name: row.client_full_name || "—",
              email: row.client_email || row.client_phone || "—",
              coachId: row.assigned_coach_id ?? null,
              coachName: row.assigned_coach_name ?? null,
            })),
          );
        } else {
          // RPC missing/failed — the admin-side client list (with the
          // assigned-coach columns) comes ONLY from get_coach_client_list
          // (rebuilt by migration 0030D).
          setRpcFailed(true);
        }
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return clients;
    return clients.filter(
      (c) =>
        c.name.toLowerCase().includes(q) || c.email.toLowerCase().includes(q),
    );
  }, [clients, search]);

  const unassignedCount = useMemo(
    () => clients.filter((c) => !c.coachId).length,
    [clients],
  );

  async function reassign(client: ClientRow, coachId: string) {
    if (!coachId || coachId === client.coachId) return;
    setSavingId(client.id);
    try {
      const res = await fetch("/api/admin/assignments", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ client_id: client.id, coach_id: coachId }),
      });
      const json = await res.json().catch(() => ({}));
      if (res.ok) {
        const target = staff.find((s) => s.id === coachId);
        setClients((prev) =>
          prev.map((c) =>
            c.id === client.id
              ? {
                  ...c,
                  coachId,
                  coachName: target?.full_name || "—",
                }
              : c,
          ),
        );
        setCounts((prev) => {
          const next = { ...prev };
          if (client.coachId) next[client.coachId] = Math.max(0, (next[client.coachId] ?? 1) - 1);
          next[coachId] = (next[coachId] ?? 0) + 1;
          return next;
        });
        toast.success(
          isAr
            ? `تم تعيين ${client.name} مع ${target?.full_name || "المدرب"}`
            : `${client.name} assigned to ${target?.full_name || "the coach"}`,
        );
      } else {
        toast.error(json.message || json.error || (isAr ? "فشل التعيين" : "Assignment failed"));
      }
    } finally {
      setSavingId(null);
    }
  }

  if (loading) {
    return (
      <div className="py-20 text-center text-base font-normal text-[#6e6e73]">
        {isAr ? "جارٍ التحميل…" : "Loading…"}
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">
          {isAr ? "تعيين المدربين" : "Coach assignments"}
        </h1>
        <p className="mt-2 max-w-2xl text-base font-normal text-[#6e6e73] md:text-lg">
          {isAr
            ? "كل عميل يتبع مدربًا واحدًا فقط. اختر المدرب لكل عميل من القائمة — التغيير فوري ويحدد من يرى بيانات العميل ومن تستقبله الإشعارات."
            : "Each client follows exactly one coach. Pick the coach per client — the change is instant and controls who sees the client's data and who receives his notifications."}
        </p>
      </div>

      {/* Staff cards */}
      <section>
        <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-[#6e6e73]">
          {isAr ? "فريق العمل" : "Staff"}
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {staff.map((s) => (
            <div key={s.id} className="rounded-2xl bg-[#f5f5f7] p-5">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-medium">{s.full_name || "—"}</p>
                  <p className="mt-0.5 text-xs font-normal text-[#6e6e73]" dir="ltr">
                    {s.email || s.id}
                  </p>
                </div>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-medium ${
                    s.role === "admin"
                      ? "bg-[#0071e3]/10 text-[#0071e3]"
                      : "bg-[#1d1d1f]/5 text-[#1d1d1f]"
                  }`}
                >
                  {s.role === "admin" ? (isAr ? "أدمن" : "Admin") : isAr ? "مدرب" : "Coach"}
                </span>
              </div>
              <p className="mt-3 text-sm font-normal text-[#6e6e73]">
                {isAr ? "العملاء الحاليون: " : "Current clients: "}
                <span className="font-medium text-[#1d1d1f]">{counts[s.id] ?? 0}</span>
              </p>
            </div>
          ))}
          {staff.length === 0 && (
            <p className="text-sm font-normal text-[#6e6e73]">
              {isAr ? "لا يوجد فريق بعد." : "No staff yet."}
            </p>
          )}
        </div>
      </section>

      {/* Clients */}
      <section className="rounded-3xl bg-[#f5f5f7] p-6 md:p-8">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold tracking-tight">
            {isAr ? "العملاء" : "Clients"}
            <span className="ms-2 text-sm font-normal text-[#6e6e73]">
              {isAr ? `(${clients.length} عميل — ${unassignedCount} غير معيّن)` : `(${clients.length} clients — ${unassignedCount} unassigned)`}
            </span>
          </h2>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={isAr ? "ابحث بالاسم أو البريد…" : "Search by name or email…"}
            className="w-full max-w-xs rounded-full border border-[#d2d2d7] bg-white px-4 py-2 text-sm outline-none focus:border-[#0071e3]"
          />
        </div>

        {rpcFailed && (
          <p className="mb-4 rounded-xl bg-[#ff9500]/10 px-4 py-3 text-sm font-medium text-[#ff9500]">
            {isAr
              ? "تعذر تحميل قائمة العملاء — تأكد من تشغيل هجرة 0030D (get_coach_client_list) ثم حدّث الصفحة."
              : "Failed to load the client list — make sure migration 0030D (get_coach_client_list) ran, then refresh."}
          </p>
        )}

        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-start">
            <thead>
              <tr className="border-b border-[#d2d2d7] text-xs font-normal uppercase tracking-wide text-[#6e6e73]">
                <th className="p-3 text-start">{isAr ? "العميل" : "Client"}</th>
                <th className="p-3 text-start">{isAr ? "المدرب الحالي" : "Current coach"}</th>
                <th className="p-3 text-start">{isAr ? "إعادة التعيين" : "Assign to"}</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <tr key={c.id} className="border-b border-[#d2d2d7]/60 hover:bg-white/50">
                  <td className="p-3">
                    <div className="font-medium">{c.name}</div>
                    <div className="text-xs font-normal text-[#6e6e73]" dir="ltr">
                      {c.email}
                    </div>
                  </td>
                  <td className="p-3">
                    {c.coachName ? (
                      <span className="rounded-full bg-[#0071e3]/10 px-3 py-1 text-xs font-medium text-[#0071e3]">
                        {c.coachName}
                      </span>
                    ) : (
                      <span className="rounded-full bg-[#ff9500]/10 px-3 py-1 text-xs font-medium text-[#ff9500]">
                        {isAr ? "غير معيّن" : "Unassigned"}
                      </span>
                    )}
                  </td>
                  <td className="p-3">
                    <select
                      value={c.coachId ?? ""}
                      disabled={savingId === c.id}
                      onChange={(e) => reassign(c, e.target.value)}
                      className="max-w-[220px] rounded-xl border border-[#d2d2d7] bg-white px-3 py-2 text-sm outline-none focus:border-[#0071e3] disabled:opacity-50"
                    >
                      <option value="">
                        {isAr ? "— اختر مدربًا —" : "— pick a coach —"}
                      </option>
                      {staff
                        .filter((s) => s.id !== c.id)
                        .map((s) => (
                          <option key={s.id} value={s.id}>
                            {(s.full_name || s.email || s.id) +
                              (s.role === "admin" ? (isAr ? " (أدمن)" : " (admin)") : "")}
                          </option>
                        ))}
                    </select>
                    {savingId === c.id && (
                      <span className="ms-2 text-xs font-normal text-[#6e6e73]">
                        {isAr ? "جارٍ الحفظ…" : "Saving…"}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={3} className="p-8 text-center text-sm font-normal text-[#6e6e73]">
                    {isAr ? "لا نتائج مطابقة للبحث." : "No clients match your search."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
