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
 *   1. ADD COACH — owner feedback «ما فيش طريقه لتعيين المدرب نفسه
 *      بمعنى اخر اضافه مدرب للموقع»: invite a brand-new coach by email
 *      (Supabase invite → he sets his own password) or promote an
 *      existing client instantly — POST /api/admin/staff.
 *   2. Staff cards — every coach/admin + his assigned-client count +
 *      demote (تحويله لعميل) for coaches via PATCH /api/admin/staff.
 *   3. Client rows — search, current coach, and a picker that PATCHes
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

  // COACH FEES (owner answer 3 — «سعر ثابت على كل عميل قابل للتعديل»):
  // per-coach flat fee, editable inline; total = live client count × fee.
  type FeeRow = {
    id: string;
    full_name: string | null;
    email: string | null;
    fee_per_client: number;
    currency: string;
  };
  const [fees, setFees] = useState<FeeRow[]>([]);
  const [feeDrafts, setFeeDrafts] = useState<Record<string, string>>({});
  const [savingFeeId, setSavingFeeId] = useState<string | null>(null);

  // Add-coach form state
  const [newEmail, setNewEmail] = useState("");
  const [newName, setNewName] = useState("");
  const [adding, setAdding] = useState(false);
  const [demotingId, setDemotingId] = useState<string | null>(null);

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

        // Coach fees (independent of the RPC — loads even if 0030D RPC is missing)
        const feesRes = await fetch("/api/admin/coach-fees");
        if (feesRes.ok) {
          const feesJson = await feesRes.json();
          const rows = (feesJson.coaches ?? []) as FeeRow[];
          setFees(rows);
          setFeeDrafts(Object.fromEntries(rows.map((c) => [c.id, String(c.fee_per_client)])));
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

  async function refreshStaff() {
    const res = await fetch("/api/admin/assignments");
    if (res.ok) {
      const json = await res.json();
      setStaff(json.staff ?? []);
      setCounts(json.counts ?? {});
    }
  }

  async function refreshFees() {
    const res = await fetch("/api/admin/coach-fees");
    if (res.ok) {
      const json = await res.json();
      setFees(json.coaches ?? []);
      setFeeDrafts(
        Object.fromEntries(
          ((json.coaches ?? []) as FeeRow[]).map((c) => [c.id, String(c.fee_per_client)]),
        ),
      );
    }
  }

  async function saveFee(coachId: string) {
    const raw = feeDrafts[coachId] ?? "0";
    const fee = Number(raw);
    if (!Number.isFinite(fee) || fee < 0) {
      toast.error(isAr ? "اكتب سعرًا صحيحًا (0 أو أكثر)" : "Enter a valid price (0 or more)");
      return;
    }
    setSavingFeeId(coachId);
    try {
      const res = await fetch("/api/admin/coach-fees", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ coach_id: coachId, fee_per_client: fee }),
      });
      const json = await res.json().catch(() => ({}));
      if (res.ok) {
        toast.success(isAr ? "تم حفظ السعر" : "Fee saved");
        await refreshFees();
      } else {
        toast.error(json.message || json.error || (isAr ? "فشل الحفظ" : "Save failed"));
      }
    } finally {
      setSavingFeeId(null);
    }
  }

  async function addCoach() {
    const email = newEmail.trim();
    if (!email) {
      toast.error(isAr ? "اكتب بريد المدرب أولًا" : "Enter the coach's email first");
      return;
    }
    setAdding(true);
    try {
      const res = await fetch("/api/admin/staff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, full_name: newName.trim() || undefined }),
      });
      const json = await res.json().catch(() => ({}));
      if (res.ok) {
        if (json.action === "invited") {
          toast.success(
            isAr
              ? `تم إرسال دعوة إلى ${email} — هيوصله إيميل فيه لينك تحديد كلمة المرور، وبعد ما يحددها هيظهر هنا كمدرب`
              : `Invite sent to ${email} — he will receive an email with a password link and appear here as a coach once he sets it`,
            { duration: 8000 },
          );
        } else {
          toast.success(
            isAr
              ? `${email} كان عميلًا وأصبح مدربًا الآن`
              : `${email} was a client and is now a coach`,
          );
        }
        setNewEmail("");
        setNewName("");
        await refreshStaff();
      } else {
        toast.error(json.message || json.error || (isAr ? "فشل إضافة المدرب" : "Failed to add the coach"));
      }
    } finally {
      setAdding(false);
    }
  }

  async function demoteCoach(s: Staff) {
    const ok = confirm(
      isAr
        ? `تحويل ${s.full_name || s.email} إلى عميل عادي؟`
        : `Convert ${s.full_name || s.email} back to a regular client?`,
    );
    if (!ok) return;
    setDemotingId(s.id);
    try {
      const res = await fetch("/api/admin/staff", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: s.id, action: "demote" }),
      });
      const json = await res.json().catch(() => ({}));
      if (res.ok) {
        toast.success(
          isAr
            ? `تم تحويل ${s.full_name || s.email} إلى عميل عادي`
            : `${s.full_name || s.email} is now a regular client`,
        );
        await refreshStaff();
      } else {
        toast.error(json.message || json.error || (isAr ? "فشل التحويل" : "Failed to demote"));
      }
    } finally {
      setDemotingId(null);
    }
  }

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

  // Source split (owner model 2026-08-29): a client assigned to an
  // ADMIN is a SITE client (the general coach's pool); a client
  // assigned to a plain COACH is a coach-brought private client.
  const staffRoleById = useMemo(
    () => Object.fromEntries(staff.map((s) => [s.id, s.role])),
    [staff],
  );
  const siteClientsCount = useMemo(
    () => clients.filter((c) => staffRoleById[c.coachId ?? ""] === "admin").length,
    [clients, staffRoleById],
  );
  const coachClientsCount = useMemo(
    () => clients.filter((c) => staffRoleById[c.coachId ?? ""] === "coach").length,
    [clients, staffRoleById],
  );
  const clientCountByCoach = useMemo(() => {
    const map: Record<string, number> = {};
    for (const c of clients) {
      if (c.coachId) map[c.coachId] = (map[c.coachId] ?? 0) + 1;
    }
    return map;
  }, [clients]);

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

      {/* Add coach */}
      <section className="rounded-3xl border border-[#0071e3]/20 bg-[#0071e3]/[0.04] p-6 md:p-8">
        <h2 className="text-lg font-semibold tracking-tight">
          {isAr ? "إضافة مدرب للموقع" : "Add a coach"}
        </h2>
        <p className="mt-1 text-sm font-normal text-[#6e6e73]">
          {isAr
            ? "اكتب بريد المدرب الجديد: لو غير مسجل هيوصله دعوة على إيميله يحدد منها كلمة المرور بنفسه، ولو مسجل كعميل هيتمت ترقيته لمدرب فورًا."
            : "Enter the new coach's email: if he is not registered yet he receives an invite to set his own password; if he is already a client he is promoted instantly."}
        </p>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row">
          <input
            type="email"
            dir="ltr"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !adding) addCoach();
            }}
            placeholder="coach@example.com"
            className="flex-1 rounded-xl border border-[#d2d2d7] bg-white px-4 py-2.5 text-sm outline-none focus:border-[#0071e3]"
          />
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !adding) addCoach();
            }}
            placeholder={isAr ? "الاسم (اختياري)" : "Name (optional)"}
            className="flex-1 rounded-xl border border-[#d2d2d7] bg-white px-4 py-2.5 text-sm outline-none focus:border-[#0071e3]"
          />
          <button
            onClick={addCoach}
            disabled={adding}
            className="rounded-xl bg-[#0071e3] px-6 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {adding
              ? (isAr ? "جارٍ الإضافة…" : "Adding…")
              : (isAr ? "إضافة مدرب" : "Add coach")}
          </button>
        </div>
      </section>

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
              {s.role === "coach" && (
                <button
                  onClick={() => demoteCoach(s)}
                  disabled={demotingId === s.id}
                  className="mt-3 text-xs font-medium text-[#ff3b30] transition-opacity hover:opacity-70 disabled:opacity-50"
                >
                  {demotingId === s.id
                    ? (isAr ? "جارٍ التحويل…" : "Converting…")
                    : (isAr ? "تحويله إلى عميل عادي" : "Convert back to client")}
                </button>
              )}
            </div>
          ))}
          {staff.length === 0 && (
            <p className="text-sm font-normal text-[#6e6e73]">
              {isAr ? "لا يوجد فريق بعد." : "No staff yet."}
            </p>
          )}
        </div>
      </section>

      {/* Coach fees — fixed per-client price (owner answer 3) */}
      {fees.length > 0 && (
        <section className="rounded-3xl bg-[#f5f5f7] p-6 md:p-8">
          <h2 className="text-lg font-semibold tracking-tight">
            {isAr ? "اشتراك المدربين — سعر ثابت لكل عميل" : "Coach billing — fixed fee per client"}
          </h2>
          <p className="mt-1 text-sm font-normal text-[#6e6e73]">
            {isAr
              ? "سعر ثابت يدفعه المدرب عن كل عميل من عملائه، قابل للتعديل في أي وقت. الإجمالي بيتحدث تلقائيًا مع عدد عملائه الحالي."
              : "A flat fee each coach pays per client, editable anytime. The monthly total updates automatically with his current client count."}
          </p>
          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[640px] text-start">
              <thead>
                <tr className="border-b border-[#d2d2d7] text-xs font-normal uppercase tracking-wide text-[#6e6e73]">
                  <th className="p-3 text-start">{isAr ? "المدرب" : "Coach"}</th>
                  <th className="p-3 text-start">{isAr ? "عملاؤه" : "His clients"}</th>
                  <th className="p-3 text-start">{isAr ? "السعر لكل عميل" : "Fee per client"}</th>
                  <th className="p-3 text-start">{isAr ? "الإجمالي" : "Total"}</th>
                  <th className="p-3 text-start"></th>
                </tr>
              </thead>
              <tbody>
                {fees.map((f) => {
                  const n = clientCountByCoach[f.id] ?? 0;
                  const draft = Number(feeDrafts[f.id] ?? "0");
                  const total = (Number.isFinite(draft) ? draft : 0) * n;
                  return (
                    <tr key={f.id} className="border-b border-[#d2d2d7]/60 hover:bg-white/50">
                      <td className="p-3">
                        <div className="font-medium">{f.full_name || "—"}</div>
                        <div className="text-xs font-normal text-[#6e6e73]" dir="ltr">
                          {f.email || f.id}
                        </div>
                      </td>
                      <td className="p-3 font-medium">{n}</td>
                      <td className="p-3">
                        <input
                          type="number"
                          min="0"
                          step="1"
                          dir="ltr"
                          value={feeDrafts[f.id] ?? "0"}
                          onChange={(e) =>
                            setFeeDrafts((prev) => ({ ...prev, [f.id]: e.target.value }))
                          }
                          className="w-28 rounded-xl border border-[#d2d2d7] bg-white px-3 py-2 text-sm outline-none focus:border-[#0071e3]"
                        />
                        <span className="ms-2 text-xs text-[#6e6e73]">{f.currency}</span>
                      </td>
                      <td className="p-3 font-semibold">
                        {total.toLocaleString()} {f.currency}
                      </td>
                      <td className="p-3">
                        <button
                          onClick={() => saveFee(f.id)}
                          disabled={savingFeeId === f.id}
                          className="rounded-xl bg-[#1d1d1f] px-4 py-2 text-xs font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                        >
                          {savingFeeId === f.id
                            ? (isAr ? "جارٍ الحفظ…" : "Saving…")
                            : (isAr ? "حفظ" : "Save")}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Clients */}
      <section className="rounded-3xl bg-[#f5f5f7] p-6 md:p-8">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold tracking-tight">
            {isAr ? "العملاء" : "Clients"}
            <span className="ms-2 text-sm font-normal text-[#6e6e73]">
              {isAr
                ? `(${clients.length} عميل — ${siteClientsCount} عميل موقع — ${coachClientsCount} عملاء مدربين)`
                : `(${clients.length} clients — ${siteClientsCount} site — ${coachClientsCount} coach-brought)`}
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
                      staffRoleById[c.coachId ?? ""] === "admin" ? (
                        <span className="rounded-full bg-[#1d1d1f]/5 px-3 py-1 text-xs font-medium text-[#1d1d1f]">
                          {isAr ? "عميل موقع — الكوتش العام" : "Site client — general coach"}
                        </span>
                      ) : (
                        <span className="rounded-full bg-[#34c759]/10 px-3 py-1 text-xs font-medium text-[#248a3d]">
                          {isAr ? `عميل جابه المدرب ${c.coachName}` : `Brought by ${c.coachName}`}
                        </span>
                      )
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
