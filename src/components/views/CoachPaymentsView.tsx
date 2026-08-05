"use client";

import { useEffect, useState } from "react";
import { Check, X, Receipt, CreditCard, Smartphone, Inbox, Loader2 } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { listSubscriptionRequests, reviewSubscriptionRequest, getReceiptSignedUrl } from "@/lib/data";
import { getTier, type TierId } from "@/lib/plans";
import { toast } from "sonner";

export function CoachPaymentsView() {
  const { t } = useI18n();
  const [filter, setFilter] = useState<"pending" | "approved" | "rejected" | "all">("pending");
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [reviewing, setReviewing] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const data = await listSubscriptionRequests(filter);
    setRows(data);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, [filter]);

  const review = async (id: string, action: "approve" | "reject") => {
    setReviewing(id);
    try {
      await reviewSubscriptionRequest(id, action);
      toast.success(action === "approve" ? t("admin.approvedToast") : t("admin.rejectedToast"));
      await load();
    } catch (e: any) {
      toast.error(e.message || t("common.error"));
    } finally {
      setReviewing(null);
    }
  };

  const openReceipt = async (path: string) => {
    try {
      const url = await getReceiptSignedUrl(path);
      if (url) window.open(url, "_blank", "noopener");
    } catch {
      toast.error(t("common.error"));
    }
  };

  const tabs: typeof filter[] = ["pending", "approved", "rejected", "all"];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold md:text-3xl">{t("nav.admin")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("admin.subtitle")}</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setFilter(tab)}
            className={cn(
              "rounded-full border px-4 py-1.5 text-sm font-medium transition-colors",
              filter === tab
                ? "border-primary bg-primary/10 text-primary"
                : "border-border text-muted-foreground hover:text-foreground",
            )}
          >
            {t(`admin.${tab}`)}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : rows.length === 0 ? (
        <Card className="border-dashed py-16 text-center text-muted-foreground">
          <Inbox className="mx-auto mb-2 h-8 w-8 text-muted-foreground/50" />
          <p className="text-sm">{t("admin.empty")}</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {rows.map((r) => (
            <Card key={r.id} className="p-4 shadow-card">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="truncate font-semibold">{r.full_name}</h3>
                    <StatusBadge status={r.status} t={t} />
                  </div>
                  <p dir="ltr" className="text-sm text-muted-foreground">{r.whatsapp}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{new Date(r.created_at).toLocaleString()}</p>
                </div>
                <div className="text-end">
                  <div className="font-display text-lg font-bold text-gradient">
                    ${r.price_egp}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {t(getTier(r.plan_tier as TierId)?.nameKey ?? r.plan_tier)} · {r.duration_months} {t("admin.duration")}
                  </p>
                </div>
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1 rounded-lg bg-secondary px-2.5 py-1 text-xs">
                  {r.payment_method === "instapay" ? <CreditCard className="h-3.5 w-3.5" /> : <Smartphone className="h-3.5 w-3.5" />}
                  {r.payment_method === "instapay" ? t("checkout.instapay") : t("checkout.vodafone")}
                </span>
                {r.receipt_path && (
                  <Button variant="outline" size="sm" className="gap-1.5" onClick={() => openReceipt(r.receipt_path)}>
                    <Receipt className="h-3.5 w-3.5" />
                    {t("admin.viewReceipt")}
                  </Button>
                )}
                {r.status === "pending" && (
                  <div className="ms-auto flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1.5 border-destructive/40 text-destructive hover:bg-destructive/10"
                      disabled={reviewing === r.id}
                      onClick={() => review(r.id, "reject")}
                    >
                      <X className="h-3.5 w-3.5" />
                      {t("admin.reject")}
                    </Button>
                    <Button
                      size="sm"
                      className="gap-1.5"
                      disabled={reviewing === r.id}
                      onClick={() => review(r.id, "approve")}
                    >
                      {reviewing === r.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                      {t("admin.approve")}
                    </Button>
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status, t }: { status: string; t: (k: string) => string }) {
  const cls = cn(
    status === "pending" && "border-warning text-warning",
    status === "approved" && "border-success text-success",
    status === "rejected" && "border-destructive text-destructive",
  );
  return <Badge variant="outline" className={cls}>{t(`admin.${status}`)}</Badge>;
}
