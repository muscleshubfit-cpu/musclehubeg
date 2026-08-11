"use client";

import { useEffect, useState } from "react";
import { Plus, Send, MessageSquare } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/hooks/use-auth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
 Dialog,
 DialogContent,
 DialogHeader,
 DialogTitle,
 DialogFooter,
} from "@/components/ui/dialog";
import {
 listTickets,
 createTicket,
 listTicketMessages,
 addTicketMessage,
} from "@/lib/data";
import { toast } from "sonner";

export function SupportView() {
 const { t } = useI18n();
 const { profile } = useAuth();
 const [tickets, setTickets] = useState<any[]>([]);
 const [loading, setLoading] = useState(true);
 const [open, setOpen] = useState(false);
 const [subject, setSubject] = useState("");
 const [message, setMessage] = useState("");
 const [saving, setSaving] = useState(false);
 const [activeTicket, setActiveTicket] = useState<any | null>(null);

 const load = async () => {
 if (!profile) return;
 setLoading(true);
 const data = await listTickets(profile.id);
 setTickets(data);
 setLoading(false);
 };

 useEffect(() => {
 load();
 }, [profile]);

 const create = async () => {
 if (!profile || !subject.trim() || !message.trim()) return;
 setSaving(true);
 try {
 await createTicket(profile.id, subject.trim(), message.trim());
 setSubject("");
 setMessage("");
 setOpen(false);
 await load();
 toast.success(t("support.created"));
 } catch (e: any) {
 toast.error(e.message || t("common.error"));
 } finally {
 setSaving(false);
 }
 };

 if (loading) return <div className="text-muted-foreground">{t("common.loading")}</div>;

 return (
 <div className="space-y-6">
 <div className="flex flex-wrap items-center justify-between gap-3">
 <div>
 <h1 className="text-2xl font-bold md:text-3xl">{t("support.title")}</h1>
 <p className="mt-1 text-sm text-muted-foreground">{t("support.subtitle")}</p>
 </div>
 <Button className="gap-2" onClick={() => setOpen(true)}>
 <Plus className="h-4 w-4" />
 {t("support.newTicket")}
 </Button>
 </div>

 {tickets.length === 0 ? (
 <Card className="border-dashed p-8 text-center text-sm text-muted-foreground">
 <MessageSquare className="mx-auto mb-2 h-8 w-8 text-muted-foreground/50" />
 {t("support.noTickets")}
 </Card>
 ) : (
 <div className="space-y-3">
 {tickets.map((tk) => (
 <Card
 key={tk.id}
 className="cursor-pointer p-5 shadow-card transition-all hover:shadow-glow"
 onClick={() => setActiveTicket(tk)}
 >
 <div className="flex items-center justify-between gap-3">
 <div className="min-w-0">
 <h3 className="truncate font-semibold">{tk.subject}</h3>
 <p className="mt-1 text-xs text-muted-foreground">
 {new Date(tk.created_at).toLocaleString()}
 </p>
 </div>
 <StatusBadge status={tk.status} t={t} />
 </div>
 </Card>
 ))}
 </div>
 )}

 <Dialog open={open} onOpenChange={setOpen}>
 <DialogContent>
 <DialogHeader>
 <DialogTitle>{t("support.newTicket")}</DialogTitle>
 </DialogHeader>
 <div className="space-y-3">
 <div>
 <Label htmlFor="subject">{t("support.subject")}</Label>
 <Input
 id="subject"
 value={subject}
 onChange={(e) => setSubject(e.target.value)}
 className="mt-1.5"
 />
 </div>
 <div>
 <Label htmlFor="message">{t("support.message")}</Label>
 <Textarea
 id="message"
 value={message}
 onChange={(e) => setMessage(e.target.value)}
 className="mt-1.5 min-h-32"
 />
 </div>
 </div>
 <DialogFooter>
 <Button variant="secondary" onClick={() => setOpen(false)}>{t("common.cancel")}</Button>
 <Button onClick={create} disabled={saving || !subject.trim() || !message.trim()}>
 {saving ? t("common.saving") : t("support.create")}
 </Button>
 </DialogFooter>
 </DialogContent>
 </Dialog>

 {activeTicket && (
 <TicketDetail
 ticket={activeTicket}
 onClose={() => setActiveTicket(null)}
 />
 )}
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
 const label =
 status === "open" ? t("support.open") : status === "pending" ? t("support.pending") : t("support.closed");
 return <Badge variant="outline" className={cls}>{label}</Badge>;
}

function TicketDetail({ ticket, onClose }: { ticket: any; onClose: () => void }) {
 const { t } = useI18n();
 const { profile } = useAuth();
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
 if (!input.trim() || !profile) return;
 setSending(true);
 const optimistic = { id: "tmp-" + Date.now(), ticket_id: ticket.id, sender_id: profile.id, body: input.trim(), created_at: new Date().toISOString() };
 setMessages((prev) => [...prev, optimistic]);
 const text = input.trim();
 setInput("");
 try {
 await addTicketMessage(ticket.id, profile.id, text);
 } finally {
 setSending(false);
 }
 };

 return (
 <Dialog open onOpenChange={(o) => !o && onClose()}>
 <DialogContent className="max-h-[80vh] max-w-xl">
 <DialogHeader>
 <DialogTitle className="flex items-center justify-between gap-2">
 <span className="truncate">{ticket.subject}</span>
 <StatusBadge status={ticket.status} t={t} />
 </DialogTitle>
 </DialogHeader>
 <div className="flex h-64 flex-col">
 <div className="flex-1 space-y-2 overflow-y-auto scrollbar-thin p-1">
 {messages.map((m) => {
 const mine = m.sender_id === profile?.id;
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
 <div className="mt-3 flex gap-2 border-t border-border pt-3">
 <Input
 value={input}
 onChange={(e) => setInput(e.target.value)}
 onKeyDown={(e) => e.key === "Enter" && send()}
 placeholder={t("support.reply")}
 disabled={sending}
 />
 <Button onClick={send} disabled={sending || !input.trim()} className="gap-2">
 <Send className="h-4 w-4" />
 </Button>
 </div>
 </div>
 </DialogContent>
 </Dialog>
 );
}
