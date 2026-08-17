"use client";

import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useI18n } from "@/lib/i18n";
import { Bookmark, Loader2, Check, Download, Trash2 } from "lucide-react";
import { toast } from "sonner";

type Props = {
  toolSlug: string;
  title: string;
  resultData: Record<string, any>;
};

/**
 * SaveResultButton — appears on tool result pages.
 *
 * Two actions:
 *   1. Save: stores the result in Supabase (saved_results table)
 *      - Requires login
 *      - Enforces membership limits (Free: 3, Premium: 50, Pro: 200)
 *   2. Download: exports the result as a JSON file
 *      - Available to all users (no login required)
 */
export function SaveResultButton({ toolSlug, title, resultData }: Props) {
  const { profile } = useAuth();
  const { lang } = useI18n();
  const isAr = lang === "ar";
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = async () => {
    if (!profile) {
      toast.error(isAr ? "سجّل الدخول للحفظ" : "Log in to save");
      window.location.href = "/auth?mode=login&next=" + encodeURIComponent(window.location.pathname);
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
    } catch (e: any) {
      toast.error(e?.message || (isAr ? "فشل الحفظ" : "Failed to save"));
    } finally {
      setSaving(false);
    }
  };

  const handleDownload = () => {
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

      {/* Download button */}
      <button
        onClick={handleDownload}
        className="inline-flex items-center gap-2 rounded-full border border-[#d2d2d7] bg-white px-5 py-2.5 text-sm font-normal text-[#1d1d1f] transition-colors hover:bg-[#f5f5f7]"
      >
        <Download className="h-4 w-4" />
        {isAr ? "تحميل" : "Download"}
      </button>
    </div>
  );
}
