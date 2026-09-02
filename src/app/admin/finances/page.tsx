"use client";

import { useEffect, useMemo, useState } from "react";
import { useI18n } from "@/lib/i18n";
import { listSubscriptionRequests } from "@/lib/data";
import { MEMBERSHIPS } from "@/lib/memberships";
import { getTier, type TierId } from "@/lib/plans";
import {
  PageHeader,
  StatTile,
  SectionCard,
  RequestStatusPill,
  EmptyState,
  fmtMoney,
  fmtNum,
  fmtDate,
} from "@/components/admin/ui";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

/**
 * ADMIN FINANCES (/admin/finances) — Admin Panel 2.0 (Phase 101).
 *
 * The owner's money was scattered across FOUR pages (membership payment
 * requests + refunds /admin/payments, wallet topups /admin/wallets, the
 * offline activation ledger inside /admin/assignments, referral payouts
 * /admin/referrals) with NO consolidated revenue-vs-coach-money view.
 *
 * This page separates the two money streams per the platform model law
 * (AGENTS.md §10 — TERMINOLOGY):
 *
 *   A) SITE MONEY (B2C) — clients pay THE SITE: subscription_requests
 *      (manual receipts: InstaPay / Vodafone Cash) minus 7-day refunds.
 *      = gross revenue, refunds, NET.
 *
 *   B) COACH MONEY (B2B) — coaches pay THE SITE: wallet top-ups
 *      (prepaid credit), per-client monthly fees, and the offline
 *      activation ledger (coach_payments). Balances = prepaid credit
 *      coaches hold, NOT site revenue.
 *
 * ZERO new API surface: composes existing read-only endpoints the admin
 * already uses; all aggregation is client-side (admin-only page).
 */

type SubReq = Awaited<ReturnType<typeof listSubscriptionRequests>>[number];

type RefundRow = {
  id: string;
  tier: string;
  months: number | null;
  amount_usd: number | null;
  status: string;
  created_at: string;
  user_name: string;
};

type WalletRow = {
  coach_id: string;
  full_name: string;
  email: string | null;
  balance: number;
  currency: string;
  fee_per_client: number;
  fee_currency: string;
  client_count: number;
};

type TopupRow = {
  id: string;
  amount: number;
  currency: string;
  method: string;
  status: string;
  created_at: string;
};

type LedgerRow = {
  id: string;
  amount: number | null;
  currency: string;
  method: string;
  created_at: string;
  coach: { full_name: string | null; email: string | null } | null;
  client: { full_name: string | null; email: string | null } | null;
};

