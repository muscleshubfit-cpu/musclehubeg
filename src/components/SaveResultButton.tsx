"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { useI18n } from "@/lib/i18n";
import { useMembershipTier } from "@/hooks/use-membership-tier";
import { Bookmark, Loader2, Check, Download, Trash2, ImageDown } from "lucide-react";
import { toast } from "sonner";
import type { ToolResultData } from "@/lib/result-png-export";

type Props = {
  toolSlug: string;
  title: string;
  resultData: ToolResultData;
};

/**
 * SaveResultButton — appears on tool result pages.
 *
 * Three actions:
 *   1. Save: stores the result in Supabase (saved_results table)
 *      - Requires login
 *      - Enforces membership limits (Free: 3, Premium: 50, Pro: 200)
 *   2. Download JSON: exports the result as a JSON file (any tier)
 *   3. Download PNG: exports a formatted result card as a PNG image
 *      - Premium/Pro/Coaching only (membership gate)
 */
export function SaveResultButton({ toolSlug, title, resultData }: Props) {
  const { profile } = useAuth();
  const { lang } = useI18n();
  const router = useRouter();
  const isAr = lang === "ar";
  const { tier } = useMembershipTier(profile);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [exportingPng, setExportingPng] = useState(false);

  const handleSave = async () => {
    if (!profile) {
      toast.error(isAr ? "سجّل الدخول للحفظ" : "Log in to save");
      router.push("/auth?mode=login&next=" + encodeURIComponent(window.location.pathname));
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/tools/save-result", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tool_slug: toolSlug,
          title,
          result_data: resultData,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.error === "Limit reached") {
          toast.error(
            isAr
              ? `وصلت حد الحفظ (${data.limit}). ترقّي عضويتك للمزيد.`
              : `Save limit reached (${data.limit}). Upgrade for more.`,
          );
        } else {
          toast.error(data.error || (isAr ? "فشل الحفظ" : "Failed to save"));
        }
        return;
      }

      setSaved(true);
      toast.success(isAr ? "تم الحفظ ✅" : "Saved ✅");
      setTimeout(() => setSaved(false), 3000);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : (isAr ? "فشل الحفظ" : "Failed to save"));
    } finally {
      setSaving(false);
    }
  };

  const handleDownloadJson = () => {
    const exportData = {
      tool: toolSlug,
      title,
      date: new Date().toISOString(),
      result: resultData,
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${toolSlug}-result-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);

    toast.success(isAr ? "تم التحميل" : "Downloaded");
  };

  const handleDownloadPdf = async () => {
    // PDF export is a premium feature — resolve tier via the
    // useMembershipTier hook (queries subscriptions table, not the
    // missing profile.membership_tier field).
    if (!profile) {
      toast.error(isAr ? "سجّل الدخول أولاً" : "Log in first");
      return;
    }
    const allowed = ["premium", "pro", "coaching"].includes(tier);
    if (!allowed) {
      toast.error(
        isAr
          ? "تحميل PDF متاح للأعضاء Premium فأعلى"
          : "PDF export is Premium+ only",
      );
      router.push("/memberships");
      return;
    }

    setExportingPng(true);
    try {
      const { exportResultPdf } = await import("@/lib/result-png-export");
      await exportResultPdf({
        toolSlug,
        title,
        resultData,
        isAr,
      });
      toast.success(isAr ? "تم تحميل PDF" : "PDF downloaded");
    } catch (e) {
      console.error("[PDF export]", e);
      toast.error(
        isAr ? "فشل إنشاء PDF" : "Failed to generate PDF",
      );
    } finally {
      setExportingPng(false);
    }
  };

  return (
    <div className="flex flex-wrap gap-2">
      {/* Save button */}
      <button
        onClick={handleSave}
        disabled={saving || saved}
        className="inline-flex items-center gap-2 rounded-full bg-[#0071e3] px-5 py-2.5 text-sm font-normal text-white transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        {saving ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : saved ? (
          <Check className="h-4 w-4" />
        ) : (
          <Bookmark className="h-4 w-4" />
        )}
        {saved
          ? isAr ? "تم الحفظ" : "Saved"
          : isAr ? "حفظ النتيجة" : "Save result"}
      </button>

      {/* PDF export button (premium+) */}
      <button
        onClick={handleDownloadPdf}
        disabled={exportingPng}
        className="inline-flex items-center gap-2 rounded-full bg-[#1d1d1f] px-5 py-2.5 text-sm font-normal text-white transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        {exportingPng ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <ImageDown className="h-4 w-4" />
        )}
        {isAr ? "تحميل PDF" : "PDF"}
      </button>

      {/* JSON download button */}
      <button
        onClick={handleDownloadJson}
        className="inline-flex items-center gap-2 rounded-full border border-[#d2d2d7] bg-white px-5 py-2.5 text-sm font-normal text-[#1d1d1f] transition-colors hover:bg-[#f5f5f7]"
      >
        <Download className="h-4 w-4" />
        {isAr ? "JSON" : "JSON"}
      </button>
    </div>
  );
}
