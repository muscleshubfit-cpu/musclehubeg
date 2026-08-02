"use client";

import { createContext, useContext, useState, useCallback, type ReactNode } from "react";

export type View =
  | "landing"
  | "pricing"
  | "auth"
  | "checkout"
  | "dashboard"
  | "questionnaires"
  | "progress"
  | "plans"
  | "chat"
  | "support"
  | "coach"
  | "coach-client"
  | "coach-support"
  | "coach-payments"
  | "referral"
  | "blog";

type NavCtx = {
  view: View;
  params: Record<string, any>;
  navigate: (view: View, params?: Record<string, any>) => void;
};

const Ctx = createContext<NavCtx | null>(null);

export function NavProvider({ children }: { children: ReactNode }) {
  const [view, setView] = useState<View>("landing");
  const [params, setParams] = useState<Record<string, any>>({});

  const navigate = useCallback((v: View, p: Record<string, any> = {}) => {
    setView(v);
    setParams(p);
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  return <Ctx.Provider value={{ view, params, navigate }}>{children}</Ctx.Provider>;
}

export function useNav() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useNav must be used within NavProvider");
  return ctx;
}
