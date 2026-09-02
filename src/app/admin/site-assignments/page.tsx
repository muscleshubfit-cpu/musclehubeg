"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useI18n } from "@/lib/i18n";
import { getAdminClientsPaged } from "@/lib/data";
import { Loader2, Search, Trash2, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { PageHeader, SectionCard, EmptyState } from "@/components/admin/ui";
import { cn } from "@/lib/utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

/**
 * SITE-COACH ROSTER (/admin/site-assignments) — Phase 103 (0067).
 *
 * Owner directive: «قائمة جديده لتعين مدربين للموقع وتعيين أعضاء ليهم
 * لمتابعتهم ( b2c )».
 *
 * TWO steps in ONE surface:
 *   1. pick a SITE coach (coaches flagged coach_kind='site' from the
 *      coaches page toggle);
 *   2. search any site member and assign him to that coach for follow-up.
 *
 * The roster lives in site_coach_assignments — a table with ZERO money
 * attached (the B2B coach_assignments feeds wallet billing and affiliate
 * attribution, so B2C members must never land in it). One member ↔ one
 * site coach: assigning a member who already has a coach MOVES him.
 * Writes go through /api/admin/site-assignments (requireAdmin +
 * service-role; browser grants on the table are read-only by design).
 */

type CoachLite = { client_id: string; client_full_name: string | null; client_email: string | null };
type MemberLite = {
  client_id: string;
  client_full_name: string | null;
  client_email: string | null;
  site_coach_name: string | null;
};
type AssignmentRow = {
  id: string;
  coach_id: string;
  client_id: string;
  coach_name: string;
  client_name: string;
  assigned_by_name: string | null;
  created_at: string;
};

export default function SiteAssignmentsPage() {
  const { lang } = useI18n();
  const isAr = lang === "ar";

  const [coaches, setCoaches] = useState<CoachLite[]>([]);
  const [rpcFailed, setRpcFailed] = useState(false);
  const [coachId, setCoachId] = useState("");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<MemberLite[]>([]);
  const [searching, setSearching] = useState(false);
  const [assignments, setAssignments] = useState<AssignmentRow[]>([]);
  const [loadingRoster, setLoadingRoster] = useState(true);
  const [busyMember, setBusyMember] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const loadRoster = useCallback(async () => {
    setLoadingRoster(true);
    try {
      const res = await fetch("/api/admin/site-assignments");
      const data = await res.json();
      if (res.ok) setAssignments(data.assignments ?? []);
    } finally {
      setLoadingRoster(false);
    }
  }, []);

  useEffect(() => {
    loadRoster();
  }, [loadRoster]);

  // Site coaches (coach_kind='site') — the assignable pool.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const data = await getAdminClientsPaged({ limit: 100, offset: 0, type: "coach_site", sort: "name" });
      if (cancelled) return;
      if (data === null) {
        setRpcFailed(true);
      } else {
        setRpcFailed(false);
        setCoaches(
          (data as unknown as CoachLite[]).map((r) => ({
            client_id: r.client_id,
            client_full_name: r.client_full_name,
            client_email: r.client_email,
          })),
        );
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Member search (site members = role client without a B2B coach).
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }
    let cancelled = false;
    setSearching(true);
    const t = setTimeout(async () => {
      const data = await getAdminClientsPaged({
        limit: 8,
        offset: 0,
        type: "member_site",
        search: query.trim(),
        sort: "name",
      });
      if (cancelled) return;
      setSearching(false);
      setResults(
        data === null
          ? []
          : (data as unknown as MemberLite[]).map((r) => ({
              client_id: r.client_id,
              client_full_name: r.client_full_name,
              client_email: r.client_email,
              site_coach_name: r.site_coach_name,
            })),
      );
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(t);
      setSearching(false);
    };
  }, [query]);

  const assign = async (member: MemberLite) => {
    if (!coachId) {
      toast.error(isAr ? "اختار مدرب الموقع الأول من فوق" : "Pick a site coach first");
      return;
    }
    setBusyMember(member.client_id);
    try {
      const res = await fetch("/api/admin/site-assignments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ coach_id: coachId, client_id: member.client_id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || data.error || "failed");
      toast.success(
        isAr
          ? `اتعين ${member.client_full_name || member.client_email} للمتابعة`
          : "Member assigned for follow-up",
      );
      setQuery("");
      setResults([]);
      loadRoster();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : (isAr ? "خطأ في التعيين" : "Assign failed"));
    } finally {
      setBusyMember(null);
    }
  };

  const unassign = async (row: AssignmentRow) => {
    setRemovingId(row.id);
    try {
      const res = await fetch("/api/admin/site-assignments", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: row.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || data.error || "failed");
      toast.success(isAr ? "اتشال التعيين" : "Assignment removed");
      loadRoster();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : (isAr ? "خطأ في الإزالة" : "Remove failed"));
    } finally {
      setRemovingId(null);
    }
  };

  const coachName = (id: string) =>
    coaches.find((c) => c.client_id === id)?.client_full_name || "—";

  return (
    <div className="space-y-8">
      <PageHeader
        title={isAr ? "مدربو الموقع والتعيينات" : "Site coaches & roster"}
        sub={
          isAr
            ? "عيّن مدربين كـ«مدربي موقع» من صفحة المدربين، وخصص لكل مدرب أعضاء الموقع اللي هيتابعهم (B2C). عضو واحد ↔ مدرب موقع واحد — وإعادة التعيين بتنتقل به. الجدول ده منفصل تمامًا عن حسابات مدربي B2B والفلوس."
            : "Designate site coaches from the coaches page, then assign site members to each coach for B2C follow-up. One member ↔ one site coach — re-assigning moves him. This roster is fully separate from B2B billing."
        }
      />

      {/* Step 1 — pick the site coach */}
      <SectionCard
        title={isAr ? "١ — اختار مدرب الموقع" : "1 — Pick the site coach"}
        sub={
          isAr
            ? "اللي مفيهوش مدربين موقع؟ افتح صفحة المدربين واضغط «تعيينه مدرب موقع» جنب أي مدرب."
            : "No site coaches yet? Open the coaches page and press «Make site coach» next to any coach."
        }
      >
        {rpcFailed ? (
          <EmptyState
            text={
              isAr
                ? "تعذر التحميل — خدمة العملاء الموحدة (مايجريشن 0067) لسه ما اتطبقتش."
                : "Could not load — the unified service (migration 0067) is not applied yet."
            }
          />
        ) : coaches.length === 0 ? (
          <div className="flex flex-wrap items-center gap-3 rounded-2xl bg-[#f5f5f7] p-4 text-sm text-[#6e6e73]">
            {isAr ? "مفيش مدربي موقع لسه —" : "No site coaches yet —"}
            <Link href="/admin/coaches" className="font-medium text-[#0071e3] hover:underline">
              {isAr ? "افتح صفحة المدربين لتعيين أول مدرب موقع ›" : "Open the coaches page to designate one ›"}
            </Link>
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {coaches.map((c) => (
              <button
                key={c.client_id}
                onClick={() => setCoachId(c.client_id)}
                className={cn(
                  "rounded-full border px-4 py-2.5 text-sm font-medium transition-all",
                  coachId === c.client_id
                    ? "border-[#1d1d1f] bg-[#1d1d1f] text-white"
                    : "border-[#d2d2d7] bg-white text-[#1d1d1f] hover:border-[#1d1d1f]/40 hover:bg-[#f5f5f7]",
                )}
              >
                {c.client_full_name || c.client_email || "—"}
              </button>
            ))}
          </div>
        )}
      </SectionCard>

      {/* Step 2 — search & assign members */}
      <SectionCard
        title={isAr ? "٢ — ابحث عن عضو وعيّنه" : "2 — Search & assign members"}
        sub={
          isAr
            ? coachId
              ? `العضو هيتعين لـ: ${coachName(coachId)}`
              : "ابدأ باختيار مدرب الموقع من الخطوة الأولى"
            : coachId
              ? `Assigning to: ${coachName(coachId)}`
              : "Pick a site coach in step 1 first"
        }
      >
        <div className="relative">
          <Search className="absolute top-1/2 start-4 h-4 w-4 -translate-y-1/2 text-[#86868b]" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={isAr ? "بحث بالاسم أو البريد أو الهاتف…" : "Search name, email or phone…"}
            className="w-full rounded-full border border-[#d2d2d7] bg-white py-3 pe-4 ps-11 text-sm font-normal outline-none transition-colors placeholder:text-[#86868b] focus:border-[#1d1d1f]/40"
          />
        </div>

        {searching && (
          <p className="flex items-center gap-2 text-xs text-[#86868b]">
            <Loader2 className="h-3 w-3 animate-spin" />
            {isAr ? "جاري البحث…" : "Searching…"}
          </p>
        )}

        {results.length > 0 && (
          <div className="overflow-hidden rounded-2xl border border-[#f2f2f7]">
            {results.map((m) => (
              <div
                key={m.client_id}
                className="flex flex-wrap items-center justify-between gap-2 border-b border-[#f2f2f7] p-3 last:border-0"
              >
                <div>
                  <p className="text-sm font-medium">{m.client_full_name || "—"}</p>
                  <p dir="ltr" className="text-xs text-[#6e6e73]">
                    {m.client_email || "—"}
                  </p>
                  {m.site_coach_name && (
                    <p className="text-xs text-[#ff9500]">
                      {isAr ? `حاليًا متابع لـ: ${m.site_coach_name} — التعيين هينقله` : `Currently with: ${m.site_coach_name} — will be moved`}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => assign(m)}
                  disabled={busyMember === m.client_id || !coachId}
                  className="inline-flex items-center gap-1.5 rounded-full bg-[#1d1d1f] px-4 py-2 text-xs font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                >
                  {busyMember === m.client_id ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <UserPlus className="h-3.5 w-3.5" />
                  )}
                  {isAr ? "تعيين للمتابعة" : "Assign"}
                </button>
              </div>
            ))}
          </div>
        )}
      </SectionCard>

      {/* The roster */}
      <SectionCard
        title={isAr ? "قائمة التعيينات" : "The roster"}
        sub={
          isAr
            ? "كل عضو ومين المسؤول عن متابعته — المقيّد هنا مش بيتحسب في فواتير أي مدرب."
            : "Every member and who follows him up — roster rows never count toward any coach's bill."
        }
      >
        {loadingRoster ? (
          <div className="py-12 text-center text-sm text-[#6e6e73]">
            {isAr ? "جاري التحميل…" : "Loading…"}
          </div>
        ) : assignments.length === 0 ? (
          <EmptyState
            text={
              isAr
                ? "مفيش تعيينات بعد — اختار مدرب موقع وابحث عن عضو وعيّنه من فوق."
                : "No assignments yet — pick a site coach, search a member and assign him above."
            }
          />
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-[#f2f2f7]">
            <Table>
              <TableHeader>
                <TableRow className="bg-[#f5f5f7] hover:bg-[#f5f5f7]">
                  <TableHead className="text-start">{isAr ? "العضو" : "Member"}</TableHead>
                  <TableHead className="text-start">{isAr ? "مدرب المتابعة" : "Follow-up coach"}</TableHead>
                  <TableHead className="hidden text-start md:table-cell">{isAr ? "عينه" : "Assigned by"}</TableHead>
                  <TableHead className="hidden text-start md:table-cell">{isAr ? "التاريخ" : "Date"}</TableHead>
                  <TableHead className="text-start" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {assignments.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell>
                      <p className="font-medium">{a.client_name}</p>
                      <a
                        href={`/coach/${a.client_id}`}
                        className="text-xs text-[#0071e3] hover:underline"
                      >
                        {isAr ? "إدارة كاملة ›" : "Manage ›"}
                      </a>
                    </TableCell>
                    <TableCell className="text-sm">{a.coach_name}</TableCell>
                    <TableCell className="hidden text-sm text-[#6e6e73] md:table-cell">
                      {a.assigned_by_name || "—"}
                    </TableCell>
                    <TableCell className="hidden whitespace-nowrap text-sm text-[#6e6e73] md:table-cell">
                      {new Date(a.created_at).toLocaleDateString(isAr ? "ar-EG" : "en-US", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end">
                        <button
                          onClick={() => unassign(a)}
                          disabled={removingId === a.id}
                          title={isAr ? "إزالة التعيين" : "Remove assignment"}
                          className="inline-flex items-center gap-1.5 rounded-full bg-[#ff3b30]/10 px-3 py-1.5 text-xs font-medium text-[#ff3b30] transition-colors hover:bg-[#ff3b30]/20 disabled:opacity-50"
                        >
                          {removingId === a.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Trash2 className="h-3.5 w-3.5" />
                          )}
                          {isAr ? "إزالة" : "Remove"}
                        </button>
                      </div>
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
