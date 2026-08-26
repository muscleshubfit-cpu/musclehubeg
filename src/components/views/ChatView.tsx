"use client";

import { useEffect, useRef, useState } from "react";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/hooks/use-auth";
import { useNav } from "@/hooks/use-nav";
import { useEvoChat } from "@/lib/evo-chat-context";
import { getSwapUsage } from "@/lib/data";

/**
 * M5 fix: ChatView now uses EvoChatContext (the same context used by the
 * floating widget) instead of its own separate implementation. This
 * eliminates the dual codepath that wrote to chat_messages with different
 * field names + different persistence logic.
 *
 * The /chat page is now a full-screen view of the same chat state.
 */
export function ChatView() {
  const { t, lang } = useI18n();
  const { profile } = useAuth();
  const { navigate } = useNav();
  const isAr = lang === "ar";
  const evoChat = useEvoChat();
  const [input, setInput] = useState("");
  const [swapUsage, setSwapUsage] = useState<any>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Load swap usage (unique to /chat page — not in floating widget)
  useEffect(() => {
    if (!profile) return;
    getSwapUsage(profile.id).then(setSwapUsage);
  }, [profile]);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [evoChat?.messages, evoChat?.isTyping]);

  const send = async () => {
    if (!input.trim() || !evoChat) return;
    const text = input.trim();
    setInput("");
    await evoChat.sendMessage(text);
  };

  if (!evoChat) {
    return (
      <div className="py-20 text-center text-base font-normal text-[#6e6e73]">
        {t("common.loading")}
      </div>
    );
  }

  const messages = evoChat.messages;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">{t("chat.title")}</h1>
        <p className="mt-2 text-base font-normal text-[#6e6e73] md:text-lg">{t("chat.subtitle")}</p>
      </div>

      <div className="flex h-[60vh] flex-col overflow-hidden rounded-3xl bg-[#f5f5f7]">
        {/* Messages */}
        <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto p-6">
          {messages.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center text-center">
              <p className="text-xl font-semibold tracking-tight">EVO</p>
              <p className="mt-2 text-sm font-normal text-[#6e6e73]">{t("chat.welcome")}</p>
            </div>
          ) : (
            messages.map((m) => (
              <div key={m.id} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[75%] rounded-3xl px-5 py-3 text-base font-normal ${
                    m.role === "user"
                      ? "bg-[#0071e3] text-white"
                      : "bg-white text-[#1d1d1f]"
                  }`}
                >
                  {m.content}
                  {/* Display links if provided by the AI */}
                  {m.links && m.links.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {m.links.map((link, i) => (
                        <a
                          key={i}
                          href={link.url}
                          className="inline-block rounded-full bg-[#0071e3]/10 px-3 py-1 text-xs font-medium text-[#0071e3] transition-opacity hover:opacity-70"
                        >
                          {link.label}
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
          {evoChat.isTyping && (
            <div className="flex justify-start">
              <div className="rounded-3xl bg-white px-5 py-3 text-base font-normal text-[#6e6e73]">
                {t("chat.sending")}
              </div>
            </div>
          )}
        </div>

        {/* Input */}
        <div className="border-t border-[#d2d2d7] bg-white p-4">
          <div className="flex gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && send()}
              placeholder={t("chat.placeholder")}
              disabled={evoChat.isTyping}
              className="flex-1 rounded-full border border-[#d2d2d7] bg-[#f5f5f7] px-5 py-3 text-base font-normal outline-none focus:border-[#0071e3]"
            />
            <button
              onClick={send}
              disabled={evoChat.isTyping || !input.trim()}
              className="rounded-full bg-[#0071e3] px-6 py-3 text-base font-normal text-white transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {isAr ? "إرسال" : "Send"}
            </button>
            {messages.length > 0 && (
              <button
                onClick={evoChat.clearChat}
                disabled={evoChat.isTyping}
                className="rounded-full border border-[#d2d2d7] px-4 py-3 text-sm font-normal text-[#6e6e73] transition-colors hover:bg-[#f5f5f7] disabled:opacity-50"
                title={isAr ? "مسح المحادثة" : "Clear chat"}
              >
                {isAr ? "مسح" : "Clear"}
              </button>
            )}
          </div>

          {/* Swap quota */}
          {swapUsage && (
            <div className="mt-3 flex flex-wrap items-center gap-3 text-xs font-normal text-[#6e6e73]">
              <span>
                {isAr ? "تبديل الوجبات:" : "Meal swaps:"}{" "}
                <strong className={swapUsage.meal.remaining <= 0 && !swapUsage.meal.unlimited ? "text-[#ff3b30]" : "text-[#1d1d1f]"}>
                  {swapUsage.meal.unlimited ? "∞" : `${swapUsage.meal.remaining}/${swapUsage.meal.limit}`}
                </strong>
              </span>
              <span className="text-[#d2d2d7]">|</span>
              <span>
                {isAr ? "تبديل التمارين:" : "Workout swaps:"}{" "}
                <strong className={swapUsage.exercise.remaining <= 0 && !swapUsage.exercise.unlimited ? "text-[#ff3b30]" : "text-[#1d1d1f]"}>
                  {swapUsage.exercise.unlimited ? "∞" : `${swapUsage.exercise.remaining}/${swapUsage.exercise.limit}`}
                </strong>
              </span>
              {((swapUsage.meal.remaining <= 0 && !swapUsage.meal.unlimited) || (swapUsage.exercise.remaining <= 0 && !swapUsage.exercise.unlimited)) && (
                <button
                  onClick={() => navigate("support")}
                  className="ms-auto text-[#0071e3] transition-opacity hover:opacity-70"
                >
                  {isAr ? "اطلب تبديل من المدرب ›" : "Request coach swap ›"}
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
