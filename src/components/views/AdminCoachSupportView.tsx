"use client";

import { useCallback, useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

/**
 * ADMIN — coach support threads (0037). The owner reads coach messages
 * (wallet / activation / ads / platform issues) and replies in-app;
 * the coach is notified instantly. Complements /admin/wallets —
 * reachable at /admin/coach-support.
 */

type Msg = { id: string; sender_role: string; body: string; created_at: string };
type Thread = {
  id: string;
  coach_id: string;
  coach_name: string;
  coach_email: string;
  subject: string;
  body: string;
  status: string;
  priority?: string | null;
  created_at: string;
  messages: Msg[];
};

export function AdminCoachSupportView() {
  const { lang } = useI18n();
  const isAr = lang === "ar";
  const [threads, setThreads] = useState<Thread[]>([]);
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState<Thread | null>(null);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/coach-support");
      const json = await res.json().catch(() => null);
      if (res.ok && json) {
        setThreads((json.threads ?? []) as Thread[]);
      } else {
        toast.error(json?.message || (isAr ? "تعذر التحميل" : "Failed to load"));
      }
    } finally {
      setLoading(false);
    }
  }, [isAr]);

  useEffect(() => {
    void load();
    const interval = setInterval(load, 30000);
    return () => clearInterval(interval);
  }, [load]);

  const sendReply = async (close: boolean) => {
    if (!active) return;
    if (!reply.trim()) {
      toast.error(isAr ? "اكتب الرد الأول" : "Write a reply first");
      return;
    }
    setSending(true);
    try {
      const res = await fetch("/api/admin/coach-support", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ parent_id: active.id, body: reply.trim(), close }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) {
        toast.error(json?.message || (isAr ? "فشل الإرسال" : "Send failed"));
        return;
      }
      toast.success(isAr ? "تم إرسال الرد للمدرب" : "Reply sent to the coach");
      setReply("");
      setActive(null);
      await load();
    } finally {
      setSending(false);
    }
  };

  const fmt = (iso: string) =>
    new Date(iso).toLocaleString(isAr ? "ar-EG" : "en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

  if (loading) {
    return (
      <div className="py-20 text-center text-base font-normal text-[#6e6e73]">
        {isAr ? "جارٍ التحميل…" : "Loading…"}
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">
          {isAr ? "دعم المدربين" : "Coach Support"}
        </h1>
        <p className="mt-2 text-base font-normal text-[#6e6e73] md:text-lg">
          {isAr
            ? "رسايل المدربين عن المنصة (المحفظة / التفعيل / الإعلانات / صفحاتهم) — ردك بيوصلكم إشعار فوري للطرفين."
            : "Coach messages about the platform (wallet / activation / ads / their pages) — replies notify both sides instantly."}
        </p>
      </div>

      {threads.length === 0 ? (
        <div className="rounded-2xl bg-[#f5f5f7] p-12 text-center text-base font-normal text-[#6e6e73]">
          {isAr ? "لا توجد رسايل بعد" : "No messages yet"}
        </div>
      ) : (
        <div className="space-y-4">
          {threads.map((th) => (
            <div key={th.id} className="rounded-3xl border border-[#d2d2d7] p-6">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold">
                    {th.subject}
                    {/* PHASE 68 — priority support (coaching tier → high) */}
                    {th.priority === "high" && (
                      <span className="ms-2 rounded-full bg-[#ff3b30]/10 px-2 py-0.5 text-[10px] font-semibold text-[#ff3b30]">
                        {isAr ? "أولوية" : "PRIORITY"}
                      </span>
                    )}
                  </p>
                  <p className="text-xs font-normal text-[#6e6e73]">
                    {th.coach_name || th.coach_id.slice(0, 8)} {th.coach_email ? `· ${th.coach_email}` : ""} · {fmt(th.created_at)}
                  </p>
                </div>
                <span
                  className={cn(
                    "rounded-full px-3 py-1 text-xs font-medium",
                    th.status === "open" && "bg-[#0071e3]/10 text-[#0071e3]",
                    th.status === "answered" && "bg-[#34c759]/10 text-[#34c759]",
                    th.status === "closed" && "bg-[#f5f5f7] text-[#6e6e73]",
                  )}
                >
                  {th.status === "open"
                    ? isAr ? "مفتوحة" : "Open"
                    : th.status === "answered"
                      ? isAr ? "تم الرد" : "Answered"
                      : isAr ? "مغلقة" : "Closed"}
                </span>
              </div>

              <div className="mt-4 space-y-3">
                <div className="rounded-2xl bg-[#f5f5f7] p-4">
                  <p className="whitespace-pre-wrap text-sm font-normal leading-relaxed">{th.body}</p>
                </div>
                {th.messages.map((m) => (
                  <div
                    key={m.id}
                    className={cn(
                      "rounded-2xl p-4",
                      m.sender_role === "admin"
                        ? "bg-[#0071e3]/5 border border-[#0071e3]/20"
                        : "bg-[#f5f5f7]",
                    )}
                  >
                    {m.sender_role === "admin" && (
                      <p className="mb-1 text-xs font-semibold text-[#0071e3]">
                        {isAr ? "إدارة الموقع" : "Site team"}
                      </p>
                    )}
                    <p className="whitespace-pre-wrap text-sm font-normal leading-relaxed">{m.body}</p>
                    <p className="mt-2 text-xs text-[#6e6e73]">{fmt(m.created_at)}</p>
                  </div>
                ))}
              </div>

              {active?.id === th.id ? (
                <div className="mt-4 space-y-2">
                  <textarea
                    value={reply}
                    onChange={(e) => setReply(e.target.value)}
                    rows={4}
                    maxLength={4000}
                    placeholder={isAr ? "اكتب ردك للمدرب…" : "Write your reply to the coach…"}
                    className="w-full rounded-xl border border-[#d2d2d7] bg-white px-4 py-2.5 text-sm outline-none focus:border-[#0071e3]"
                  />
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => sendReply(false)}
                      disabled={sending}
                      className="rounded-full bg-[#0071e3] px-5 py-2.5 text-sm font-normal text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                    >
                      {sending ? "…" : isAr ? "إرسال الرد" : "Send reply"}
                    </button>
                    <button
                      onClick={() => sendReply(true)}
                      disabled={sending}
                      className="rounded-full border border-[#d2d2d7] bg-white px-5 py-2.5 text-sm font-normal transition-opacity hover:opacity-70 disabled:opacity-50"
                    >
                      {isAr ? "إرسال + إغلاق" : "Send + close"}
                    </button>
                    <button
                      onClick={() => { setActive(null); setReply(""); }}
                      className="rounded-full px-4 py-2.5 text-sm font-normal text-[#6e6e73] transition-colors hover:text-[#1d1d1f]"
                    >
                      {isAr ? "إلغاء" : "Cancel"}
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setActive(th)}
                  className="mt-4 rounded-full bg-[#1d1d1f] px-5 py-2.5 text-sm font-normal text-white transition-opacity hover:opacity-90"
                >
                  {isAr ? "رد على المدرب" : "Reply to coach"}
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
