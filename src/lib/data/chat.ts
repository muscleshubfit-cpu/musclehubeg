"use client";

import {
 supabase,
 isSupabaseConfigured,
 read,
 write,
 uid,
 LS_CHAT,
} from "./helpers";

export async function listChat(clientId: string) {
 if (isSupabaseConfigured && supabase) {
 const { data } = await supabase
 .from("chat_messages")
 .select("*")
 .eq("client_id", clientId)
 .order("created_at", { ascending: true });
 return data ?? [];
 }
 return read<any[]>(LS_CHAT, []).filter((m) => m.client_id === clientId);
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
 const all = read<any[]>(LS_CHAT, []);
 const row = { id: uid(), client_id: clientId, role, body, created_at: new Date().toISOString() };
 all.push(row);
 write(LS_CHAT, all);
 return row;
}
