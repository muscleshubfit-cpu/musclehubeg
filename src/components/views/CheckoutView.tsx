"use client";

import { useState } from "react";
import { Dumbbell, ArrowRight, QrCode, CreditCard, Smartphone, CheckCircle2 } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { LanguageToggle } from "@/components/LanguageToggle";
import { useNav } from "@/hooks/use-nav";
import { useAuth } from "@/hooks/use-auth";
import { getTier, formatEgp, type TierId, type Duration, type PaymentMethod } from "@/lib/plans";
import { upsertSubscription } from "@/lib/data";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export function CheckoutView({ tier, months }: { tier: TierId; months: Duration }) {
  const { t } = useI18n();
  const { navigate } = useNav();
  const { profile } = useAuth();
  const tierData = getTier(tier)!;
  const price = tierData.prices[months];
  const [method, setMethod] = useState<PaymentMethod>("instapay");
  const [activating, setActivating] = useState(false);
  const [done, setDone] = useState(false);

  const activate = async () => {
    if (!profile) {
      navigate("auth", { mode: "signup" });
      return;
    }
    setActivating(true);
    try {
      const start = new Date();
      const end = new Date();
      end.setMonth(end.getMonth() + months);
      await upsertSubscription(profile.id, tier, months, start.toISOString(), end.toISOString());
      setDone(true);
      toast.success(t("checkout.activated"));
      setTimeout(() => navigate("dashboard"), 1200);
    } catch (e: any) {
      toast.error(e.message || t("common.error"));
    } finally {
      setActivating(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4">
        <button className="flex items-center gap-2" onClick={() => navigate("pricing")}>
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-primary">
            <Dumbbell className="h-5 w-5 text-primary-foreground" />
          </span>
          <span className="font-display text-lg font-bold">{t("brand.name")}</span>
        </button>
        <LanguageToggle />
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10">
        <h1 className="text-3xl font-bold">{t("checkout.title")}</h1>

        <div className="mt-6 grid gap-6 md:grid-cols-2">
          {/* Summary */}
          <div className="rounded-3xl border border-border bg-card p-6 shadow-card">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              {t("checkout.plan")}
            </h2>
            <p className="mt-1 font-display text-2xl font-bold">{t(tierData.nameKey)}</p>
            <p className="text-sm text-muted-foreground">{t(tierData.subKey)}</p>

            <div className="mt-5 space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">{t("checkout.duration")}</span>
                <span className="font-medium">{months} {t("pricing.months")}</span>
              </div>
              <div className="flex items-center justify-between border-t border-border pt-2">
                <span className="text-muted-foreground">{t("checkout.total")}</span>
                <span className="font-display text-xl font-bold text-gradient">
                  {formatEgp(price)} {t("pricing.egp")}
                </span>
              </div>
            </div>
          </div>

          {/* Payment */}
          <div className="rounded-3xl border border-border bg-card p-6 shadow-card">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              {t("checkout.method")}
            </h2>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <button
                onClick={() => setMethod("instapay")}
                className={cn(
                  "flex flex-col items-center gap-2 rounded-2xl border p-4 text-sm font-medium transition-colors",
                  method === "instapay"
                    ? "border-primary bg-secondary text-primary"
                    : "border-border hover:border-primary/40",
                )}
              >
                <CreditCard className="h-5 w-5" />
                {t("checkout.instapay")}
              </button>
              <button
                onClick={() => setMethod("vodafone_cash")}
                className={cn(
                  "flex flex-col items-center gap-2 rounded-2xl border p-4 text-sm font-medium transition-colors",
                  method === "vodafone_cash"
                    ? "border-primary bg-secondary text-primary"
                    : "border-border hover:border-primary/40",
                )}
              >
                <Smartphone className="h-5 w-5" />
                {t("checkout.vodafone")}
              </button>
            </div>

            <div className="mt-5 flex flex-col items-center rounded-2xl border border-dashed border-border bg-muted/40 p-5">
              <QrCode className="h-32 w-32 text-foreground/70" />
              <p className="mt-3 text-center text-xs text-muted-foreground">{t("checkout.scanQr")}</p>
              <p className="mt-2 font-mono text-sm font-semibold">
                {method === "instapay" ? "ahmedzake@instapay" : "01000000000"}
              </p>
            </div>

            <Button
              className="mt-5 w-full gap-2"
              disabled={activating || done}
              onClick={activate}
            >
              {done ? (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  {t("checkout.activated")}
                </>
              ) : (
                <>
                  {activating ? t("common.loading") : t("checkout.pay")}
                  <ArrowRight className="h-4 w-4 rtl:rotate-180" />
                </>
              )}
            </Button>
          </div>
        </div>

        <button
          className="mt-6 text-sm text-muted-foreground hover:text-foreground"
          onClick={() => navigate("pricing")}
        >
          ← {t("checkout.backToPricing")}
        </button>
      </main>

      <footer className="mt-auto border-t border-border py-8 text-center text-sm text-muted-foreground">
        © {new Date().getFullYear()} {t("brand.name")}. {t("landing.footer")}
      </footer>
    </div>
  );
}
