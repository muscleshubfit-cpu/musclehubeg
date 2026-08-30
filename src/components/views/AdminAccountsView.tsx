"use client";

import { useEffect, useMemo, useState } from "react";
import { useI18n } from "@/lib/i18n";
import { Search, Trash2, Loader2, FlaskConical, Users } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

/**
 * ADMIN ACCOUNTS MANAGER (0045).
 * Owner request: «بالنسبة للحسابات التجريبية فقط ضيف فى داشبورد الادمن
 * طريقة للتعليم على الحسابات وزرار مسح»
 *
 * One simple admin surface that lists EVERY account with:
 *   - a test-account badge + one-click toggle (profiles.is_test_account,
 *     migration 0045 Part B) so QA/demo accounts are visibly marked
 *   - a delete button (confirm-guarded) that removes the auth user and
 *     cascade-deletes all his data (subscriptions, requests, plans, …)
 *
 * Guards live server-side (/api/admin/accounts): self-delete and
 * admin-account delete are refused (403/400) and the UI mirrors them.
 */

type Account = {
  id: string;
  full_name: string | null;
  email: string | null;
  role: string;
  is_test_account: boolean | null;
  created_at: string;
};

type RoleFilter = "all" | "client" | "coach" | "admin" | "test";

export function AdminAccountsView() {
  const { lang } = useI18n();
  const isAr = lang === "ar";
  const [rows, setRows] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("all");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/accounts");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "failed");
      setRows(data.accounts ?? []);
    } catch (e: any) {
      toast.error(e.message || (isAr ? "خطأ في تحميل الحسابات" : "Failed to load accounts"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((r) => {
      if (roleFilter === "test" && !r.is_test_account) return false;
      if (roleFilter !== "all" && roleFilter !== "test" && r.role !== roleFilter) return false;
      if (!q) return true;
      return (
        (r.full_name || "").toLowerCase().includes(q) ||
        (r.email || "").toLowerCase().includes(q)
      );
    });
  }, [rows, query, roleFilter]);

  const testCount = rows.filter((r) => r.is_test_account).length;

  const toggleTest = async (acc: Account) => {
    setBusyId(acc.id);
    try {
      const res = await fetch("/api/admin/accounts", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: acc.id,
          is_test_account: !acc.is_test_account,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || data.error || "failed");
      setRows((prev) =>
        prev.map((r) =>
          r.id === acc.id ? { ...r, is_test_account: !acc.is_test_account } : r,
        ),
      );
      toast.success(
        !acc.is_test_account
          ? isAr ? "اتعلّم الحساب كتجريبي" : "Marked as test account"
          : isAr ? "اتشال علم الحساب التجريبي" : "Test mark removed",
      );
    } catch (e: any) {
      toast.error(e.message || (isAr ? "خطأ" : "Error"));
    } finally {
      setBusyId(null);
    }
  };

  const deleteAccount = async (acc: Account) => {
    setBusyId(acc.id);
    try {
      const res = await fetch("/api/admin/accounts", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: acc.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || data.error || "failed");
      setRows((prev) => prev.filter((r) => r.id !== acc.id));
      toast.success(isAr ? "اتمسح الحساب وكل بياناته" : "Account and all its data deleted");
    } catch (e: any) {
      toast.error(e.message || (isAr ? "خطأ في المسح" : "Delete failed"));
    } finally {
      setBusyId(null);
      setConfirmId(null);
    }
  };

  const roleBadge = (role: string) => {
    if (role === "admin")
      return { cls: "bg-[#0071e3]/10 text-[#0071e3]", label: isAr ? "أدمن" : "Admin" };
    if (role === "coach")
      return { cls: "bg-[#8b5cf6]/10 text-[#8b5cf6]", label: isAr ? "مدرب" : "Coach" };
    return { cls: "bg-[#34c759]/10 text-[#34c759]", label: isAr ? "عميل" : "Client" };
  };

  const filterTabs: Array<{ key: RoleFilter; label: string }> = [
    { key: "all", label: isAr ? "الكل" : "All" },
    { key: "client", label: isAr ? "العملاء" : "Clients" },
    { key: "coach", label: isAr ? "المدربين" : "Coaches" },
    { key: "admin", label: isAr ? "الأدمن" : "Admins" },
    { key: "test", label: isAr ? `تجريبي (${testCount})` : `Test (${testCount})` },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">
          {isAr ? "الحسابات" : "Accounts"}
        </h1>
        <p className="mt-2 max-w-3xl text-base font-normal text-[#6e6e73] md:text-lg">
          {isAr
            ? "علّم على أي حساب إنه تجريبي (يظهر بعلامة مميزة في كل لوحة الأدمن)، أو امسح الحساب نهائيًا بكل بياناته. حسابات الأدمن محمية من المسح."
            : "Mark any account as a TEST account (visible badge) or permanently delete it with all its data. Admin accounts are protected from deletion."}
        </p>
      </div>

      {/* Search + filters */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="relative w-full md:max-w-sm">
          <Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6e6e73]" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={isAr ? "ابحث بالاسم أو الإيميل…" : "Search name or email…"}
            className="w-full rounded-full border border-[#d2d2d7] bg-white py-2.5 ps-9 pe-4 text-sm outline-none transition-colors focus:border-[#0071e3]"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {filterTabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setRoleFilter(tab.key)}
              className={cn(
                "rounded-full px-4 py-2 text-xs font-medium transition-colors",
                roleFilter === tab.key
                  ? "bg-[#1d1d1f] text-white"
                  : "bg-[#f5f5f7] text-[#1d1d1f] hover:bg-[#e8e8ed]",
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-[#0071e3]" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-3xl bg-[#f5f5f7] p-12 text-center">
          <Users className="mx-auto h-10 w-10 text-[#d2d2d7]" />
          <p className="mt-3 text-sm text-[#6e6e73]">
            {isAr ? "مفيش حسابات مطابقة" : "No matching accounts"}
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-3xl border border-[#d2d2d7]">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[#f5f5f7] text-start text-xs text-[#6e6e73]">
                <th className="p-4 text-start font-medium">{isAr ? "الحساب" : "Account"}</th>
                <th className="hidden p-4 text-start font-medium sm:table-cell">{isAr ? "النوع" : "Role"}</th>
                <th className="hidden p-4 text-start font-medium md:table-cell">{isAr ? "تاريخ الإنشاء" : "Created"}</th>
                <th className="p-4 text-end font-medium">{isAr ? "إجراءات" : "Actions"}</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((acc) => {
                const badge = roleBadge(acc.role);
                const busy = busyId === acc.id;
                return (
                  <tr key={acc.id} className="border-t border-[#d2d2d7]/60">
                    <td className="p-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium">{acc.full_name || "—"}</span>
                        {acc.is_test_account && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-[#ff9500]/10 px-2 py-0.5 text-[10px] font-bold text-[#ff9500]">
                            <FlaskConical className="h-3 w-3" />
                            {isAr ? "تجريبي" : "TEST"}
                          </span>
                        )}
                      </div>
                      <p className="mt-0.5 text-xs text-[#6e6e73]" dir="ltr">
                        {acc.email || acc.id}
                      </p>
                      <span className={cn("mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-medium sm:hidden", badge.cls)}>
                        {badge.label}
                      </span>
                    </td>
                    <td className="hidden p-4 sm:table-cell">
                      <span className={cn("rounded-full px-2.5 py-1 text-xs font-medium", badge.cls)}>
                        {badge.label}
                      </span>
                    </td>
                    <td className="hidden p-4 text-xs text-[#6e6e73] md:table-cell">
                      {acc.created_at ? new Date(acc.created_at).toLocaleDateString(isAr ? "ar-EG" : "en-US") : "—"}
                    </td>
                    <td className="p-4">
                      <div className="flex items-center justify-end gap-2">
                        {/* Toggle test mark */}
                        <button
                          onClick={() => toggleTest(acc)}
                          disabled={busy}
                          title={isAr ? "تعليم كحساب تجريبي" : "Toggle test mark"}
                          className={cn(
                            "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-50",
                            acc.is_test_account
                              ? "bg-[#ff9500]/10 text-[#ff9500] hover:bg-[#ff9500]/20"
                              : "bg-[#f5f5f7] text-[#1d1d1f] hover:bg-[#e8e8ed]",
                          )}
                        >
                          {busy ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <FlaskConical className="h-3.5 w-3.5" />
                          )}
                          {acc.is_test_account
                            ? isAr ? "إلغاء التعليم" : "Unmark"
                            : isAr ? "تعليم تجريبي" : "Mark test"}
                        </button>

                        {/* Delete — two-step confirm */}
                        {confirmId === acc.id ? (
                          <>
                            <button
                              onClick={() => deleteAccount(acc)}
                              disabled={busy}
                              className="rounded-full bg-[#ff3b30] px-3 py-1.5 text-xs font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                            >
                              {busy
                                ? isAr ? "جاري المسح…" : "Deleting…"
                                : isAr ? "تأكيد المسح!" : "Confirm delete!"}
                            </button>
                            <button
                              onClick={() => setConfirmId(null)}
                              disabled={busy}
                              className="rounded-full px-2.5 py-1.5 text-xs text-[#6e6e73] hover:text-[#1d1d1f]"
                            >
                              {isAr ? "إلغاء" : "Cancel"}
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => setConfirmId(acc.id)}
                            disabled={busy || acc.role === "admin"}
                            title={
                              acc.role === "admin"
                                ? isAr ? "حسابات الأدمن محمية" : "Admin accounts are protected"
                                : isAr ? "مسح الحساب نهائيًا" : "Delete account permanently"
                            }
                            className="inline-flex items-center gap-1.5 rounded-full bg-[#ff3b30]/10 px-3 py-1.5 text-xs font-medium text-[#ff3b30] transition-colors hover:bg-[#ff3b30]/20 disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            {isAr ? "مسح" : "Delete"}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <p className="text-xs text-[#6e6e73]">
        {isAr
          ? "ملاحظة: المسح نهائي — بيمسح حساب المستخدم واشتراكاته وطلباته وخططه وإشعاراته من قاعدة البيانات بالكامل."
          : "Note: deletion is permanent — it removes the user's auth account plus all subscriptions, requests, plans and notifications via database cascades."}
      </p>
    </div>
  );
}
