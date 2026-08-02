"use client";

import { useEffect, useRef, useState } from "react";
import { Bot, Send, User } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/hooks/use-auth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { listChat, addChat } from "@/lib/data";

export function ChatView() {
  const { t } = useI18n();
  const { profile } = useAuth();
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!profile) return;
    (async () => {
      const data = await listChat(profile.id);
      setMessages(data);
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

    // Optimistic: show user message immediately
    const userMsg = {
      id: "tmp-" + Date.now(),
      client_id: profile.id,
      role: "user" as const,
      body: text,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMsg]);

    try {
      // Persist user message
      await addChat(profile.id, "user", text);

      // Build history for AI (last 10 messages)
      const history = [...messages, userMsg].slice(-10).map((m) => ({
        role: m.role,
        content: m.body,
      }));

      // Call AI API
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          history,
          clientContext: { name: profile.full_name },
        }),
      });

      let reply: string;
      if (res.ok) {
        const data = await res.json();
        reply = data.reply || "عذراً، لم أتمكن من الرد الآن.";
      } else {
        // Fallback to canned response if AI fails
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
      // If anything fails, show a fallback reply
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

  if (loading) return <div className="text-muted-foreground">{t("common.loading")}</div>;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold md:text-3xl">{t("chat.title")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("chat.subtitle")}</p>
      </div>

      <Card className="flex h-[60vh] flex-col overflow-hidden shadow-card">
        <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto scrollbar-thin p-4">
          {messages.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center text-center text-sm text-muted-foreground">
              <Bot className="mb-2 h-10 w-10 text-primary" />
              {t("chat.welcome")}
            </div>
          ) : (
            messages.map((m) => (
              <div
                key={m.id}
                className={`flex gap-2 ${m.role === "user" ? "flex-row-reverse" : ""}`}
              >
                <div
                  className={`grid h-8 w-8 shrink-0 place-items-center rounded-full ${
                    m.role === "user" ? "bg-secondary text-primary" : "bg-gradient-primary text-primary-foreground"
                  }`}
                >
                  {m.role === "user" ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
                </div>
                <div
                  className={`max-w-[75%] rounded-2xl px-4 py-2 text-sm ${
                    m.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-foreground"
                  }`}
                >
                  {m.body}
                </div>
              </div>
            ))
          )}
          {sending && (
            <div className="flex gap-2">
              <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-gradient-primary text-primary-foreground">
                <Bot className="h-4 w-4" />
              </div>
              <div className="rounded-2xl bg-muted px-4 py-2 text-sm text-muted-foreground">{t("chat.sending")}</div>
            </div>
          )}
        </div>

        <div className="border-t border-border p-3">
          <div className="flex gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && send()}
              placeholder={t("chat.placeholder")}
              disabled={sending}
            />
            <Button onClick={send} disabled={sending || !input.trim()} className="gap-2">
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </Card>
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
