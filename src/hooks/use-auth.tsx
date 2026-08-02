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
  isCoach: boolean;
  signUp: (email: string, password: string, fullName: string, phone: string) => Promise<{ error: string | null }>;
  signIn: (email: string, password: string) => Promise<{ error: string | null; profile: Profile | null }>;
  signInGoogle: () => Promise<{ error: string | null }>;
  signOutAsync: () => Promise<void>;
};

const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    seedLocalData();

    // The /auth/callback route handler does the heavy lifting (server-side
    // code exchange). On the client, we just need to (a) check if there's
    // an existing session from the cookie that was set, and (b) subscribe
    // to auth state changes so we update the UI when the session lands.
    let unsub: (() => void) | null = null;

    async function init() {
      // If we landed back with ?code=... in URL (shouldn't happen now since
      // /auth/callback handles it, but as a safety net), try to exchange it.
      if (supabase && typeof window !== "undefined") {
        const url = new URL(window.location.href);
        if (url.searchParams.has("code")) {
          try {
            await supabase.auth.exchangeCodeForSession(window.location.href);
            // Clean the URL
            window.history.replaceState({}, document.title, url.pathname);
          } catch (e) {
            console.error("[auth] Fallback code exchange failed:", e);
          }
        }
      }

      // Subscribe to auth state changes. This fires immediately with the
      // current session (from cookie), and again whenever it changes.
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
    async (email: string, password: string, fullName: string, phone: string) => {
      const { error, profile: p } = await signUpEmail(email, password, fullName, phone);
      if (!error && p) setProfile(p);
      return { error };
    },
    [],
  );

  const signIn = useCallback(async (email: string, password: string) => {
    const { error, profile: p } = await signInEmail(email, password);
    if (!error && p) setProfile(p);
    return { error, profile: p };
  }, []);

  const signInGoogle = useCallback(async () => {
    return await signInWithGoogle();
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
        isCoach: profile?.role === "coach",
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
