"use client";

import { useEffect, useState } from "react";
import { Inbox, MessageSquare } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { listAllTickets, listTicketMessages, addTicketMessage } from "@/lib/data";
import { toast } from "sonner";

export function CoachSupportView() {
  const { t } = useI18n();
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

  if (loading) return <div className="text-muted-foreground">{t("common.loading")}</div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold md:text-3xl">{t("nav.support.coach")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("coach.support.subtitle")}</p>
      </div>

      <div className="grid gap-4 md:grid-cols-[340px_1fr]">
        {/* List */}
        <div className={cn("space-y-2", active && "hidden md:block")}>
          {tickets.length === 0 ? (
            <Card className="border-dashed p-8 text-center text-sm text-muted-foreground">
              <Inbox className="mx-auto mb-2 h-8 w-8 text-muted-foreground/50" />
              {t("support.noTickets")}
            </Card>
          ) : (
            tickets.map((tk) => (
              <button
                key={tk.id}
                onClick={() => setActive(tk)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-2xl border p-3 text-start transition-colors",
                  active?.id === tk.id ? "border-primary/50 bg-primary/5" : "border-border bg-card hover:border-primary/30",
                )}
              >
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-primary/10">
                  <MessageSquare className="h-4 w-4 text-primary" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">
                    {tk.profiles?.full_name || tk.client_id.slice(0, 8)}
                  </span>
                  <span className="block truncate text-xs text-muted-foreground">{tk.subject}</span>
                </span>
                <StatusBadge status={tk.status} t={t} />
              </button>
            ))
          )}
        </div>

        {/* Detail */}
        <div className={cn("rounded-2xl border border-border bg-card", !active && "hidden md:block")}>
          {active ? (
            <TicketDetail ticket={active} onClose={() => setActive(null)} onReplied={load} />
          ) : (
            <div className="grid h-[60vh] place-items-center text-sm text-muted-foreground">
              {t("support.noTickets")}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status, t }: { status: string; t: (k: string) => string }) {
  const cls = cn(
    "border",
    status === "open" && "border-success text-success",
    status === "pending" && "border-warning text-warning",
    status === "closed" && "border-muted-foreground text-muted-foreground",
  );
  const label = status === "open" ? t("support.open") : status === "pending" ? t("support.pending") : t("support.closed");
  return <Badge variant="outline" className={cls}>{label}</Badge>;
}

function TicketDetail({ ticket, onClose, onReplied }: { ticket: any; onClose: () => void; onReplied: () => void }) {
  const { t } = useI18n();
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    (async () => {
      const data = await listTicketMessages(ticket.id);
      setMessages(data);
    })();
  }, [ticket.id]);

  const send = async () => {
    if (!input.trim()) return;
    setSending(true);
    const optimistic = { id: "tmp-" + Date.now(), ticket_id: ticket.id, sender_id: "coach", body: input.trim(), created_at: new Date().toISOString() };
    setMessages((prev) => [...prev, optimistic]);
    const text = input.trim();
    setInput("");
    try {
      // The coach is the sender — we need the coach's user ID
      // For now, use "coach" as a placeholder; in production, get from auth context
      await addTicketMessage(ticket.id, ticket.client_id, text); // client_id used as proxy for coach reply
      onReplied();
    } catch (e: any) {
      toast.error(e.message || t("common.error"));
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex h-[60vh] flex-col">
      <div className="flex items-center gap-2 border-b border-border p-3">
        <Button variant="ghost" size="sm" className="md:hidden" onClick={onClose}>←</Button>
        <span className="truncate text-sm font-semibold">{ticket.subject}</span>
        <StatusBadge status={ticket.status} t={t} />
      </div>
      <div className="flex-1 space-y-2 overflow-y-auto scrollbar-thin p-3">
        {messages.map((m) => {
          const mine = m.sender_id !== ticket.client_id;
          return (
            <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${
                  mine ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"
                }`}
              >
                {m.body}
              </div>
            </div>
          );
        })}
      </div>
      <div className="flex gap-2 border-t border-border p-3">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          placeholder={t("support.reply")}
          className="flex-1 rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary/50"
          disabled={sending}
        />
        <Button onClick={send} disabled={sending || !input.trim()} className="gap-2">
          {t("support.send")}
        </Button>
      </div>
    </div>
  );
}
