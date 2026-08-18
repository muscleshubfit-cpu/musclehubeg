"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from "react";

/**
 * EvoChatContext — manages EVO chat state across all pages.
 *
 * The widget state (open/closed) and chat history persist as the user
 * navigates between pages. Chat history is stored in localStorage for
 * anonymous users (session-based, cleared on browser close).
 *
 * For authenticated subscribers, chat history should be synced to
 * Supabase `chat_messages` table (future enhancement).
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

// Load state from localStorage
function loadState(): ChatState {
  if (typeof window === "undefined") {
    return {
      messages: [],
      isOpen: false,
      isTyping: false,
      dailyCount: 0,
      dailyCountDate: getTodayString(),
    };
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return {
        messages: [],
        isOpen: false,
        isTyping: false,
        dailyCount: 0,
        dailyCountDate: getTodayString(),
      };
    }

    const state = JSON.parse(raw) as ChatState;

    // Reset daily count if it's a new day
    const today = getTodayString();
    if (state.dailyCountDate !== today) {
      state.dailyCount = 0;
      state.dailyCountDate = today;
    }

    // Keep only last 20 messages (session memory for anonymous)
    if (state.messages.length > 20) {
      state.messages = state.messages.slice(-20);
    }

    return {
      ...state,
      isTyping: false, // always reset typing on load
    };
  } catch {
    return {
      messages: [],
      isOpen: false,
      isTyping: false,
      dailyCount: 0,
      dailyCountDate: getTodayString(),
    };
  }
}

// Save state to localStorage
function saveState(state: ChatState) {
  if (typeof window === "undefined") return;
  try {
    // Don't save isTyping or isOpen (transient state)
    const toSave = {
      messages: state.messages,
      dailyCount: state.dailyCount,
      dailyCountDate: state.dailyCountDate,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
  } catch {
    // localStorage might be full or disabled
  }
}

export function EvoChatProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<ChatState>({
    messages: [],
    isOpen: false,
    isTyping: false,
    dailyCount: 0,
    dailyCountDate: getTodayString(),
  });

  // Load from localStorage on mount (client-side only)
  useEffect(() => {
    const loaded = loadState();
    setState(loaded);
  }, []);

  // Save to localStorage whenever messages or dailyCount change
  useEffect(() => {
    saveState(state);
  }, [state.messages, state.dailyCount, state.dailyCountDate]);

  const openChat = useCallback(() => {
    setState((prev) => ({ ...prev, isOpen: true }));
  }, []);

  const closeChat = useCallback(() => {
    setState((prev) => ({ ...prev, isOpen: false }));
  }, []);

  const toggleChat = useCallback(() => {
    setState((prev) => ({ ...prev, isOpen: !prev.isOpen }));
  }, []);

  const clearChat = useCallback(() => {
    setState((prev) => ({
      ...prev,
      messages: [],
      dailyCount: 0,
      dailyCountDate: getTodayString(),
    }));
  }, []);

  const dailyLimitReached = state.dailyCount >= DAILY_LIMIT;

  const sendMessage = useCallback(
    async (content: string) => {
      if (!content.trim() || dailyLimitReached) return;

      // Add user message
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

      try {
        // Call the EVO chat API
        const response = await fetch("/api/ai/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: content.trim(),
            history: state.messages.slice(-10), // send last 10 messages for context
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
      } catch (error) {
        const errorMessage: ChatMessage = {
          id: `msg-${Date.now()}-error`,
          role: "assistant",
          content:
            "عذراً، حصل خطأ في الاتصال. تأكد من الإنترنت وحاول مرة أخرى.",
          timestamp: Date.now(),
        };

        setState((prev) => ({
          ...prev,
          messages: [...prev.messages, errorMessage],
          isTyping: false,
        }));
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
