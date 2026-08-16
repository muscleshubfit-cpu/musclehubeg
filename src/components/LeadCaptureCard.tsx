"use client";

import { useState } from "react";
import { Mail, Send, CheckCircle2, Loader2 } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

type ToolSlug =
  | "calorie-calculator"
  | "bmi-calculator"
  | "macro-calculator"
  | "body-fat-calculator";

type Props = {
  toolSlug: ToolSlug;
  /** Short human-readable summary, e.g. "TDEE: 2500 kcal · Protein: 188g" */
  resultSummary: string;
  /** Structured result object — stored as JSON for re-creating the message later */
  resultJson?: Record<string, any>;
};

/**
 * LeadCaptureCard — appears on the result page of each free tool.
 *
 * Email-only flow (WhatsApp removed per user request):
 *   - User enters their email.
 *   - On submit, we save the lead to the database AND send a real
 *     email (via Resend, server-side) with the user's results in a
 *     branded HTML template.
 *   - If Resend is not configured, we still save the lead and show
 *     a "we'll send shortly" message (graceful degradation).
 */
export function LeadCaptureCard({ toolSlug, resultSummary, resultJson }: Props) {
  const { lang } = useI18n();
  const isAr = lang === "ar";

  const [email, setEmail] = useState("");
  const [consent, setConsent] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [emailSent, setEmailSent] = useState<boolean>(false);

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
          tool_slug: toolSlug,
          email: cleanEmail,
          result_summary: resultSummary,
          result_json: resultJson,
          lang,
          consent,
        }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        setError(data.error || (isAr ? "حصل خطأ" : "Something went wrong"));
        return;
      }
      setEmailSent(!!data.emailSent);
      setDone(true);
    } catch (e: any) {
      setError(e?.message || (isAr ? "حصل خطأ" : "Something went wrong"));
    } finally {
      setSubmitting(false);
    }
  };

  // ---- Success state ----
  if (done) {
    return (
      <div className="rounded-3xl border border-[#34c759]/30 bg-[#34c759]/5 p-6 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#34c759]">
          <CheckCircle2 className="h-6 w-6 text-white" />
        </div>
        <p className="mt-4 text-base font-medium text-[#1d1d1f]">
          {isAr ? "تم تسجيل طلبك ✅" : "Request saved ✅"}
        </p>
        <p className="mt-2 text-sm font-normal text-[#6e6e73]">
          {emailSent
            ? isAr
              ? `بعتنا نتائجك على ${email} ✉️`
              : `We sent your results to ${email} ✉️`
            : isAr
              ? "هنرسلك نتائجك على الإيميل خلال دقائق."
              : "We'll send your results to your email shortly."}
        </p>
      </div>
    );
  }

  // ---- Form state ----
  return (
    <div className="rounded-3xl border border-[#0071e3]/15 bg-[#0071e3]/[0.03] p-6 md:p-7">
      {/* Header */}
      <div className="flex items-start gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-[#0071e3]/10 text-xl">
          ✉️
        </span>
        <div>
          <h3 className="text-base font-semibold tracking-tight text-[#1d1d1f]">
            {isAr ? "ابعتلي نتائجي على الإيميل" : "Send me my results by email"}
          </h3>
          <p className="mt-1 text-sm font-normal text-[#6e6e73]">
            {isAr
              ? "اكتب إيميلك وهنرسلك نتائجك فوراً (اختياري)."
              : "Enter your email and we'll send your results instantly (optional)."}
          </p>
        </div>
      </div>

      {/* Email input */}
      <div className="mt-5">
        <div className="relative">
          <Mail className="absolute start-3 top-1/2 h-5 w-5 -translate-y-1/2 text-[#6e6e73]" />
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={isAr ? "you@example.com" : "you@example.com"}
            dir="ltr"
            className="w-full rounded-xl border border-[#d2d2d7] bg-white ps-11 pe-4 py-3 text-base font-normal outline-none focus:border-[#0071e3]"
          />
        </div>
      </div>

      {/* Consent checkbox */}
      <label className="mt-3 flex items-start gap-2 text-xs font-normal text-[#6e6e73]">
        <input
          type="checkbox"
          checked={consent}
          onChange={(e) => setConsent(e.target.checked)}
          className="mt-0.5 h-4 w-4 rounded border-[#d2d2d7]"
        />
        <span>
          {isAr
            ? "موافق إن الكوتش أحمد زكي يكلّمني بخصوص خطتي الرياضية وعروض الاشتراك."
            : "I agree to be contacted by Coach Ahmed Zake about my fitness plan and subscription offers."}
        </span>
      </label>

      {/* Error */}
      {error && (
        <p className="mt-3 text-sm font-normal text-[#ff3b30]">{error}</p>
      )}

      {/* Submit */}
      <button
        type="button"
        onClick={submit}
        disabled={submitting}
        className="mt-4 flex w-full items-center justify-center gap-2 rounded-full bg-[#0071e3] px-6 py-3 text-sm font-normal text-white transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        {submitting ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            {isAr ? "جارٍ الإرسال..." : "Sending..."}
          </>
        ) : (
          <>
            <Send className="h-4 w-4" />
            {isAr ? "ابعتلي النتائج" : "Send me my results"}
          </>
        )}
      </button>

      <p className="mt-3 text-center text-xs font-normal text-[#6e6e73]">
        {isAr
          ? "مفيش سبام. تقدر تلغي الاشتراك في أي وقت."
          : "No spam. Unsubscribe anytime."}
      </p>
    </div>
  );
}
