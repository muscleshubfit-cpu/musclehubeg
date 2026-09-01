"use client";

import { useState } from "react";
import { Mail, Send, CheckCircle2, Loader2 } from "lucide-react";
import { useI18n } from "@/lib/i18n";

/**
 * NewsletterForm — Phase 72 (owner request)
 *
 * Daily/weekly newsletter subscription form. Lives in the site footer
 * (variant="footer") and on the homepage (variant="home").
 *
 * On submit the subscriber is saved in the `tool_leads` table with
 * tool_slug="newsletter" and type="newsletter" (via POST /api/tools/lead).
 * No email is sent on subscription — just a confirmation message.
 */
export function NewsletterForm({ variant = "footer" }: { variant?: "footer" | "home" }) {
  const { lang } = useI18n();
  const isAr = lang === "ar";

  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setError(null);

    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail) {
      setError(isAr ? "اكتب بريدك الإلكتروني" : "Enter your email");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      setError(isAr ? "البريد الإلكتروني غير صحيح" : "Invalid email");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/tools/lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tool_slug: "newsletter",
          email: cleanEmail,
          lang,
        }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        setError(data.error || (isAr ? "حصل خطأ" : "Something went wrong"));
        return;
      }
      setDone(true);
    } catch (e: any) {
      setError(e?.message || (isAr ? "حصل خطأ" : "Something went wrong"));
    } finally {
      setSubmitting(false);
    }
  };

  const inputClasses =
    variant === "home"
      ? "w-full rounded-full border border-[#d2d2d7] bg-white px-5 py-3 text-base font-normal outline-none focus:border-[#0071e3]"
      : "w-full rounded-xl border border-[#d2d2d7] bg-white px-4 py-3 text-sm font-normal outline-none focus:border-[#0071e3]";

  // ---- Success state ----
  if (done) {
    return (
      <div
        className={`flex items-center gap-3 rounded-2xl border border-[#34c759]/30 bg-[#34c759]/5 ${
          variant === "home" ? "p-5" : "p-4"
        }`}
      >
        <CheckCircle2 className="h-5 w-5 shrink-0 text-[#34c759]" />
        <div>
          <p className={`font-medium text-[#1d1d1f] ${variant === "home" ? "text-base" : "text-sm"}`}>
            {isAr ? "تم الاشتراك بنجاح!" : "You're subscribed!"}
          </p>
          <p className="mt-0.5 text-xs font-normal text-[#6e6e73]">
            {isAr
              ? "ستصلك أحدث النصائح والعروض أولاً بأول — مجاناً."
              : "You'll receive our latest tips and offers — free."}
          </p>
        </div>
      </div>
    );
  }

  // ---- Form ----
  return (
    <div>
      {variant === "home" ? (
        <div className="text-center">
          <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-[#0071e3]/10">
            <Mail className="h-6 w-6 text-[#0071e3]" />
          </span>
          <h2 className="mt-4 text-2xl font-semibold tracking-tight text-[#1d1d1f] md:text-3xl">
            {isAr ? "النشرة البريدية المجانية" : "The free newsletter"}
          </h2>
          <p className="mx-auto mt-2 max-w-md text-base font-normal text-[#6e6e73]">
            {isAr
              ? "نصائح تدريب وتغذية يومية توصلك على بريدك، مجاناً تماماً."
              : "Daily training and nutrition tips straight to your inbox — completely free."}
          </p>
        </div>
      ) : (
        <div>
          <p className="text-sm font-semibold text-[#1d1d1f]">
            {isAr ? "النشرة البريدية المجانية" : "Free newsletter"}
          </p>
          <p className="mt-1 text-xs font-normal text-[#6e6e73]">
            {isAr
              ? "نصائح تدريب وتغذية توصلك أولاً بأول."
              : "Training & nutrition tips, straight to you."}
          </p>
        </div>
      )}

      <div className={variant === "home" ? "mx-auto mt-6 flex max-w-md flex-col gap-2 sm:flex-row" : "mt-3"}>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder={isAr ? "بريدك الإلكتروني" : "Your email"}
          dir="ltr"
          className={inputClasses}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              submit();
            }
          }}
        />
        <button
          type="button"
          onClick={submit}
          disabled={submitting}
          className={`flex shrink-0 items-center justify-center gap-2 bg-[#0071e3] font-normal text-white transition-opacity hover:opacity-90 disabled:opacity-50 ${
            variant === "home"
              ? "rounded-full px-6 py-3 text-sm"
              : "mt-2 w-full rounded-xl px-4 py-3 text-sm sm:mt-0"
          }`}
        >
          {submitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              {isAr ? "جارٍ الاشتراك..." : "Subscribing..."}
            </>
          ) : (
            <>
              <Send className="h-4 w-4" />
              {isAr ? "اشترك الآن مجاناً" : "Subscribe free"}
            </>
          )}
        </button>
      </div>

      {error && (
        <p className={`mt-2 text-sm font-normal text-[#ff3b30] ${variant === "home" ? "text-center" : ""}`}>
          {error}
        </p>
      )}

      <p className={`mt-2 text-xs font-normal text-[#8e8e93] ${variant === "home" ? "text-center" : ""}`}>
        {isAr ? "مفيش سبام. تقدر تلغي الاشتراك في أي وقت." : "No spam. Unsubscribe anytime."}
      </p>
    </div>
  );
}
