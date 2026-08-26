"use client";

import { useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { listAllTickets, listTicketMessages, addTicketMessage, updateTicketStatus } from "@/lib/data";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";

export function CoachSupportView() {
  const { t } = useI18n();
  const { profile } = useAuth();
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState<any | null>(null);

  const load = async () => {
    setLoading(true);
    const data = await listAllTickets();
    setTickets(data);
    setLoading(false);
  };

  useEffect(() => {
    load();
    const interval = setInterval(load, 20000);
    return () => clearInterval(interval);
  }, []);

  if (loading)
    return (
      <div className="py-20 text-center text-base font-normal text-[#6e6e73]">
        {t("common.loading")}
      </div>
    );

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">{t("nav.support.coach")}</h1>
        <p className="mt-2 text-base font-normal text-[#6e6e73] md:text-lg">{t("coach.support.subtitle")}</p>
      </div>

      <div className="grid gap-4 md:grid-cols-[340px_1fr]">
        {/* List */}
        <div className={cn("space-y-2", active && "hidden md:block")}>
          {tickets.length === 0 ? (
            <div className="rounded-2xl bg-[#f5f5f7] p-12 text-center text-base font-normal text-[#6e6e73]">
              {t("support.noTickets")}
            </div>
          ) : (
            tickets.map((tk) => (
              <button
                key={tk.id}
                onClick={() => setActive(tk)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-2xl p-4 text-start transition-colors",
                  active?.id === tk.id ? "bg-[#0071e3]/10" : "bg-[#f5f5f7] hover:bg-[#ececf0]",
                )}
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">
                    {tk.profiles?.full_name || tk.client_id.slice(0, 8)}
                  </span>
                  <span className="block truncate text-xs font-normal text-[#6e6e73]">{tk.subject}</span>
                </span>
                <StatusPill status={tk.status} t={t} />
              </button>
            ))
          )}
        </div>

        {/* Detail */}
        <div className={cn("rounded-3xl bg-[#f5f5f7]", !active && "hidden md:block")}>
          {active ? (
            <TicketDetail ticket={active} onClose={() => setActive(null)} onReplied={load} coachId={profile?.id || ""} onStatusChange={load} />
          ) : (
            <div className="grid h-[60vh] place-items-center text-base font-normal text-[#6e6e73]">
              {t("support.noTickets")}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatusPill({ status, t }: { status: string; t: (k: string) => string }) {
  const cls = cn(
    status === "open" && "bg-[#0071e3]/10 text-[#0071e3]",
    status === "pending" && "bg-[#ff9500]/10 text-[#ff9500]",
    status === "closed" && "bg-[#f5f5f7] text-[#6e6e73]",
  );
  const label = status === "open" ? t("support.open") : status === "pending" ? t("support.pending") : t("support.closed");
  return (
    <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-normal ${cls}`}>
      {label}
    </span>
  );
}

function TicketDetail({ ticket, onClose, onReplied, coachId, onStatusChange }: { ticket: any; onClose: () => void; onReplied: () => void; coachId: string; onStatusChange: () => void }) {
  const { t } = useI18n();
  const isAr = useI18n().lang === "ar";
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [statusLoading, setStatusLoading] = useState(false);

  useEffect(() => {
    (async () => {
      const data = await listTicketMessages(ticket.id);
      setMessages(data);
    })();
    // M20 fix: poll for new messages every 10s while the ticket is open
    // so the coach sees client replies in real-time.
    const interval = setInterval(async () => {
      const data = await listTicketMessages(ticket.id);
      setMessages(data);
    }, 10000);
    return () => clearInterval(interval);
  }, [ticket.id]);

  const send = async () => {
    if (!input.trim()) return;
    setSending(true);
    const optimistic = { id: "tmp-" + Date.now(), ticket_id: ticket.id, sender_id: "coach", body: input.trim(), created_at: new Date().toISOString() };
    setMessages((prev) => [...prev, optimistic]);
    const text = input.trim();
    setInput("");
    try {
      // Use the coach's own profile.id as sender_id — not the client's ID.
      // RLS on ticket_messages requires sender_id = auth.uid() (C14 fix).
      await addTicketMessage(ticket.id, coachId, text);
      onReplied();
    } catch (e: any) {
      toast.error(e.message || t("common.error"));
    } finally {
      setSending(false);
    }
  };

  const toggleStatus = async () => {
    setStatusLoading(true);
    try {
      const newStatus = ticket.status === "closed" ? "open" : "closed";
      await updateTicketStatus(ticket.id, newStatus);
      toast.success(isAr ? (newStatus === "closed" ? "تم إغلاق التذكرة" : "تم إعادة فتح التذكرة") : (newStatus === "closed" ? "Ticket closed" : "Ticket reopened"));
      onStatusChange();
    } catch (e: any) {
      toast.error(e.message || t("common.error"));
    } finally {
      setStatusLoading(false);
    }
  };

  return (
    <div className="flex h-[60vh] flex-col">
      <div className="flex items-center gap-3 border-b border-[#d2d2d7] p-4">
        <button onClick={onClose} className="text-sm font-normal text-[#0071e3] md:hidden">
          ‹
        </button>
        <span className="truncate text-base font-medium">{ticket.subject}</span>
        <StatusPill status={ticket.status} t={t} />
        <button
          onClick={toggleStatus}
          disabled={statusLoading}
          className="ms-auto shrink-0 rounded-full px-3 py-1 text-xs font-medium text-[#0071e3] transition-colors hover:bg-[#0071e3]/10 disabled:opacity-50"
        >
          {statusLoading
            ? "..."
            : ticket.status === "closed"
              ? (isAr ? "إعادة فتح" : "Reopen")
              : (isAr ? "إغلاق" : "Close")}
        </button>
      </div>
      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        {messages.map((m) => {
          const mine = m.sender_id !== ticket.client_id;
          return (
            <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[80%] rounded-3xl px-5 py-3 text-sm font-normal ${
                  mine ? "bg-[#0071e3] text-white" : "bg-white text-[#1d1d1f]"
                }`}
              >
                {m.body}
              </div>
            </div>
          );
        })}
      </div>
      <div className="flex gap-2 border-t border-[#d2d2d7] bg-white p-4">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          placeholder={t("support.reply")}
          className="flex-1 rounded-full border border-[#d2d2d7] bg-[#f5f5f7] px-5 py-2.5 text-sm font-normal outline-none focus:border-[#0071e3]"
          disabled={sending}
        />
        <button
          onClick={send}
          disabled={sending || !input.trim()}
          className="rounded-full bg-[#0071e3] px-5 py-2.5 text-sm font-normal text-white transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {t("support.send")}
        </button>
      </div>
    </div>
  );
}

