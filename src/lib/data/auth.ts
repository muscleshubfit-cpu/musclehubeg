"use client";

import {
 supabase,
 isSupabaseConfigured,
 type Profile,
 getReferralCookie,
 trackReferral,
 clearReferralCookie,
 read,
 write,
 uid,
 LS_USERS,
 LS_PROFILES,
 LS_SESSION,
 LS_SUBS,
 LS_PROGRESS,
 LS_PLANS,
 LS_CHAT,
 type StoredUser,
 type Session,
} from "./helpers";
import { createAdminNotification } from "./notifications";
// Coach-attribution cookie lives outside the data layer (client helper).
import {
 getCoachSlugCookie,
 clearCoachSlugCookie,
} from "../coach-cookie";

/* -------------------------------------------------------------------------- */
/* Public API */
/* -------------------------------------------------------------------------- */

export async function signUpEmail(
 email: string,
 password: string,
 fullName: string,
 phone: string,
 coachSlug?: string | null,
): Promise<{ error: string | null; profile: Profile | null; needsConfirmation?: boolean }> {
 if (isSupabaseConfigured && supabase) {
 // COACH ATTRIBUTION (0033): a slug from /auth?coach={slug} (or the
 // 30-day cookie set by the landing page CTA) travels in the signup
 // metadata — the rebuilt auto-assign trigger assigns this client to
 // that coach INSTEAD of the admin. No slug → site client → admin.
 const resolvedCoachSlug = coachSlug || getCoachSlugCookie() || undefined;
 const { data, error } = await supabase.auth.signUp({
 email,
 password,
 options: {
  data: {
   full_name: fullName,
   phone,
   role: "client",
   ...(resolvedCoachSlug ? { coach_slug: resolvedCoachSlug } : {}),
  },
 },
 });
 if (error) return { error: error.message, profile: null };
 if (data.user) {
 // M6 fix: detect email confirmation requirement.
 // When Supabase requires email confirmation, data.session is null
 // but data.user is set. Returning a profile here would cause the
 // caller (AuthView) to redirect to /dashboard — but the user
 // isn't actually logged in, so AuthGate bounces them back to /auth.
 // Instead, return needsConfirmation=true so the caller shows a
 // "Check your email" screen.
 if (!data.session) {
 // Attribution done at insert time — the cookie's job is over.
 clearCoachSlugCookie();
 // Track referral before returning — the cookie may expire by the
 // time the user confirms their email.
 try {
 const refCode = getReferralCookie();
 if (refCode) {
 await trackReferral(refCode, data.user.id, email);
 clearReferralCookie();
 }
 } catch {}
 // Notify the ASSIGNED coach about new pending client (multi-coach routing)
 await createAdminNotification(
 "new_client",
 "عميل جديد سجّل (بانتظار التأكيد)! ",
 `${fullName} (${email}) انضم للمنصة — في انتظار تأكيد البريد الإلكتروني.`,
 "coach",
 data.user.id,
 ).catch(() => {});
 return { error: null, profile: null, needsConfirmation: true };
 }
 const profile: Profile = {
 id: data.user.id,
 email: data.user.email ?? null,
 full_name: fullName,
 phone,
 role: "client",
 avatar_url: null,
 referral_code: null,
 created_at: new Date().toISOString(),
 };
 // Notify the ASSIGNED coach about new client (multi-coach routing)
 await createAdminNotification(
 "new_client",
 "عميل جديد سجّل! ",
 `${fullName} (${email}) انضم للمنصة. اطمئن على استبياناته وجهّز خططه.`,
 "coach",
 data.user.id,
 ).catch(() => {});
 clearCoachSlugCookie();
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
 email,
 full_name: fullName,
 phone,
 role: "client",
 avatar_url: null,
 referral_code: null,
 created_at: new Date().toISOString(),
 };
 write(LS_PROFILES, profiles);
 write<Session>(LS_SESSION, { userId: id, email });
 // Notify coach
 await createAdminNotification("new_client", "عميل جديد", `${fullName} سجّل`, "coach", id).catch(() => {});
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
 // Auto-bootstrap a coach account for known coach emails.
 // The default fallback `speerr@gmail.com` is the Owner's personal
 // admin email — it grants coach role on signup without requiring
 // the COACH_EMAILS env var to be set. This is intentional: the
 // Owner must always be able to log in as coach even on a fresh
 // deployment that hasn't had env vars configured yet.
 //
 // `muscleshubfit@gmail.com` is the public contact email shown on
 // the site (footer, contact form, SECURITY.md) — it is NOT an admin
 // email and must never be granted coach role by default. To grant
 // coach to additional emails, set the `COACH_EMAILS` env var to a
 // comma-separated list.
 const coachEmails = (process.env.COACH_EMAILS || "speerr@gmail.com").split(",").map((e: string) => e.trim().toLowerCase());
 const isCoachEmail = coachEmails.includes(data.email?.toLowerCase() || "");
 if (isCoachEmail) {
 // Call the SECURITY DEFINER RPC that bypasses RLS to set role='coach'.
 // Direct client UPDATE is now blocked by the profiles_update_self
 // WITH CHECK (migration 0017). The RPC validates the email against
 // the coach_emails table server-side.
 await supabase.rpc("auto_promote_coach_if_allowed");
 // Re-fetch to return the updated profile
 const { data: updated } = await supabase
 .from("profiles")
 .select()
 .eq("id", userId)
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
 // See the comment above (in the role-update branch) for the rationale
 // behind the `speerr@gmail.com` default fallback. `muscleshubfit@gmail.com`
 // is public-contact only — never granted coach role by default.
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
 // Never seed demo data in production — if Supabase env vars are
 // missing in production, the app should fail rather than fall back
 // to demo mode with hardcoded coach credentials that are public in
 // the repo (C7 security fix, 2026-08-26).
 if (process.env.NODE_ENV === "production") {
 console.error("[seedLocalData] Supabase not configured in production — refusing to seed demo data");
 return;
 }
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
 email: "ahmed@coach.app",
 full_name: "MuscleHubEG Coach",
 phone: "+20 100 000 0000",
 role: "coach",
 avatar_url: null,
 referral_code: null,
 created_at: new Date().toISOString(),
 },
 [clientId]: {
 id: clientId,
 email: "client@demo.app",
 full_name: "Demo Client",
 phone: "+20 100 111 1111",
 role: "client",
 avatar_url: null,
 referral_code: null,
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
