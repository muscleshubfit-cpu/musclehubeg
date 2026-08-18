// @ts-nocheck
"use client";

import { supabase, isSupabaseConfigured } from "@/lib/supabase/client";
import type { Profile } from "@/lib/supabase/types";
import { swapLimitFor } from "@/lib/plans";
import { trackReferral, awardCommission } from "@/lib/referral";
import { getReferralCookie, clearReferralCookie } from "@/lib/referral-cookie";

/* -------------------------------------------------------------------------- */
/* Local fallback store — used when Supabase env vars are missing. */
/* Keeps the app fully usable in preview / demo mode. */
/* -------------------------------------------------------------------------- */

const LS_USERS = "mhe:users";
const LS_SESSION = "mhe:session";
const LS_PROFILES = "mhe:profiles";
const LS_SUBS = "mhe:subs";
const LS_PROGRESS = "mhe:progress";
const LS_PLANS = "mhe:plans";
const LS_TICKETS = "mhe:tickets";
const LS_TICKET_MSGS = "mhe:ticket_msgs";
const LS_NUTRI_Q = "mhe:nutri_q";
const LS_FIT_Q = "mhe:fit_q";
const LS_CHAT = "mhe:chat";

type StoredUser = { id: string; email: string; password: string };
type Session = { userId: string; email: string } | null;

function read<T>(key: string, fallback: T): T {
 try {
 const raw = localStorage.getItem(key);
 return raw ? (JSON.parse(raw) as T) : fallback;
 } catch {
 return fallback;
 }
}
function write<T>(key: string, val: T) {
 try {
 localStorage.setItem(key, JSON.stringify(val));
 } catch {}
}

export function uid() {
 return "id-" + Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
}

/* -------------------------------------------------------------------------- */
/* Public API */
/* -------------------------------------------------------------------------- */

export async function signUpEmail(
 email: string,
 password: string,
 fullName: string,
 phone: string,
): Promise<{ error: string | null; profile: Profile | null }> {
 if (isSupabaseConfigured && supabase) {
 const { data, error } = await supabase.auth.signUp({
 email,
 password,
 options: { data: { full_name: fullName, phone, role: "client" } },
 });
 if (error) return { error: error.message, profile: null };
 if (data.user) {
 const profile: Profile = {
 id: data.user.id,
 full_name: fullName,
 phone,
 role: "client",
 avatar_url: null,
 created_at: new Date().toISOString(),
 };
 // Notify coach about new client
 await createAdminNotification(
 "new_client",
 "عميل جديد سجّل! ",
 `${fullName} (${email}) انضم للمنصة. اطمئن على استبياناته وجهّز خططه.`,
 "coach",
 ).catch(() => {});
 // Track referral if cookie exists
 try {
 const refCode = getReferralCookie();
 if (refCode) {
 await trackReferral(refCode, data.user.id, email);
 clearReferralCookie();
 }
 } catch {}
 return { error: null, profile };
 }
 return { error: null, profile: null };
 }

 // Local fallback
 const users = read<StoredUser[]>(LS_USERS, []);
 if (users.find((u) => u.email === email)) {
 return { error: "Email already registered", profile: null };
 }
 const id = uid();
 users.push({ id, email, password });
 write(LS_USERS, users);
 const profiles = read<Record<string, Profile>>(LS_PROFILES, {});
 profiles[id] = {
 id,
 full_name: fullName,
 phone,
 role: "client",
 avatar_url: null,
 created_at: new Date().toISOString(),
 };
 write(LS_PROFILES, profiles);
 write<Session>(LS_SESSION, { userId: id, email });
 // Notify coach
 await createAdminNotification("new_client", "عميل جديد", `${fullName} سجّل`, "coach").catch(() => {});
 return { error: null, profile: profiles[id] };
}

export async function signInEmail(
 email: string,
 password: string,
): Promise<{ error: string | null; profile: Profile | null }> {
 if (isSupabaseConfigured && supabase) {
 const { data, error } = await supabase.auth.signInWithPassword({ email, password });
 if (error) return { error: error.message, profile: null };
 if (data.user) {
 const profile = await fetchProfile(data.user.id);
 return { error: null, profile };
 }
 return { error: null, profile: null };
 }

 // Local fallback
 const users = read<StoredUser[]>(LS_USERS, []);
 const user = users.find((u) => u.email === email && u.password === password);
 if (!user) return { error: "Invalid email or password", profile: null };
 write<Session>(LS_SESSION, { userId: user.id, email: user.email });
 const profiles = read<Record<string, Profile>>(LS_PROFILES, {});
 return { error: null, profile: profiles[user.id] ?? null };
}

export async function signOut() {
 if (isSupabaseConfigured && supabase) {
 await supabase.auth.signOut();
 }
 write<Session>(LS_SESSION, null);
}

/**
 * Sign in with Google OAuth.
 *
 * Flow: client → Google consent → Supabase /auth/v1/callback →
 * our /auth/callback route (server-side) → exchanges code for session
 * cookie → redirects to / where the client picks up the session.
 */
export async function signInWithGoogle(nextPath?: string): Promise<{ error: string | null }> {
 if (!isSupabaseConfigured || !supabase) {
 return { error: "Google login requires Supabase to be configured" };
 }
 const origin = typeof window !== "undefined" ? window.location.origin : "";
 // Append `next` to the callback URL so /auth/callback can redirect back
 // to the original page (e.g. /checkout) after OAuth completes.
 const callbackUrl = nextPath
 ? `${origin}/auth/callback?next=${encodeURIComponent(nextPath)}`
 : `${origin}/auth/callback`;
 const { error } = await supabase.auth.signInWithOAuth({
 provider: "google",
 options: {
 redirectTo: callbackUrl,
 queryParams: {
 access_type: "offline",
 prompt: "consent",
 },
 },
 });
 return { error: error?.message ?? null };
}

