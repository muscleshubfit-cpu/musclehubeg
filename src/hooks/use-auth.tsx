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

    // Critical: @supabase/ssr's createBrowserClient does NOT auto-detect the
    // `?code=...` param returned from OAuth redirects. We must explicitly
    // exchange it for a session. Without this, the user lands back on the
    // site after Google login but no session is created.
    async function handleOAuthCallback() {
      if (!supabase) return;
      const url = typeof window !== "undefined" ? window.location.href : "";
      const hasCode = typeof window !== "undefined" && new URL(window.location.href).searchParams.has("code");
      if (hasCode) {
        try {
          const { data, error } = await supabase.auth.exchangeCodeForSession(url);
          if (error) {
            console.error("[auth] OAuth code exchange failed:", error.message);
          } else if (data?.session?.user) {
            // After successful exchange, clean the URL so the code param doesn't linger
            const cleanUrl = window.location.pathname + window.location.hash;
            window.history.replaceState({}, document.title, cleanUrl);
          }
        } catch (e) {
          console.error("[auth] OAuth callback exception:", e);
        }
      }
    }

    handleOAuthCallback().then(() => {
      const unsub = onAuthChange((p) => {
        setProfile(p);
        setLoading(false);
      });
      // Note: we don't return unsub here because the effect cleanup runs on unmount;
      // we keep the subscription alive for the component's lifetime.
      // We rely on the closure to call unsub when the effect re-runs or component unmounts.
      // However, React's StrictMode in dev may double-invoke; in production it's fine.
      // To be safe, store cleanup on the effect's return.
      // (We restructure slightly below.)
      cleanupRef.current = unsub;
    });

    const cleanupRef: { current: (() => void) | null } = { current: null };
    return () => {
      if (cleanupRef.current) cleanupRef.current();
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
