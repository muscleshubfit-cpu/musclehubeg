"use client";

import { cn } from "@/lib/utils";

/**
 * SHARED PAGINATION (Phase 52 — «تخيل لو فى ١٠٠٠٠٠٠٠ مستخدم مسجل»).
 * Compact Apple-style pager used by every big list (clients, accounts).
 * Shows «يعرض X–Y من Z» + page window with ellipses + optional page-size
 * selector. Purely presentational — the caller owns page state.
 */

function fmt(n: number, isAr: boolean) {
  return n.toLocaleString(isAr ? "ar-EG" : "en-US");
}

export function Pagination({
  page,
  pageSize,
  total,
  onPageChange,
  onPageSizeChange,
  sizes,
  isAr,
  busy,
  className,
}: {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (p: number) => void;
  onPageSizeChange?: (s: number) => void;
  sizes?: number[];
  isAr: boolean;
  busy?: boolean;
  className?: string;
}) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  if (total <= 0) return null;

  const from = (page - 1) * pageSize + 1;
  const to = Math.min(total, page * pageSize);

  // Page window: 1 … (c-1) c (c+1) … last
  const items: Array<number | "…"> = [];
  const winStart = Math.max(2, page - 1);
  const winEnd = Math.min(totalPages - 1, page + 1);
  items.push(1);
  if (winStart > 2) items.push("…");
  for (let i = winStart; i <= winEnd; i++) items.push(i);
  if (winEnd < totalPages - 1) items.push("…");
  if (totalPages > 1) items.push(totalPages);

  const btn =
    "grid h-9 min-w-9 place-items-center rounded-full px-2.5 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40";

  return (
    <div className={cn("flex flex-wrap items-center justify-between gap-3", className)}>
      <p className="text-xs font-normal text-[#6e6e73]">
        {isAr
          ? `يعرض ${fmt(from, isAr)}–${fmt(to, isAr)} من ${fmt(total, isAr)}`
          : `Showing ${from.toLocaleString()}–${to.toLocaleString()} of ${total.toLocaleString()}`}
      </p>

      <div className="flex flex-wrap items-center gap-1.5">
        {onPageSizeChange && sizes && sizes.length > 0 && (
          <select
            value={pageSize}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
            aria-label={isAr ? "عدد الصفوف بالصفحة" : "Rows per page"}
            className="h-9 rounded-full border border-[#d2d2d7] bg-white px-3 text-xs font-normal outline-none focus:border-[#0071e3]"
          >
            {sizes.map((s) => (
              <option key={s} value={s}>
                {isAr ? `${s} بالصفحة` : `${s} / page`}
              </option>
            ))}
          </select>
        )}

        <button
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1 || busy}
          className={cn(btn, "bg-white text-[#1d1d1f] hover:bg-[#e8e8ed]")}
        >
          {isAr ? "السابق" : "Prev"}
        </button>

        {items.map((n, i) =>
          n === "…" ? (
            <span key={`e${i}`} className="px-1 text-xs text-[#86868b]">
              …
            </span>
          ) : (
            <button
              key={n}
              onClick={() => onPageChange(n)}
              disabled={busy}
              aria-current={n === page ? "page" : undefined}
              className={cn(
                btn,
                n === page ? "bg-[#1d1d1f] text-white" : "bg-white text-[#1d1d1f] hover:bg-[#e8e8ed]",
              )}
            >
              {fmt(n, isAr)}
            </button>
          ),
        )}

        <button
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages || busy}
          className={cn(btn, "bg-white text-[#1d1d1f] hover:bg-[#e8e8ed]")}
        >
          {isAr ? "التالي" : "Next"}
        </button>
      </div>
    </div>
  );
}
