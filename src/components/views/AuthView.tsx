"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useI18n } from "@/lib/i18n";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LanguageToggle } from "@/components/LanguageToggle";
import { GoogleIcon } from "@/components/GoogleIcon";
import { useNav } from "@/hooks/use-nav";
import { useAuth } from "@/hooks/use-auth";
import { isSupabaseConfigured } from "@/lib/supabase/client";
import { passwordBreachCount } from "@/lib/password-breach";
import { safeNext } from "@/lib/safe-redirect";
import { setCoachSlugCookie, clearCoachSlugCookie, getCoachSlugCookie } from "@/lib/coach-cookie";
import { toast } from "sonner";

const SLUG_RE = /^[a-z0-9-]{3,40}$/;

export function AuthView({ mode, next, coach }: { mode: "login" | "signup"; next?: string; coach?: string }) {
  const { t, lang } = useI18n();
  const { navigate } = useNav();
  const router = useRouter();
  const { signIn, signUp, signInGoogle, profile } = useAuth();
  const isSignup = mode === "signup";
  const isAr = lang === "ar";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [needsConfirmation, setNeedsConfirmation] = useState(false);

  // COACH ATTRIBUTION (0033): the signup CTA on a coach's landing page
  // links here as /auth?mode=signup&coach={slug}. Persist the slug in a
  // 30-day cookie so it survives BOTH signup paths — email metadata
  // (primary) and the Google OAuth round-trip (claimed later by the
  // CoachSlugClaimer via /api/coach/claim).
  const coachSlug = coach && SLUG_RE.test(coach) ? coach : getCoachSlugCookie();
  useEffect(() => {
    if (coach && SLUG_RE.test(coach)) setCoachSlugCookie(coach);
  }, [coach]);

  // After a successful login, redirect to `next` if provided (e.g. /checkout),
  // otherwise fall back to the role's console. Phase 51: admin gets his
  // /admin console here too (was landing on the coach's clients list).
  const goAfterLogin = (isCoach: boolean) => {
    if (next) {
      // Validate `next` to prevent open-redirect attacks (C17 fix).
      // Use a hard navigation so query params (?tier=...&months=...) are preserved.
      window.location.href = safeNext(next);
      return;
    }
    if (profile?.role === "admin") {
      router.push("/admin");
      return;
    }
    navigate(isCoach ? "coach" : "dashboard");
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isSignup) {
        // Phase 134: mirror the server's password_min_length=8 client-side
        // (LOGIN keeps no minLength so legacy 6-7 char passwords still work).
        if (password.length < 8) {
          toast.error(
            isAr
              ? "كلمة المرور يجب أن تكون 8 أحرف على الأقل"
              : "Password must be at least 8 characters",
          );
          return;
        }
        // Phase 134: block known-breached passwords (HIBP k-anonymity —
        // only the first 5 SHA-1 chars leave the device; fail-open so
        // signup availability never depends on a third-party API).
        const breaches = await passwordBreachCount(password);
        if (breaches > 0) {
          toast.error(
            isAr
              ? "كلمة المرور هذه ظهرت في تسريبات بيانات معروفة — اختر كلمة مرور أخرى"
              : "This password appeared in known data breaches — choose a different one",
          );
          return;
        }
        const { error, needsConfirmation: needsConf } = await signUp(
          email,
          password,
          fullName,
          phone,
          coachSlug,
        );
        if (error) {
          toast.error(error);
        } else if (needsConf) {
          // M6 fix: email confirmation required — don't redirect to dashboard.
          // Show a "check your email" screen instead.
          // Attribution already happened at insert time (metadata → 0033
          // trigger) — the cookie's job is done.
          clearCoachSlugCookie();
          setNeedsConfirmation(true);
        } else {
          toast.success(t("auth.accountCreated"));
          goAfterLogin(false);
        }
      } else {
        const { error, profile } = await signIn(email, password);
        if (error) {
          toast.error(error);
        } else {
          toast.success(t("auth.welcomeBack"));
          goAfterLogin(profile?.role !== "client");
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setGoogleLoading(true);
    try {
      const { error } = await signInGoogle(next);
      if (error) {
        toast.error(t("auth.googleError"));
        setGoogleLoading(false);
      }
    } catch {
      setGoogleLoading(false);
      toast.error(t("auth.googleError"));
    }
  };

  // M6 fix: show "check your email" screen when email confirmation is required
  if (needsConfirmation) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[var(--bg)] px-4 text-center text-[var(--text)]">
        <div className="mx-auto max-w-md">
          <div className="mb-6 grid h-16 w-16 mx-auto place-items-center rounded-full border border-[var(--edge)] bg-[var(--tint)]">
            <svg className="h-8 w-8 text-[var(--muted-2)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {isAr ? "تحقق من بريدك الإلكتروني" : "Check your email"}
          </h1>
          <p className="mt-3 text-sm font-normal text-[var(--muted-foreground)]">
            {isAr
              ? `أرسلنا رابط تأكيد إلى ${email}. اضغط على الرابط لتفعيل حسابك ثم سجّل الدخول.`
              : `We sent a confirmation link to ${email}. Click the link to activate your account, then sign in.`}
          </p>
          <button
            onClick={() => {
              setNeedsConfirmation(false);
              navigate("auth", { mode: "login" });
            }}
            className="btn-chrome mt-6 px-6 py-2.5 text-sm"
          >
            {isAr ? "العودة لتسجيل الدخول" : "Back to login"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-[var(--bg)] text-[var(--text)]">
      <header className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4">
        <button
          className="text-lg font-semibold tracking-tight"
          onClick={() => navigate("landing")}
        >
          Alkemos
        </button>
        <LanguageToggle />
      </header>

      <main className="flex flex-1 items-center justify-center px-4 py-10">
        <div className="w-full max-w-md">
          {/* Apple-style clean card — no border, no shadow, just whitespace */}
          <div className="px-2">
            <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">
              {isSignup ? t("auth.signup.title") : t("auth.login.title")}
            </h1>
            <p className="mt-2 text-base font-normal text-[var(--muted-foreground)] md:text-lg">
              {isSignup ? t("auth.signup.subtitle") : t("auth.login.subtitle")}
            </p>

            {/* Banner: explain why login is needed */}
            {next && (
              <div className="marble-card mt-6 p-4 text-sm text-[var(--text)]">
                <p className="font-medium">
                  {isAr
                    ? "سجّل الدخول عشان تكمّل عملية الاشتراك"
                    : "Log in to continue your subscription"}
                </p>
                <p className="mt-1 text-[var(--muted-foreground)]">
                  {isAr
                    ? "هترجع تلقائياً لصفحة الدفع بعد ما تسجّل."
                    : "You'll be returned to checkout automatically after logging in."}
                </p>
              </div>
            )}

            {!isSupabaseConfigured && (
              <div className="marble-card mt-6 p-4 text-sm font-normal text-[var(--muted-foreground)]">
                {t("auth.demoNotice")}
              </div>
            )}

            {/* Google OAuth button — Apple-style */}
            {isSupabaseConfigured && (
              <>
                <button
                  type="button"
                  onClick={handleGoogle}
                  disabled={googleLoading || loading}
                  className="btn-outline mt-8 flex w-full items-center justify-center gap-3 px-6 py-3 text-base disabled:opacity-50"
                >
                  {googleLoading ? (
                    <span className="h-5 w-5 animate-spin rounded-full border-2 border-[#0071e3] border-t-transparent" />
                  ) : (
                    <GoogleIcon className="h-5 w-5" />
                  )}
                  <span>{t("auth.google")}</span>
                </button>

                {/* Divider */}
                <div className="my-6 flex items-center gap-4">
                  <div className="h-px flex-1 bg-[#d2d2d7]" />
                  <span className="text-xs font-normal uppercase tracking-wide text-[var(--muted-foreground)]">
                    {t("auth.or")}
                  </span>
                  <div className="h-px flex-1 bg-[#d2d2d7]" />
                </div>
              </>
            )}

            <form onSubmit={submit} className="space-y-5">
              {isSignup && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="fullname" className="text-sm font-medium">
                      {t("auth.fullName")}
                    </Label>
                    <Input
                      id="fullname"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Mohamed Ali"
                      className="rounded-xl border-[var(--edge)] bg-[var(--card)] px-4 py-3 text-base"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone" className="text-sm font-medium">
                      {t("auth.phone")}
                    </Label>
                    <Input
                      id="phone"
                      required
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+20 100 000 0000"
                      className="rounded-xl border-[var(--edge)] bg-[var(--card)] px-4 py-3 text-base"
                    />
                  </div>
                </>
              )}
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium">
                  {t("auth.email")}
                </Label>
                <Input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="rounded-xl border-[var(--edge)] bg-[var(--card)] px-4 py-3 text-base"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-medium">
                  {t("auth.password")}
                </Label>
                <Input
                  id="password"
                  type="password"
                  required
                  minLength={isSignup ? 8 : undefined}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="rounded-xl border-[var(--edge)] bg-[var(--card)] px-4 py-3 text-base"
                />
              </div>

              <button
                type="submit"
                disabled={loading || googleLoading}
                className="btn-chrome w-full px-6 py-3 text-base disabled:opacity-50"
              >
                {loading ? t("common.loading") : isSignup ? t("auth.signUp") : t("auth.signIn")}
              </button>
            </form>

            <p className="mt-8 text-center text-sm font-normal text-[var(--muted-foreground)]">
              {isSignup ? t("auth.haveAccount") : t("auth.noAccount")}{" "}
              <button
                type="button"
                className="font-normal text-[var(--muted-2)] underline-offset-4 transition-opacity hover:opacity-70 hover:underline"
                onClick={() => navigate("auth", { mode: isSignup ? "login" : "signup" })}
              >
                {isSignup ? t("auth.toLogin") : t("auth.toSignup")}
              </button>
            </p>

            {/* Continue as guest — login is optional, not a wall */}
            <div className="mt-8 border-t border-[var(--edge)] pt-6">
              <p className="text-center text-sm font-normal text-[var(--muted-foreground)]">
                {isAr
                  ? "مش جاهز تسجّل؟ تقدر تستخدم الأدوات والمدونة بدون حساب."
                  : "Not ready to sign up? You can use the tools and blog without an account."}
              </p>
              <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
                <a
                  href="/tools"
                  className="rounded-full border border-[var(--edge)] bg-[var(--tint)] px-5 py-2 text-sm font-normal text-[var(--text)] transition-opacity hover:opacity-90"
                >
                  {isAr ? "الأدوات المجانية" : "Free Tools"}
                </a>
                <a
                  href="/blog"
                  className="rounded-full border border-[var(--edge)] bg-[var(--tint)] px-5 py-2 text-sm font-normal text-[var(--text)] transition-opacity hover:opacity-90"
                >
                  {isAr ? "المدونة" : "Blog"}
                </a>
                <button
                  type="button"
                  onClick={() => navigate("landing")}
                  className="rounded-full border border-[var(--edge)] bg-[var(--tint)] px-5 py-2 text-sm font-normal text-[var(--text)] transition-opacity hover:opacity-90"
                >
                  {isAr ? "العودة للرئيسية" : "Back to home"}
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>

      <footer className="mt-auto border-t border-[var(--edge)] py-6 text-center text-xs font-normal text-[var(--muted-foreground)]">
        © {new Date().getFullYear()} Alkemos. {isAr ? "كل الحقوق محفوظة." : "All rights reserved."}
      </footer>
    </div>
  );
}
