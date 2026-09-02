"use client";

import {
 supabase,
 isSupabaseConfigured,
 read,
 write,
 uid,
 LS_TICKETS,
 LS_TICKET_MSGS,
 LS_PREFIX,
} from "./helpers";
import { createAdminNotification } from "./notifications";
import type { SupportTicket, TicketMessage } from "@/lib/supabase/types";

/** Staff-inbox row: support_tickets + the client profile embed. */
export type StaffTicket = SupportTicket & {
  profiles?: { full_name: string | null; email: string | null } | null;
};

/** /api/support/tickets JSON envelope (both list and action responses). */
type TicketsRouteEnvelope = {
  ok?: boolean;
  error?: string;
  message?: string;
  ticket?: SupportTicket;
  tickets?: StaffTicket[];
  messages?: TicketMessage[];
};

export async function listTickets(clientId: string) {
 if (isSupabaseConfigured && supabase) {
 const { data } = await supabase
 .from("support_tickets")
 .select("*")
 .eq("client_id", clientId)
 .order("created_at", { ascending: false });
 return data ?? [];
 }
 return read<SupportTicket[]>(LS_TICKETS, []).filter((p) => p.client_id === clientId);
}

export async function createTicket(clientId: string, subject: string, body: string) {
 if (isSupabaseConfigured && supabase) {
 // PHASE 68 — priority support (owner-approved): creation now goes through
 // /api/support/tickets (server) so the priority decision is made
 // SERVER-SIDE from the caller's ACTIVE coaching subscription
 // (coaching → 'high', else 'normal') and cannot be client-forged.
 try {
 const res = await fetch("/api/support/tickets", {
 method: "POST",
 headers: { "Content-Type": "application/json" },
 body: JSON.stringify({ subject, body }),
 });
 const json = (await res.json().catch(() => null)) as TicketsRouteEnvelope | null;
 if (res.ok && json?.ok) return json.ticket;
 console.error("[tickets] create route failed:", res.status, json?.error ?? json?.message);
 } catch (e) {
 console.error("[tickets] create route unreachable:", e instanceof Error ? e.message : e);
 }
 // Legacy fallback — direct client insert (RLS: own rows), normal priority.
 const { data: ticket, error } = await supabase
 .from("support_tickets")
 .insert({ client_id: clientId, subject, status: "open", priority: "normal" })
 .select()
 .single();
 if (error) throw new Error(error.message);
 await supabase.from("ticket_messages").insert({ ticket_id: ticket.id, sender_id: clientId, body });
 // Notify the ASSIGNED coach (multi-coach routing via clientId)
 await createAdminNotification("new_ticket", "تذكرة دعم جديدة ", `موضوع: ${subject}`, "coach-support", clientId).catch(() => {});
 return ticket;
 }
 const all = read<SupportTicket[]>(LS_TICKETS, []);
 const ticket: SupportTicket = { id: uid(), client_id: clientId, subject, status: "open", priority: "normal", created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
 all.push(ticket);
 write(LS_TICKETS, all);
 const msgs = read<TicketMessage[]>(LS_TICKET_MSGS, []);
 msgs.push({ id: uid(), ticket_id: ticket.id, sender_id: clientId, body, created_at: new Date().toISOString() });
 write(LS_TICKET_MSGS, msgs);
 return ticket;
}

export async function listTicketMessages(ticketId: string) {
 if (isSupabaseConfigured && supabase) {
 const { data } = await supabase
 .from("ticket_messages")
 .select("*")
 .eq("ticket_id", ticketId)
 .order("created_at", { ascending: true });
 return data ?? [];
 }
 return read<TicketMessage[]>(LS_TICKET_MSGS, []).filter((m) => m.ticket_id === ticketId);
}

export async function addTicketMessage(ticketId: string, senderId: string, body: string) {
 if (isSupabaseConfigured && supabase) {
 const { data, error } = await supabase
 .from("ticket_messages")
 .insert({ ticket_id: ticketId, sender_id: senderId, body })
 .select()
 .single();
 if (error) throw new Error(error.message);
 // M19 fix: update ticket's updated_at + auto-set status to 'pending'
 // when coach replies (so the client knows there's a new message).
 await supabase
 .from("support_tickets")
 .update({ updated_at: new Date().toISOString(), status: "pending" })
 .eq("id", ticketId);
 return data;
 }
 const all = read<TicketMessage[]>(LS_TICKET_MSGS, []);
 const row = { id: uid(), ticket_id: ticketId, sender_id: senderId, body, created_at: new Date().toISOString() };
 all.push(row);
 write(LS_TICKET_MSGS, all);
 return row;
}

/**
 * M19 fix: update a support ticket's status (open/pending/closed).
 * Used by the coach to close or reopen tickets.
 */
export async function updateTicketStatus(ticketId: string, status: "open" | "pending" | "closed") {
 if (isSupabaseConfigured && supabase) {
 const { data, error } = await supabase
 .from("support_tickets")
 .update({ status, updated_at: new Date().toISOString() })
 .eq("id", ticketId)
 .select()
 .single();
 if (error) throw new Error(error.message);
 return data;
 }
 const all = read<SupportTicket[]>(LS_PREFIX + "tickets", []);
 const idx = all.findIndex((t) => t.id === ticketId);
 if (idx >= 0) {
 all[idx].status = status;
 all[idx].updated_at = new Date().toISOString();
 write(LS_PREFIX + "tickets", all);
 return all[idx];
 }
 return null;
}

/**
 * All Tickets (for the STAFF support inbox: admin + coaches).
 *
 * Phase 55 fix: this used to query support_tickets straight from the
 * browser (RLS + a named-FK embed). Any failure there returned [] with
 * NO error — the owner saw notifications arrive while the inbox stayed
 * empty. Now the staff inbox reads through /api/support/tickets
 * (service-side, admin → all tickets, coach → his assigned clients).
 * The old direct query stays only as a fallback if the route is down,
 * and total failure now THROWS so the UI can show it instead of a
 * silent "no tickets".
 */
export async function listAllTickets() {
 if (isSupabaseConfigured && supabase) {
 try {
 const res = await fetch("/api/support/tickets");
 const json = (await res.json().catch(() => null)) as TicketsRouteEnvelope | null;
 if (res.ok && json) return json.tickets ?? [];
 console.error("[tickets] staff list route failed:", res.status, json?.error);
 } catch (e) {
 console.error("[tickets] staff list route unreachable:", e instanceof Error ? e.message : e);
 }
 // Legacy fallback — RLS-scoped direct read (assigned coach / admin).
 const { data, error } = await supabase!
 .from("support_tickets")
 .select("*, profiles!support_tickets_client_id_fkey(full_name, email)")
 .order("created_at", { ascending: false });
 if (error) throw new Error(error.message);
 return data ?? [];
 }
 return read<SupportTicket[]>(LS_TICKETS, []);
}

// ---------------------------------------------------------------------------
// Staff ticket actions (Phase 55) — replies/status changes from the ADMIN or
// a COACH run through /api/support/tickets (service-side). The client-side
// insert/update above works for the CLIENT (RLS: own rows), but staff rows
// depended on RLS helper functions in the live DB; when those are missing
// the action failed silently. The route never depends on them.
// ---------------------------------------------------------------------------

export async function listTicketMessagesStaff(ticketId: string) {
 const res = await fetch(`/api/support/tickets?ticketId=${encodeURIComponent(ticketId)}`);
 const json = (await res.json().catch(() => null)) as TicketsRouteEnvelope | null;
 if (!res.ok || !json) throw new Error(json?.message || `HTTP ${res.status}`);
 return json.messages ?? [];
}

export async function addTicketMessageStaff(ticketId: string, body: string) {
 const res = await fetch("/api/support/tickets", {
 method: "POST",
 headers: { "Content-Type": "application/json" },
 body: JSON.stringify({ ticketId, body }),
 });
 const json = (await res.json().catch(() => null)) as TicketsRouteEnvelope | null;
 if (!res.ok || !json?.ok) throw new Error(json?.message || `HTTP ${res.status}`);
 return json;
}

export async function updateTicketStatusStaff(ticketId: string, status: "open" | "pending" | "closed") {
 const res = await fetch("/api/support/tickets", {
 method: "POST",
 headers: { "Content-Type": "application/json" },
 body: JSON.stringify({ ticketId, status }),
 });
 const json = (await res.json().catch(() => null)) as TicketsRouteEnvelope | null;
 if (!res.ok || !json?.ok) throw new Error(json?.message || `HTTP ${res.status}`);
 return json;
}
