/**
 * Email + name validation — Phase 73 (owner request):
 * «فلترة الواجهة: فحص البريد برمجياً قبل الإرسال، منع الرموز الغريبة
 *  والحقول الفارغة، وعرض رسالة خطأ واضحة».
 *
 * Shared by BOTH sides:
 *   - client components (LeadCaptureCard, NewsletterForm) — pre-submit
 *   - server routes (/api/send-email, /api/tools/lead) — defense in depth
 *
 * Strict rules for the email:
 *   - only ASCII letters/digits and . _ % + - in the local part
 *   - exactly one @, a domain with at least one dot, TLD of 2+ letters
 *   - no spaces, no Arabic/non-Latin characters, no "..", no weird symbols
 *   - max 254 chars total, max 64 chars in the local part
 */

export type EmailIssue = "empty" | "weird_chars" | "bad_format" | "too_long";

const EMAIL_FULL_RE =
  /^[A-Za-z0-9._%+-]+@[A-Za-z0-9]([A-Za-z0-9-]*[A-Za-z0-9])?(\.[A-Za-z0-9]([A-Za-z0-9-]*[A-Za-z0-9])?)*\.[A-Za-z]{2,}$/;

const EMAIL_LOCAL_RE = /^[A-Za-z0-9._%+-]{1,64}$/;

export function validateEmailStrict(
  raw: string,
): { ok: true; email: string } | { ok: false; issue: EmailIssue } {
  const email = String(raw ?? "")
    .trim()
    .toLowerCase();

  if (!email) return { ok: false, issue: "empty" };
  if (email.length > 254) return { ok: false, issue: "too_long" };
  // non-ASCII (Arabic letters, emojis, RTL marks …) = weird symbols → block
  if (/[^\x21-\x7E]/.test(email)) return { ok: false, issue: "weird_chars" };
  if (email.includes("..")) return { ok: false, issue: "weird_chars" };
  if (!EMAIL_FULL_RE.test(email)) return { ok: false, issue: "bad_format" };

  const local = email.split("@")[0] ?? "";
  if (!EMAIL_LOCAL_RE.test(local)) return { ok: false, issue: "bad_format" };

  return { ok: true, email };
}

/** Clear bilingual error for each failure reason (Arabic-first, simple). */
export function emailErrorMessage(issue: EmailIssue, isAr: boolean): string {
  switch (issue) {
    case "empty":
      return isAr ? "اكتب بريدك الإلكتروني الأول" : "Enter your email";
    case "weird_chars":
      return isAr
        ? "البريد فيه رموز غير مسموحة — اكتبه بالحروف الإنجليزية بالشكل ده: name@example.com"
        : "Your email has unsupported characters — write it in English, like name@example.com";
    case "too_long":
      return isAr
        ? "البريد الإلكتروني طويل أكتر من اللازم"
        : "This email address is too long";
    case "bad_format":
    default:
      return isAr
        ? "البريد الإلكتروني غير مكتمل — لازم يحتوي على @ ونقطة، زي: name@example.com"
        : "Incomplete email — it needs an @ and a dot, like name@example.com";
  }
}

/**
 * Name field (optional): Arabic or English letters, spaces, and the
 * everyday marks ' - . only. Digits, emojis, @, <>/\\ and other symbols
 * are rejected. Returns null when the name is fine (or intentionally
 * empty — the field is optional).
 */
const NAME_ALLOWED_RE = /^[A-Za-z\u00C0-\u024F\u0600-\u06FF\u0750-\u077F][A-Za-z\u00C0-\u024F\u0600-\u06FF\u0750-\u077F\s'’\-.]*$/;

export function validateNameStrict(raw: string, isAr: boolean): string | null {
  const name = String(raw ?? "").trim();
  if (!name) return null; // optional field
  if (name.length < 2) {
    return isAr ? "الاسم قصير جداً" : "The name is too short";
  }
  if (name.length > 80) {
    return isAr ? "الاسم طويل أكتر من اللازم" : "The name is too long";
  }
  if (!NAME_ALLOWED_RE.test(name)) {
    return isAr
      ? "الاسم لازم يكون حروف عربية أو إنجليزية فقط — من غير أرقام أو رموز"
      : "Use Arabic or English letters only — no digits or symbols in the name";
  }
  return null;
}
