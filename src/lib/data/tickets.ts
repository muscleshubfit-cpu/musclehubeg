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

export async function listTickets(clientId: string) {
 if (isSupabaseConfigured && supabase) {
 const { data } = await supabase
 .from("support_tickets")
 .select("*")
 .eq("client_id", clientId)
 .order("created_at", { ascending: false });
 return data ?? [];
 }
 return read<any[]>(LS_TICKETS, []).filter((p) => p.client_id === clientId);
}

export async function createTicket(clientId: string, subject: string, body: string) {
 if (isSupabaseConfigured && supabase) {
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
 const all = read<any[]>(LS_TICKETS, []);
 const ticket = { id: uid(), client_id: clientId, subject, status: "open", priority: "normal", created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
 all.push(ticket);
 write(LS_TICKETS, all);
 const msgs = read<any[]>(LS_TICKET_MSGS, []);
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
 return read<any[]>(LS_TICKET_MSGS, []).filter((m) => m.ticket_id === ticketId);
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
 const all = read<any[]>(LS_TICKET_MSGS, []);
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
 const all = read<any[]>(LS_PREFIX + "tickets", []);
 const idx = all.findIndex((t) => t.id === ticketId);
 if (idx >= 0) {
 all[idx].status = status;
 all[idx].updated_at = new Date().toISOString();
 write(LS_PREFIX + "tickets", all);
 return all[idx];
 }
 return null;
}

// ---------------------------------------------------------------------------
// All Tickets (for coach support inbox)
// ---------------------------------------------------------------------------

export async function listAllTickets() {
 if (isSupabaseConfigured && supabase) {
 const { data } = await supabase
 .from("support_tickets")
 .select("*, profiles!support_tickets_client_id_fkey(full_name, email)")
 .order("created_at", { ascending: false });
 return data ?? [];
 }
 return read<any[]>(LS_TICKETS, []);
}
