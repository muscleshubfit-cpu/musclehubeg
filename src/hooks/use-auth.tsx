"use client";

import {
 createContext,
 useContext,
 useEffect,
 useState,
 useCallback,
 type ReactNode,
} from "react";
import {
 signUpEmail,
 signInEmail,
 signOut,
 onAuthChange,
 seedLocalData,
 signInWithGoogle,
} from "@/lib/data";
import { supabase } from "@/lib/supabase/client";
import type { Profile } from "@/lib/supabase/types";

type AuthCtx = {
 profile: Profile | null;
 loading: boolean;
 /** STAFF semantics: true for role coach AND admin. Gates every coach
  * surface (clients, support, payments). Admin additionally gets the
  * admin-exclusive surfaces via isAdmin. */
 isCoach: boolean;
 /** role === "admin" — platform owner. Admin-exclusive: blog admin,
  * tool leads, saved results, referrals admin. */
 isAdmin: boolean;
 signUp: (email: string, password: string, fullName: string, phone: string, coachSlug?: string | null) => Promise<{ error: string | null; needsConfirmation?: boolean }>;
 signIn: (email: string, password: string) => Promise<{ error: string | null; profile: Profile | null }>;
 signInGoogle: (nextPath?: string) => Promise<{ error: string | null }>;
 signOutAsync: () => Promise<void>;
};

const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
 const [profile, setProfile] = useState<Profile | null>(null);
 const [loading, setLoading] = useState(true);

 useEffect(() => {
 seedLocalData();

 let unsub: (() => void) | null = null;

 async function init() {
 // Safety net: exchange code if present in URL (from OAuth callback).
 if (supabase && typeof window !== "undefined") {
 const url = new URL(window.location.href);
 if (url.searchParams.has("code")) {
 try {
 await supabase.auth.exchangeCodeForSession(window.location.href);
 window.history.replaceState({}, document.title, url.pathname);
 } catch (e) {
 console.error("[auth] Fallback code exchange failed:", e);
 }
 }
 }

 // Subscribe to auth state changes first (so we don't miss any events).
 unsub = onAuthChange((p) => {
 setProfile(p);
 setLoading(false);
 });
 }

 init();

 return () => {
 if (unsub) unsub();
 };
 }, []);

 const signUp = useCallback(
 async (email: string, password: string, fullName: string, phone: string, coachSlug?: string | null) => {
 const { error, profile: p, needsConfirmation } = await signUpEmail(email, password, fullName, phone, coachSlug);
 if (!error && p) setProfile(p);
 return { error, needsConfirmation };
 },
 [],
 );

 const signIn = useCallback(async (email: string, password: string) => {
 const { error, profile: p } = await signInEmail(email, password);
 if (!error && p) setProfile(p);
 return { error, profile: p };
 }, []);

 const signInGoogle = useCallback(async (nextPath?: string) => {
 return await signInWithGoogle(nextPath);
 }, []);

 const signOutAsync = useCallback(async () => {
 await signOut();
 setProfile(null);
 }, []);

 return (
 <Ctx.Provider
 value={{
 profile,
 loading,
 isCoach: profile?.role === "coach" || profile?.role === "admin",
 isAdmin: profile?.role === "admin",
 signUp,
 signIn,
 signInGoogle,
 signOutAsync,
 }}
 >
 {children}
 </Ctx.Provider>
 );
}

export function useAuth() {
 const ctx = useContext(Ctx);
 if (!ctx) throw new Error("useAuth must be used within AuthProvider");
 return ctx;
}
