"use client";

import { useState } from "react";
import { Dumbbell, ArrowRight, Info } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LanguageToggle } from "@/components/LanguageToggle";
import { GoogleIcon } from "@/components/GoogleIcon";
import { useNav } from "@/hooks/use-nav";
import { useAuth } from "@/hooks/use-auth";
import { isSupabaseConfigured } from "@/lib/supabase/client";
import { toast } from "sonner";

export function AuthView({ mode }: { mode: "login" | "signup" }) {
  const { t } = useI18n();
  const { navigate } = useNav();
  const { signIn, signUp, signInGoogle } = useAuth();
  const isSignup = mode === "signup";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const goHome = (isCoach: boolean) => navigate(isCoach ? "coach" : "dashboard");

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
          goHome(false);
        }
      } else {
        const { error, profile } = await signIn(email, password);
        if (error) {
          toast.error(error);
        } else {
          toast.success(t("auth.welcomeBack"));
          goHome(profile?.role === "coach");
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setGoogleLoading(true);
    try {
      const { error } = await signInGoogle();
      if (error) {
        toast.error(t("auth.googleError"));
        setGoogleLoading(false);
      }
      // If successful, Supabase will redirect to Google → back to origin.
      // The auth state change will be picked up by onAuthChange on return.
    } catch {
      setGoogleLoading(false);
      toast.error(t("auth.googleError"));
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4">
        <button className="flex items-center gap-2" onClick={() => navigate("landing")}>
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-primary">
            <Dumbbell className="h-5 w-5 text-primary-foreground" />
          </span>
          <span className="font-display text-lg font-bold">{t("brand.name")}</span>
        </button>
        <LanguageToggle />
      </header>

      <main className="flex flex-1 items-center justify-center px-4 py-10">
        <div className="w-full max-w-md">
          <div className="rounded-3xl border border-border bg-card p-8 shadow-card">
            <h1 className="text-2xl font-bold">{isSignup ? t("auth.signup.title") : t("auth.login.title")}</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {isSignup ? t("auth.signup.subtitle") : t("auth.login.subtitle")}
            </p>

            {!isSupabaseConfigured && (
              <div className="mt-4 flex items-start gap-2 rounded-xl border border-warning/30 bg-warning/10 p-3 text-xs text-warning-foreground">
                <Info className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
                <span>{t("auth.demoNotice")}</span>
              </div>
            )}

            {/* Google OAuth button */}
            {isSupabaseConfigured && (
              <>
                <Button
                  type="button"
                  variant="outline"
                  className="mt-6 w-full gap-3"
                  onClick={handleGoogle}
                  disabled={googleLoading || loading}
                >
                  {googleLoading ? (
                    <span className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                  ) : (
                    <GoogleIcon className="h-5 w-5" />
                  )}
                  <span className="font-medium">{t("auth.google")}</span>
                </Button>

                {/* Divider */}
                <div className="my-5 flex items-center gap-3">
                  <div className="h-px flex-1 bg-border" />
                  <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    {t("auth.or")}
                  </span>
                  <div className="h-px flex-1 bg-border" />
                </div>
              </>
            )}

            <form onSubmit={submit} className="space-y-4">
              {isSignup && (
                <>
                  <div className="space-y-1.5">
                    <Label htmlFor="fullname">{t("auth.fullName")}</Label>
                    <Input
                      id="fullname"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Ahmed Ali"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="phone">{t("auth.phone")}</Label>
                    <Input
                      id="phone"
                      required
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+20 100 000 0000"
                    />
                  </div>
                </>
              )}
              <div className="space-y-1.5">
                <Label htmlFor="email">{t("auth.email")}</Label>
                <Input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="password">{t("auth.password")}</Label>
                <Input
                  id="password"
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                />
              </div>

              <Button type="submit" className="w-full gap-2" disabled={loading || googleLoading}>
                {loading ? t("common.loading") : isSignup ? t("auth.signUp") : t("auth.signIn")}
                <ArrowRight className="h-4 w-4 rtl:rotate-180" />
              </Button>
            </form>

            <p className="mt-6 text-center text-sm text-muted-foreground">
              {isSignup ? t("auth.haveAccount") : t("auth.noAccount")}{" "}
              <button
                type="button"
                className="font-semibold text-primary hover:underline"
                onClick={() => navigate("auth", { mode: isSignup ? "login" : "signup" })}
              >
                {isSignup ? t("auth.toLogin") : t("auth.toSignup")}
              </button>
            </p>
          </div>
        </div>
      </main>

      <footer className="mt-auto border-t border-border py-8 text-center text-sm text-muted-foreground">
        © {new Date().getFullYear()} {t("brand.name")}. {t("landing.footer")}
      </footer>
    </div>
  );
}