export async function fetchProfile(userId: string): Promise<Profile | null> {
 if (isSupabaseConfigured && supabase) {
 const { data, error } = await supabase.from("profiles").select("*").eq("id", userId).maybeSingle();
 if (data) {
 // Auto-bootstrap a coach account for known coach emails
 // This prevents the coach from being downgraded to 'client'
 // if the auth trigger fires with role='client'
 if (data.role === "client") {
 const coachEmails = (process.env.COACH_EMAILS || "speerr@gmail.com").split(",").map((e: string) => e.trim().toLowerCase());
 const isCoachEmail = coachEmails.includes(data.email?.toLowerCase() || "");
 if (isCoachEmail) {
 const { data: updated } = await supabase
 .from("profiles")
 .update({ role: "coach" })
 .eq("id", userId)
 .select()
 .single();
 return updated as Profile;
 }
 }
 return data as Profile;
 }
 // Profile row not found — can happen if the auth trigger didn't fire
 // (e.g. user existed before trigger was created). Try to create it from
 // the current session's user metadata.
 if (error?.code === "PGRST116" || !data) {
 try {
 const { data: userData } = await supabase.auth.getUser();
 if (userData?.user) {
 const u = userData.user;
 // Check if this is a known coach email BEFORE creating the profile
 const coachEmails = (process.env.COACH_EMAILS || "speerr@gmail.com").split(",").map((e: string) => e.trim().toLowerCase());
 const isCoachEmail = coachEmails.includes(u.email?.toLowerCase() || "");
 const newProfile = {
 id: u.id,
 email: u.email ?? null,
 full_name:
 (u.user_metadata?.full_name as string) ||
 (u.user_metadata?.name as string) ||
 u.email ||
 null,
 phone: (u.user_metadata?.phone as string) || null,
 role: (isCoachEmail ? "coach" : "client") as "coach" | "client",
 avatar_url: (u.user_metadata?.avatar_url as string) || null,
 };
 const { data: inserted, error: insErr } = await supabase
 .from("profiles")
 .upsert(newProfile, { onConflict: "id" })
 .select()
 .single();
 if (!insErr && inserted) return inserted as Profile;
 }
 } catch {
 // swallow — fall through to null
 }
 }
 return null;
 }
 const profiles = read<Record<string, Profile>>(LS_PROFILES, {});
 return profiles[userId] ?? null;
}

export function onAuthChange(cb: (profile: Profile | null) => void): () => void {
 if (isSupabaseConfigured && supabase) {
 // CRITICAL: @supabase/ssr stores the session in cookies (not localStorage).
 // onAuthStateChange may NOT fire on page load with an INITIAL_SESSION event
 // when the session is cookie-based. So we explicitly call getSession() on
 // mount to read the cookie-based session and emit the profile immediately.
 supabase.auth.getSession().then(async ({ data: { session } }) => {
 if (session?.user) {
 const profile = await fetchProfile(session.user.id);
 cb(profile);
 } else {
 cb(null);
 }
 }).catch(() => cb(null));

 // Also subscribe to future auth state changes (sign in/out, token refresh).
 const { data } = supabase.auth.onAuthStateChange(async (_event, session) => {
 if (session?.user) {
 const profile = await fetchProfile(session.user.id);
 cb(profile);
 } else {
 cb(null);
 }
 });
 return () => data.subscription.unsubscribe();
 }
 // Local fallback — emit current session on subscribe
 const session = read<Session>(LS_SESSION, null);
 if (session) {
 const profiles = read<Record<string, Profile>>(LS_PROFILES, {});
 cb(profiles[session.userId] ?? null);
 } else {
 cb(null);
 }
 return () => {};
}

/* -------------------------------------------------------------------------- */
/* Seed data for first local run */
/* -------------------------------------------------------------------------- */

