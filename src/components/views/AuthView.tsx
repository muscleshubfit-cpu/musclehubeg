"use client";

import { useState } from "react";
import { Dumbbell, ArrowRight, Info } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LanguageToggle } from "@/components/LanguageToggle";
import { useNav } from "@/hooks/use-nav";
import { useAuth } from "@/hooks/use-auth";
import { isSupabaseConfigured } from "@/lib/supabase/client";
import { toast } from "sonner";

export function AuthView({ mode }: { mode: "login" | "signup" }) {
  const { t } = useI18n();
  const { navigate } = useNav();
  const { signIn, signUp } = useAuth();
  const isSignup = mode === "signup";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);

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

            <form onSubmit={submit} className="mt-6 space-y-4">
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

              <Button type="submit" className="w-full gap-2" disabled={loading}>
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

            {!isSupabaseConfigured && (
              <div className="mt-6 rounded-xl border border-border bg-muted/40 p-3 text-xs text-muted-foreground">
                <p className="font-semibold text-foreground">{isSignup ? t("auth.toSignup") : t("auth.toLogin")} — Demo</p>
                <p className="mt-1">coach@coach.app / coach123</p>
                <p>client@demo.app / client123</p>
              </div>
            )}
          </div>
        </div>
      </main>

      <footer className="mt-auto border-t border-border py-8 text-center text-sm text-muted-foreground">
        © {new Date().getFullYear()} {t("brand.name")}. {t("landing.footer")}
      </footer>
    </div>
  );
}
