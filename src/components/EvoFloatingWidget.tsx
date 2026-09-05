"use client";

import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import { useEvoChat } from "@/lib/evo-chat-context";
import { useI18n } from "@/lib/i18n";
import { Send, X, ExternalLink, Loader2, Sparkles, Bookmark, Check } from "lucide-react";
import { VoiceMicButton } from "@/components/VoiceMicButton";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useCallback } from "react";

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

/**
 * MessageText — renders assistant message content with markdown-lite
 * inline link support: [label](url) becomes a real anchor. URLs are
 * restricted to site-relative or http(s) — safe by construction.
 * (Live answers arrive with a separate links[] array; this renderer
 * covers model-written markdown and any legacy persisted bodies.)
 */
function MessageText({ content }: { content: string }) {
  const MD_LINK = /\[([^\]]+)\]\(([^()\s]+)\)/g;
  const parts: React.ReactNode[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = MD_LINK.exec(content)) !== null) {
    if (m.index > last) parts.push(content.slice(last, m.index));
    const [, label, url] = m;
    const safe = /^(https?:\/\/|\/|#)/i.test(url);
    if (safe) {
      const external = /^https?:\/\//i.test(url);
      parts.push(
        external ? (
          <a
            key={m.index}
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-[#0071e3] underline underline-offset-2"
          >
            {label}
          </a>
        ) : (
          <a
            key={m.index}
            href={url}
            className="font-medium text-[#0071e3] underline underline-offset-2"
          >
            {label}
          </a>
        ),
      );
    } else {
      parts.push(m[0]);
    }
    last = m.index + m[0].length;
  }
  if (last < content.length) parts.push(content.slice(last));
  // dir="auto": each message renders by its own first strong character —
  // Arabic messages flow RTL, English LTR, so mixed AR/EN text keeps its
  // logical word order instead of scrambling between the two directions.
  return (
    <p dir="auto" className="text-sm font-normal leading-relaxed whitespace-pre-wrap">
      {parts}
    </p>
  );
}

export function EvoFloatingWidget() {
  const { lang } = useI18n();
  const isAr = lang === "ar";
  const router = useRouter();
  const {
    isOpen,
    isTyping,
    messages,
    dailyCount,
    dailyLimit,
    dailyLimitReached,
    isPaidTier,
    quota,
    openChat,
    closeChat,
    toggleChat,
    sendMessage,
  } = useEvoChat();

  // PHASE 69 — «احفظ كخطة»: persists the EVO plan text as a REAL plan row
  // via /api/plans/member-edit (plans RLS is coach-write-only, so the
  // member path runs server-side with ownership checks).
  const [savingPlanId, setSavingPlanId] = useState<string | null>(null);
  const [savedPlanIds, setSavedPlanIds] = useState<Set<string>>(new Set());
  const savePlan = useCallback(
    async (msg: { id: string; content: string; planKind?: string; planRequest?: string }) => {
      if (!msg.planKind || savingPlanId) return;
      setSavingPlanId(msg.id);
      try {
        const res = await fetch("/api/plans/member-edit", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            mode: "save-evo",
            kind: msg.planKind,
            title:
              msg.planRequest?.slice(0, 80) ||
              (isAr ? "خطة من EVO" : "Plan from EVO"),
            text: msg.content,
          }),
        });
        const json = await res.json().catch(() => null);
        if (!res.ok || !json?.ok) {
          throw new Error(json?.message || "save failed");
        }
        setSavedPlanIds((prev) => new Set(prev).add(msg.id));
        toast.success(
          isAr ? "تم حفظ الخطة في صفحة خططي ✓" : "Plan saved to your plans page ✓",
          { action: { label: isAr ? "افتح" : "Open", onClick: () => router.push("/plans") } },
        );
      } catch (e) {
        toast.error(
          e instanceof Error && e.message !== "save failed"
            ? e.message
            : isAr ? "تعذر حفظ الخطة — جرب تاني" : "Could not save the plan",
        );
      } finally {
        setSavingPlanId(null);
      }
    },
    [isAr, savingPlanId, router],
  );

  const [input, setInput] = useState("");
 // OWNER DIRECTIVE #1: voice questions (Web Speech API) — Arabic or English.
 const voiceLang = isAr ? "ar-EG" : "en-US";
 const handleVoiceTranscript = useCallback(
 (text: string) => setInput((prev) => (prev ? `${prev} ${text}` : text)),
 [],
 );
  const inputRef = useRef<HTMLInputElement>(null);

  // ── SCROLL LAW (OWNER 2026-08-27): the chat ALWAYS opens at the END of
  // the conversation, never the beginning. The old effect keyed on
  // [messages, isTyping] never fired on open — history had already loaded
  // while the drawer was closed (ref was null), so reopening showed the
  // TOP of the conversation. Now we scroll the CONTAINER itself:
  //   • on drawer open / history restore  → instant snap to the latest message
  //   • on new messages while open        → smooth follow
  // Container.scrollTo also avoids scrollIntoView's side effect of scrolling
  // the whole page behind the drawer.
  const scrollBodyRef = useRef<HTMLDivElement>(null);
  const pendingSnapRef = useRef(false);
  const wasOpenRef = useRef(false);

  useEffect(() => {
    if (isOpen && !wasOpenRef.current) pendingSnapRef.current = true;
    wasOpenRef.current = isOpen;
  }, [isOpen]);

  const scrollToLatest = useCallback((behavior: ScrollBehavior) => {
    const el = scrollBodyRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior });
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    // Double rAF: wait for the drawer layout (and restored history DOM) to
    // be committed, then snap/follow. Instant on open — smooth afterwards.
    let raf2 = 0;
    const raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => {
        scrollToLatest(pendingSnapRef.current ? "auto" : "smooth");
        pendingSnapRef.current = false;
      });
    });
    return () => {
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
    };
  }, [isOpen, messages, isTyping, scrollToLatest]);

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
  // T-AI-DEEP-AUDIT-V2 (D2 fix): "subscriber" = PAID tier from the resolved
  // membership, NOT merely being logged in. The old `!!profile` made free
  // accounts look unlimited: no countdown, no warning, and — after the
  // server 429 — an enabled-but-dead input (locks were gated on
  // `!isSubscriber`). Now every quota UI keys off dailyLimit/isPaidTier
  // which mirror the server's actual tier resolution.
  const isSubscriber = isPaidTier;

  return (
    <>
      {/* Floating Button — always visible (OWNER 2026-08-27: enlarged 36px → 48px).
          NO-COVER LAW: lifts above the cookie-consent banner via the
          --mhe-cookie-bar-h variable published by CookieConsent — a new
          visitor must always be able to reach EVO. */}
      {!isOpen && (
        <button
          onClick={openChat}
          className="fixed z-50 cursor-pointer rounded-full bg-[#0071e3] p-1.5 shadow-lg transition-all hover:scale-105 hover:shadow-xl"
          style={{
            [isAr ? "left" : "right"]: "20px",
            bottom: "calc(20px + var(--mhe-cookie-bar-h, 0px))",
          } as React.CSSProperties}
          aria-label={isAr ? "افتح محادثة EVO" : "Open EVO chat"}
        >
          {/* EVO profile image with pulse animation — image only, no text */}
          <span className="relative block">
            <Image
              src="/images/evo-standalone.jpg"
              alt="EVO"
              width={48}
              height={48}
              priority
              className="h-12 w-12 rounded-full object-cover ring-2 ring-white/40"
            />
            <span className="absolute inset-0 animate-ping rounded-full bg-[#0071e3] opacity-20" />
            {/* Online indicator */}
            <span className="absolute bottom-0 end-0 h-3.5 w-3.5 rounded-full bg-[#34c759] ring-2 ring-white" />
          </span>
        </button>
      )}

      {/* Drawer — slides in from the side */}
      {isOpen && (
        <>
          {/* Backdrop (transparent — doesn't block interaction with page) */}
          <div
            className="fixed inset-0 z-40 bg-black/20"
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
                <Image
                  src="/images/evo-standalone.jpg"
                  alt="EVO"
                  width={40}
                  height={40}
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
                <button
                  onClick={closeChat}
                  className="grid h-8 w-8 place-items-center rounded-full text-white/80 transition-colors hover:bg-white/10"
                  aria-label={isAr ? "إغلاق" : "Close"}
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* PHASE 69 — QUOTA METER: the advertised plan quotas are now
                VISIBLE (same tamper-proof ledger the server counts).
                2026-09-02: weekly cap (1+1 · Pro 2+2) + monthly total. */}
            {isSubscriber && quota && (
              <div className="border-b border-[#d2d2d7] bg-white px-4 py-1.5 text-center text-[10px] font-normal text-[#6e6e73]">
                <span>
                  {isAr
                    ? `الخطط الشهرية: تغذية ${quota.nutrition.used}/${quota.nutrition.unlimited ? "∞" : quota.nutrition.limit} · تمرين ${quota.workout.used}/${quota.workout.unlimited ? "∞" : quota.workout.limit}`
                    : `Monthly plans: nutrition ${quota.nutrition.used}/${quota.nutrition.unlimited ? "∞" : quota.nutrition.limit} · workout ${quota.workout.used}/${quota.workout.unlimited ? "∞" : quota.workout.limit}`}
                </span>
                {typeof quota.nutrition?.weeklyLimit === "number" && (
                  <span className="block">
                    {isAr
                      ? `هذا الأسبوع: تغذية ${quota.nutrition.weeklyUsed ?? 0}/${quota.nutrition.weeklyLimit} · تمرين ${quota.workout.weeklyUsed ?? 0}/${quota.workout.weeklyLimit}`
                      : `This week: nutrition ${quota.nutrition.weeklyUsed ?? 0}/${quota.nutrition.weeklyLimit} · workout ${quota.workout.weeklyUsed ?? 0}/${quota.workout.weeklyLimit}`}
                  </span>
                )}
              </div>
            )}

            {/* Messages area */}
            <div ref={scrollBodyRef} className="flex-1 overflow-y-auto bg-[#f5f5f7] p-4">
              {showWelcome ? (
                /* Welcome screen */
                <div className="flex h-full flex-col items-center justify-center text-center">
                  <Image
                    src="/images/evo-standalone.jpg"
                    alt="EVO"
                    width={80}
                    height={80}
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
                        {msg.role === "user" ? (
                          <p dir="auto" className="text-sm font-normal leading-relaxed whitespace-pre-wrap">
                            {msg.content}
                          </p>
                        ) : (
                          <MessageText content={msg.content} />
                        )}
                        {/* PHASE 69 — «احفظ كخطة» on the reply that answered a
                            plan-creation request (paid tiers) */}
                        {msg.role === "assistant" && isSubscriber && msg.planKind && (
                          <div className="mt-2 border-t border-black/10 pt-2">
                            {savedPlanIds.has(msg.id) ? (
                              <span className="inline-flex items-center gap-1 text-xs font-medium text-[#34c759]">
                                <Check className="h-3 w-3" />
                                {isAr ? "محفوظة في خططي" : "Saved to my plans"}
                              </span>
                            ) : (
                              <button
                                onClick={() => savePlan(msg)}
                                disabled={savingPlanId === msg.id}
                                className="inline-flex items-center gap-1.5 rounded-full bg-[#1d1d1f] px-3 py-1.5 text-xs font-medium text-white transition-opacity hover:opacity-85 disabled:opacity-50"
                              >
                                {savingPlanId === msg.id ? (
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                ) : (
                                  <Bookmark className="h-3 w-3" />
                                )}
                                {isAr ? "احفظ كخطة" : "Save as plan"}
                              </button>
                            )}
                          </div>
                        )}
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

                  {/* Rate limit warning — D2: keyed on the RESOLVED limit,
                      not on being logged in. */}
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
                        href="/memberships"
                        className="mt-3 inline-block rounded-full bg-[#0071e3] px-4 py-2 text-xs font-medium text-white"
                      >
                        {isAr ? "اشترك الآن" : "Subscribe now"}
                      </a>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Input area — D2: the countdown shows only for limited tiers
                (dailyLimit !== null); paid tiers chat without counters. */}
            <div className="border-t border-[#d2d2d7] bg-white p-3">
              {!isSubscriber && dailyLimit !== null && (
                <div className="mb-2 text-center text-[10px] font-normal text-[#6e6e73]">
                  {isAr
                    ? `${dailyLimit - dailyCount} رسائل متبقية اليوم`
                    : `${dailyLimit - dailyCount} messages left today`}
                </div>
              )}
              <form onSubmit={handleSubmit} className="flex items-center gap-2">
                <input
                  ref={inputRef}
                  dir="auto"
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
                <VoiceMicButton
                  lang={voiceLang}
                  onTranscript={handleVoiceTranscript}
                  disabled={isTyping || (dailyLimitReached && !isSubscriber)}
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
