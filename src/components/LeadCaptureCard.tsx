"use client";

import { useState } from "react";
import { Mail, MessageCircle, Send, CheckCircle2, Loader2, ExternalLink } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { COUNTRIES, DEFAULT_COUNTRY, formatWhatsappNumber, type Country } from "@/lib/countries";

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
 * User picks ONE contact method (Email OR WhatsApp):
 *   - WhatsApp: country code dropdown (with flag) + local number input.
 *     On submit, we save the lead and return a wa.me link. The user
 *     clicks "Open WhatsApp" → WhatsApp opens with a pre-filled message
 *     to the coach containing their results. They hit send → coach
 *     receives the lead.
 *   - Email: standard email input. On submit, we save the lead and
 *     try to send an email server-side (Resend). If Resend isn't
 *     configured, we fall back to a mailto: link.
 */
export function LeadCaptureCard({ toolSlug, resultSummary, resultJson }: Props) {
  const { lang } = useI18n();
  const isAr = lang === "ar";

  const [method, setMethod] = useState<ContactMethod>("whatsapp");
  const [email, setEmail] = useState("");
  const [country, setCountry] = useState<Country>(DEFAULT_COUNTRY);
  const [localNumber, setLocalNumber] = useState("");
  const [consent, setConsent] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [waMeUrl, setWaMeUrl] = useState<string | null>(null);
  const [emailSent, setEmailSent] = useState<boolean>(false);

  const fullWhatsapp = formatWhatsappNumber(country.dialCode, localNumber);

  const submit = async () => {
    setError(null);

    const cleanEmail = email.trim().toLowerCase();

    if (method === "email" && !cleanEmail) {
      setError(isAr ? "اكتب بريدك الإلكتروني" : "Enter your email");
      return;
    }
    if (method === "whatsapp" && !localNumber.trim()) {
      setError(isAr ? "اكتب رقم واتساب" : "Enter your WhatsApp number");
      return;
    }
    if (method === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      setError(isAr ? "البريد الإلكتروني غير صحيح" : "Invalid email");
      return;
    }
    if (method === "whatsapp" && localNumber.replace(/[^0-9]/g, "").length < 7) {
      setError(isAr ? "رقم الواتساب قصير جداً" : "WhatsApp number too short");
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
          whatsapp: method === "whatsapp" ? fullWhatsapp : null,
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
      setWaMeUrl(data.waMeUrl || null);
      setEmailSent(!!data.emailSent);
      setDone(true);
    } catch (e: any) {
      setError(e?.message || (isAr ? "حصل خطأ" : "Something went wrong"));
    } finally {
      setSubmitting(false);
    }
  };

  // ---- Success state: WhatsApp ----
  if (done && method === "whatsapp" && waMeUrl) {
    return (
      <div className="rounded-3xl border border-[#34c759]/30 bg-[#34c759]/5 p-6 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#34c759]">
          <CheckCircle2 className="h-6 w-6 text-white" />
        </div>
        <p className="mt-4 text-base font-medium text-[#1d1d1f]">
          {isAr ? "تم تسجيل طلبك ✅" : "Request saved ✅"}
        </p>
        <p className="mt-2 text-sm font-normal text-[#6e6e73]">
          {isAr
            ? "اضغط الزر ده عشان تفتح واتساب وتبعتلي نتائجك للكوتش أحمد. هيبعتك خطة مخصصة فوراً."
            : "Click the button below to open WhatsApp and send your results to Coach Ahmed. He'll reply with a personalized plan."}
        </p>
        <a
          href={waMeUrl}
          target="_blank"
          rel="noreferrer"
          className="mt-4 inline-flex items-center gap-2 rounded-full bg-[#34c759] px-6 py-3 text-sm font-normal text-white transition-opacity hover:opacity-90"
        >
          <MessageCircle className="h-4 w-4" />
          {isAr ? "افتح واتساب وابعت" : "Open WhatsApp & Send"}
          <ExternalLink className="h-3.5 w-3.5 opacity-70" />
        </a>
      </div>
    );
  }

  // ---- Success state: Email ----
  if (done && method === "email") {
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
              ? "هنبعتلك نتائجك على الإيميل خلال دقائق."
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
          <div className="flex gap-2">
            {/* Country code selector */}
            <div className="relative shrink-0">
              <select
                value={country.code}
                onChange={(e) => {
                  const found = COUNTRIES.find((c) => c.code === e.target.value);
                  if (found) setCountry(found);
                }}
                className="h-full appearance-none rounded-xl border border-[#d2d2d7] bg-white ps-3 pe-8 text-base font-normal outline-none focus:border-[#0071e3]"
                aria-label={isAr ? "كود الدولة" : "Country code"}
              >
                {COUNTRIES.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.flag} {c.dialCode}
                  </option>
                ))}
              </select>
              {/* Dropdown arrow */}
              <svg
                className="pointer-events-none absolute end-2 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6e6e73]"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.06l3.71-3.83a.75.75 0 111.08 1.04l-4.25 4.39a.75.75 0 01-1.08 0L5.21 8.27a.75.75 0 01.02-1.06z" clipRule="evenodd" />
              </svg>
            </div>
            {/* Local number input */}
            <input
              type="tel"
              value={localNumber}
              onChange={(e) => setLocalNumber(e.target.value)}
              placeholder={isAr ? "100 123 4567" : "100 123 4567"}
              dir="ltr"
              inputMode="numeric"
              className="flex-1 rounded-xl border border-[#d2d2d7] bg-white px-4 py-3 text-base font-normal outline-none focus:border-[#0071e3]"
            />
          </div>
        )}
      </div>

      {/* Preview of full WhatsApp number */}
      {method === "whatsapp" && localNumber && (
        <p className="mt-2 text-xs font-normal text-[#6e6e73]" dir="ltr">
          {isAr ? "الرقم الكامل: " : "Full number: "}
          <span className="font-medium text-[#1d1d1f]">{fullWhatsapp}</span>
        </p>
      )}

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
