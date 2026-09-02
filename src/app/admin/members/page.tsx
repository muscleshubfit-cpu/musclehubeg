"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useI18n } from "@/lib/i18n";
import {
  getCoachClientStats,
  getCoachClientListPaged,
  type CoachClientStats,
} from "@/lib/data";
import { MEMBERSHIPS } from "@/lib/memberships";
import { getTier, type TierId } from "@/lib/plans";
import { Pagination } from "@/components/Pagination";
import {
  PageHeader,
  StatTile,
  MemberStatusBadge,
  TierBadge,
  SegmentedTabs,
  EmptyState,
  memberStatus,
  fmtNum,
} from "@/components/admin/ui";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

/**
 * ADMIN MEMBERS TABLE (/admin/members) — Admin Panel 2.0 (Phase 101).
 *
 * The membership-status surface the old panel never had: /admin/payments
 * shows payment REQUESTS (a queue), while actual memberships lived inside
 * the coach console at /coach with no visual Active/Expired separation.
 *
 * This page is the FULL member picture, driven by the same paged RPC the
 * coach console uses (get_coach_client_list_paged — zero new DB surface):
 *   - lifecycle badges: نشط / ينتهي قريباً / منتهي / بانتظار الدفع / بدون
 *     اشتراك — computed by ONE shared helper (memberStatus) that mirrors
 *     the RPC flag logic exactly
 *   - filters: lifecycle tabs + membership-tier select + search + sort
 *   - «إدارة العميل» opens the full client manager (/coach/<id>) — the
 *     admin is coach-of-all, so the deep surface stays exactly as-is
 */

type Row = {
  client_id: string;
  client_full_name: string | null;
  client_email: string | null;
  client_phone: string | null;
  sub_tier: string | null;
  sub_status: string | null;
  sub_end_date: string | null;
  sub_months: number | null;
  pending_payments: number | null;
  assigned_coach_name: string | null;
};

type SortKey = "newest" | "oldest" | "name" | "expiry";

const PAGE_SIZES = [25, 50, 100];

