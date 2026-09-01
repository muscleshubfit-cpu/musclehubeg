"use client";

import {
 supabase,
 isSupabaseConfigured,
} from "./helpers";

// ---------------------------------------------------------------------------
// Referrals (invite friends, get 10% discount)
// ---------------------------------------------------------------------------

export async function getReferralStats(userId: string) {
 if (isSupabaseConfigured && supabase) {
 const { data, error } = await supabase
 .from("referrals")
 .select("*")
 .eq("referrer_id", userId)
 .order("created_at", { ascending: false });
 if (error) throw new Error(error.message);
 const total = data.length;
 const completed = data.filter((r: { status?: string | null }) => r.status === "completed").length;
 const pending = data.filter((r: { status?: string | null }) => r.status === "pending").length;
 return { total, completed, pending, referrals: data };
 }
 return { total: 0, completed: 0, pending: 0, referrals: [] };
}

export async function createReferral(referrerId: string, referredEmail: string) {
 if (isSupabaseConfigured && supabase) {
 const { data, error } = await supabase
 .from("referrals")
 .insert({ referrer_id: referrerId, referred_email: referredEmail, referral_code: "" })
 .select()
 .single();
 if (error) throw new Error(error.message);
 return data;
 }
 return null;
}
