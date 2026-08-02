"use client";

import { supabase, isSupabaseConfigured } from "@/lib/supabase/client";
import type { Profile } from "@/lib/supabase/types";

/* -------------------------------------------------------------------------- */
/*  Local fallback store — used when Supabase env vars are missing.           */
/*  Keeps the app fully usable in preview / demo mode.                        */
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
/*  Public API                                                                */
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
      // The profiles table is populated by a trigger (see supabase/migrations).
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
export async function signInWithGoogle(): Promise<{ error: string | null }> {
  if (!isSupabaseConfigured || !supabase) {
    return { error: "Google login requires Supabase to be configured" };
  }
  const redirectTo =
    typeof window !== "undefined"
      ? `${window.location.origin}/auth/callback`
      : undefined;
  const { error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo,
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
      // Auto-bootstrap a coach account for the demo email
      if (data.role === "client" && data.email?.endsWith("@coach.app")) {
        const { data: updated } = await supabase
          .from("profiles")
          .update({ role: "coach" })
          .eq("id", userId)
          .select()
          .single();
        return updated as Profile;
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
          const newProfile = {
            id: u.id,
            email: u.email ?? null,
            full_name:
              (u.user_metadata?.full_name as string) ||
              (u.user_metadata?.name as string) ||
              u.email ||
              null,
            phone: (u.user_metadata?.phone as string) || null,
            role: "client" as const,
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
/*  Seed data for first local run                                             */
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
        full_name: "Ahmed Zake",
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
/*  Generic data access (works with Supabase OR local store)                  */
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
    const { data } = await supabase
      .from("plans")
      .select("*")
      .eq("client_id", clientId)
      .order("created_at", { ascending: false });
    return data ?? [];
  }
  return read<any[]>(LS_PLANS, []).filter((p) => p.client_id === clientId);
}

export async function addPlan(plan: any) {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase.from("plans").insert(plan).select().single();
    if (error) throw new Error(error.message);
    return data;
  }
  const all = read<any[]>(LS_PLANS, []);
  const newRow = { ...plan, id: uid(), created_at: new Date().toISOString() };
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
    // Try upsert; if RLS blocks, fall back to insert
    const { data: row, error } = await supabase
      .from(table)
      .upsert(
        { client_id: clientId, data, status, updated_at: new Date().toISOString() },
        { onConflict: "client_id" },
      )
      .select()
      .single();
    if (error) throw new Error(error.message);
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

export async function listAllSubscriptions() {
  if (isSupabaseConfigured && supabase) {
    const { data } = await supabase.from("subscriptions").select("*");
    return data ?? [];
  }
  return read<any[]>(LS_SUBS, []);
}

export async function upsertSubscription(clientId: string, tier: string, months: number, startDate: string, endDate: string) {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from("subscriptions")
      .upsert(
        { client_id: clientId, tier, months, start_date: startDate, end_date: endDate, status: "active" },
        { onConflict: "client_id" },
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
