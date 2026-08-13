"use client";

import { useEffect, useRef, useState } from "react";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/hooks/use-auth";
import { useNav } from "@/hooks/use-nav";
import { listChat, addChat, getSwapUsage } from "@/lib/data";

export function ChatView() {
  const { t, lang } = useI18n();
  const { profile } = useAuth();
  const { navigate } = useNav();
  const isAr = lang === "ar";
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [swapUsage, setSwapUsage] = useState<any>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!profile) return;
    (async () => {
      const [data, usage] = await Promise.all([
        listChat(profile.id),
        getSwapUsage(profile.id),
      ]);
      setMessages(data);
      setSwapUsage(usage);
      setLoading(false);
    })();
  }, [profile]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const send = async () => {
    if (!input.trim() || !profile) return;
    const text = input.trim();
    setInput("");
    setSending(true);

    const userMsg = {
      id: "tmp-" + Date.now(),
      client_id: profile.id,
      role: "user" as const,
      body: text,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMsg]);

    try {
      await addChat(profile.id, "user", text);
      const history = [...messages, userMsg].slice(-10).map((m) => ({
        role: m.role,
        content: m.body,
      }));

      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          history,
          userId: profile.id,
          userName: profile.full_name,
        }),
      });

      let reply: string;
      if (res.ok) {
        const data = await res.json();
        reply = data.reply || (isAr ? "عذراً، لم أتمكن من الرد الآن." : "Sorry, I couldn't respond right now.");
      } else {
        reply = generateFallbackReply(text);
      }

      const aiMsg = {
        id: "tmp-ai-" + Date.now(),
        client_id: profile.id,
        role: "assistant" as const,
        body: reply,
        created_at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, aiMsg]);
      await addChat(profile.id, "assistant", reply);
    } catch {
      const reply = generateFallbackReply(text);
      const aiMsg = {
        id: "tmp-ai-" + Date.now(),
        client_id: profile.id,
        role: "assistant" as const,
        body: reply,
        created_at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, aiMsg]);
      await addChat(profile.id, "assistant", reply);
    } finally {
      setSending(false);
    }
  };

  if (loading)
    return (
      <div className="py-20 text-center text-base font-normal text-[#6e6e73]">
        {t("common.loading")}
      </div>
    );

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
                  {m.body}
                </div>
              </div>
            ))
          )}
          {sending && (
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
              disabled={sending}
              className="flex-1 rounded-full border border-[#d2d2d7] bg-[#f5f5f7] px-5 py-3 text-base font-normal outline-none focus:border-[#0071e3]"
            />
            <button
              onClick={send}
              disabled={sending || !input.trim()}
              className="rounded-full bg-[#0071e3] px-6 py-3 text-base font-normal text-white transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {isAr ? "إرسال" : "Send"}
            </button>
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

function generateFallbackReply(input: string): string {
  const text = input.toLowerCase();
  if (text.includes("protein") || text.includes("بروتين")) {
    return "Aim for 1.6–2.2 g of protein per kg of bodyweight. For an 80 kg person, that's 128–176 g/day. Spread across 4 meals for best absorption.";
  }
  if (text.includes("water") || text.includes("ماء") || text.includes("مياه")) {
    return "A good baseline is 30–40 ml per kg of bodyweight. Add 500 ml around training and more if you sweat heavily or live in a hot climate.";
  }
  if (text.includes("weight") || text.includes("وزن") || text.includes("fat") || text.includes("دهون")) {
    return "For sustainable fat loss, aim for a 300–500 kcal daily deficit (≈0.4–0.5 kg/week). Keep protein high, train hard, and re-check every 2 weeks.";
  }
  if (text.includes("cardio") || text.includes("كارديو")) {
    return "Cardio is optional for fat loss but great for heart health. 2–3 sessions of 20–30 min/week is plenty on top of strength training.";
  }
  if (text.includes("workout") || text.includes("تمرين") || text.includes("training")) {
    return "Stick to progressive overload on compound lifts (squat, bench, deadlift, row). Add 2.5 kg or 1 rep when you hit the top of the rep range with good form.";
  }
  return "شكراً لسؤالك! الكوتش الذكي غير متاح حالياً مؤقتاً. يمكنك أيضاً فتح تذكرة دعم من صفحة الدعم وسيرد عليك الكوتش أحمد مباشرة.";
}
