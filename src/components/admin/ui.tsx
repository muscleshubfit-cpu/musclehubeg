"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * SHARED ADMIN PRIMITIVES (Admin Panel 2.0 — Phase 101).
 *
 * Extracted from the per-view copies that had drifted apart:
 *  - StatusPill was duplicated (AdminPaymentsView + AdminCoachSupportView)
 *  - tierColor map lived privately inside AdminPaymentsView
 *  - every view hand-rolled its own header + stat tiles + tab pills
 *
 * These are DUMB, presentational building blocks — no data fetching, no
 * business logic — so any admin surface can compose them safely.
 */

/* ── PageHeader ─────────────────────────────────────────────────── */

export function PageHeader({
  title,
  sub,
  actions,
}: {
  title: string;
  sub?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">{title}</h1>
        {sub && (
          <p className="mt-2 max-w-3xl text-base font-normal text-[#6e6e73] md:text-lg">
            {sub}
          </p>
        )}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}

/* ── StatTile ───────────────────────────────────────────────────── */

type StatTone = "dark" | "green" | "blue" | "orange" | "red" | "gray";

const TONE_VALUE: Record<StatTone, string> = {
  dark: "text-[#1d1d1f]",
  green: "text-[#34c759]",
  blue: "text-[#0071e3]",
  orange: "text-[#ff9500]",
  red: "text-[#ff3b30]",
  gray: "text-[#6e6e73]",
};

export function StatTile({
  label,
  value,
  href,
  tone = "dark",
  sub,
}: {
  label: string;
  value: string | number | null | undefined;
  href?: string;
  tone?: StatTone;
  sub?: string;
}) {
  const body = (
    <>
      <p className={cn("text-2xl font-semibold tracking-tight md:text-3xl", TONE_VALUE[tone])}>
        {value ?? "…"}
      </p>
      <p className="mt-1 text-xs font-normal text-[#6e6e73]">{label}</p>
      {sub && <p className="mt-0.5 text-[11px] font-normal text-[#86868b]">{sub}</p>}
    </>
  );
  const cls =
    "block rounded-2xl bg-[#f5f5f7] p-4 transition-colors" +
    (href ? " hover:bg-[#ebebed]" : "");
  return href ? (
    <Link href={href} className={cls}>
      {body}
    </Link>
  ) : (
    <div className={cls}>{body}</div>
  );
}

/* ── StatusBadge (subscription lifecycle) ───────────────────────── */

export type MemberStatus = "active" | "expiring" | "expired" | "no_sub" | "pending_payment";

const STATUS_STYLE: Record<MemberStatus, { cls: string; ar: string; en: string }> = {
  active: { cls: "bg-[#34c759]/10 text-[#34c759]", ar: "نشط", en: "Active" },
  expiring: { cls: "bg-[#ff9500]/10 text-[#ff9500]", ar: "ينتهي قريباً", en: "Expiring soon" },
  expired: { cls: "bg-[#ff3b30]/10 text-[#ff3b30]", ar: "منتهي", en: "Expired" },
  no_sub: { cls: "bg-[#6e6e73]/10 text-[#6e6e73]", ar: "بدون اشتراك", en: "No subscription" },
  pending_payment: {
    cls: "bg-[#ff9500]/10 text-[#ff9500]",
    ar: "بانتظار الدفع",
    en: "Awaiting payment",
  },
};

export function MemberStatusBadge({
  status,
  isAr,
}: {
  status: MemberStatus;
  isAr: boolean;
}) {
  const s = STATUS_STYLE[status];
  return (
    <span className={cn("inline-block rounded-full px-2.5 py-0.5 text-xs font-medium", s.cls)}>
      {isAr ? s.ar : s.en}
    </span>
  );
}

/**
 * Compute the member lifecycle status from an RPC row — ONE shared
 * implementation replacing the per-view copies (CoachView enrichClientRow
 * logic, mirrored server-side by get_coach_client_list_paged).
 */
export function memberStatus(row: {
  sub_tier?: string | null;
  sub_status?: string | null;
  sub_end_date?: string | null;
  pending_payments?: number | null;
}): MemberStatus {
  const now = Date.now();
  const hasSub = !!row.sub_tier;
  const endMs = row.sub_end_date ? new Date(row.sub_end_date).getTime() : null;
  const isActive = !!hasSub && row.sub_status === "active" && endMs !== null && endMs > now;
  if (isActive) return endMs !== null && endMs - now < 14 * 864e5 ? "expiring" : "active";
  if (!hasSub) return "no_sub";
  if ((row.pending_payments ?? 0) > 0) return "pending_payment";
  return "expired";
}

/* ── TierBadge ──────────────────────────────────────────────────── */

export function TierBadge({ tier, label }: { tier: string | null | undefined; label: string }) {
  const cls =
    tier === "premium"
      ? "bg-[#0071e3]/10 text-[#0071e3]"
      : tier === "pro"
        ? "bg-[#1d1d1f]/10 text-[#1d1d1f]"
        : tier === "coaching"
          ? "bg-[#8b5cf6]/10 text-[#8b5cf6]"
          : tier === "starter"
            ? "bg-[#34c759]/10 text-[#34c759]"
            : tier === "elite"
              ? "bg-[#ff9500]/10 text-[#ff9500]"
              : "bg-[#6e6e73]/10 text-[#6e6e73]";
  return (
    <span className={cn("inline-block rounded-full px-2.5 py-0.5 text-xs font-medium", cls)}>
      {label}
    </span>
  );
}

/* ── Generic status pill (request review states) ────────────────── */

export function RequestStatusPill({
  status,
  labels,
}: {
  status: string;
  labels: Record<string, string>;
}) {
  const cls =
    status === "pending"
      ? "bg-[#ff9500]/10 text-[#ff9500]"
      : status === "approved"
        ? "bg-[#34c759]/10 text-[#34c759]"
        : status === "rejected"
          ? "bg-[#ff3b30]/10 text-[#ff3b30]"
          : "bg-[#6e6e73]/10 text-[#6e6e73]";
  return (
    <span className={cn("inline-block rounded-full px-2.5 py-0.5 text-xs font-medium", cls)}>
      {labels[status] ?? status}
    </span>
  );
}

/* ── SegmentedTabs (Apple-style pill control) ───────────────────── */

export type SegmentedTab = { key: string; label: string; count?: number | null };

export function SegmentedTabs({
  tabs,
  active,
  onChange,
}: {
  tabs: SegmentedTab[];
  active: string;
  onChange: (key: string) => void;
}) {
  return (
    <div className="inline-flex max-w-full flex-wrap rounded-full bg-[#f5f5f7] p-1">
      {tabs.map((tab) => (
        <button
          key={tab.key}
          onClick={() => onChange(tab.key)}
          className={cn(
            "rounded-full px-4 py-2 text-sm font-normal transition-all",
            active === tab.key
              ? "bg-white text-[#1d1d1f] shadow-sm"
              : "text-[#6e6e73] hover:text-[#1d1d1f]",
          )}
        >
          {tab.label}
          {tab.count != null && tab.count > 0 && active !== tab.key && (
            <span className="ms-1.5 rounded-full bg-[#ff9500] px-1.5 py-0.5 text-[10px] font-bold text-white">
              {tab.count}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}

/* ── EmptyState ─────────────────────────────────────────────────── */

export function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-2xl bg-[#f5f5f7] p-12 text-center text-base font-normal text-[#6e6e73]">
      {text}
    </div>
  );
}

/* ── SectionCard (titled container) ─────────────────────────────── */

export function SectionCard({
  title,
  sub,
  children,
}: {
  title: string;
  sub?: string;
  children: ReactNode;
}) {
  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight md:text-3xl">{title}</h2>
        {sub && (
          <p className="mt-2 max-w-3xl text-sm font-normal text-[#6e6e73] md:text-base">
            {sub}
          </p>
        )}
      </div>
      {children}
    </section>
  );
}

/* ── Formatting helpers ─────────────────────────────────────────── */

export const fmtMoney = (n: number | null | undefined) =>
  `$${(n ?? 0).toLocaleString("en-US", { maximumFractionDigits: 2 })}`;

export const fmtNum = (n: number | null | undefined, isAr: boolean) =>
  (n ?? 0).toLocaleString(isAr ? "ar-EG" : "en-US");

export const fmtDate = (iso: string | null | undefined, isAr: boolean) =>
  iso
    ? new Date(iso).toLocaleDateString(isAr ? "ar-EG" : "en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : "—";
