"use client";

import { useState } from "react";
import { Mail, MessageCircle, Send, CheckCircle2, Loader2 } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

type ToolSlug =
  | "calorie-calculator"
  | "bmi-calculator"
  | "macro-calculator"
  | "body-fat-calculator";

type ContactMethod = "email" | "whatsapp";

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
 * User picks ONE contact method (Email OR WhatsApp), enters their info,
 * and we save them as a lead in the `tool_leads` table. Both fields are
 * optional in the schema, but the form requires at least one.
 *
 * The card is collapsible and clearly labeled as optional, so it never
 * feels like a wall blocking the user from their results.
 */
export function LeadCaptureCard({ toolSlug, resultSummary, resultJson }: Props) {
  const { lang } = useI18n();
  const isAr = lang === "ar";

  const [method, setMethod] = useState<ContactMethod>("whatsapp");
  const [email, setEmail] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [consent, setConsent] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setError(null);

    const cleanEmail = email.trim().toLowerCase();
    const cleanWhatsapp = whatsapp.trim();

    // Validate based on selected method
    if (method === "email" && !cleanEmail) {
      setError(isAr ? "اكتب بريدك الإلكتروني" : "Enter your email");
      return;
    }
    if (method === "whatsapp" && !cleanWhatsapp) {
      setError(isAr ? "اكتب رقم واتساب" : "Enter your WhatsApp number");
      return;
    }
    if (method === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      setError(isAr ? "البريد الإلكتروني غير صحيح" : "Invalid email");
      return;
    }
    if (method === "whatsapp" && !/^[+0-9][0-9\s-]{6,}$/.test(cleanWhatsapp)) {
      setError(isAr ? "رقم الواتساب غير صحيح" : "Invalid WhatsApp number");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/tools/lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tool_slug: toolSlug,
          email: method === "email" ? cleanEmail : null,
          whatsapp: method === "whatsapp" ? cleanWhatsapp : null,
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
      setDone(true);
    } catch (e: any) {
      setError(e?.message || (isAr ? "حصل خطأ" : "Something went wrong"));
    } finally {
      setSubmitting(false);
    }
  };

  if (done) {
    return (
      <div className="rounded-3xl border border-[#34c759]/30 bg-[#34c759]/5 p-6 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#34c759]">
          <CheckCircle2 className="h-6 w-6 text-white" />
        </div>
        <p className="mt-4 text-base font-medium text-[#1d1d1f]">
          {isAr ? "تم استلام طلبك ✅" : "Request received ✅"}
        </p>
        <p className="mt-2 text-sm font-normal text-[#6e6e73]">
          {isAr
            ? method === "email"
              ? "هنرسلك نتائجك على الإيميل خلال دقائق."
              : "هنرسلك نتائجك على واتساب خلال دقائق."
            : method === "email"
              ? "We'll send your results to your email shortly."
              : "We'll send your results on WhatsApp shortly."}
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-3xl border border-[#0071e3]/15 bg-[#0071e3]/[0.03] p-6 md:p-7">
      {/* Header */}
      <div className="flex items-start gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-[#0071e3]/10 text-xl">
          📨
        </span>
        <div>
          <h3 className="text-base font-semibold tracking-tight text-[#1d1d1f]">
            {isAr ? "ابعتلي نتائجي" : "Send me my results"}
          </h3>
          <p className="mt-1 text-sm font-normal text-[#6e6e73]">
            {isAr
              ? "اختار طريقة الاستلام (اختياري — تقدر تتجاهل)."
              : "Pick how you'd like to receive them (optional — you can skip)."}
          </p>
        </div>
      </div>

      {/* Method toggle */}
      <div className="mt-5 grid grid-cols-2 gap-2 rounded-full bg-[#f5f5f7] p-1">
        <button
          type="button"
          onClick={() => setMethod("whatsapp")}
          className={cn(
            "flex items-center justify-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-all",
            method === "whatsapp"
              ? "bg-[#1d1d1f] text-white"
              : "text-[#6e6e73] hover:text-[#1d1d1f]",
          )}
        >
          <MessageCircle className="h-4 w-4" />
          {isAr ? "واتساب" : "WhatsApp"}
        </button>
        <button
          type="button"
          onClick={() => setMethod("email")}
          className={cn(
            "flex items-center justify-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-all",
            method === "email"
              ? "bg-[#1d1d1f] text-white"
              : "text-[#6e6e73] hover:text-[#1d1d1f]",
          )}
        >
          <Mail className="h-4 w-4" />
          {isAr ? "إيميل" : "Email"}
        </button>
      </div>

      {/* Input field */}
      <div className="mt-4">
        {method === "email" ? (
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={isAr ? "you@example.com" : "you@example.com"}
            dir="ltr"
            className="w-full rounded-xl border border-[#d2d2d7] bg-white px-4 py-3 text-base font-normal outline-none focus:border-[#0071e3]"
          />
        ) : (
          <input
            type="tel"
            value={whatsapp}
            onChange={(e) => setWhatsapp(e.target.value)}
            placeholder={isAr ? "+20 100 000 0000" : "+20 100 000 0000"}
            dir="ltr"
            className="w-full rounded-xl border border-[#d2d2d7] bg-white px-4 py-3 text-base font-normal outline-none focus:border-[#0071e3]"
          />
        )}
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
