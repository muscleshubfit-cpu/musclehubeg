"use client";

import { useState } from "react";
import { Mail, Send, CheckCircle2, Loader2 } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import {
  validateEmailStrict,
  emailErrorMessage,
  validateNameStrict,
} from "@/lib/email-validation";

type ToolSlug =
  | "calorie-calculator"
  | "bmi-calculator"
  | "macro-calculator"
  | "body-fat-calculator"
  | "water-tracker"
  | "meal-planner";

type Props = {
  toolSlug: ToolSlug;
  /** Short human-readable summary, e.g. "TDEE: 2500 kcal · Protein: 188g" */
  resultSummary: string;
  /** Structured result object — stored as JSON and rendered inside the email */
  resultJson?: Record<string, unknown>;
};

/**
 * LeadCaptureCard — Phase 72 (owner request)
 *
 * Shows on the result page of every free tool AFTER the visitor calculates
 * their results. The visitor enters their email (name optional) and receives
 * a professional HTML email with their full results + smart tips.
 *
 * The lead (email + name + tool) is saved in the `tool_leads` table FIRST,
 * then the email is sent via POST /api/send-email (nodemailer on the server).
 */
export function LeadCaptureCard({ toolSlug, resultSummary, resultJson }: Props) {
  const { lang } = useI18n();
  const isAr = lang === "ar";

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setError(null);

    // Phase 73: strict client-side filtering — nothing is sent before the
    // email and the name pass the format/characters rules.
    const emailCheck = validateEmailStrict(email);
    if (!emailCheck.ok) {
      setError(emailErrorMessage(emailCheck.issue, isAr));
      return;
    }
    const nameError = validateNameStrict(name, isAr);
    if (nameError) {
      setError(nameError);
      return;
    }

    const cleanEmail = emailCheck.email;

    setSubmitting(true);
    try {
      const res = await fetch("/api/send-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tool_slug: toolSlug,
          email: cleanEmail,
          name: name.trim() || undefined,
          result_summary: resultSummary,
          result_json: resultJson,
          lang,
        }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        setError(data.error || (isAr ? "حصل خطأ" : "Something went wrong"));
        return;
      }
      setDone(true);
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : (isAr ? "حصل خطأ" : "Something went wrong"),
      );
    } finally {
      setSubmitting(false);
    }
  };

  // ---- Success state ----
  if (done) {
    return (
      <div className="marble-card p-6 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[var(--text)]">
          <CheckCircle2 className="h-6 w-6 text-[var(--bg)]" />
        </div>
        <p className="mt-4 text-base font-medium text-[var(--text)]">
          {isAr ? "تم الإرسال!" : "Sent!"}
        </p>
        <p className="mt-2 text-sm font-normal text-[var(--muted-foreground)]">
          {isAr
            ? `تفقد بريدك الإلكتروني خلال دقائق — بعتنا لك نتائجك كاملة مع نصائح ذكية على (${email}).`
            : `Check your inbox in a few minutes — we've sent your full results with smart tips to (${email}).`}
        </p>
        <p className="mt-2 text-xs font-normal text-[var(--muted-foreground)]">
          {isAr
            ? "مكتبتك الرسائل غير المرغوبة (Spam) لو الرسالة وصلت متأخر."
            : "If it doesn't arrive, check your Spam folder."}
        </p>
      </div>
    );
  }

  // ---- Form state ----
  return (
    <div className="marble-card p-6 md:p-7">
      {/* Header */}
      <div className="flex items-start gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl border border-[var(--edge)] bg-[var(--tint)]">
          <Mail className="h-5 w-5 text-[var(--muted-2)]" />
        </span>
        <div>
          <h3 className="text-base font-semibold tracking-tight text-[var(--text)]">
            {isAr ? "استلم نتائجك كاملة على بريدك" : "Get your full results by email"}
          </h3>
          <p className="mt-1 text-sm font-normal text-[var(--muted-foreground)]">
            {isAr
              ? "أدخل بريدك الإلكتروني لتصلك النتائج كاملة مع نصائح ذكية."
              : "Enter your email to receive your full results with smart tips."}
          </p>
        </div>
      </div>

      {/* Name (optional) */}
      <div className="mt-5">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={isAr ? "اسمك (اختياري)" : "Your name (optional)"}
          maxLength={80}
          className="w-full rounded-xl border border-[var(--edge)] bg-[var(--card)] px-4 py-3 text-base font-normal outline-none focus:border-[var(--chrome-edge)]"
        />
      </div>

      {/* Email input */}
      <div className="mt-3">
        <div className="relative">
          <Mail className="absolute start-3 top-1/2 h-5 w-5 -translate-y-1/2 text-[var(--muted-foreground)]" />
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="name@example.com"
            dir="ltr"
            maxLength={254}
            inputMode="email"
            className="w-full rounded-xl border border-[var(--edge)] bg-[var(--card)] ps-11 pe-4 py-3 text-base font-normal outline-none focus:border-[var(--chrome-edge)]"
          />
        </div>
      </div>

      {/* Error */}
      {error && (
        <p role="alert" className="mt-3 text-sm font-normal text-[#ff3b30]">{error}</p>
      )}

      {/* Submit */}
      <button
        type="button"
        onClick={submit}
        disabled={submitting}
        className="btn-chrome mt-4 flex w-full items-center justify-center gap-2 px-6 py-3 text-sm disabled:opacity-50"
      >
        {submitting ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            {isAr ? "جارٍ الإرسال..." : "Sending..."}
          </>
        ) : (
          <>
            <Send className="h-4 w-4" />
            {isAr ? "أرسل لي النتائج على بريدي" : "Email me my results"}
          </>
        )}
      </button>

      <p className="mt-3 text-center text-xs font-normal text-[var(--muted-foreground)]">
        {isAr
          ? "مجاني تماماً. مفيش سبام، وتقدر تطلب حذف بريدك في أي وقت."
          : "Completely free. No spam — ask us to remove your email anytime."}
      </p>
    </div>
  );
}
