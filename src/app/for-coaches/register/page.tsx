"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/hooks/use-auth";
import { SiteHeader } from "@/components/SiteHeader";

/**
 * COACH REGISTRATION FORM — the «تسجيل مباشر» endpoint of the
 * /for-coaches funnel (owner-approved instant registration).
 *
 * Flow: POST /api/coach/register (server creates the account with
 * role='coach', email confirmed) → auto sign-in with the password the
 * coach just chose → redirect to /coach. No email round trip.
 *
 * Honeypot field `website` (hidden from humans) — filled → API fakes
 * success without creating anything.
 */

const ERR_EN: Record<string, string> = {
  invalid_name: "Please enter your full name",
  invalid_email: "Please enter a valid email address",
  weak_password: "Password must be at least 8 characters",
  already_registered:
    "This email is already registered — log in instead or use another email",
  rate_limited: "Too many attempts — wait a few minutes and try again",
  signup_failed: "Something went wrong creating your account — try again",
};

export default function CoachRegisterPage() {
  const { lang } = useI18n();
  const isAr = lang === "ar";
  const router = useRouter();
  const { signIn } = useAuth();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/coach/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          full_name: fullName,
          email,
          password,
          phone,
          website: "", // honeypot — humans leave it empty
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
        message?: string;
      };

      if (!res.ok || !data.ok) {
        const code = data.error ?? "signup_failed";
        setError(isAr ? data.message || code : ERR_EN[code] || data.message || code);
        setLoading(false);
        return;
      }

      // Instant activation → sign in with the just-chosen password.
      const { error: signInErr } = await signIn(email, password);
      if (signInErr) {
        // Rare (server confirmed the account) — send him to login.
        setDone(true);
        setLoading(false);
        router.push("/auth");
        return;
      }
      setDone(true);
      setLoading(false);
      router.push("/coach");
    } catch {
      setError(
        isAr
          ? "فيه مشكلة في الاتصال — اتأكد من النت وجرب تاني"
          : "Connection problem — check your internet and try again",
      );
      setLoading(false);
    }
  };

  const inputCls =
    "mt-1.5 w-full rounded-2xl border border-[#d2d2d7] bg-white px-4 py-3 text-sm text-[#1d1d1f] outline-none transition-colors placeholder:text-[#a1a1a6] focus:border-[#0071e3] focus:ring-2 focus:ring-[#0071e3]/20";

  return (
    <div className="min-h-screen bg-[#f5f5f7] text-[#1d1d1f]">
      <SiteHeader variant="landing" />

      <main className="mx-auto max-w-md px-4 py-12 md:py-16">
        <div className="text-center">
          <span className="inline-block rounded-full bg-[#0071e3]/10 px-4 py-1.5 text-xs font-bold text-[#0071e3]">
            {isAr ? "تسجيل المدربين — تفعيل فوري" : "Coach registration — instant activation"}
          </span>
          <h1 className="mt-3 text-2xl font-semibold tracking-tight md:text-3xl">
            {isAr ? "أنشئ حسابك كمدرب" : "Create your coach account"}
          </h1>
          <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-[#6e6e73]">
            {isAr
              ? "دقيقة واحدة وحسابك جاهز: ضيف عملاءك، حدّد أسعارك بنفسك، واقبض منهم مباشرة."
              : "One minute and you're in: add your clients, set your own prices, and get paid directly."}
          </p>
        </div>

        {done ? (
          <div className="mt-8 rounded-3xl bg-white p-8 text-center ring-1 ring-[#e5e5ea]">
            <h2 className="text-lg font-bold">
              {isAr ? "تم إنشاء حسابك!" : "Your account is ready!"}
            </h2>
            <p className="mt-2 text-sm text-[#6e6e73]">
              {isAr
                ? "بنحوّلك دلوقتي إلى لوحة المدرب..."
                : "Taking you to your coach dashboard..."}
            </p>
          </div>
        ) : (
          <form
            onSubmit={submit}
            className="mt-8 rounded-3xl bg-white p-7 ring-1 ring-[#e5e5ea] md:p-8"
          >
            <label className="block text-sm font-medium">
              {isAr ? "الاسم الكامل" : "Full name"}
              <input
                type="text"
                required
                minLength={2}
                maxLength={120}
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className={inputCls}
                placeholder={isAr ? "مثال: أحمد محمد" : "e.g. Ahmed Mohamed"}
                autoComplete="name"
              />
            </label>

            <label className="mt-4 block text-sm font-medium">
              {isAr ? "البريد الإلكتروني" : "Email"}
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={inputCls}
                placeholder="coach@example.com"
                autoComplete="email"
                dir="ltr"
              />
            </label>

            <label className="mt-4 block text-sm font-medium">
              {isAr ? "كلمة السر (8 حروف على الأقل)" : "Password (min 8 characters)"}
              <span className="relative mt-1.5 block">
                <input
                  type={showPass ? "text" : "password"}
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={inputCls}
                  autoComplete="new-password"
                  dir="ltr"
                />
                <button
                  type="button"
                  onClick={() => setShowPass((v) => !v)}
                  className="absolute inset-y-0 end-3 my-auto h-fit text-xs font-semibold text-[#0071e3]"
                >
                  {showPass ? (isAr ? "إخفاء" : "Hide") : isAr ? "إظهار" : "Show"}
                </button>
              </span>
            </label>

            <label className="mt-4 block text-sm font-medium">
              {isAr ? "رقم الموبايل (اختياري)" : "Phone (optional)"}
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className={inputCls}
                placeholder="01xxxxxxxxx"
                autoComplete="tel"
                dir="ltr"
              />
            </label>

            {/* Honeypot — hidden from humans, catnip for bots */}
            <div className="absolute h-0 w-0 overflow-hidden opacity-0" aria-hidden="true">
              <label>
                Website
                <input
                  type="text"
                  name="website"
                  tabIndex={-1}
                  autoComplete="off"
                  defaultValue=""
                />
              </label>
            </div>

            {error && (
              <p className="mt-4 rounded-2xl bg-red-50 px-4 py-3 text-sm font-medium text-red-600">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="mt-6 w-full rounded-full bg-[#0071e3] py-3.5 text-sm font-semibold text-white shadow-lg shadow-[#0071e3]/25 transition-all duration-300 hover:bg-[#0077ed] disabled:opacity-60"
            >
              {loading
                ? isAr
                  ? "جاري إنشاء الحساب..."
                  : "Creating your account..."
                : isAr
                  ? "سجّل الآن — مجانًا"
                  : "Register now — free"}
            </button>

            <p className="mt-4 text-center text-xs leading-relaxed text-[#6e6e73]">
              {isAr
                ? "بالتسجيل أنت موافق على "
                : "By registering you agree to the "}
              <Link href="/terms" className="text-[#0071e3] hover:underline">
                {isAr ? "شروط الاستخدام" : "Terms"}
              </Link>
              {isAr ? " و" : " and "}
              <Link href="/privacy" className="text-[#0071e3] hover:underline">
                {isAr ? "سياسة الخصوصية" : "Privacy Policy"}
              </Link>
            </p>
          </form>
        )}

        <p className="mt-6 text-center text-sm text-[#6e6e73]">
          {isAr ? "عندك حساب بالفعل؟ " : "Already have an account? "}
          <Link href="/auth" className="font-semibold text-[#0071e3] hover:underline">
            {isAr ? "سجّل دخول" : "Log in"}
          </Link>
        </p>
        <p className="mt-2 text-center text-sm text-[#6e6e73]">
          <Link href="/for-coaches" className="text-[#0071e3] hover:underline">
            {isAr ? "ارجع لصفحة مميزات المدربين" : "Back to the coach landing page"}
          </Link>
        </p>
      </main>
    </div>
  );
}