export function seedLocalData() {
 if (isSupabaseConfigured) return;
 const users = read<StoredUser[]>(LS_USERS, []);
 if (users.length === 0) {
 // Seed a demo coach + a demo client so the user can log in immediately.
 const coachId = "id-coach-demo";
 const clientId = "id-client-demo";
 const seededUsers: StoredUser[] = [
 { id: coachId, email: "ahmed@coach.app", password: "coach123" },
 { id: clientId, email: "client@demo.app", password: "client123" },
 ];
 write(LS_USERS, seededUsers);
 const profiles: Record<string, Profile> = {
 [coachId]: {
 id: coachId,
 full_name: "MuscleHub Coach",
 phone: "+20 100 000 0000",
 role: "coach",
 avatar_url: null,
 created_at: new Date().toISOString(),
 },
 [clientId]: {
 id: clientId,
 full_name: "Demo Client",
 phone: "+20 100 111 1111",
 role: "client",
 avatar_url: null,
 created_at: new Date().toISOString(),
 },
 };
 write(LS_PROFILES, profiles);
 // Seed a subscription for the demo client
 write(LS_SUBS, [
 {
 id: uid(),
 client_id: clientId,
 tier: "advanced",
 months: 6,
 start_date: new Date(Date.now() - 30 * 864e5).toISOString(),
 end_date: new Date(Date.now() + 150 * 864e5).toISOString(),
 status: "active",
 created_at: new Date().toISOString(),
 },
 ]);
 // Seed some progress entries
 const now = Date.now();
 write(LS_PROGRESS, [
 { id: uid(), client_id: clientId, weight: 92, waist: 102, chest: 108, hips: 110, arm: 36, neck: 40, energy: 7, adherence: 8, notes: "", created_at: new Date(now - 28 * 864e5).toISOString() },
 { id: uid(), client_id: clientId, weight: 90.5, waist: 100, chest: 107, hips: 109, arm: 36.5, neck: 39.5, energy: 8, adherence: 9, notes: "Feeling stronger", created_at: new Date(now - 21 * 864e5).toISOString() },
 { id: uid(), client_id: clientId, weight: 89, waist: 98, chest: 106, hips: 107, arm: 37, neck: 39, energy: 8, adherence: 9, notes: "", created_at: new Date(now - 14 * 864e5).toISOString() },
 { id: uid(), client_id: clientId, weight: 87.5, waist: 96, chest: 105, hips: 106, arm: 37.5, neck: 38.5, energy: 9, adherence: 10, notes: "Great week!", created_at: new Date(now - 7 * 864e5).toISOString() },
 ]);
 // Seed demo plans
 write(LS_PLANS, [
 {
 id: uid(),
 client_id: clientId,
 type: "meal",
 title: "Cutting Phase — Week 1-4",
 notes: "High protein, moderate carbs. Adjust calories if weight loss > 1kg/week.",
 file_url: null,
 content: {
 calories: 2200,
 macros: { protein: 180, carbs: 200, fat: 70 },
 meals: [
 { name: "Breakfast", food: "Oats + whey + banana", amount: "80g + 30g + 1" },
 { name: "Lunch", food: "Grilled chicken + rice + salad", amount: "200g + 150g + bowl" },
 { name: "Snack", food: "Greek yogurt + almonds", amount: "200g + 30g" },
 { name: "Dinner", food: "Salmon + sweet potato + veggies", amount: "180g + 150g + bowl" },
 ],
 },
 created_at: new Date(now - 10 * 864e5).toISOString(),
 },
 {
 id: uid(),
 client_id: clientId,
 type: "workout",
 title: "Push / Pull / Legs — 4 days",
 notes: "Progressive overload. Add 2.5kg when you hit top rep range.",
 file_url: null,
 content: {
 days: [
 { day: "Day 1", focus: "Push", exercises: [
 { exercise: "Bench Press", sets: 4, reps: "6-8", rest: "2 min" },
 { exercise: "Overhead Press", sets: 3, reps: "8-10", rest: "90 sec" },
 { exercise: "Incline DB Press", sets: 3, reps: "10-12", rest: "90 sec" },
 { exercise: "Triceps Pushdown", sets: 3, reps: "12-15", rest: "60 sec" },
 ]},
 { day: "Day 2", focus: "Pull", exercises: [
 { exercise: "Deadlift", sets: 3, reps: "5", rest: "3 min" },
 { exercise: "Pull-ups", sets: 4, reps: "6-10", rest: "90 sec" },
 { exercise: "Barbell Row", sets: 3, reps: "8-10", rest: "90 sec" },
 { exercise: "Biceps Curl", sets: 3, reps: "12-15", rest: "60 sec" },
 ]},
 { day: "Day 3", focus: "Legs", exercises: [
 { exercise: "Squat", sets: 4, reps: "6-8", rest: "3 min" },
 { exercise: "Romanian Deadlift", sets: 3, reps: "8-10", rest: "2 min" },
 { exercise: "Leg Press", sets: 3, reps: "12-15", rest: "90 sec" },
 { exercise: "Calf Raise", sets: 4, reps: "15-20", rest: "60 sec" },
 ]},
 { day: "Day 4", focus: "Upper", exercises: [
 { exercise: "Incline Bench", sets: 4, reps: "8-10", rest: "2 min" },
 { exercise: "Lat Pulldown", sets: 3, reps: "10-12", rest: "90 sec" },
 { exercise: "Lateral Raise", sets: 3, reps: "15", rest: "60 sec" },
 { exercise: "Face Pull", sets: 3, reps: "15-20", rest: "60 sec" },
 ]},
 ],
 },
 created_at: new Date(now - 8 * 864e5).toISOString(),
 },
 ]);
 // Seed demo chat
 write(LS_CHAT, [
 { id: uid(), client_id: clientId, role: "assistant", body: "Hi! I'm your AI coach. How can I help you today?", created_at: new Date(now - 5 * 864e5).toISOString() },
 ]);
 }
}

/* -------------------------------------------------------------------------- */
/* Generic data access (works with Supabase OR local store) */
/* -------------------------------------------------------------------------- */

export async function listProgress(clientId: string) {
 if (isSupabaseConfigured && supabase) {
 const { data } = await supabase
 .from("progress_entries")
 .select("*")
 .eq("client_id", clientId)
 .order("created_at", { ascending: true });
 return data ?? [];
 }
 return read<any[]>(LS_PROGRESS, []).filter((p) => p.client_id === clientId);
}

export async function addProgress(entry: any) {
 if (isSupabaseConfigured && supabase) {
 const { data, error } = await supabase.from("progress_entries").insert(entry).select().single();
 if (error) throw new Error(error.message);
 return data;
 }
 const all = read<any[]>(LS_PROGRESS, []);
 const newRow = { ...entry, id: uid(), created_at: new Date().toISOString() };
 all.push(newRow);
 write(LS_PROGRESS, all);
 return newRow;
}

