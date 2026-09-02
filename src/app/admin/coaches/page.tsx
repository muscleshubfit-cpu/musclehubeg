"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useI18n } from "@/lib/i18n";
import { getAdminClientsPaged, type AdminClientsPageOpts } from "@/lib/data";
import { Loader2, MapPin, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { PageHeader, MemberStatusBadge, TierBadge, EmptyState, memberStatus, SectionCard } from "@/components/admin/ui";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

/**
 * COACHES PAGE (/admin/coaches) — Phase 103 REBUILD.
 *
 * Owner directive: «ادارة المدربين مفيهاش قائمة بالمدربين وكذلك كل ما يخصهم
 * ظاهر بالخارج ازرار فى لوحة الادمن» + «تفرقة بين مدربين الموقع ومدربين b2b».
 *
 * The Phase-101 hub was 4 link cards with NO coach list. This page now
 * opens with the REAL roster: every coach with his kind (site / B2B),
 * client counts (B2B clients + assigned members), membership status and
 * wallet — and a one-tap site/B2B kind toggle. The management tools stay
 * right below the roster (no more scattered hub): page reviews, B2B
 * assignments, wallets, support, and the NEW site-coach roster page.
 *
 * Data: get_admin_clients_paged(type='coach') — same unified 0067 feed as
 * /admin/clients, filtered server-side to coaches only. Wallet balances
 * come from the existing /api/admin/wallets read endpoint.
 */

type CoachRow = {
  client_id: string;
  client_full_name: string | null;
  client_email: string | null;
  coach_kind: string;
  is_test_account: boolean;
  sub_tier: string | null;
  sub_status: string | null;
  sub_end_date: string | null;
  b2b_clients: number;
  site_members: number;
};

type WalletRow = { coach_id: string; balance: number };

type Card = {
  href: string;
  emoji: string;
  ar: string;
  en: string;
  descAr: string;
  descEn: string;
  badge?: "pending" | "missing";
};

export default function CoachesPage() {
  const { lang } = useI18n();
  const isAr = lang === "ar";

  const [rows, setRows] = useState<CoachRow[]>([]);
  const [wallets, setWallets] = useState<Map<string, number>>(new Map());
  const [loading, setLoading] = useState(true);
  const [rpcFailed, setRpcFailed] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [pendingPages, setPendingPages] = useState<number | null>(null);
  const [missingPages, setMissingPages] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const opts: AdminClientsPageOpts = {
        limit: 100,
        offset: 0,
        type: "coach",
        sort: "name",
      };
      const data = await getAdminClientsPaged(opts);
      if (data === null) {
        setRpcFailed(true);
        setRows([]);
      } else {
        setRpcFailed(false);
        setRows(data as unknown as CoachRow[]);
      }
      // Wallet balances (existing read endpoint) — best effort.
      const wRes = await fetch("/api/admin/wallets").catch(() => null);
      if (wRes && wRes.ok) {
        const wData = await wRes.json();
        const list: WalletRow[] = wData?.wallets ?? [];
        setWallets(new Map(list.map((w) => [w.coach_id, Number(w.balance) || 0])));
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/admin/coach-pages");
        if (!res.ok) return;
        const data = await res.json();
        if (cancelled || !data?.counts) return;
        setPendingPages(Number(data.counts.pending) || 0);
        setMissingPages(Number(data.counts.missing) || 0);
      } catch {
        /* badges stay hidden */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  /** Site / B2B kind toggle — PATCH /api/admin/coach-kind (0067). */
  const toggleKind = async (r: CoachRow) => {
    setBusyId(r.client_id);
    const nextKind = r.coach_kind === "site" ? "b2b" : "site";
    try {
      const res = await fetch("/api/admin/coach-kind", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ coach_id: r.client_id, coach_kind: nextKind }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || data.error || "failed");
      setRows((prev) =>
        prev.map((x) => (x.client_id === r.client_id ? { ...x, coach_kind: nextKind } : x)),
      );
      toast.success(
        nextKind === "site"
          ? isAr ? "اتحول لمدرب موقع — صار يظهر في صفحة تعيين مدربي الموقع" : "Converted to a site coach"
          : isAr ? "اتحول لمدرب B2B" : "Converted to a B2B coach",
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : (isAr ? "خطأ" : "Error"));
    } finally {
      setBusyId(null);
    }
  };

  const cards: Card[] = [
    {
      href: "/admin/site-assignments",
      emoji: "🎯",
      ar: "مدربو الموقع والتعيينات",
      en: "Site coaches & roster",
      descAr:
        "تعيين مدربين كـ«مدربي موقع» وتخصيص أعضاء الموقع ليهم للمتابعة (B2C) — جدول منفصل تمامًا عن حسابات مدربي B2B",
      descEn:
        "Designate site coaches and assign site members to them for B2C follow-up — a table fully separate from B2B billing",
    },
    {
      href: "/admin/coach-pages",
      emoji: "🗂️",
      ar: "صفحات المدربين",
      en: "Coach pages",
      descAr: "مراجعة صفحات المدربين — موافقة أو رفض بسبب، وتذكير اللي لسه ما أنشأش صفحته",
      descEn:
        "Review coach pages — approve or reject with reason, and remind those without a page",
      badge: "pending",
    },
    {
      href: "/admin/assignments",
      emoji: "🤝",
      ar: "تعيينات مدربي B2B",
      en: "B2B assignments",
      descAr: "إضافة مدرب B2B، ربط عملائه بالمدربين، رسوم الكوتشينج، وسجل الدفعات اليدوية",
      descEn:
        "Add B2B coaches, assign their clients, coaching fees & the offline-payments ledger",
    },
    {
      href: "/admin/wallets",
      emoji: "👷",
      ar: "المحافظ",
      en: "Wallets",
      descAr: "أرصدة المحافظ، طلبات الشحن والإيصالات، والتعديل اليدوي",
      descEn: "Balances, receipt top-ups & manual adjustments",
    },
    {
      href: "/admin/coach-support",
      emoji: "🛠️",
      ar: "دعم المدربين",
      en: "Coach support",
      descAr: "رسائل دعم المدربين الواردة للإدارة والرد عليها",
      descEn: "Coach→site support inbox and replies",
    },
  ];

  const siteCount = rows.filter((r) => r.coach_kind === "site").length;

  return (
    <div className="space-y-8">
      <PageHeader
        title={isAr ? "المدربون" : "Coaches"}
        sub={
          isAr
            ? "قائمة بكل المدربين مع تفرقة واضحة: «مدرب موقع» بيتابع أعضاء الموقع (B2C)، و«مدرب B2B» شريك خارجي ليه عملاءه ومحفظته وفاتورته — وتحتها كل أدوات المدربين."
            : "The full coach roster with a clear split: a «site coach» follows up site members (B2C), a «B2B coach» is an external partner with his own clients, wallet and billing — with every coach tool right below."
        }
      />

      {/* THE ROSTER — what the old hub never had */}
      <SectionCard
        title={isAr ? "قائمة المدربين" : "Coach roster"}
        sub={
          isAr
            ? `${rows.length} مدرب — منهم ${siteCount} مدرب موقع`
            : `${rows.length} coaches — ${siteCount} site coach(es)`
        }
      >
        {rpcFailed ? (
          <EmptyState
            text={
              isAr
                ? "تعذر تحميل القائمة — خدمة العملاء الموحدة (مايجريشن 0067) لسه ما اتطبقتش. أول ما تتطبق هتشتغل لوحدها."
                : "Could not load the roster — the unified service (migration 0067) is not applied yet."
            }
          />
        ) : loading && rows.length === 0 ? (
          <div className="py-16 text-center text-base font-normal text-[#6e6e73]">
            {isAr ? "جاري التحميل…" : "Loading…"}
          </div>
        ) : rows.length === 0 ? (
          <EmptyState text={isAr ? "مفيش مدربين مسجلين بعد" : "No coaches yet"} />
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-[#f2f2f7]">
            <Table>
              <TableHeader>
                <TableRow className="bg-[#f5f5f7] hover:bg-[#f5f5f7]">
                  <TableHead className="text-start">{isAr ? "المدرب" : "Coach"}</TableHead>
                  <TableHead className="text-start">{isAr ? "النوع" : "Kind"}</TableHead>
                  <TableHead className="text-start">{isAr ? "عملاؤه / أعضاؤه" : "His people"}</TableHead>
                  <TableHead className="hidden text-start md:table-cell">
                    {isAr ? "عضويته" : "Membership"}
                  </TableHead>
                  <TableHead className="hidden text-start lg:table-cell">
                    {isAr ? "المحفظة" : "Wallet"}
                  </TableHead>
                  <TableHead className="text-start" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => {
                  const status = memberStatus(r);
                  const isSite = r.coach_kind === "site";
                  const busy = busyId === r.client_id;
                  const balance = wallets.get(r.client_id);
                  return (
                    <TableRow key={r.client_id} className={loading ? "opacity-50" : undefined}>
                      <TableCell>
                        <p className="font-medium">{r.client_full_name || "—"}</p>
                        <p dir="ltr" className="mt-0.5 text-xs text-[#6e6e73]">
                          {r.client_email || "—"}
                        </p>
                      </TableCell>
                      <TableCell>
                        <span
                          className={cn(
                            "inline-block rounded-full px-2.5 py-0.5 text-xs font-medium",
                            isSite
                              ? "bg-[#34c759]/10 text-[#34c759]"
                              : "bg-[#8b5cf6]/10 text-[#8b5cf6]",
                          )}
                        >
                          {isSite
                            ? isAr ? "مدرب موقع" : "Site coach"
                            : isAr ? "مدرب B2B" : "B2B coach"}
                        </span>
                      </TableCell>
                      <TableCell className="text-sm text-[#6e6e73]">
                        <p>{isAr ? "عملاء B2B: " : "B2B clients: "}{r.b2b_clients}</p>
                        <p>{isAr ? "أعضاء متابعة: " : "Follow-up members: "}{r.site_members}</p>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <TierBadge
                          tier={r.sub_tier}
                          label={
                            r.sub_tier
                              ? (isAr ? "مشترك" : "Subscriber")
                              : (isAr ? "بدون" : "None")
                          }
                        />
                        <div className="mt-1">
                          <MemberStatusBadge status={status} isAr={isAr} />
                        </div>
                      </TableCell>
                      <TableCell className="hidden text-sm text-[#6e6e73] lg:table-cell">
                        {balance !== undefined
                          ? `$${balance.toLocaleString("en-US", { maximumFractionDigits: 2 })}`
                          : "—"}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap items-center justify-end gap-1.5">
                          <button
                            onClick={() => toggleKind(r)}
                            disabled={busy}
                            title={
                              isSite
                                ? isAr ? "تحويله لمدرب B2B" : "Convert to B2B coach"
                                : isAr ? "تعيينه مدرب موقع" : "Designate as site coach"
                            }
                            className={cn(
                              "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-50",
                              isSite
                                ? "bg-[#f5f5f7] text-[#1d1d1f] hover:bg-[#e8e8ed]"
                                : "bg-[#34c759]/10 text-[#34c759] hover:bg-[#34c759]/20",
                            )}
                          >
                            {busy ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <MapPin className="h-3.5 w-3.5" />
                            )}
                            {isSite
                              ? isAr ? "إلغاء تعيين الموقع" : "Remove site role"
                              : isAr ? "تعيينه مدرب موقع" : "Make site coach"}
                          </button>
                          {isSite && (
                            <Link
                              href="/admin/site-assignments"
                              className="whitespace-nowrap rounded-full bg-[#f5f5f7] px-3 py-1.5 text-xs font-medium text-[#0071e3] transition-colors hover:bg-[#e8e8ed]"
                            >
                              {isAr ? "أعضاؤه ›" : "His members ›"}
                            </Link>
                          )}
                          <a
                            href={`/coach/${r.client_id}`}
                            className="whitespace-nowrap rounded-full bg-[#f5f5f7] px-3 py-1.5 text-xs font-medium text-[#0071e3] transition-colors hover:bg-[#e8e8ed]"
                          >
                            {isAr ? "إدارة كاملة ›" : "Manage ›"}
                          </a>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </SectionCard>

      {/* Tools — every coach surface one tap away (no hub-of-hubs) */}
      <SectionCard
        title={isAr ? "أدوات المدربين" : "Coach tools"}
        sub={
          isAr
            ? "كل ما يخص المدربين في مكان واحد — والقائمة الجانبية بتوصلك لأي أداة منهم مباشرة."
            : "Every coach-management surface in one place — the sidebar also reaches each tool directly."
        }
      >
        <div className="grid gap-4 sm:grid-cols-2">
          {cards.map((card) => (
            <Link
              key={card.href}
              href={card.href}
              className="group rounded-3xl border border-[#d2d2d7] bg-white p-5 transition-all hover:-translate-y-0.5 hover:border-[#1d1d1f]/40 hover:shadow-lg hover:shadow-black/5"
            >
              <div className="flex items-start justify-between gap-2">
                <span className="text-3xl">{card.emoji}</span>
                <div className="flex gap-1.5">
                  {card.badge === "pending" && pendingPages !== null && pendingPages > 0 && (
                    <span className="rounded-full bg-[#ff9500] px-2.5 py-1 text-[10px] font-bold text-white">
                      {isAr ? `${pendingPages} في الانتظار` : `${pendingPages} pending`}
                    </span>
                  )}
                  {card.badge === "pending" && missingPages !== null && missingPages > 0 && (
                    <span className="rounded-full bg-[#86868b]/15 px-2.5 py-1 text-[10px] font-bold text-[#6e6e73]">
                      {isAr ? `${missingPages} بدون صفحة` : `${missingPages} no page`}
                    </span>
                  )}
                </div>
              </div>
              <p className="mt-3 font-semibold">{isAr ? card.ar : card.en}</p>
              <p className="mt-1 text-sm leading-relaxed text-[#6e6e73]">
                {isAr ? card.descAr : card.descEn}
              </p>
            </Link>
          ))}
        </div>
      </SectionCard>

      <p className="flex items-start gap-2 text-xs text-[#6e6e73]">
        <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        {isAr
          ? "تفرقة النوع محفوظة في قاعدة البيانات (profiles.coach_kind) — ومدربي B2B تفضل فاتورتهم ومحافظهم شغالة زي ما هي بدون أي تأثير، ومدربي الموقع تعييناتهم في جدول منفصل تمامًا عن الفلوس."
          : "The kind split is stored in the DB (profiles.coach_kind) — B2B coaches keep their wallet and billing untouched, and site-coach rosters live in a table fully separate from money."}
      </p>
    </div>
  );
}
