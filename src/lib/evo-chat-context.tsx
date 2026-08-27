"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from "react";
import { supabase, isSupabaseConfigured } from "@/lib/supabase/client";
import {
  buildPersistBody,
  parsePersistedBody,
} from "@/lib/evo-chat-links";

/**
 * EvoChatContext — manages EVO chat state across all pages.
 *
 * Chat history is stored in localStorage for anonymous users
 * (session-based, cleared on browser close).
 *
 * For authenticated users, chat history is synced to Supabase
 * `chat_messages` table for persistence across devices.
 *
 * OWNER DIRECTIVES (2026-08-27):
 *   1. EVO CHAT SURFACE LAW — the floating widget (EvoFloatingWidget)
 *      is the ONLY chat surface. The old /chat page was REMOVED and
 *      /chat now redirects to /evo. Any CTA anywhere opens the widget
 *      by dispatching the global EVO_OPEN_CHAT_EVENT below.
 *   2. BACK-BUTTON LAW — with the drawer open, the browser/hardware
 *      Back key must CLOSE the drawer, never navigate the site. A
 *      sentinel history entry (mheEvoChat) is pushed while open.
 *   3. LINK PERSISTENCE — assistant links used to vanish on reload
 *      (chat_messages has no links column). Links now travel INSIDE
 *      the persisted body as markdown bullets and are parsed back
 *      out on load, so a reopened conversation renders exactly like
 *      the live one.
 */

/** Global event that opens the floating EVO chat from ANY component. */
export const EVO_OPEN_CHAT_EVENT = "mhe:open-evo-chat";

/**
 * Open the floating EVO chat from anywhere (client-side no-op on server).
 * Works from any CTA regardless of provider depth — the provider listens
 * for this event and opens the drawer.
 */
export function openEvoFloatingChat() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(EVO_OPEN_CHAT_EVENT));
}

/** History sentinel flag marking the entry pushed while the drawer is open. */
const EVO_HISTORY_FLAG = "mheEvoChat";

export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: number;
  /** Optional links to platform pages (exercises, foods, programs, blog) */
  links?: Array<{
    label: string;
    url: string;
  }>;
};

export type ChatState = {
  messages: ChatMessage[];
  isOpen: boolean;
  isTyping: boolean;
  /** Number of messages sent by the user today (for rate limiting) */
  dailyCount: number;
  /** Date string (YYYY-MM-DD) for rate limit reset */
  dailyCountDate: string;
};

const STORAGE_KEY = "mhe:evo-chat";
const DAILY_LIMIT = 10; // anonymous users
const MAX_MESSAGES = 20;

type EvoChatContextType = {
  isOpen: boolean;
  isTyping: boolean;
  messages: ChatMessage[];
  dailyCount: number;
  dailyLimit: number;
  dailyLimitReached: boolean;
  openChat: () => void;
  closeChat: () => void;
  toggleChat: () => void;
  sendMessage: (content: string) => Promise<void>;
};

const EvoChatContext = createContext<EvoChatContextType | null>(null);

// Get today's date string
function getTodayString(): string {
  return new Date().toISOString().split("T")[0];
}

// Load state from localStorage (fallback for anonymous)
function loadLocalState(): ChatState {
  if (typeof window === "undefined") {
    return { messages: [], isOpen: false, isTyping: false, dailyCount: 0, dailyCountDate: getTodayString() };
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { messages: [], isOpen: false, isTyping: false, dailyCount: 0, dailyCountDate: getTodayString() };
    const state = JSON.parse(raw) as ChatState;
    const today = getTodayString();
    if (state.dailyCountDate !== today) { state.dailyCount = 0; state.dailyCountDate = today; }
    if (state.messages.length > MAX_MESSAGES) state.messages = state.messages.slice(-MAX_MESSAGES);
    return { ...state, isTyping: false };
  } catch {
    return { messages: [], isOpen: false, isTyping: false, dailyCount: 0, dailyCountDate: getTodayString() };
  }
}

// Save state to localStorage
function saveLocalState(state: ChatState) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      messages: state.messages,
      dailyCount: state.dailyCount,
      dailyCountDate: state.dailyCountDate,
    }));
  } catch { /* localStorage full or disabled */ }
}

