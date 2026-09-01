"use client";

import {
 supabase,
 isSupabaseConfigured,
 read,
 write,
 uid,
 LS_CHAT,
} from "./helpers";

// Shape of a persisted chat row (chat_messages columns / localStorage mirror).
type ChatRow = {
 id: string;
 client_id: string;
 role: string;
 body: string;
 created_at: string;
};

export async function listChat(clientId: string) {
 if (isSupabaseConfigured && supabase) {
 const { data } = await supabase
 .from("chat_messages")
 .select("*")
 .eq("client_id", clientId)
 .order("created_at", { ascending: true });
 return data ?? [];
 }
 return read<ChatRow[]>(LS_CHAT, []).filter((m) => m.client_id === clientId);
}

export async function addChat(clientId: string, role: "user" | "assistant", body: string) {
 if (isSupabaseConfigured && supabase) {
 const { data, error } = await supabase
 .from("chat_messages")
 .insert({ client_id: clientId, role, body })
 .select()
 .single();
 if (error) throw new Error(error.message);
 return data;
 }
 const all = read<ChatRow[]>(LS_CHAT, []);
 const row = { id: uid(), client_id: clientId, role, body, created_at: new Date().toISOString() };
 all.push(row);
 write(LS_CHAT, all);
 return row;
}
