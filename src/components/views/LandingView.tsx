"use client";

import {
  Dumbbell,
  Salad,
  LineChart,
  Camera,
  Activity,
  MessageCircle,
  ArrowRight,
  LayoutDashboard,
} from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { LanguageToggle } from "@/components/LanguageToggle";
import { useNav } from "@/hooks/use-nav";
import { useAuth } from "@/hooks/use-auth";

export function LandingView() {
  const { t } = useI18n();
  const { navigate } = useNav();
  const { profile, isCoach } = useAuth();
  const isLoggedIn = !!profile;

  const features = [
    { icon: Salad, title: t("landing.f1.title"), desc: t("landing.f1.desc") },
    { icon: Dumbbell, title: t("landing.f2.title"), desc: t("landing.f2.desc") },
    { icon: Activity, title: t("landing.f3.title"), desc: t("landing.f3.desc") },
    { icon: Camera, title: t("landing.f4.title"), desc: t("landing.f4.desc") },
    { icon: LineChart, title: t("landing.f5.title"), desc: t("landing.f5.desc") },
    { icon: MessageCircle, title: t("landing.f6.title"), desc: t("landing.f6.desc") },
  ];

  const steps = [
    { n: "1", title: t("landing.how.s1.title"), desc: t("landing.how.s1.desc") },
    { n: "2", title: t("landing.how.s2.title"), desc: t("landing.how.s2.desc") },
    { n: "3", title: t("landing.how.s3.title"), desc: t("landing.how.s3.desc") },
    { n: "4", title: t("landing.how.s4.title"), desc: t("landing.how.s4.desc") },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-primary">
            <Dumbbell className="h-5 w-5 text-primary-foreground" />
          </span>
          <span className="font-display text-lg font-bold">{t("brand.name")}</span>
        </div>
        <div className="flex items-center gap-2">
          <LanguageToggle />
          {isLoggedIn ? (
            <Button size="sm" className="gap-2" onClick={() => navigate(isCoach ? "coach" : "dashboard")}>
              <LayoutDashboard className="h-4 w-4" />
              {isCoach ? t("nav.clients") : t("nav.dashboard")}
            </Button>
          ) : (
            <Button variant="ghost" size="sm" onClick={() => navigate("auth", { mode: "login" })}>
              {t("landing.hero.login")}
            </Button>
          )}
        </div>
      </header>

      {/* Hero */}
      <section className="bg-hero-glow">
        <div className="mx-auto max-w-6xl px-4 py-20 text-center md:py-28">
          <span className="inline-block rounded-full border border-border bg-secondary px-4 py-1.5 text-xs font-medium text-muted-foreground">
            {isLoggedIn ? `${t("common.welcome")}, ${profile?.full_name || ""}` : t("landing.hero.badge")}
          </span>
          <h1 className="mx-auto mt-6 max-w-3xl text-4xl font-extrabold leading-tight md:text-6xl">
            {t("landing.hero.title")}
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-base text-muted-foreground md:text-lg">
            {t("landing.hero.subtitle")}
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            {isLoggedIn ? (
              <Button size="lg" className="gap-2 shadow-glow" onClick={() => navigate(isCoach ? "coach" : "dashboard")}>
                <LayoutDashboard className="h-4 w-4" />
                {isCoach ? t("coach.title") : t("nav.dashboard")}
                <ArrowRight className="h-4 w-4 rtl:rotate-180" />
              </Button>
            ) : (
              <>
                <Button size="lg" className="gap-2 shadow-glow" onClick={() => navigate("auth", { mode: "signup" })}>
                  {t("landing.hero.cta")}
                  <ArrowRight className="h-4 w-4 rtl:rotate-180" />
                </Button>
                <Button size="lg" variant="secondary" onClick={() => navigate("pricing")}>
                  {t("landing.pricing.cta")}
                </Button>
              </>
            )}
          </div>

          <div className="mx-auto mt-14 grid max-w-2xl grid-cols-3 gap-4">
            {[
              { v: "+500", l: t("landing.stats.clients") },
              { v: "+8", l: t("landing.stats.experience") },
              { v: "24/7", l: t("landing.stats.support") },
            ].map((s) => (
              <div key={s.l} className="rounded-2xl border border-border bg-card p-4 shadow-card">
                <div className="font-display text-2xl font-bold text-gradient md:text-3xl">{s.v}</div>
                <div className="mt-1 text-xs text-muted-foreground">{s.l}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-6xl px-4 py-16">
        <div className="text-center">
          <h2 className="text-3xl font-bold">{t("landing.features.title")}</h2>
          <p className="mt-2 text-muted-foreground">{t("landing.features.subtitle")}</p>
        </div>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <div
              key={f.title}
              className="rounded-2xl border border-border bg-card p-6 shadow-card transition-colors hover:border-primary/40"
            >
              <span className="grid h-11 w-11 place-items-center rounded-xl bg-secondary text-primary">
                <f.icon className="h-5 w-5" />
              </span>
              <h3 className="mt-4 text-lg font-semibold">{f.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="border-y border-border bg-card/40">
        <div className="mx-auto max-w-6xl px-4 py-16">
          <h2 className="text-center text-3xl font-bold">{t("landing.how.title")}</h2>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {steps.map((s) => (
              <div key={s.n} className="rounded-2xl border border-border bg-background p-6">
                <span className="grid h-10 w-10 place-items-center rounded-full bg-gradient-primary font-display font-bold text-primary-foreground">
                  {s.n}
                </span>
                <h3 className="mt-4 font-semibold">{s.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-3xl px-4 py-20 text-center">
        <h2 className="text-3xl font-bold md:text-4xl">{t("landing.cta.title")}</h2>
        <p className="mt-3 text-muted-foreground">{t("landing.cta.subtitle")}</p>
        <Button size="lg" className="mt-7 gap-2 shadow-glow" onClick={() => navigate("auth", { mode: "signup" })}>
          {t("landing.cta.button")}
          <ArrowRight className="h-4 w-4 rtl:rotate-180" />
        </Button>
      </section>

      <footer className="mt-auto border-t border-border py-8 text-center text-sm text-muted-foreground">
        © {new Date().getFullYear()} {t("brand.name")}. {t("landing.footer")}
      </footer>
    </div>
  );
}