export async function listPlans(clientId: string) {
 if (isSupabaseConfigured && supabase) {
 // Client sees ONLY approved + current plans (drafts are hidden until coach approves)
 const { data } = await supabase
 .from("plans")
 .select("*")
 .eq("client_id", clientId)
 .eq("status", "approved")
 .eq("is_current", true)
 .order("created_at", { ascending: false });
 return data ?? [];
 }
 return read<any[]>(LS_PLANS, []).filter((p) => p.client_id === clientId);
}

/** Coach sees ALL plans including drafts (for review/approval). */
export async function listAllClientPlans(clientId: string) {
 if (isSupabaseConfigured && supabase) {
 const { data } = await supabase
 .from("plans")
 .select("*")
 .eq("client_id", clientId)
 .order("created_at", { ascending: false });
 return data ?? [];
 }
 return read<any[]>(LS_PLANS, []).filter((p) => p.client_id === clientId);
}

/** Approve a draft plan and send it to the client. Archives previous current plans. */
export async function activatePlan(planId: string, clientId: string) {
 if (isSupabaseConfigured && supabase) {
 // Archive existing current plans of the same client+type
 const { data: plan } = await supabase
 .from("plans")
 .select("type")
 .eq("id", planId)
 .maybeSingle();
 if (plan) {
 await supabase
 .from("plans")
 .update({ is_current: false, status: "archived" })
 .eq("client_id", clientId)
 .eq("type", plan.type)
 .eq("is_current", true)
 .neq("id", planId);
 }
 // Approve + activate
 const { data, error } = await supabase
 .from("plans")
 .update({
 status: "approved",
 is_current: true,
 approved_at: new Date().toISOString(),
 })
 .eq("id", planId)
 .select()
 .single();
 if (error) throw new Error(error.message);
 // Notify the client
 await createNotification(
 clientId,
 "plan_activated",
 "تم تفعيل خطة جديدة لك! ",
 "خطتك الجديدة جاهزة الآن. اطّلع عليها من صفحة خططي.",
 "/plans",
 );
 // Notify coach (confirmation)
 await createAdminNotification(
 "plan_approved",
 "تم تفعيل خطة للعميل ",
 `خطة ${plan?.type === "meal" ? "تغذية" : "تمارين"} تم تفعيلها وإرسالها للعميل.`,
 "coach",
 ).catch(() => {});
 return data;
 }
 // Local fallback
 const all = read<any[]>(LS_PLANS, []);
 const idx = all.findIndex((p) => p.id === planId);
 if (idx >= 0) {
 all[idx].status = "approved";
 all[idx].is_current = true;
 all[idx].approved_at = new Date().toISOString();
 write(LS_PLANS, all);
 }
 return all[idx];
}

/** Record a swap and check daily limit (tier-dependent). Returns { allowed, used, limit }. */
export async function recordSwap(userId: string, planId: string, swapType: "meal" | "exercise") {
 // Determine limit from user's subscription tier
 const subs = await listAllSubscriptions();
 const userSub = subs.find((s: any) => s.client_id === userId);
 const tierId = (userSub?.tier as any) || "starter";
 const DAILY_LIMIT = swapLimitFor(tierId) ?? 2; // null = unlimited → use large number

 if (isSupabaseConfigured && supabase) {
 const todayStart = new Date();
 todayStart.setHours(0, 0, 0, 0);
 const { count, error } = await supabase
 .from("plan_swaps")
 .select("*", { count: "exact", head: true })
 .eq("user_id", userId)
 .eq("swap_type", swapType)
 .gte("created_at", todayStart.toISOString());
 if (error) throw new Error(error.message);
 const used = count ?? 0;

 // Unlimited tier
 if (DAILY_LIMIT === null || swapLimitFor(tierId) === null) {
 const { error: insErr } = await supabase
 .from("plan_swaps")
 .insert({ user_id: userId, plan_id: planId, swap_type: swapType });
 if (insErr) throw new Error(insErr.message);
 return { allowed: true, used: used + 1, limit: null as number | null, unlimited: true };
 }

 if (used >= DAILY_LIMIT) {
 return { allowed: false, used, limit: DAILY_LIMIT, unlimited: false };
 }
 const { error: insErr } = await supabase
 .from("plan_swaps")
 .insert({ user_id: userId, plan_id: planId, swap_type: swapType });
 if (insErr) throw new Error(insErr.message);
 return { allowed: true, used: used + 1, limit: DAILY_LIMIT, unlimited: false };
 }
 // Local fallback
 const all = read<any[]>(LS_PREFIX + "swaps", []);
 const today = new Date().toDateString();
 const todaySwaps = all.filter(
 (s) => s.user_id === userId && s.swap_type === swapType && new Date(s.created_at).toDateString() === today,
 );
 if (DAILY_LIMIT !== null && todaySwaps.length >= DAILY_LIMIT) {
 return { allowed: false, used: todaySwaps.length, limit: DAILY_LIMIT, unlimited: false };
 }
 all.push({ id: uid(), user_id: userId, plan_id: planId, swap_type: swapType, created_at: new Date().toISOString() });
 write(LS_PREFIX + "swaps", all);
 return { allowed: true, used: todaySwaps.length + 1, limit: DAILY_LIMIT, unlimited: DAILY_LIMIT === null };
}