export default function AdminFinancesPage() {
  const { lang } = useI18n();
  const isAr = lang === "ar";

  const [loading, setLoading] = useState(true);
  const [reqs, setReqs] = useState<SubReq[]>([]);
  const [refunds, setRefunds] = useState<RefundRow[]>([]);
  const [wallets, setWallets] = useState<WalletRow[]>([]);
  const [topups, setTopups] = useState<TopupRow[]>([]);
  const [ledger, setLedger] = useState<LedgerRow[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const [subReqs, refundsRes, walletsRes, ledgerRes] = await Promise.all([
          listSubscriptionRequests("all"),
          fetch("/api/admin/refunds").catch(() => null),
          fetch("/api/admin/wallets").catch(() => null),
          fetch("/api/admin/coach-payments?limit=100").catch(() => null),
        ]);
        if (cancelled) return;
        setReqs(subReqs ?? []);
        if (refundsRes && refundsRes.ok) {
          const body = await refundsRes.json();
          setRefunds(body.rows ?? []);
        }
        if (walletsRes && walletsRes.ok) {
          const body = await walletsRes.json();
          setWallets(body.wallets ?? []);
          setTopups(body.topups ?? []);
        }
        if (ledgerRes && ledgerRes.ok) {
          const body = await ledgerRes.json();
          setLedger(Array.isArray(body) ? body : (body.rows ?? []));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const tierLabel = (tier: string | null | undefined) => {
    if (!tier) return "—";
    const m = MEMBERSHIPS.find((x) => x.id === tier);
    if (m) return isAr ? m.nameAr : m.nameEn;
    const legacy = getTier(tier as TierId);
    return legacy ? legacy.id : tier;
  };

  /* ── A) SITE MONEY (B2C) ── */
  const site = useMemo(() => {
    const approved = reqs.filter((r) => r.status === "approved");
    const pending = reqs.filter((r) => r.status === "pending");
    const approvedSum = approved.reduce((s, r) => s + (Number(r.price_usd) || 0), 0);
    const pendingSum = pending.reduce((s, r) => s + (Number(r.price_usd) || 0), 0);
    const refundsApproved = refunds
      .filter((r) => r.status === "approved")
      .reduce((s, r) => s + (Number(r.amount_usd) || 0), 0);
    return {
      approvedSum,
      pendingSum,
      approvedCount: approved.length,
      pendingCount: pending.length,
      refundsApproved,
      refundsPending: refunds.filter((r) => r.status === "pending").length,
      net: approvedSum - refundsApproved,
      recent: approved.slice(0, 8),
    };
  }, [reqs, refunds]);

  // Last-6-months approved revenue buckets (client-side, admin-only page).
  const monthly = useMemo(() => {
    const now = new Date();
    const buckets: { key: string; label: string; value: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      buckets.push({
        key: `${d.getFullYear()}-${d.getMonth()}`,
        label: new Intl.DateTimeFormat(isAr ? "ar-EG" : "en-US", { month: "short" }).format(d),
        value: 0,
      });
    }
    const index = new Map(buckets.map((b) => [b.key, b]));
    for (const r of reqs) {
      if (r.status !== "approved") continue;
      const d = new Date(r.created_at);
      const b = index.get(`${d.getFullYear()}-${d.getMonth()}`);
      if (b) b.value += Number(r.price_usd) || 0;
    }
    return buckets;
  }, [reqs, isAr]);

  /* ── B) COACH MONEY (B2B) ── */
  const coach = useMemo(() => {
    const balances = wallets.reduce((s, w) => s + (Number(w.balance) || 0), 0);
    const topupsApproved = topups
      .filter((t) => t.status === "approved")
      .reduce((s, t) => s + (Number(t.amount) || 0), 0);
    const topupsPending = topups
      .filter((t) => t.status === "pending")
      .reduce((s, t) => s + (Number(t.amount) || 0), 0);
    const ledgerSum = ledger.reduce((s, r) => s + (Number(r.amount) || 0), 0);
    return { balances, topupsApproved, topupsPending, ledgerSum };
  }, [wallets, topups, ledger]);

  if (loading) {
    return (
      <div className="space-y-8">
        <PageHeader title={isAr ? "المالية" : "Finances"} />
        <div className="py-20 text-center text-base font-normal text-[#6e6e73]">
          {isAr ? "جاري تجميع الأرقام…" : "Aggregating the numbers…"}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-10">
      <PageHeader
        title={isAr ? "المالية" : "Finances"}
        sub={
          isAr
            ? "فصل واضح بين أموال الموقع (اشتراكات العملاء B2C) وأموال المدربين (محافظ ورسوم B2B) — كل حسبة من مصادرها الموجودة فعلاً، بدون أي كتابة."
            : "A clear split between SITE money (client subscriptions, B2C) and COACH money (wallets & fees, B2B) — aggregated from the existing sources, read-only."
        }
      />

      {/* ── A) SITE MONEY (B2C) ── */}
      <SectionCard
        title={isAr ? "أموال الموقع — عضويات العملاء (B2C)" : "Site money — client memberships (B2C)"}
        sub={
          isAr
            ? "إيرادات اشتراكات الموقع المدفوعة يدوياً (انستاباي / فودافون كاش) بعد خصم الاستردادات المعتمدة. الشهر بيتحسب من تاريخ الطلب."
            : "Site membership revenue from manual payments (InstaPay / Vodafone Cash), net of approved refunds. Months are bucketed by request date."
        }
      >
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatTile
            label={isAr ? "إيرادات معتمدة" : "Approved revenue"}
            value={fmtMoney(site.approvedSum)}
            sub={isAr ? `${fmtNum(site.approvedCount, isAr)} اشتراك` : `${fmtNum(site.approvedCount, isAr)} subs`}
            tone="blue"
          />
          <StatTile
            label={isAr ? "استردادات معتمدة" : "Approved refunds"}
            value={fmtMoney(site.refundsApproved)}
            sub={
              site.refundsPending > 0
                ? isAr
                  ? `${fmtNum(site.refundsPending, isAr)} طلب معلّق`
                  : `${fmtNum(site.refundsPending, isAr)} pending`
                : undefined
            }
            tone="red"
            href="/admin/payments"
          />
          <StatTile
            label={isAr ? "الصافي" : "Net"}
            value={fmtMoney(site.net)}
            tone="green"
          />
          <StatTile
            label={isAr ? "معلّق (بانتظار مراجعتك)" : "Pending (awaiting review)"}
            value={fmtMoney(site.pendingSum)}
            sub={isAr ? `${fmtNum(site.pendingCount, isAr)} طلب` : `${fmtNum(site.pendingCount, isAr)} requests`}
            tone="orange"
            href="/admin/payments"
          />
        </div>

        {/* Monthly revenue trend */}
        <div className="rounded-2xl border border-[#f2f2f7] bg-white p-4">
          <p className="mb-3 text-sm font-medium text-[#6e6e73]">
            {isAr ? "الإيرادات المعتمدة — آخر 6 شهور" : "Approved revenue — last 6 months"}
          </p>
          <div dir="ltr" className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthly} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f2f2f7" vertical={false} />
                <XAxis
                  dataKey="label"
                  tick={{ fill: "#6e6e73", fontSize: 12 }}
                  axisLine={{ stroke: "#d2d2d7" }}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: "#6e6e73", fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                  width={48}
                />
                <Tooltip
                  formatter={(v) => [fmtMoney(Number(v)), isAr ? "إيرادات" : "Revenue"]}
                  cursor={{ fill: "#f5f5f7" }}
                />
                <Bar dataKey="value" fill="#1d1d1f" radius={[6, 6, 0, 0]} maxBarSize={48} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Recent approved payments */}
        {site.recent.length > 0 && (
          <div className="overflow-x-auto rounded-2xl border border-[#f2f2f7]">
            <Table>
              <TableHeader>
                <TableRow className="bg-[#f5f5f7] hover:bg-[#f5f5f7]">
                  <TableHead className="text-start">{isAr ? "العميل" : "Client"}</TableHead>
                  <TableHead className="text-start">{isAr ? "الخطة" : "Tier"}</TableHead>
                  <TableHead className="text-start">{isAr ? "المبلغ" : "Amount"}</TableHead>
                  <TableHead className="text-start">{isAr ? "التاريخ" : "Date"}</TableHead>
                  <TableHead className="text-start">{isAr ? "الحالة" : "Status"}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {site.recent.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{r.full_name || "—"}</TableCell>
                    <TableCell className="text-sm text-[#6e6e73]">{tierLabel(r.plan_tier)}</TableCell>
                    <TableCell className="font-semibold">{fmtMoney(Number(r.price_usd))}</TableCell>
                    <TableCell className="whitespace-nowrap text-sm text-[#6e6e73]">
                      {fmtDate(r.created_at, isAr)}
                    </TableCell>
                    <TableCell>
                      <RequestStatusPill
                        status={r.status}
                        labels={
                          isAr
                            ? { pending: "قيد المراجعة", approved: "معتمد", rejected: "مرفوض" }
                            : { pending: "Pending", approved: "Approved", rejected: "Rejected" }
                        }
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </SectionCard>

      {/* ── B) COACH MONEY (B2B) ── */}
      <SectionCard
        title={isAr ? "أموال المدربين — النظام B2B" : "Coach money — the B2B system"}
        sub={
          isAr
            ? "المحفوظ هنا فلوس المدربين للموقع: رصيد المحافظ المُسبق، طلبات الشحن، وسجل التفعيل اليدوي. رصيد المحفظة رصيد استخدام مش إيراد ليك."
            : "This tracks what COACHES owe/hold with the site: prepaid wallet balances, top-up requests, and the offline activation ledger. A wallet balance is prepaid credit, NOT your revenue."
        }
      >
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatTile
            label={isAr ? "أرصدة المحافظ الحالية" : "Current wallet balances"}
            value={fmtMoney(coach.balances)}
            sub={isAr ? `${fmtNum(wallets.length, isAr)} مدرب` : `${fmtNum(wallets.length, isAr)} coaches`}
            href="/admin/wallets"
          />
          <StatTile
            label={isAr ? "شحن معتمد (دفعه المدربين)" : "Approved top-ups (paid in)"}
            value={fmtMoney(coach.topupsApproved)}
            tone="blue"
            href="/admin/wallets"
          />
          <StatTile
            label={isAr ? "شحن معلّق" : "Pending top-ups"}
            value={fmtMoney(coach.topupsPending)}
            tone="orange"
            href="/admin/wallets"
          />
          <StatTile
            label={isAr ? "سجل التفعيل اليدوي" : "Offline activation ledger"}
            value={fmtMoney(coach.ledgerSum)}
            sub={isAr ? "آخر 100 عملية" : "last 100 records"}
            href="/admin/assignments"
          />
        </div>

        {wallets.length === 0 ? (
          <EmptyState text={isAr ? "مفيش محافظ مدربين بعد" : "No coach wallets yet"} />
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-[#f2f2f7]">
            <Table>
              <TableHeader>
                <TableRow className="bg-[#f5f5f7] hover:bg-[#f5f5f7]">
                  <TableHead className="text-start">{isAr ? "المدرب" : "Coach"}</TableHead>
                  <TableHead className="text-start">{isAr ? "الرصيد" : "Balance"}</TableHead>
                  <TableHead className="text-start">{isAr ? "العميلين الحاليين" : "Clients"}</TableHead>
                  <TableHead className="text-start">{isAr ? "الرسوم الشهرية/عميل" : "Fee/client"}</TableHead>
                  <TableHead className="text-start">{isAr ? "فاتورة الشهر المتوقعة" : "Expected monthly bill"}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {wallets.map((w) => (
                  <TableRow key={w.coach_id}>
                    <TableCell>
                      <p className="font-medium">{w.full_name || "—"}</p>
                      <p dir="ltr" className="mt-0.5 text-xs text-[#6e6e73]">
                        {w.email || "—"}
                      </p>
                    </TableCell>
                    <TableCell className="font-semibold">
                      {fmtMoney(Number(w.balance))}{" "}
                      <span className="text-xs font-normal text-[#6e6e73]">{w.currency}</span>
                    </TableCell>
                    <TableCell>{fmtNum(w.client_count, isAr)}</TableCell>
                    <TableCell className="text-sm text-[#6e6e73]">
                      {fmtMoney(Number(w.fee_per_client))}{" "}
                      <span className="text-xs">{w.fee_currency}</span>
                    </TableCell>
                    <TableCell className="font-medium">
                      {fmtMoney(Number(w.fee_per_client) * Number(w.client_count))}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </SectionCard>
    </div>
  );
}
