"use client";

import {
 supabase,
 isSupabaseConfigured,
 read,
 write,
 uid,
 LS_NUTRI_Q,
 LS_FIT_Q,
} from "./helpers";
import { createNotification, createAdminNotification } from "./notifications";

export async function getQuestionnaire(clientId: string, type: "nutrition" | "fitness") {
 if (isSupabaseConfigured && supabase) {
 const table = type === "nutrition" ? "nutrition_questionnaires" : "fitness_questionnaires";
 const { data } = await supabase
 .from(table)
 .select("*")
 .eq("client_id", clientId)
 .order("updated_at", { ascending: false })
 .limit(1)
 .maybeSingle();
 return data;
 }
 const store = read<Record<string, any>>(type === "nutrition" ? LS_NUTRI_Q : LS_FIT_Q, {});
 return store[clientId] ?? null;
}

export async function upsertQuestionnaire(
 clientId: string,
 type: "nutrition" | "fitness",
 data: any,
 status: "draft" | "submitted" | "approved" | "needs_info",
) {
 if (isSupabaseConfigured && supabase) {
 const table = type === "nutrition" ? "nutrition_questionnaires" : "fitness_questionnaires";
 const { data: row, error } = await supabase
 .from(table)
 .upsert(
 { client_id: clientId, data, status, updated_at: new Date().toISOString() },
 { onConflict: "client_id" },
 )
 .select()
 .single();
 if (error) throw new Error(error.message);
 // If submitted, notify coach (fire-and-forget — don't block on notification)
 if (status === "submitted") {
 createAdminNotification(
 "questionnaire_submitted",
 "استبيان جديد للمراجعة ",
 `استبيان ${type === "nutrition" ? "التغذية" : "اللياقة"} — بانتظار مراجعتك`,
 "coach",
 ).catch(() => {});
 }
 return row;
 }
 const key = type === "nutrition" ? LS_NUTRI_Q : LS_FIT_Q;
 const store = read<Record<string, any>>(key, {});
 store[clientId] = {
 id: store[clientId]?.id ?? uid(),
 client_id: clientId,
 data,
 status,
 created_at: store[clientId]?.created_at ?? new Date().toISOString(),
 updated_at: new Date().toISOString(),
 };
 write(key, store);
 return store[clientId];
}

// ---------------------------------------------------------------------------
// Questionnaire status management (coach)
// ---------------------------------------------------------------------------

export async function setQuestionnaireStatus(
 clientId: string,
 type: "nutrition" | "fitness",
 status: "draft" | "submitted" | "approved" | "needs_info",
) {
 if (isSupabaseConfigured && supabase) {
 const table = type === "nutrition" ? "nutrition_questionnaires" : "fitness_questionnaires";
 const { data, error } = await supabase
 .from(table)
 .update({ status, updated_at: new Date().toISOString() })
 .eq("client_id", clientId)
 .select()
 .single();
 if (error) throw new Error(error.message);
 // Notify the user
 const statusMsg = status === "approved" ? "تمت الموافقة على استبيانك" : "يحتاج استبيانك لمزيد من المعلومات";
 await createNotification(clientId, "questionnaire_status", statusMsg, `استبيان ${type === "nutrition" ? "التغذية" : "اللياقة"}: ${statusMsg}`, "/questionnaires");
 return data;
 }
 const key = type === "nutrition" ? LS_NUTRI_Q : LS_FIT_Q;
 const store = read<Record<string, any>>(key, {});
 if (store[clientId]) {
 store[clientId].status = status;
 store[clientId].updated_at = new Date().toISOString();
 write(key, store);
 }
 return store[clientId];
}