export default function AdminMembersPage() {
  const { lang } = useI18n();
  const isAr = lang === "ar";

  const [stats, setStats] = useState<CoachClientStats | null>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [rpcFailed, setRpcFailed] = useState(false);

  const [tab, setTab] = useState("all");
  const [segment, setSegment] = useState("all");
  const [sort, setSort] = useState<SortKey>("newest");
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounce search so typing does not hammer the RPC.
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDebounced(search.trim());
      setPage(1);
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [search]);

  useEffect(() => {
    let cancelled = false;
    getCoachClientStats().then((s) => {
      if (!cancelled) setStats(s);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getCoachClientListPaged({
        limit: pageSize,
        offset: (page - 1) * pageSize,
        search: debounced,
        filter: tab,
        segment,
        sort,
      });
      if (data === null) {
        setRpcFailed(true);
        setRows([]);
        setTotal(0);
      } else {
        setRpcFailed(false);
        setRows(data as unknown as Row[]);
        const first = (data as unknown as Array<Row & { total_count?: number | string }>)[0];
        const t = Number(first?.total_count ?? 0);
        setTotal(Number.isFinite(t) ? t : data.length);
      }
    } finally {
      setLoading(false);
    }
  }, [pageSize, page, debounced, tab, segment, sort]);

  useEffect(() => {
    load();
  }, [load]);

  const tierLabel = (tier: string | null | undefined) => {
    if (!tier) return "—";
    const m = MEMBERSHIPS.find((x) => x.id === tier);
    if (m) return isAr ? m.nameAr : m.nameEn;
    const legacy = getTier(tier as TierId);
    return legacy ? legacy.id : tier;
  };

  const tabs = useMemo(
    () => [
      { key: "all", label: isAr ? "الكل" : "All", count: stats?.total ?? null },
      { key: "active", label: isAr ? "نشط" : "Active", count: stats?.active ?? null },
      { key: "expiring", label: isAr ? "ينتهي قريباً" : "Expiring", count: stats?.expiring ?? null },
      { key: "expired", label: isAr ? "منتهي" : "Expired", count: stats?.expired ?? null },
      {
        key: "pending_payment",
        label: isAr ? "بانتظار الدفع" : "Awaiting payment",
        count: stats?.pending_payment ?? null,
      },
    ],
    [isAr, stats],
  );

  const sortOptions: { key: SortKey; label: string }[] = [
    { key: "newest", label: isAr ? "الأحدث تسجيلاً" : "Newest" },
    { key: "oldest", label: isAr ? "الأقدم تسجيلاً" : "Oldest" },
    { key: "name", label: isAr ? "الاسم" : "Name" },
    { key: "expiry", label: isAr ? "قرب الانتهاء" : "Expiry" },
  ];

  return (
    <div className="space-y-8">
      <PageHeader
        title={isAr ? "الأعضاء" : "Members"}
        sub={
          isAr
            ? "كل العملاء واشتراكاتهم في جدول واحد — الحالة محسوبة من تاريخ الانتهاء فعلياً (نشط / ينتهي قريباً / منتهي)، مع فلاتر وترتيب وبحث."
            : "Every client and subscription in one table — status computed from the real end date (active / expiring / expired), with filters, sort & search."
        }
      />

      {/* Stats strip */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <StatTile label={isAr ? "إجمالي العملاء" : "Total clients"} value={stats ? fmtNum(stats.total, isAr) : null} />
        <StatTile label={isAr ? "نشط" : "Active"} value={stats ? fmtNum(stats.active, isAr) : null} tone="green" />
        <StatTile label={isAr ? "ينتهي قريباً" : "Expiring"} value={stats ? fmtNum(stats.expiring, isAr) : null} tone="orange" />
        <StatTile label={isAr ? "منتهي" : "Expired"} value={stats ? fmtNum(stats.expired, isAr) : null} tone="red" />
        <StatTile
          label={isAr ? "بانتظار الدفع" : "Awaiting payment"}
          value={stats ? fmtNum(stats.pending_payment, isAr) : null}
          tone="orange"
        />
      </div>

      {/* Filters: lifecycle tabs + tier segment + sort */}
      <div className="flex flex-wrap items-center gap-3">
        <SegmentedTabs
          tabs={tabs}
          active={tab}
          onChange={(k) => {
            setTab(k);
            setPage(1);
          }}
        />
        <select
          value={segment}
          onChange={(e) => {
            setSegment(e.target.value);
            setPage(1);
          }}
          className="rounded-full border border-[#d2d2d7] bg-white px-4 py-2 text-sm font-normal text-[#1d1d1f] outline-none transition-colors hover:bg-[#f5f5f7]"
        >
          <option value="all">{isAr ? "كل الخطط" : "All tiers"}</option>
          {MEMBERSHIPS.map((m) => (
            <option key={m.id} value={m.id}>
              {isAr ? m.nameAr : m.nameEn}
            </option>
          ))}
        </select>
        <select
          value={sort}
          onChange={(e) => {
            setSort(e.target.value as SortKey);
            setPage(1);
          }}
          className="rounded-full border border-[#d2d2d7] bg-white px-4 py-2 text-sm font-normal text-[#1d1d1f] outline-none transition-colors hover:bg-[#f5f5f7]"
        >
          {sortOptions.map((o) => (
            <option key={o.key} value={o.key}>
              {o.label}
            </option>
          ))}
        </select>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={isAr ? "بحث بالاسم أو البريد أو الهاتف…" : "Search name, email or phone…"}
          className="min-w-52 flex-1 rounded-full border border-[#d2d2d7] bg-white px-4 py-2 text-sm font-normal outline-none transition-colors placeholder:text-[#86868b] focus:border-[#1d1d1f]/40"
        />
      </div>

      {rpcFailed ? (
        <EmptyState
          text={
            isAr
              ? "تعذر تحميل القائمة (خدمة القوائم غير مطبقة على قاعدة البيانات) — جرّب صفحة العملاء الكاملة من القائمة الجانبية."
              : "Could not load the list (the paged-list service is not applied) — try the full client manager from the sidebar."
          }
        />
      ) : loading && rows.length === 0 ? (
        <div className="py-20 text-center text-base font-normal text-[#6e6e73]">
          {isAr ? "جاري التحميل…" : "Loading…"}
        </div>
      ) : rows.length === 0 ? (
        <EmptyState text={isAr ? "مفيش نتائج مطابقة" : "No matching members"} />
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-[#f2f2f7]">
          <Table>
            <TableHeader>
              <TableRow className="bg-[#f5f5f7] hover:bg-[#f5f5f7]">
                <TableHead className="text-start">{isAr ? "العميل" : "Client"}</TableHead>
                <TableHead className="text-start">{isAr ? "الخطة" : "Tier"}</TableHead>
                <TableHead className="text-start">{isAr ? "الحالة" : "Status"}</TableHead>
                <TableHead className="text-start">{isAr ? "ينتهي في" : "Ends"}</TableHead>
                <TableHead className="text-start">{isAr ? "الكوتش" : "Coach"}</TableHead>
                <TableHead className="text-start" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => {
                const status = memberStatus(r);
                return (
                  <TableRow key={r.client_id} className={loading ? "opacity-50" : undefined}>
                    <TableCell>
                      <p className="font-medium">{r.client_full_name || "—"}</p>
                      <p dir="ltr" className="mt-0.5 text-xs text-[#6e6e73]">
                        {r.client_email || r.client_phone || "—"}
                      </p>
                    </TableCell>
                    <TableCell>
                      <TierBadge tier={r.sub_tier} label={tierLabel(r.sub_tier)} />
                    </TableCell>
                    <TableCell>
                      <MemberStatusBadge status={status} isAr={isAr} />
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-sm text-[#6e6e73]">
                      {r.sub_end_date
                        ? new Date(r.sub_end_date).toLocaleDateString(isAr ? "ar-EG" : "en-US", {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          })
                        : "—"}
                    </TableCell>
                    <TableCell className="text-sm text-[#6e6e73]">
                      {r.assigned_coach_name || "—"}
                    </TableCell>
                    <TableCell>
                      <a
                        href={`/coach/${r.client_id}`}
                        className="whitespace-nowrap text-sm font-normal text-[#0071e3] transition-opacity hover:opacity-70"
                      >
                        {isAr ? "إدارة العميل ›" : "Manage ›"}
                      </a>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      <Pagination
        page={page}
        pageSize={pageSize}
        total={total}
        onPageChange={(p) => setPage(p)}
        onPageSizeChange={(s) => {
          setPageSize(s);
          setPage(1);
        }}
        sizes={PAGE_SIZES}
        isAr={isAr}
        busy={loading}
      />
    </div>
  );
}
