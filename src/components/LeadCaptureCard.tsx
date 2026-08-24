"use client";

import { useState } from "react";
import { Mail, Send, CheckCircle2, Loader2 } from "lucide-react";
import { useI18n } from "@/lib/i18n";

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
 * LeadCaptureCard — simple newsletter signup on the result page of each free tool.
 *
 * Collects the visitor's email and stores it as a lead in the `tool_leads`
 * table. The coach can later use these emails for newsletter campaigns.
 * No email is sent to the user — just a "subscribed" confirmation.
 */
export function LeadCaptureCard({ toolSlug, resultSummary, resultJson }: Props) {
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
          tool_slug: toolSlug,
          email: cleanEmail,
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
          {isAr ? "تم الاشتراك ✅" : "Subscribed ✅"}
        </p>
        <p className="mt-2 text-sm font-normal text-[#6e6e73]">
          {isAr
            ? `سجّلنا إيميلك (${email}) في النشرة البريدية. هنوصلك بأحدث النصائح والعروض.`
            : `We've added ${email} to our newsletter. You'll receive our latest tips and offers.`}
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
            {isAr ? "اشترك في النشرة البريدية" : "Subscribe to our newsletter"}
          </h3>
          <p className="mt-1 text-sm font-normal text-[#6e6e73]">
            {isAr
              ? "نصائح أسبوعية للتغذية واللياقة + عروض حصرية على الاشتراكات."
              : "Weekly nutrition & fitness tips + exclusive subscription offers."}
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
            {isAr ? "جارٍ الاشتراك..." : "Subscribing..."}
          </>
        ) : (
          <>
            <Send className="h-4 w-4" />
            {isAr ? "اشترك الآن" : "Subscribe now"}
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
