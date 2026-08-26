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

/**
 * EvoChatContext — manages EVO chat state across all pages.
 *
 * Chat history is stored in localStorage for anonymous users
 * (session-based, cleared on browser close).
 *
 * For authenticated users, chat history is synced to Supabase
 * `chat_messages` table for persistence across devices.
 */

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
  clearChat: () => void;
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

// Convert a DB row to ChatMessage
function rowToMessage(row: { id: string; role: string; body: string; created_at: string }): ChatMessage {
  return {
    id: row.id,
    role: row.role as "user" | "assistant",
    content: row.body,
    timestamp: new Date(row.created_at).getTime(),
  };
}

export function EvoChatProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<ChatState>({
    messages: [], isOpen: false, isTyping: false, dailyCount: 0, dailyCountDate: getTodayString(),
  });

  // Load from Supabase (authenticated) or localStorage (anonymous) on mount
  useEffect(() => {
    (async () => {
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
              setState((prev) => ({ ...prev, messages }));
              return; // Don't load from localStorage
            }
          }
        } catch { /* fall through to localStorage */ }
      }
      // Anonymous or no Supabase: load from localStorage
      const loaded = loadLocalState();
      setState(loaded);
    })();
  }, []);

  // Save to localStorage on every change (for offline/cache)
  useEffect(() => {
    saveLocalState(state);
  }, [state.messages, state.dailyCount, state.dailyCountDate]);

  const openChat = useCallback(() => setState((prev) => ({ ...prev, isOpen: true })), []);
  const closeChat = useCallback(() => setState((prev) => ({ ...prev, isOpen: false })), []);
  const toggleChat = useCallback(() => setState((prev) => ({ ...prev, isOpen: !prev.isOpen })), []);

  const clearChat = useCallback(async () => {
    // Delete from Supabase if authenticated
    if (isSupabaseConfigured && supabase) {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await supabase.from("chat_messages").delete().eq("client_id", user.id);
        }
      } catch { /* non-blocking */ }
    }
    setState((prev) => ({ ...prev, messages: [], isTyping: false }));
    // M-audit fix: do NOT reset dailyCount on clearChat — prevents rate
    // limit bypass (user could clear chat → reset counter → send more).
    // The daily limit is also enforced server-side now (C15 fix), but
    // keeping the client counter consistent is still important for UX.
  }, []);

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
                  body: data.response || "",
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
        clearChat,
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