/** Get current swap usage for today (for displaying remaining quota). */
export async function getSwapUsage(userId: string) {
 // Determine limit from user's subscription tier
 const subs = await listAllSubscriptions();
 const userSub = subs.find((s: any) => s.client_id === userId);
 const tierId = (userSub?.tier as any) || "starter";
 const LIMIT = swapLimitFor(tierId); // null = unlimited
 if (isSupabaseConfigured && supabase) {
 const todayStart = new Date();
 todayStart.setHours(0, 0, 0, 0);
 const [meals, exercises] = await Promise.all([
 supabase
 .from("plan_swaps")
 .select("*", { count: "exact", head: true })
 .eq("user_id", userId)
 .eq("swap_type", "meal")
 .gte("created_at", todayStart.toISOString()),
 supabase
 .from("plan_swaps")
 .select("*", { count: "exact", head: true })
 .eq("user_id", userId)
 .eq("swap_type", "exercise")
 .gte("created_at", todayStart.toISOString()),
 ]);
 return {
 meal: {
 used: meals.count ?? 0,
 limit: LIMIT,
 remaining: LIMIT === null ? Infinity : Math.max(0, LIMIT - (meals.count ?? 0)),
 unlimited: LIMIT === null,
 },
 exercise: {
 used: exercises.count ?? 0,
 limit: LIMIT,
 remaining: LIMIT === null ? Infinity : Math.max(0, LIMIT - (exercises.count ?? 0)),
 unlimited: LIMIT === null,
 },
 };
 }
 return {
 meal: { used: 0, limit: LIMIT, remaining: LIMIT === null ? Infinity : LIMIT, unlimited: LIMIT === null },
 exercise: { used: 0, limit: LIMIT, remaining: LIMIT === null ? Infinity : LIMIT, unlimited: LIMIT === null },
 };
}

export async function addPlan(plan: any) {
 if (isSupabaseConfigured && supabase) {
 // New plans from coach upload are "approved" directly (manual upload).
 // New plans from AI generation are "draft" (need approval).
 const status = plan.status || "approved";
 const is_current = plan.is_current ?? (status === "approved");
 const { data, error } = await supabase
 .from("plans")
 .insert({ ...plan, status, is_current })
 .select()
 .single();
 if (error) throw new Error(error.message);
 return data;
 }
 const all = read<any[]>(LS_PLANS, []);
 const status = plan.status || "approved";
 const newRow = {
 ...plan,
 id: uid(),
 status,
 is_current: plan.is_current ?? (status === "approved"),
 approved_at: status === "approved" ? new Date().toISOString() : null,
 created_at: new Date().toISOString(),
 };
 all.push(newRow);
 write(LS_PLANS, all);
 return newRow;
}

export async function deletePlan(id: string) {
 if (isSupabaseConfigured && supabase) {
 await supabase.from("plans").delete().eq("id", id);
 return;
 }
 const all = read<any[]>(LS_PLANS, []);
 write(LS_PLANS, all.filter((p) => p.id !== id));
}

