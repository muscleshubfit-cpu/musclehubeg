/**
 * Server-side link-based pagination — zero client JS.
 *
 * Companion to src/components/Pagination.tsx (interactive, callback
 * based) for server-rendered list pages (foods, exercises) whose pager
 * must work as plain <Link> navigation driven by URL search params.
 * Same Apple-style window (1 … c-1 c c+1 … last) as the client pager.
 */

import Link from "next/link";
import { cn } from "@/lib/utils";

function fmt(n: number, isAr: boolean) {
  return n.toLocaleString(isAr ? "ar-EG" : "en-US");
}

export function ServerPagination({
  page,
  pageSize,
  total,
  isAr,
  buildHref,
  className,
}: {
  page: number;
  pageSize: number;
  total: number;
  isAr: boolean;
  /** Builds the href for a target page, preserving the current filters. */
  buildHref: (page: number) => string;
  className?: string;
}) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  if (total <= 0) return null;

  const from = (page - 1) * pageSize + 1;
  const to = Math.min(total, page * pageSize);

  const items: Array<number | "…"> = [];
  const winStart = Math.max(2, page - 1);
  const winEnd = Math.min(totalPages - 1, page + 1);
  items.push(1);
  if (winStart > 2) items.push("…");
  for (let i = winStart; i <= winEnd; i++) items.push(i);
  if (winEnd < totalPages - 1) items.push("…");
  if (totalPages > 1) items.push(totalPages);

  const btn =
    "grid h-9 min-w-9 place-items-center rounded-full px-2.5 text-xs font-medium transition-colors";

  return (
    <nav
      aria-label={isAr ? "التنقل بين الصفحات" : "Page navigation"}
      className={cn("flex flex-wrap items-center justify-between gap-3", className)}
    >
      <p className="text-xs font-normal text-[#6e6e73]">
        {isAr
          ? `يعرض ${fmt(from, isAr)}–${fmt(to, isAr)} من ${fmt(total, isAr)}`
          : `Showing ${from.toLocaleString()}–${to.toLocaleString()} of ${total.toLocaleString()}`}
      </p>

      <div className="flex flex-wrap items-center gap-1.5">
        {page <= 1 ? (
          <span aria-disabled="true" className={cn(btn, "cursor-not-allowed bg-white text-[#1d1d1f] opacity-40")}>
            {isAr ? "السابق" : "Prev"}
          </span>
        ) : (
          <Link href={buildHref(page - 1)} className={cn(btn, "bg-white text-[#1d1d1f] hover:bg-[#e8e8ed]")}>
            {isAr ? "السابق" : "Prev"}
          </Link>
        )}

        {items.map((n, i) =>
          n === "…" ? (
            <span key={`e${i}`} className="px-1 text-xs text-[#86868b]">
              …
            </span>
          ) : n === page ? (
            <span
              key={n}
              aria-current="page"
              className={cn(btn, "bg-[#1d1d1f] text-white")}
            >
              {fmt(n, isAr)}
            </span>
          ) : (
            <Link
              key={n}
              href={buildHref(n)}
              className={cn(btn, "bg-white text-[#1d1d1f] hover:bg-[#e8e8ed]")}
            >
              {fmt(n, isAr)}
            </Link>
          ),
        )}

        {page >= totalPages ? (
          <span aria-disabled="true" className={cn(btn, "cursor-not-allowed bg-white text-[#1d1d1f] opacity-40")}>
            {isAr ? "التالي" : "Next"}
          </span>
        ) : (
          <Link href={buildHref(page + 1)} className={cn(btn, "bg-white text-[#1d1d1f] hover:bg-[#e8e8ed]")}>
            {isAr ? "التالي" : "Next"}
          </Link>
        )}
      </div>
    </nav>
  );
}
