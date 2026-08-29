"use client";

import { useCallback, useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

/**
 * «دعم المدربين» — COACH → SITE SUPPORT VIEW (0037).
 *
 * Owner directive: the site's support team serves COACHES on platform
 * matters (wallet, activation, ads, the public page) — support for HIS
 * clients stays with the coach himself («دعم العملاء خاص بالمدرب»).
 * This page is a dedicated channel separate from the site's regular
 * client support: the coach opens a thread, the team replies in-app.
 */

type Msg = { id: string; sender_role: string; body: string; created_at: string };
type Thread = {
  id: string;
  subject: string;
  body: string;
  status: string;
  created_at: string;
  messages: Msg[];
};

export function CoachHelpView() {
  const { lang } = useI18n();
  const isAr = lang === "ar";
  const [threads, setThreads] = useState<Thread[]>([]);
  const [loading, setLoading] = useState(true);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/coach/support");
      const json = await res.json().catch(() => null);
      if (res.ok && json) {
        setThreads((json.threads ?? []) as Thread[]);
        if (json.migration_missing) {
          toast.info(isAr ? "شغّل هجرة 0037 لتشغيل قناة الدعم" : "Run migration 0037 to enable support");
        }
      } else {
        toast.error(json?.message || (isAr ? "تعذر تحميل الرسائل" : "Failed to load messages"));
      }
    } finally {
      setLoading(false);
    }
  }, [isAr]);

  useEffect(() => {
    void load();
    const interval = setInterval(load, 30000); // poll for admin replies
    return () => clearInterval(interval);
  }, [load]);

  const send = async () => {
    if (!subject.trim() || !body.trim()) {
      toast.error(isAr ? "اكتب الموضوع ونص الرسالة" : "Write a subject and a message");
      return;
    }
    setSending(true);
    try {
      const res = await fetch("/api/coach/support", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject: subject.trim(), body: body.trim() }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) {
        toast.error(json?.message || (isAr ? "فشل الإرسال" : "Send failed"));
        return;
      }
      toast.success(isAr ? "وصلت رسالتك لفريق دعم المدربين" : "Your message reached the coach support team");
      setSubject("");
      setBody("");
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

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">
          {isAr ? "دعم المدربين" : "Coach Support"}
        </h1>
        <p className="mt-2 text-base font-normal text-[#6e6e73] md:text-lg">
          {isAr
            ? "قناة مخصصة للمدربين — لكل ما يخص المنصة: المحفظة، التفعيل، الإعلانات، صفحتك العامة."
            : "A dedicated channel for coaches — anything platform-related: wallet, activation, ads, your public page."}
        </p>
      </div>

      {/* Scope note — owner law: client support belongs to the coach */}
      <div className="rounded-2xl bg-[#f5f5f7] p-6">
        <p className="text-sm font-medium">{isAr ? "مين بيساعد مين؟" : "Who helps whom?"}</p>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          <div className="rounded-xl bg-white p-4">
            <p className="text-sm font-semibold text-[#0071e3]">
              {isAr ? "فريق الموقع يساعدك أنت (المدرب)" : "The site team helps YOU (the coach)"}
            </p>
            <p className="mt-1 text-xs font-normal leading-relaxed text-[#6e6e73]">
              {isAr
                ? "مشاكل المحفظة والتفعيل والإعلانات وصفحتك العامة ولوحة التحكم — كل ده عندنا هنا."
                : "Wallet, activation, ads, your public page, dashboard issues — all handled here."}
            </p>
          </div>
          <div className="rounded-xl bg-white p-4">
            <p className="text-sm font-semibold">
              {isAr ? "وأنت بتساعد عملاءك" : "YOU support your own clients"}
            </p>
            <p className="mt-1 text-xs font-normal leading-relaxed text-[#6e6e73]">
              {isAr
                ? "دعم عملائك مسؤوليتك أنت (تابعهم من «دعم العملاء») — المسؤولية الكاملة على كل مدرب تجاه عملائه."
                : "Your clients' support is your responsibility (use Client Support) — each coach is fully responsible for his own clients."}
            </p>
          </div>
        </div>
      </div>

      {/* New message */}
      <div className="rounded-3xl bg-[#f5f5f7] p-6 md:p-8">
        <h2 className="text-lg font-semibold tracking-tight">
          {isAr ? "ابعت رسالة لفريق دعم المدربين" : "Message the coach support team"}
        </h2>
        <div className="mt-4 space-y-3">
          <input
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            maxLength={140}
            placeholder={isAr ? "الموضوع — مثال: مشكلة في شحن المحفظة" : "Subject — e.g. wallet top-up issue"}
            className="w-full rounded-xl border border-[#d2d2d7] bg-white px-4 py-2.5 text-sm outline-none focus:border-[#0071e3]"
          />
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={5}
            maxLength={4000}
            placeholder={isAr ? "اشرح المشكلة بالتفصيل — وهنرد عليك هنا في نفس الصفحة." : "Describe the issue in detail — we'll reply right here."}
            className="w-full rounded-xl border border-[#d2d2d7] bg-white px-4 py-2.5 text-sm outline-none focus:border-[#0071e3]"
          />
          <button
            onClick={send}
            disabled={sending}
            className="rounded-full bg-[#0071e3] px-6 py-2.5 text-sm font-normal text-white transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {sending ? (isAr ? "جارٍ الإرسال…" : "Sending…") : isAr ? "إرسال" : "Send"}
          </button>
        </div>
      </div>

      {/* Threads */}
      {loading ? (
        <div className="py-10 text-center text-base font-normal text-[#6e6e73]">
          {isAr ? "جارٍ التحميل…" : "Loading…"}
        </div>
      ) : threads.length === 0 ? (
        <div className="rounded-2xl bg-[#f5f5f7] p-12 text-center text-base font-normal text-[#6e6e73]">
          {isAr ? "لا توجد رسايل بعد" : "No messages yet"}
        </div>
      ) : (
        <div className="space-y-4">
          {threads.map((th) => (
            <div key={th.id} className="rounded-3xl border border-[#d2d2d7] p-6">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-semibold">{th.subject}</p>
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
                  <p className="mt-2 text-xs text-[#6e6e73]">{fmt(th.created_at)}</p>
                </div>
                {th.messages.map((m) => (
                  <div
                    key={m.id}
                    className={cn(
                      "rounded-2xl p-4",
                      m.sender_role === "admin" ? "bg-[#0071e3]/5 border border-[#0071e3]/20" : "bg-[#f5f5f7]",
                    )}
                  >
                    {m.sender_role === "admin" && (
                      <p className="mb-1 text-xs font-semibold text-[#0071e3]">
                        {isAr ? "فريق دعم المدربين" : "Coach Support Team"}
                      </p>
                    )}
                    <p className="whitespace-pre-wrap text-sm font-normal leading-relaxed">{m.body}</p>
                    <p className="mt-2 text-xs text-[#6e6e73]">{fmt(m.created_at)}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