/** Update a plan's content (title, notes, content JSON, status). */
export async function updatePlan(id: string, updates: { title?: string; notes?: string; content?: any; status?: string; is_current?: boolean }) {
 if (isSupabaseConfigured && supabase) {
 const { data, error } = await supabase
 .from("plans")
 .update(updates)
 .eq("id", id)
 .select()
 .single();
 if (error) throw new Error(error.message);
 return data;
 }
 const all = read<any[]>(LS_PLANS, []);
 const idx = all.findIndex((p) => p.id === id);
 if (idx >= 0) {
 all[idx] = { ...all[idx], ...updates };
 write(LS_PLANS, all);
 }
 return all[idx];
}

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
 // Notify coach
 await createAdminNotification("new_ticket", "تذكرة دعم جديدة ", `موضوع: ${subject}`, "coach-support").catch(() => {});
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
 return data;
 }
 const all = read<any[]>(LS_TICKET_MSGS, []);
 const row = { id: uid(), ticket_id: ticketId, sender_id: senderId, body, created_at: new Date().toISOString() };
 all.push(row);
 write(LS_TICKET_MSGS, all);
 return row;
}

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
 // If submitted, notify coach
 if (status === "submitted") {
 await createAdminNotification(
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

export async function listAllClients() {
 if (isSupabaseConfigured && supabase) {
 const { data } = await supabase
 .from("profiles")
 .select("*")
 .eq("role", "client")
 .order("created_at", { ascending: false });
 return data ?? [];
 }
 const profiles = read<Record<string, Profile>>(LS_PROFILES, {});
 return Object.values(profiles).filter((p) => p.role === "client");
}

// ---------------------------------------------------------------------------
// Progress Photos
// ---------------------------------------------------------------------------

export async function listPhotos(userId: string) {
 if (isSupabaseConfigured && supabase) {
 const { data } = await supabase
 .from("progress_photos")
 .select("*")
 .eq("user_id", userId)
 .order("taken_on", { ascending: false });
 if (!data) return [];
 // Generate signed URLs for each photo
 const withUrls = await Promise.all(
 data.map(async (p: any) => {
 const { data: signed } = await supabase.storage
 .from("progress-photos")
 .createSignedUrl(p.file_path, 3600);
 return { ...p, url: signed?.signedUrl ?? "" };
 }),
 );
 return withUrls;
 }
 return read<any[]>(LS_PREFIX + "photos", []).filter((p) => p.user_id === userId);
}

export async function uploadPhoto(userId: string, file: File, date: string, note: string) {
 if (isSupabaseConfigured && supabase) {
 const ext = file.name.split(".").pop();
 const path = `${userId}/${Date.now()}.${ext}`;
 const { error: upErr } = await supabase.storage.from("progress-photos").upload(path, file);
 if (upErr) throw new Error(upErr.message);
 const { data, error } = await supabase
 .from("progress_photos")
 .insert({ user_id: userId, file_path: path, taken_on: date, note: note || null })
 .select()
 .single();
 if (error) throw new Error(error.message);
 return data;
 }
 // Local fallback
 const all = read<any[]>(LS_PREFIX + "photos", []);
 const row = { id: uid(), user_id: userId, file_path: "", taken_on: date, note, created_at: new Date().toISOString(), url: URL.createObjectURL(file) };
 all.push(row);
 write(LS_PREFIX + "photos", all);
 return row;
}

export async function deletePhoto(id: string, filePath?: string) {
 if (isSupabaseConfigured && supabase) {
 if (filePath) await supabase.storage.from("progress-photos").remove([filePath]);
 await supabase.from("progress_photos").delete().eq("id", id);
 return;
 }
 const all = read<any[]>(LS_PREFIX + "photos", []);
 write(LS_PREFIX + "photos", all.filter((p) => p.id !== id));
}

// ---------------------------------------------------------------------------
// Notifications
// ---------------------------------------------------------------------------

export async function listNotifications(userId: string) {
 if (isSupabaseConfigured && supabase) {
 const { data } = await supabase
 .from("notifications")
 .select("*")
 .eq("user_id", userId)
 .order("created_at", { ascending: false })
 .limit(20);
 return data ?? [];
 }
 return read<any[]>(LS_PREFIX + "notifs", []).filter((n) => n.user_id === userId);
}

export async function markNotificationsRead(userId: string) {
 if (isSupabaseConfigured && supabase) {
 await supabase.from("notifications").update({ read: true }).eq("user_id", userId).eq("read", false);
 return;
 }
 const all = read<any[]>(LS_PREFIX + "notifs", []);
 all.forEach((n) => { if (n.user_id === userId) n.read = true; });
 write(LS_PREFIX + "notifs", all);
}

export async function createNotification(userId: string, type: string, title: string, body: string, link?: string) {
 if (isSupabaseConfigured && supabase) {
 const { data, error } = await supabase
 .from("notifications")
 .insert({ user_id: userId, type, title, body, link })
 .select()
 .single();
 if (error) throw new Error(error.message);
 return data;
 }
 const all = read<any[]>(LS_PREFIX + "notifs", []);
 const row = { id: uid(), user_id: userId, type, title, body, link, read: false, created_at: new Date().toISOString() };
 all.push(row);
 write(LS_PREFIX + "notifs", all);
 return row;
}

// ---------------------------------------------------------------------------
// Admin Notifications (for coach)
// ---------------------------------------------------------------------------

export async function listAdminNotifications() {
 if (isSupabaseConfigured && supabase) {
 const { data } = await supabase
 .from("admin_notifications")
 .select("*")
 .order("created_at", { ascending: false })
 .limit(30);
 return data ?? [];
 }
 return read<any[]>(LS_PREFIX + "admin_notifs", []);
}

export async function markAdminNotificationsRead() {
 if (isSupabaseConfigured && supabase) {
 await supabase.from("admin_notifications").update({ read: true }).eq("read", false);
 return;
 }
 const all = read<any[]>(LS_PREFIX + "admin_notifs", []);
 all.forEach((n) => { n.read = true; });
 write(LS_PREFIX + "admin_notifs", all);
}

export async function createAdminNotification(type: string, title: string, body: string, link?: string) {
 if (isSupabaseConfigured && supabase) {
 // Use the server-side endpoint instead of direct supabase insert.
 // The RLS policy on admin_notifications only allows coaches to
 // insert directly — but createAdminNotification is called from
 // client-side code (new_client, questionnaire_submitted, new_ticket,
 // payment_request) where the user is NOT a coach. The server endpoint
 // uses supabaseAdmin (service_role) to bypass RLS.
 try {
 const res = await fetch("/api/notifications/admin", {
 method: "POST",
 headers: { "Content-Type": "application/json" },
 body: JSON.stringify({ type, title, body, link }),
 });
 if (!res.ok) {
 const err = await res.json().catch(() => ({}));
 throw new Error(err.error || `HTTP ${res.status}`);
 }
 const data = await res.json();
 return data;
 } catch (e: any) {
 // Re-throw so callers can .catch() if they want to suppress
 throw e;
 }
 }
 const all = read<any[]>(LS_PREFIX + "admin_notifs", []);
 const row = { id: uid(), type, title, body, link, read: false, created_at: new Date().toISOString() };
 all.push(row);
 write(LS_PREFIX + "admin_notifs", all);
 return row;
}

// ---------------------------------------------------------------------------
// Subscription Requests (for coach payments page)
// ---------------------------------------------------------------------------

export async function listSubscriptionRequests(status?: string) {
 if (isSupabaseConfigured && supabase) {
 let q = supabase.from("subscription_requests").select("*").order("created_at", { ascending: false });
 if (status && status !== "all") q = q.eq("status", status);
 const { data } = await q;
 return data ?? [];
 }
 return read<any[]>(LS_PREFIX + "subreqs", []);
}

export async function submitSubscriptionRequest(req: any) {
 if (isSupabaseConfigured && supabase) {
 const { data, error } = await supabase.from("subscription_requests").insert(req).select().single();
 if (error) throw new Error(error.message);
 // Notify coach about new payment request
 await createAdminNotification(
 "payment_request",
 "طلب دفع جديد ",
 `${req.full_name} طلب اشتراك ${req.plan_tier} لمدة ${req.duration_months} شهر — $${req.price_egp}`,
 "coach-payments",
 ).catch(() => {});
 return data;
 }
 const all = read<any[]>(LS_PREFIX + "subreqs", []);
 const row = { id: uid(), ...req, status: "pending", created_at: new Date().toISOString() };
 all.push(row);
 write(LS_PREFIX + "subreqs", all);
 return row;
}

export async function reviewSubscriptionRequest(id: string, action: "approve" | "reject") {
 if (isSupabaseConfigured && supabase) {
 const { data, error } = await supabase
 .from("subscription_requests")
 .update({ status: action === "approve" ? "approved" : "rejected", reviewed_at: new Date().toISOString() })
 .eq("id", id)
 .select()
 .single();
 if (error) throw new Error(error.message);

 // If approved, create a subscription for the user
 if (action === "approve") {
 const req = data;
 const start = new Date();
 const end = new Date();
 end.setMonth(end.getMonth() + req.duration_months);
 await upsertSubscription(req.user_id, req.plan_tier, req.duration_months, start.toISOString(), end.toISOString());
 // Notify the user
 await createNotification(req.user_id, "subscription_approved", "تم تفعيل اشتراكك!", `تم الموافقة على طلب اشتراكك (${req.plan_tier}) لمدة ${req.duration_months} أشهر.`, "/dashboard");
 // Award referral commission (20% of payment)
 try {
 const paymentAmount = req.price_egp ? Number(req.price_egp) / 50 : 10; // EGP to USD approx
 await awardCommission(req.user_id, paymentAmount, req.id);
 } catch (e) {
 console.error("[reviewSubscriptionRequest] Commission error:", e);
 }
 } else {
 await createNotification(data.user_id, "subscription_rejected", "تم رفض طلب الاشتراك", "تم رفض طلب اشتراكك. يرجى التواصل مع الدعم.", "/memberships");
 }
 return data;
 }
 const all = read<any[]>(LS_PREFIX + "subreqs", []);
 const idx = all.findIndex((r) => r.id === id);
 if (idx >= 0) all[idx].status = action === "approve" ? "approved" : "rejected";
 write(LS_PREFIX + "subreqs", all);
 return all[idx];
}

export async function getReceiptSignedUrl(filePath: string): Promise<string> {
 if (isSupabaseConfigured && supabase) {
 const { data } = await supabase.storage.from("receipts").createSignedUrl(filePath, 3600);
 return data?.signedUrl ?? "";
 }
 return "";
}

export async function uploadReceipt(file: File): Promise<string> {
 if (isSupabaseConfigured && supabase) {
 const ext = file.name.split(".").pop();
 const path = `receipts/${Date.now()}.${ext}`;
 const { error } = await supabase.storage.from("receipts").upload(path, file);
 if (error) throw new Error(error.message);
 return path;
 }
 return "";
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

// ---------------------------------------------------------------------------
// Plan file upload (coach uploads PDF files)
// ---------------------------------------------------------------------------

export async function uploadPlanFile(bucket: string, clientId: string, file: File): Promise<string> {
 if (isSupabaseConfigured && supabase) {
 const ext = file.name.split(".").pop();
 const path = `${clientId}/${Date.now()}.${ext}`;
 const { error } = await supabase.storage.from(bucket).upload(path, file);
 if (error) throw new Error(error.message);
 return path;
 }
 return "";
}

export async function getPlanFileUrl(bucket: string, filePath: string): Promise<string> {
 if (isSupabaseConfigured && supabase) {
 const { data } = await supabase.storage.from(bucket).createSignedUrl(filePath, 3600);
 return data?.signedUrl ?? "";
 }
 return "";
}

// ---------------------------------------------------------------------------
// Swap Requests (client → coach, when daily limit is reached)
// ---------------------------------------------------------------------------

export async function createSwapRequest(req: {
 userId: string;
 planId?: string;
 swapType: "meal" | "exercise";
 reason: string;
}) {
 if (isSupabaseConfigured && supabase) {
 // Use support_tickets table with a special type prefix
 const { data, error } = await supabase
 .from("support_tickets")
 .insert({
 client_id: req.userId,
 subject: `[تبديل ${req.swapType === "meal" ? "وجبة" : "تمرين"}] ${req.reason.slice(0, 50)}`,
 status: "open",
 priority: "normal",
 })
 .select()
 .single();
 if (error) throw new Error(error.message);
 // Add the detailed reason as first message
 await supabase.from("ticket_messages").insert({
 ticket_id: data.id,
 sender_id: req.userId,
 body: `طلب تبديل ${req.swapType === "meal" ? "وجبة" : "تمرين"}:\n\n${req.reason}`,
 });
 return data;
 }
 // Local fallback
 const all = read<any[]>(LS_TICKETS, []);
 const ticket = {
 id: uid(),
 client_id: req.userId,
 subject: `[تبديل ${req.swapType === "meal" ? "وجبة" : "تمرين"}] ${req.reason.slice(0, 50)}`,
 status: "open",
 priority: "normal",
 created_at: new Date().toISOString(),
 updated_at: new Date().toISOString(),
 };
 all.push(ticket);
 write(LS_TICKETS, all);
 return ticket;
}

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
 const completed = data.filter((r: any) => r.status === "completed").length;
 const pending = data.filter((r: any) => r.status === "pending").length;
 return { total, completed, pending, referrals: data };
 }
 return { total: 0, completed: 0, pending: 0, referrals: [] };
}

export async function createReferral(referrerId: string, referredEmail: string) {
 if (isSupabaseConfigured && supabase) {
 const { data, error } = await supabase
 .from("referrals")
 .insert({ referrer_id: referrerId, referred_email: referredEmail })
 .select()
 .single();
 if (error) throw new Error(error.message);
 return data;
 }
 return null;
}

// ---------------------------------------------------------------------------
// Blog posts (SEO articles)
// ---------------------------------------------------------------------------

export async function listBlogPosts() {
 if (isSupabaseConfigured && supabase) {
 const { data } = await supabase
 .from("blog_posts")
 .select("*")
 .eq("published", true)
 .order("published_at", { ascending: false });
 return data ?? [];
 }
 return [];
}

export async function getBlogPost(slug: string) {
 if (isSupabaseConfigured && supabase) {
 const { data } = await supabase
 .from("blog_posts")
 .select("*")
 .eq("slug", slug)
 .eq("published", true)
 .maybeSingle();
 return data;
 }
 return null;
}

// ---------------------------------------------------------------------------
// Coach presence (online status)
// ---------------------------------------------------------------------------

export async function getCoachPresence() {
 if (isSupabaseConfigured && supabase) {
 const { data } = await supabase
 .from("coach_presence")
 .select("*")
 .limit(1)
 .maybeSingle();
 if (!data) return { status: "offline", lastSeen: null };
 // Consider online if last seen < 2 minutes ago
 const lastSeen = new Date(data.last_seen);
 const isOnline = Date.now() - lastSeen.getTime() < 2 * 60 * 1000;
 return { status: isOnline ? "online" : "offline", lastSeen: data.last_seen };
 }
 return { status: "offline", lastSeen: null };
}

export async function updateCoachPresence(userId: string, status: "online" | "offline") {
 if (isSupabaseConfigured && supabase) {
 // Upsert presence
 const { data: existing } = await supabase
 .from("coach_presence")
 .select("id")
 .eq("user_id", userId)
 .maybeSingle();
 if (existing) {
 await supabase
 .from("coach_presence")
 .update({ status, last_seen: new Date().toISOString() })
 .eq("id", existing.id);
 } else {
 await supabase
 .from("coach_presence")
 .insert({ user_id: userId, status, last_seen: new Date().toISOString() });
 }
 }
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

const LS_PREFIX = "mhe:";

export async function listAllSubscriptions() {
 if (isSupabaseConfigured && supabase) {
 const { data } = await supabase.from("subscriptions").select("*");
 return data ?? [];
 }
 return read<any[]>(LS_SUBS, []);
}

/**
 * Fetch ONLY the calling user's own subscription.
 * Use this in user-facing contexts (e.g. /api/ai/chat) instead of
 * listAllSubscriptions() — which returns every row and is meant for
 * coach-only views. RLS also enforces this server-side, but defense in
 * depth: never trust the body's userId, and never fetch more than needed.
 */
export async function getSubscriptionForClient(clientId: string) {
 if (isSupabaseConfigured && supabase) {
 const { data } = await supabase
 .from("subscriptions")
 .select("*")
 .eq("client_id", clientId)
 .order("created_at", { ascending: false });
 // Return the highest-priority active sub (pro > coaching > premium > others)
 // Priority by feature richness, NOT by price.
 const arr = data ?? [];
 if (arr.length === 0) return null;
 const priority = (tier: string) => {
 if (tier === "pro") return 4;
 if (tier === "coaching") return 3;
 if (tier === "premium") return 2;
 if (tier === "elite") return 1;
 return 0;
 };
 arr.sort((a, b) => priority(b.tier) - priority(a.tier));
 return arr[0];
 }
 return read<any[]>(LS_SUBS, []).find((s) => s.client_id === clientId) ?? null;
}

/**
 * Fetch ALL subscriptions for a client (not just one).
 * Used by the coach client view to show multiple subscriptions
 * (e.g. Coaching + Premium coexisting).
 */
export async function listSubscriptionsForClient(clientId: string) {
 if (isSupabaseConfigured && supabase) {
 const { data } = await supabase
 .from("subscriptions")
 .select("*")
 .eq("client_id", clientId)
 .order("created_at", { ascending: false });
 return data ?? [];
 }
 return read<any[]>(LS_SUBS, []).filter((s) => s.client_id === clientId);
}

export async function upsertSubscription(clientId: string, tier: string, months: number, startDate: string, endDate: string) {
 if (isSupabaseConfigured && supabase) {
 // Determine subscription_type from tier
 const subscriptionType = tier === "coaching" ? "coaching" : "membership";
 const { data, error } = await supabase
 .from("subscriptions")
 .upsert(
 { client_id: clientId, tier, months, start_date: startDate, end_date: endDate, status: "active", subscription_type: subscriptionType },
 { onConflict: "client_id,tier" },
 )
 .select()
 .single();
 if (error) throw new Error(error.message);
 return data;
 }
 const all = read<any[]>(LS_SUBS, []);
 const idx = all.findIndex((s) => s.client_id === clientId);
 const row = {
 id: idx >= 0 ? all[idx].id : uid(),
 client_id: clientId,
 tier,
 months,
 start_date: startDate,
 end_date: endDate,
 status: "active" as const,
 created_at: idx >= 0 ? all[idx].created_at : new Date().toISOString(),
 };
 if (idx >= 0) all[idx] = row;
 else all.push(row);
 write(LS_SUBS, all);
 return row;
}
