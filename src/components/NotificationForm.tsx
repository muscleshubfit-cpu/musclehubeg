"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  NOTIFICATION_TEMPLATES,
  NOTIFICATION_LINKS,
  type NotificationTemplate,
} from "@/lib/notification-templates";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type SendMode =
  | { kind: "single"; userId: string }
  | { kind: "selected"; userIds: string[] }
  | { kind: "all"; totalCount: number };

interface NotificationFormProps {
  /** "ar" | "en" */
  lang: string;
  /** Who receives the notification */
  sendMode: SendMode;
  /** Called after a successful send */
  onSent?: () => void;
  /** Optional extra class on the wrapper */
  className?: string;
  /** Show close button (for panel / popover style) */
  showClose?: boolean;
  /** Close callback */
  onClose?: () => void;
  /** Whether the form is visible (for animation) */
  visible?: boolean;
  /** Clients for the single-client dropdown (only when sendMode.kind === "single") */
  clients?: Array<{ id: string; full_name: string | null; email: string | null }>;
  /** Currently selected single-client id (controlled) */
  selectedSingleId?: string;
  /** Callback when single-client changes */
  onSelectedSingleIdChange?: (id: string) => void;
  /** Selected client ids for multi-select (controlled) */
  selectedClientIds?: Set<string>;
  /** Callback when multi-selection changes */
  onSelectedClientIdsChange?: (ids: Set<string>) => void;
  /** Select all visible clients callback */
  onSelectAll?: () => void;
  /** Clear selection callback */
  onClearSelection?: () => void;
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function NotificationForm({
  lang,
  sendMode,
  onSent,
  className,
  showClose,
  onClose,
  visible = true,
  clients,
  selectedSingleId,
  onSelectedSingleIdChange,
  selectedClientIds,
  onSelectedClientIdsChange,
  onSelectAll,
  onClearSelection,
}: NotificationFormProps) {
  const isAr = lang === "ar";

  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [link, setLink] = useState("/dashboard");
  const [activeTemplate, setActiveTemplate] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  /* ------ template handler ------ */
  const applyTemplate = (tpl: NotificationTemplate) => {
    if (activeTemplate === tpl.id) {
      setActiveTemplate(null);
      setTitle("");
      setBody("");
      setLink("/dashboard");
    } else {
      setActiveTemplate(tpl.id);
      setTitle(isAr ? tpl.titleAr : tpl.titleEn);
      setBody(isAr ? tpl.bodyAr : tpl.bodyEn);
      setLink(tpl.link);
    }
  };

  /* ------ send handler ------ */
  const handleSend = async () => {
    if (!title.trim() || !body.trim()) return;
    setSending(true);
    try {
      const payload: Record<string, unknown> = {
        target: sendMode.kind,
        title: title.trim(),
        body: body.trim(),
        link,
      };

      if (sendMode.kind === "single") {
        payload.userId = sendMode.userId;
      } else if (sendMode.kind === "selected") {
        payload.userIds = Array.from(sendMode.userIds);
      }

      const res = await fetch("/api/notifications/broadcast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (res.ok) {
        const sentCount = data.sent ?? 0;
        const msg =
          sendMode.kind === "single"
            ? isAr
              ? "تم إرسال الإشعار ✅"
              : "Notification sent ✅"
            : isAr
              ? `تم إرسال الإشعار إلى ${sentCount} عميل ✅`
              : `Notification sent to ${sentCount} client(s) ✅`;
        toast.success(msg);

        // Reset form
        setTitle("");
        setBody("");
        setActiveTemplate(null);
        setLink("/dashboard");
        onSent?.();
      } else {
        toast.error(data.error || "Failed");
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Unknown error";
      toast.error(msg);
    } finally {
      setSending(false);
    }
  };

  /* ------ derived state ------ */
  const canSend =
    !sending &&
    title.trim() &&
    body.trim() &&
    (sendMode.kind === "all" ||
      (sendMode.kind === "single" && sendMode.userId) ||
      (sendMode.kind === "selected" && sendMode.userIds.length > 0));

  if (!visible) return null;

  /* ------ render ------ */
  return (
    <div className={cn("space-y-5", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">
          {isAr ? "إرسال إشعار" : "Send notification"}
        </h3>
        {showClose && onClose && (
          <button
            onClick={onClose}
            className="text-sm text-[#6e6e73] hover:text-[#1d1d1f]"
          >
            ✕
          </button>
        )}
      </div>

      {/* Target selector — only for broadcast (not single per-client) */}
      {sendMode.kind !== "single" && (
        <div>
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-[#6e6e73]">
            {isAr ? "المرسل إليه" : "Recipients"}
          </p>
          <div className="flex flex-wrap gap-2">
            {sendMode.kind === "all" && (
              <span className="rounded-full bg-[#1d1d1f] px-4 py-2 text-xs font-medium text-white">
                {isAr ? "جميع العملاء" : "All clients"}
                <span className="ms-1 opacity-60">
                  ({sendMode.totalCount})
                </span>
              </span>
            )}
            {sendMode.kind === "selected" && (
              <>
                <span className="rounded-full bg-[#1d1d1f] px-4 py-2 text-xs font-medium text-white">
                  {isAr ? "عملاء محددون" : "Selected clients"}
                  <span className="ms-1 opacity-60">
                    ({sendMode.userIds.length})
                  </span>
                </span>
                {onSelectAll && (
                  <button
                    onClick={onSelectAll}
                    className="rounded-full border border-[#d2d2d7] bg-white px-4 py-2 text-xs font-medium text-[#6e6e73] hover:bg-[#f5f5f7]"
                  >
                    {isAr ? "تحديد الكل" : "Select all"}
                  </button>
                )}
                {onClearSelection && (
                  <button
                    onClick={onClearSelection}
                    className="rounded-full border border-[#d2d2d7] bg-white px-4 py-2 text-xs font-medium text-[#6e6e73] hover:bg-[#f5f5f7]"
                  >
                    {isAr ? "إلغاء التحديد" : "Clear"}
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* Single-client dropdown (only when clients list is provided) */}
      {sendMode.kind === "single" && clients && clients.length > 0 && (
        <div>
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-[#6e6e73]">
            {isAr ? "العميل" : "Client"}
          </p>
          <div className="rounded-xl border border-[#d2d2d7] bg-white/80 px-4 py-2.5 text-sm text-[#1d1d1f]">
            {clients[0]?.full_name || clients[0]?.email || sendMode.userId}
          </div>
        </div>
      )}

      {/* Quick templates */}
      <div>
        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-[#6e6e73]">
          {isAr ? "قوالب جاهزة" : "Quick templates"}
        </p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {NOTIFICATION_TEMPLATES.map((tpl) => (
            <button
              key={tpl.id}
              onClick={() => applyTemplate(tpl)}
              className={cn(
                "rounded-xl border px-3 py-2.5 text-start text-xs transition-all",
                activeTemplate === tpl.id
                  ? "border-[#0071e3] bg-[#0071e3]/5"
                  : "border-[#d2d2d7] bg-white hover:bg-white/80",
              )}
            >
              <span className="text-base">{tpl.icon}</span>
              <span className="mt-0.5 block font-medium">
                {isAr ? tpl.titleAr : tpl.titleEn}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Custom message */}
      <div className={activeTemplate ? "opacity-60" : ""}>
        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-[#6e6e73]">
          {isAr ? "رسالة مخصصة" : "Custom message"}
          {activeTemplate &&
            ` (${isAr ? "عدّل القالب أو اختر آخر" : "edit template or pick another"})`}
        </p>
        <input
          value={title}
          onChange={(e) => {
            setTitle(e.target.value);
            setActiveTemplate(null);
          }}
          placeholder={isAr ? "عنوان الإشعار" : "Notification title"}
          className="w-full rounded-xl border border-[#d2d2d7] bg-white px-4 py-2.5 text-sm outline-none focus:border-[#0071e3]"
        />
        <textarea
          value={body}
          onChange={(e) => {
            setBody(e.target.value);
            setActiveTemplate(null);
          }}
          placeholder={isAr ? "نص الإشعار" : "Notification body"}
          rows={3}
          className="mt-2 w-full rounded-xl border border-[#d2d2d7] bg-white px-4 py-2.5 text-sm outline-none focus:border-[#0071e3]"
        />
      </div>

      {/* Link selector */}
      <div>
        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-[#6e6e73]">
          {isAr ? "رابط الإشعار" : "Notification link"}
        </p>
        <select
          value={link}
          onChange={(e) => setLink(e.target.value)}
          className="w-full rounded-xl border border-[#d2d2d7] bg-white px-4 py-2.5 text-sm outline-none focus:border-[#0071e3]"
        >
          {NOTIFICATION_LINKS.map((l) => (
            <option key={l.value} value={l.value}>
              {isAr ? l.labelAr : l.labelEn}
            </option>
          ))}
        </select>
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <button
          onClick={handleSend}
          disabled={!canSend}
          className="rounded-full bg-[#0071e3] px-5 py-2.5 text-sm font-normal text-white transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {sending
            ? "..."
            : sendMode.kind === "all"
              ? isAr
                ? `إرسال للجميع (${sendMode.totalCount})`
                : `Send to all (${sendMode.totalCount})`
              : sendMode.kind === "selected"
                ? isAr
                  ? `إرسال لـ ${sendMode.userIds.length} عميل`
                  : `Send to ${sendMode.userIds.length} client(s)`
                : isAr
                  ? "إرسال الإشعار"
                  : "Send notification"}
        </button>
        {showClose && onClose && (
          <button
            onClick={onClose}
            className="rounded-full border border-[#d2d2d7] bg-white px-5 py-2.5 text-sm font-normal text-[#6e6e73] transition-colors hover:bg-[#f5f5f7]"
          >
            {isAr ? "إلغاء" : "Cancel"}
          </button>
        )}
      </div>
    </div>
  );
}
