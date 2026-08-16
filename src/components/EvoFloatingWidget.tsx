"use client";

import { useState, useRef, useEffect } from "react";
import { useEvoChat } from "@/lib/evo-chat-context";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/hooks/use-auth";
import { Send, X, Trash2, ExternalLink, Loader2, Sparkles } from "lucide-react";

/**
 * EvoFloatingWidget — floating EVO chat icon + slide-in drawer.
 *
 * Appears on ALL pages (added to root layout).
 * The icon floats at the bottom corner with a pulse animation.
 * Clicking opens a drawer (not a modal) so the user stays on the page.
 *
 * Features:
 *   - EVO profile image in the floating button
 *   - Drawer with chat history + input
 *   - Typing indicator (3 animated dots)
 *   - Links in AI responses (clickable, open in same tab)
 *   - Rate limit indicator for anonymous users
 *   - Clear chat button
 *   - Doesn't navigate away from current page
 */

export function EvoFloatingWidget() {
  const { lang } = useI18n();
  const isAr = lang === "ar";
  const { profile } = useAuth();
  const {
    isOpen,
    isTyping,
    messages,
    dailyCount,
    dailyLimit,
    dailyLimitReached,
    openChat,
    closeChat,
    toggleChat,
    sendMessage,
    clearChat,
  } = useEvoChat();

  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isTyping]);

  // Focus input when drawer opens
  useEffect(() => {
    if (isOpen && inputRef.current && !dailyLimitReached) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [isOpen, dailyLimitReached]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isTyping || dailyLimitReached) return;
    sendMessage(input);
    setInput("");
  };

  // Welcome message when chat is empty
  const showWelcome = messages.length === 0;
  const isSubscriber = !!profile;

  return (
    <>
      {/* Floating Button — always visible */}
      {!isOpen && (
        <button
          onClick={openChat}
          className="fixed bottom-5 z-50 flex items-center gap-2 rounded-full bg-[#0071e3] p-1.5 pe-4 text-white shadow-lg transition-all hover:scale-105 hover:shadow-xl"
          style={{ [isAr ? "left" : "right"]: "20px" } as React.CSSProperties}
          aria-label={isAr ? "افتح محادثة EVO" : "Open EVO chat"}
        >
          {/* EVO profile image with pulse animation */}
          <span className="relative">
            <img
              src="/images/evo-standalone.jpg"
              alt="EVO"
              className="h-11 w-11 rounded-full object-cover ring-2 ring-white/30"
            />
            <span className="absolute inset-0 animate-ping rounded-full bg-[#0071e3] opacity-20" />
            {/* Online indicator */}
            <span className="absolute bottom-0 end-0 h-3 w-3 rounded-full bg-[#34c759] ring-2 ring-white" />
          </span>
          <span className="text-sm font-medium">
            {isAr ? "اسأل EVO" : "Ask EVO"}
          </span>
        </button>
      )}

      {/* Drawer — slides in from the side */}
      {isOpen && (
        <>
          {/* Backdrop (transparent — doesn't block interaction with page) */}
          <div
            className="fixed inset-0 z-40 bg-black/5"
            onClick={closeChat}
          />

          {/* Drawer */}
          <aside
            className="fixed bottom-0 top-0 z-50 flex w-full max-w-[380px] flex-col bg-white shadow-2xl"
            style={{
              [isAr ? "left" : "right"]: 0,
              animation: isAr
                ? "slideInRight 0.3s ease-out"
                : "slideInLeft 0.3s ease-out",
            }}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-[#d2d2d7] bg-gradient-to-r from-[#0071e3] to-[#8b5cf6] p-4 text-white">
              <div className="flex items-center gap-3">
                <img
                  src="/images/evo-standalone.jpg"
                  alt="EVO"
                  className="h-10 w-10 rounded-full object-cover ring-2 ring-white/30"
                />
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-base font-semibold">EVO</span>
                    <Sparkles className="h-3.5 w-3.5" />
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="h-2 w-2 rounded-full bg-[#34c759]" />
                    <span className="text-[10px] text-white/80">
                      {isAr ? "متاح الآن" : "Online now"}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1">
                {messages.length > 0 && (
                  <button
                    onClick={() => {
                      if (
                        confirm(
                          isAr
                            ? "هل تريد مسح المحادثة؟"
                            : "Clear the conversation?",
                        )
                      ) {
                        clearChat();
                      }
                    }}
                    className="grid h-8 w-8 place-items-center rounded-full text-white/80 transition-colors hover:bg-white/10"
                    aria-label={isAr ? "مسح المحادثة" : "Clear chat"}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
                <button
                  onClick={closeChat}
                  className="grid h-8 w-8 place-items-center rounded-full text-white/80 transition-colors hover:bg-white/10"
                  aria-label={isAr ? "إغلاق" : "Close"}
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Messages area */}
            <div className="flex-1 overflow-y-auto bg-[#f5f5f7] p-4">
              {showWelcome ? (
                /* Welcome screen */
                <div className="flex h-full flex-col items-center justify-center text-center">
                  <img
                    src="/images/evo-standalone.jpg"
                    alt="EVO"
                    className="h-20 w-20 rounded-2xl object-cover"
                  />
                  <h3 className="mt-4 text-lg font-semibold">EVO</h3>
                  <p className="mt-1 max-w-[260px] text-sm font-normal text-[#6e6e73]">
                    {isAr
                      ? "محرك أداء ذكي. اسألني عن التمارين، الأكلات، التغذية، أو أي حاجة رياضية."
                      : "Smart performance engine. Ask me about exercises, foods, nutrition, or anything fitness."}
                  </p>
                  {/* Suggested questions */}
                  <div className="mt-6 w-full space-y-2">
                    {[
                      isAr
                        ? "كم سعرة صدور دجاج؟"
                        : "How many calories in chicken breast?",
                      isAr
                        ? "إزاي أعمل بنش بريس؟"
                        : "How to do bench press?",
                      isAr
                        ? "عايز برنامج للمبتدئين"
                        : "I want a beginner program",
                      isAr
                        ? "إيه أفضل بروتين؟"
                        : "What's the best protein?",
                    ].map((q) => (
                      <button
                        key={q}
                        onClick={() => {
                          sendMessage(q);
                        }}
                        className="block w-full rounded-2xl bg-white p-3 text-start text-sm font-normal text-[#1d1d1f] transition-colors hover:bg-[#e5e5e7]"
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                /* Chat messages */
                <div className="space-y-3">
                  {messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex ${
                        msg.role === "user" ? "justify-end" : "justify-start"
                      }`}
                    >
                      <div
                        className={`max-w-[85%] rounded-2xl px-4 py-2.5 ${
                          msg.role === "user"
                            ? "bg-[#0071e3] text-white"
                            : "bg-white text-[#1d1d1f]"
                        }`}
                      >
                        <p className="text-sm font-normal leading-relaxed whitespace-pre-wrap">
                          {msg.content}
                        </p>
                        {/* Links */}
                        {msg.links && msg.links.length > 0 && (
                          <div className="mt-2 space-y-1 border-t border-black/10 pt-2">
                            {msg.links.map((link, i) => (
                              <a
                                key={i}
                                href={link.url}
                                className="flex items-center gap-1.5 text-xs font-medium text-[#0071e3] hover:underline"
                              >
                                <ExternalLink className="h-3 w-3" />
                                {link.label}
                              </a>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}

                  {/* Typing indicator */}
                  {isTyping && (
                    <div className="flex justify-start">
                      <div className="flex items-center gap-1 rounded-2xl bg-white px-4 py-3">
                        <span className="h-2 w-2 animate-bounce rounded-full bg-[#0071e3] [animation-delay:-0.3s]" />
                        <span className="h-2 w-2 animate-bounce rounded-full bg-[#0071e3] [animation-delay:-0.15s]" />
                        <span className="h-2 w-2 animate-bounce rounded-full bg-[#0071e3]" />
                      </div>
                    </div>
                  )}

                  {/* Rate limit warning */}
                  {dailyLimitReached && !isSubscriber && (
                    <div className="rounded-2xl bg-[#ff9500]/10 p-4 text-center">
                      <p className="text-sm font-medium text-[#ff9500]">
                        {isAr
                          ? `وصلت الحد المجاني (${dailyLimit} رسائل/يوم)`
                          : `Free limit reached (${dailyLimit} messages/day)`}
                      </p>
                      <p className="mt-1 text-xs font-normal text-[#6e6e73]">
                        {isAr
                          ? "اشترك عشان تكمل المحادثة بلا حدود"
                          : "Subscribe to continue chatting without limits"}
                      </p>
                      <a
                        href="/pricing"
                        className="mt-3 inline-block rounded-full bg-[#0071e3] px-4 py-2 text-xs font-medium text-white"
                      >
                        {isAr ? "اشترك الآن" : "Subscribe now"}
                      </a>
                    </div>
                  )}

                  <div ref={messagesEndRef} />
                </div>
              )}
            </div>

            {/* Input area */}
            <div className="border-t border-[#d2d2d7] bg-white p-3">
              {!isSubscriber && (
                <div className="mb-2 text-center text-[10px] font-normal text-[#6e6e73]">
                  {isAr
                    ? `${dailyLimit - dailyCount} رسائل متبقية اليوم`
                    : `${dailyLimit - dailyCount} messages left today`}
                </div>
              )}
              <form onSubmit={handleSubmit} className="flex items-center gap-2">
                <input
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder={
                    dailyLimitReached && !isSubscriber
                      ? isAr
                        ? "وصلت الحد المجاني"
                        : "Limit reached"
                      : isAr
                        ? "اكتب سؤالك..."
                        : "Type your question..."
                  }
                  disabled={isTyping || (dailyLimitReached && !isSubscriber)}
                  className="flex-1 rounded-full border border-[#d2d2d7] bg-[#f5f5f7] px-4 py-2.5 text-sm font-normal outline-none focus:border-[#0071e3] disabled:opacity-50"
                />
                <button
                  type="submit"
                  disabled={
                    !input.trim() || isTyping || (dailyLimitReached && !isSubscriber)
                  }
                  className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#0071e3] text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                  aria-label={isAr ? "إرسال" : "Send"}
                >
                  {isTyping ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4 rtl:rotate-180" />
                  )}
                </button>
              </form>
            </div>
          </aside>
        </>
      )}

      {/* Animations */}
      <style jsx>{`
        @keyframes slideInRight {
          from {
            transform: translateX(-100%);
          }
          to {
            transform: translateX(0);
          }
        }
        @keyframes slideInLeft {
          from {
            transform: translateX(100%);
          }
          to {
            transform: translateX(0);
          }
        }
      `}</style>
    </>
  );
}
