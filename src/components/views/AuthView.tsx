"use client";

import { useState } from "react";
import { useI18n } from "@/lib/i18n";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LanguageToggle } from "@/components/LanguageToggle";
import { GoogleIcon } from "@/components/GoogleIcon";
import { useNav } from "@/hooks/use-nav";
import { useAuth } from "@/hooks/use-auth";
import { isSupabaseConfigured } from "@/lib/supabase/client";
import { safeNext } from "@/lib/safe-redirect";
import { toast } from "sonner";

export function AuthView({ mode, next }: { mode: "login" | "signup"; next?: string }) {
  const { t, lang } = useI18n();
  const { navigate } = useNav();
  const { signIn, signUp, signInGoogle } = useAuth();
  const isSignup = mode === "signup";
  const isAr = lang === "ar";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  // After a successful login, redirect to `next` if provided (e.g. /checkout),
  // otherwise fall back to the coach/client dashboard.
  const goAfterLogin = (isCoach: boolean) => {
    if (next) {
      // Validate `next` to prevent open-redirect attacks (C17 fix).
      // Use a hard navigation so query params (?tier=...&months=...) are preserved.
      window.location.href = safeNext(next);
      return;
    }
    navigate(isCoach ? "coach" : "dashboard");
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isSignup) {
        const { error } = await signUp(email, password, fullName, phone);
        if (error) {
          toast.error(error);
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
          goAfterLogin(profile?.role === "coach");
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

  return (
    <div className="flex min-h-screen flex-col bg-white text-[#1d1d1f]">
      <header className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4">
        <button
          className="text-lg font-semibold tracking-tight"
          onClick={() => navigate("landing")}
        >
          MuscleHub
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
            <p className="mt-2 text-base font-normal text-[#6e6e73] md:text-lg">
              {isSignup ? t("auth.signup.subtitle") : t("auth.login.subtitle")}
            </p>

            {/* Banner: explain why login is needed */}
            {next && (
              <div className="mt-6 rounded-2xl border border-[#0071e3]/20 bg-[#0071e3]/5 p-4 text-sm font-normal text-[#1d1d1f]">
                <p className="font-medium">
                  {isAr
                    ? "سجّل الدخول عشان تكمّل عملية الاشتراك"
                    : "Log in to continue your subscription"}
                </p>
                <p className="mt-1 text-[#6e6e73]">
                  {isAr
                    ? "هترجع تلقائياً لصفحة الدفع بعد ما تسجّل."
                    : "You'll be returned to checkout automatically after logging in."}
                </p>
              </div>
            )}

            {!isSupabaseConfigured && (
              <div className="mt-6 rounded-xl bg-[#f5f5f7] p-4 text-sm font-normal text-[#6e6e73]">
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
                  className="mt-8 flex w-full items-center justify-center gap-3 rounded-full border border-[#d2d2d7] bg-white px-6 py-3 text-base font-normal transition-opacity hover:opacity-90 disabled:opacity-50"
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
                  <span className="text-xs font-normal uppercase tracking-wide text-[#6e6e73]">
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
                      className="rounded-xl border-[#d2d2d7] bg-white px-4 py-3 text-base"
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
                      className="rounded-xl border-[#d2d2d7] bg-white px-4 py-3 text-base"
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
                  className="rounded-xl border-[#d2d2d7] bg-white px-4 py-3 text-base"
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
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="rounded-xl border-[#d2d2d7] bg-white px-4 py-3 text-base"
                />
              </div>

              <button
                type="submit"
                disabled={loading || googleLoading}
                className="w-full rounded-full bg-[#0071e3] px-6 py-3 text-base font-normal text-white transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                {loading ? t("common.loading") : isSignup ? t("auth.signUp") : t("auth.signIn")}
              </button>
            </form>

            <p className="mt-8 text-center text-sm font-normal text-[#6e6e73]">
              {isSignup ? t("auth.haveAccount") : t("auth.noAccount")}{" "}
              <button
                type="button"
                className="font-normal text-[#0071e3] transition-opacity hover:opacity-70"
                onClick={() => navigate("auth", { mode: isSignup ? "login" : "signup" })}
              >
                {isSignup ? t("auth.toLogin") : t("auth.toSignup")}
              </button>
            </p>

            {/* Continue as guest — login is optional, not a wall */}
            <div className="mt-8 border-t border-[#d2d2d7] pt-6">
              <p className="text-center text-sm font-normal text-[#6e6e73]">
                {isAr
                  ? "مش جاهز تسجّل؟ تقدر تستخدم الأدوات والمدونة بدون حساب."
                  : "Not ready to sign up? You can use the tools and blog without an account."}
              </p>
              <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
                <a
                  href="/tools"
                  className="rounded-full bg-[#f5f5f7] px-5 py-2 text-sm font-normal text-[#1d1d1f] transition-opacity hover:opacity-90"
                >
                  {isAr ? "الأدوات المجانية" : "Free Tools"}
                </a>
                <a
                  href="/blog"
                  className="rounded-full bg-[#f5f5f7] px-5 py-2 text-sm font-normal text-[#1d1d1f] transition-opacity hover:opacity-90"
                >
                  {isAr ? "المدونة" : "Blog"}
                </a>
                <button
                  type="button"
                  onClick={() => navigate("landing")}
                  className="rounded-full bg-[#f5f5f7] px-5 py-2 text-sm font-normal text-[#1d1d1f] transition-opacity hover:opacity-90"
                >
                  {isAr ? "العودة للرئيسية" : "Back to home"}
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>

      <footer className="mt-auto border-t border-[#d2d2d7] py-6 text-center text-xs font-normal text-[#6e6e73]">
        © {new Date().getFullYear()} MuscleHub. {isAr ? "كل الحقوق محفوظة." : "All rights reserved."}
      </footer>
    </div>
  );
}