// Link persistence helpers live in evo-chat-links.ts (pure + unit-tested).
// Convert a DB row to ChatMessage — restores persisted links too.
function rowToMessage(row: { id: string; role: string; body: string; created_at: string }): ChatMessage {
  const { content, links } = parsePersistedBody(row.body);
  return {
    id: row.id,
    role: row.role as "user" | "assistant",
    content,
    timestamp: new Date(row.created_at).getTime(),
    ...(links.length > 0 ? { links } : {}),
  };
}

export function EvoChatProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<ChatState>({
    messages: [], isOpen: false, isTyping: false, dailyCount: 0, dailyCountDate: getTodayString(),
  });
  // HYDRATION GATE (2026-08-27): no persistence writes until the initial
  // load (localStorage or Supabase) has completed. Without this, the
  // mount-time save effect wrote an EMPTY state over stored history —
  // under StrictMode's double-mount it raced between the two load runs
  // and wiped the seed, and for authenticated users it clobbered the
  // local cache while the async session check was still in flight.
  const [hydrated, setHydrated] = useState(false);

  // Load from Supabase (authenticated) or localStorage (anonymous) on mount
  useEffect(() => {
    let cancelled = false;
    (async () => {
      let restored: ChatState | null = null;
      if (isSupabaseConfigured && supabase) {
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            const { data } = await supabase
              .from("chat_messages")
              .select("*")
              .eq("client_id", user.id)
              .order("created_at", { ascending: false })
              .limit(MAX_MESSAGES);
            if (data && data.length > 0) {
              const messages = data.reverse().map(rowToMessage);
              restored = { messages, isOpen: false, isTyping: false, dailyCount: 0, dailyCountDate: getTodayString() };
            }
          }
        } catch { /* fall through to localStorage */ }
      }
      if (cancelled) return;
      // Anonymous, no Supabase, or no stored rows: load from localStorage
      if (!restored) restored = loadLocalState();
      setState(restored);
      setHydrated(true); // persistence writes may start only NOW
    })();
    return () => { cancelled = true; };
  }, []);

  // Save to localStorage on every change (for offline/cache) — ONLY after
  // the initial hydration finished, so a mount-time write can never wipe
  // history that has not been read yet (StrictMode-safe).
  useEffect(() => {
    if (!hydrated) return;
    saveLocalState(state);
  }, [state.messages, state.dailyCount, state.dailyCountDate, hydrated]);

  const openChat = useCallback(() => setState((prev) => ({ ...prev, isOpen: true })), []);
  const closeChat = useCallback(() => {
    setState((prev) => ({ ...prev, isOpen: false }));
    // Consume the sentinel entry so the NEXT Back press navigates the
    // site normally instead of re-closing an already-closed drawer.
    if (typeof window !== "undefined" && window.history.state?.[EVO_HISTORY_FLAG] === true) {
      window.history.back();
    }
  }, []);
  const toggleChat = useCallback(() => setState((prev) => ({ ...prev, isOpen: !prev.isOpen })), []);

  // ── BACK-BUTTON LAW: Back closes the drawer, never the page ─────────
  // While open we keep a sentinel history entry on the stack (preserving
  // Next.js' own state keys). Back pops it → popstate → close drawer.
  const isOpen = state.isOpen;
  useEffect(() => {
    if (!isOpen) return;
    if (window.history.state?.[EVO_HISTORY_FLAG] !== true) {
      window.history.pushState(
        { ...(window.history.state || {}), [EVO_HISTORY_FLAG]: true },
        "",
      );
    }
    const onPopState = () => {
      setState((prev) => (prev.isOpen ? { ...prev, isOpen: false } : prev));
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [isOpen]);

  // ── EVO CHAT SURFACE LAW: any CTA opens THIS drawer ─────────────────
  useEffect(() => {
    const onOpenEvent = () => setState((prev) => ({ ...prev, isOpen: true }));
    window.addEventListener(EVO_OPEN_CHAT_EVENT, onOpenEvent);
    return () => window.removeEventListener(EVO_OPEN_CHAT_EVENT, onOpenEvent);
  }, []);

  // OWNER DIRECTIVE #4 (2026-08-27): the "clear chat" feature was REMOVED.
  // It allowed users to wipe their chat_messages rows — the very evidence
  // the daily-limit counter relied on (rate-limit bypass), and the UI button
  // also made quota-reset feel legitimate. History is capped at MAX_MESSAGES
  // client-side and persisted server-side; there is no user-facing clear.

  const dailyLimitReached = state.dailyCount >= DAILY_LIMIT;

  const sendMessage = useCallback(
    async (content: string) => {
      if (!content.trim() || dailyLimitReached) return;

      const userMessage: ChatMessage = {
        id: `msg-${Date.now()}-user`,
        role: "user",
        content: content.trim(),
        timestamp: Date.now(),
      };

      setState((prev) => ({
        ...prev,
        messages: [...prev.messages, userMessage],
        isTyping: true,
        dailyCount: prev.dailyCount + 1,
      }));

      // Persist user message to Supabase (fire-and-forget)
      if (isSupabaseConfigured && supabase) {
        (async () => {
          try {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
              await supabase.from("chat_messages").insert({
                client_id: user.id,
                role: "user",
                body: content.trim(),
              });
            }
          } catch { /* non-blocking */ }
        })();
      }

      try {
        const response = await fetch("/api/ai/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: content.trim(),
            history: state.messages.slice(-10),
          }),
        });

        const data = await response.json();

        // G9 FIX (2026-08-27): non-2xx responses (429 rate limit etc.) are no
        // longer rendered as normal EVO replies nor persisted as assistant
        // messages in chat_messages.
        if (!response.ok) {
          if (response.status === 429) {
            // Sync the local counter so the input locks without more failed attempts.
            setState((prev) => ({
              ...prev,
              isTyping: false,
              dailyCount: Math.max(prev.dailyCount, DAILY_LIMIT),
              messages: [
                ...prev.messages,
                {
                  id: `msg-${Date.now()}-limit`,
                  role: "assistant" as const,
                  content:
                    typeof data?.response === "string"
                      ? data.response
                      : "وصلت الحد اليومي للمحادثة. اشترك في Premium أو Pro لمحادثة غير محدودة.",
                  timestamp: Date.now(),
                  links: Array.isArray(data?.links) ? data.links : [],
                },
              ],
            }));
            return; // NOT persisted to chat_messages
          }
          throw new Error(data?.error || `HTTP ${response.status}`);
        }

        const assistantMessage: ChatMessage = {
          id: `msg-${Date.now()}-assistant`,
          role: "assistant",
          content: data.response || "عذراً، لم أتمكن من الرد. حاول مرة أخرى.",
          timestamp: Date.now(),
          links: data.links || [],
        };

        setState((prev) => ({
          ...prev,
          messages: [...prev.messages, assistantMessage],
          isTyping: false,
        }));

        // Persist assistant message to Supabase (fire-and-forget)
        if (isSupabaseConfigured && supabase) {
          (async () => {
            try {
              const { data: { user } } = await supabase.auth.getUser();
              if (user) {
                await supabase.from("chat_messages").insert({
                  client_id: user.id,
                  role: "assistant",
                  // LINK PERSISTENCE: links ride inside the body as markdown
                  // bullets — parsePersistedBody restores them on reload.
                  body: buildPersistBody(data.response || "", data.links),
                });
              }
            } catch { /* non-blocking */ }
          })();
        }
      } catch (error) {
        const errorMessage: ChatMessage = {
          id: `msg-${Date.now()}-error`,
          role: "assistant",
          content: "عذراً، حصل خطأ في الاتصال. تأكد من الإنترنت وحاول مرة أخرى.",
          timestamp: Date.now(),
        };
        setState((prev) => ({ ...prev, messages: [...prev.messages, errorMessage], isTyping: false }));
      }
    },
    [state.messages, dailyLimitReached],
  );

  return (
    <EvoChatContext.Provider
      value={{
        isOpen: state.isOpen,
        isTyping: state.isTyping,
        messages: state.messages,
        dailyCount: state.dailyCount,
        dailyLimit: DAILY_LIMIT,
        dailyLimitReached,
        openChat,
        closeChat,
        toggleChat,
        sendMessage,
      }}
    >
      {children}
    </EvoChatContext.Provider>
  );
}

export function useEvoChat() {
  const ctx = useContext(EvoChatContext);
  if (!ctx) throw new Error("useEvoChat must be used within EvoChatProvider");
  return ctx;
}
