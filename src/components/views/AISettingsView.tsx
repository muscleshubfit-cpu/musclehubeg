"use client";

import { useEffect, useState, useCallback } from "react";
import {
  ArrowLeft,
  CheckCircle2,
  Loader2,
  Settings2,
  Sparkles,
  Eye,
  EyeOff,
  ExternalLink,
  RefreshCw,
  Save,
  Trash2,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { useI18n } from "@/lib/i18n";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

type ProviderMeta = {
  id: string;
  label: string;
  defaultModel: string;
  baseUrl: string;
  docsUrl: string;
  keyPrefix: string;
  envKey: string;
};

type Status = {
  provider: string;
  model: string;
  baseUrl: string;
  isConfigured: boolean;
  source: "env" | "override" | "none";
  maskedKey: string | null;
};

type TestResult =
  | { ok: true; sample: string; provider: string; model: string }
  | { ok: false; error: string };

export function AISettingsView() {
  const { lang } = useI18n();
  const router = useRouter();
  const isAr = lang === "ar";

  const [providers, setProviders] = useState<ProviderMeta[]>([]);
  const [status, setStatus] = useState<Status | null>(null);
  const [loading, setLoading] = useState(true);

  const [provider, setProvider] = useState<string>("openrouter");
  const [apiKey, setApiKey] = useState("");
  const [model, setModel] = useState("");
  const [baseUrl, setBaseUrl] = useState("");
  const [showKey, setShowKey] = useState(false);

  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<TestResult | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/ai/settings");
      const data = await res.json();
      setProviders(data.providers || []);
      setStatus(data.status || null);
      if (data.status) {
        setProvider(data.status.provider);
        setModel(data.status.model);
        setBaseUrl(data.status.baseUrl);
        // Don't prefill the key — the server keeps it hidden.
      }
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // When provider changes, update model + baseUrl defaults if the user hasn't
  // customized them.
  useEffect(() => {
    const meta = providers.find((p) => p.id === provider);
    if (!meta) return;
    setModel((m) => m || meta.defaultModel);
    setBaseUrl((b) => b || meta.baseUrl);
  }, [provider, providers]);

  const handleProviderChange = (id: string) => {
    const meta = providers.find((p) => p.id === id);
    if (!meta) return;
    setProvider(id);
    setModel(meta.defaultModel);
    setBaseUrl(meta.baseUrl);
    setTestResult(null);
  };

  const handleTest = async (mode: "preview" | "saved") => {
    setTesting(true);
    setTestResult(null);
    try {
      const body =
        mode === "preview"
          ? { use: "preview", provider, apiKey, model, baseUrl }
          : { use: "saved" };
      const res = await fetch("/api/ai/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (data.ok) {
        setTestResult(data);
        toast.success(
          isAr
            ? `الاتصال ناجح عبر ${data.provider} (${data.model})`
            : `Connected via ${data.provider} (${data.model})`,
        );
      } else {
        setTestResult({ ok: false, error: data.error || "Unknown error" });
        toast.error(data.error || "Test failed");
      }
    } catch (e: any) {
      setTestResult({ ok: false, error: e.message });
      toast.error(e.message);
    } finally {
      setTesting(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/ai/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "save", provider, apiKey, model, baseUrl }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setStatus(data.status);
      setApiKey(""); // Clear the input after save (key is now in the cookie).
      toast.success(isAr ? "تم حفظ الإعدادات" : "Settings saved");
      await load();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleClear = async () => {
    if (!confirm(isAr ? "مسح الإعدادات المحفوظة؟" : "Clear saved settings?")) return;
    try {
      await fetch("/api/ai/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "clear" }),
      });
      toast.success(isAr ? "تم المسح" : "Cleared");
      await load();
      setTestResult(null);
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  if (loading) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        <Loader2 className="mx-auto h-6 w-6 animate-spin" />
      </div>
    );
  }

  const currentMeta = providers.find((p) => p.id === provider);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" className="gap-1" onClick={() => router.push("/admin/blog")}>
            <ArrowLeft className="h-4 w-4 rtl:rotate-180" />
            {isAr ? "رجوع" : "Back"}
          </Button>
          <div>
            <h1 className="flex items-center gap-2 text-xl font-bold md:text-2xl">
              <Settings2 className="h-5 w-5 text-primary" />
              {isAr ? "إعدادات الذكاء الاصطناعي" : "AI Settings"}
            </h1>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {isAr
                ? "اختر مزود الذكاء الاصطناعي وأدخل مفتاح API. يمكن التبديل في أي وقت بدون تغيير الكود."
                : "Pick your AI provider and API key. Switch any time — no code changes needed."}
            </p>
          </div>
        </div>
        <Button variant="outline" size="sm" className="gap-2" onClick={load}>
          <RefreshCw className="h-4 w-4" />
          {isAr ? "تحديث" : "Refresh"}
        </Button>
      </div>

      {/* Status banner */}
      {status && (
        <Card className={`p-4 ${status.isConfigured ? "border-success/40" : "border-warning/40"}`}>
          <div className="flex flex-wrap items-center gap-3">
            <div
              className={`flex h-10 w-10 items-center justify-center rounded-full ${
                status.isConfigured ? "bg-success/15 text-success" : "bg-warning/15 text-warning"
              }`}
            >
              {status.isConfigured ? <CheckCircle2 className="h-5 w-5" /> : <AlertCircle className="h-5 w-5" />}
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold">
                {status.isConfigured
                  ? isAr
                    ? "الذكاء الاصطناعي جاهز"
                    : "AI is ready"
                  : isAr
                    ? "غير مُهيأ — أدخل مفتاح API أدناه"
                    : "Not configured — add your API key below"}
              </p>
              <p className="text-xs text-muted-foreground">
                {isAr ? "المزود" : "Provider"}: <span className="font-medium">{status.provider}</span>
                {" · "}
                {isAr ? "الموديل" : "Model"}: <span className="font-medium">{status.model}</span>
                {" · "}
                {isAr ? "المصدر" : "Source"}:{" "}
                <Badge variant="outline" className="text-[10px]">
                  {status.source === "env"
                    ? isAr
                      ? "متغيرات البيئة"
                      : "env var"
                    : status.source === "override"
                      ? isAr
                        ? "محفوظ في المتصفح"
                        : "saved override"
                      : isAr
                        ? "غير موجود"
                        : "none"}
                </Badge>
                {status.maskedKey && (
                  <>
                    {" · "}
                    {isAr ? "المفتاح" : "Key"}: <code className="font-mono text-[10px]">{status.maskedKey}</code>
                  </>
                )}
              </p>
            </div>
          </div>
        </Card>
      )}

      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        {/* Form */}
        <Card className="space-y-5 p-5 shadow-card">
          {/* Provider picker */}
          <div>
            <Label className="text-sm font-semibold">
              {isAr ? "المزود" : "Provider"}
            </Label>
            <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
              {providers.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => handleProviderChange(p.id)}
                  className={`rounded-lg border p-3 text-start text-sm transition-colors ${
                    provider === p.id
                      ? "border-primary bg-primary/5 ring-1 ring-primary"
                      : "border-border hover:bg-muted/40"
                  }`}
                >
                  <div className="font-medium">{p.id}</div>
                  <div className="mt-0.5 text-[10px] text-muted-foreground line-clamp-1">
                    {p.defaultModel}
                  </div>
                </button>
              ))}
            </div>
            {currentMeta && (
              <p className="mt-2 text-xs text-muted-foreground">
                {currentMeta.label}
                {" · "}
                <a
                  href={currentMeta.docsUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-primary hover:underline"
                >
                  {isAr ? "احصل على مفتاح API" : "Get API key"}
                  <ExternalLink className="h-3 w-3" />
                </a>
              </p>
            )}
          </div>

          {/* API key */}
          <div>
            <Label className="text-sm font-semibold">
              {isAr ? "مفتاح API" : "API Key"}
            </Label>
            <div className="mt-1.5 flex gap-2">
              <div className="relative flex-1">
                <Input
                  type={showKey ? "text" : "password"}
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder={
                    status?.isConfigured
                      ? isAr
                        ? "•••••••• (أدخل مفتاح جديد للاستبدال)"
                        : "•••••••• (enter a new key to replace)"
                      : isAr
                        ? "أدخل مفتاح API هنا"
                        : "Paste your API key here"
                  }
                  className="pe-10 font-mono"
                  dir="ltr"
                  autoComplete="off"
                />
                <button
                  type="button"
                  onClick={() => setShowKey((s) => !s)}
                  className="absolute end-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  title={showKey ? "Hide" : "Show"}
                >
                  {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            {currentMeta && (
              <p className="mt-1 text-[10px] text-muted-foreground">
                {isAr ? "يبدأ المفتاح عادةً بـ" : "Key usually starts with"}{" "}
                <code className="font-mono">{currentMeta.keyPrefix}</code>
                {" · "}
                {isAr ? "متغير البيئة المقابل" : "Env var"}:{" "}
                <code className="font-mono">{currentMeta.envKey}</code>
              </p>
            )}
          </div>

          {/* Model */}
          <div>
            <Label className="text-sm font-semibold">
              {isAr ? "الموديل" : "Model"}
            </Label>
            <Input
              value={model}
              onChange={(e) => setModel(e.target.value)}
              placeholder={currentMeta?.defaultModel}
              className="mt-1.5 font-mono text-sm"
              dir="ltr"
            />
            <p className="mt-1 text-[10px] text-muted-foreground">
              {isAr
                ? "اتركها فارغة لاستخدام الموديل الافتراضي."
                : "Leave empty to use the provider's default model."}
            </p>
          </div>

          {/* Base URL */}
          <div>
            <Label className="text-sm font-semibold">
              {isAr ? "Base URL" : "Base URL"}
            </Label>
            <Input
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
              placeholder={currentMeta?.baseUrl}
              className="mt-1.5 font-mono text-sm"
              dir="ltr"
            />
            <p className="mt-1 text-[10px] text-muted-foreground">
              {isAr
                ? "تخصيص لأي endpoint متوافق مع OpenAI."
                : "Customize for any OpenAI-compatible endpoint."}
            </p>
          </div>

          {/* Actions */}
          <div className="flex flex-wrap gap-2">
            <Button
              variant="secondary"
              className="gap-2"
              onClick={() => handleTest("preview")}
              disabled={testing || (!apiKey && !status?.isConfigured)}
            >
              {testing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              {isAr ? "اختبار الاتصال" : "Test Connection"}
            </Button>
            <Button className="gap-2" onClick={handleSave} disabled={saving || (!apiKey && !status?.isConfigured)}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {isAr ? "حفظ" : "Save"}
            </Button>
            {status?.source === "override" && (
              <Button variant="ghost" className="gap-2 text-destructive" onClick={handleClear}>
                <Trash2 className="h-4 w-4" />
                {isAr ? "مسح المحفوظ" : "Clear saved"}
              </Button>
            )}
          </div>

          {/* Test result */}
          {testResult && (
            <div
              className={`rounded-lg border p-3 text-sm ${
                testResult.ok
                  ? "border-success/40 bg-success/5 text-success"
                  : "border-destructive/40 bg-destructive/5 text-destructive"
              }`}
            >
              {testResult.ok ? (
                <div className="space-y-1">
                  <p className="font-semibold">
                    {isAr ? "✓ نجح الاتصال" : "✓ Connection successful"}
                  </p>
                  <p className="text-xs opacity-80">
                    {isAr ? "استجابة المزود" : "Provider replied"}:{" "}
                    <code className="font-mono">{testResult.sample}</code>
                  </p>
                </div>
              ) : (
                <div className="space-y-1">
                  <p className="font-semibold">
                    {isAr ? "✗ فشل الاتصال" : "✗ Connection failed"}
                  </p>
                  <p className="text-xs opacity-80 break-words">{testResult.error}</p>
                </div>
              )}
            </div>
          )}
        </Card>

        {/* Sidebar: help */}
        <div className="space-y-4">
          <Card className="p-4 shadow-card">
            <h3 className="mb-2 flex items-center gap-2 text-sm font-bold">
              <Sparkles className="h-4 w-4 text-primary" />
              {isAr ? "كيف يعمل؟" : "How it works"}
            </h3>
            <ol className="space-y-2 text-xs text-muted-foreground">
              <li>
                <span className="font-semibold text-foreground">1.</span>{" "}
                {isAr
                  ? "أنشئ حساب على OpenRouter أو أي مزود آخر."
                  : "Create an account on OpenRouter or any other provider."}
              </li>
              <li>
                <span className="font-semibold text-foreground">2.</span>{" "}
                {isAr ? "احصل على مفتاح API من لوحة التحكم." : "Get an API key from the dashboard."}
              </li>
              <li>
                <span className="font-semibold text-foreground">3.</span>{" "}
                {isAr
                  ? "الصق المفتاح هنا، اضغط اختبار، ثم حفظ."
                  : "Paste it here, click Test, then Save."}
              </li>
              <li>
                <span className="font-semibold text-foreground">4.</span>{" "}
                {isAr
                  ? "افتح محرر المدونة واضغط «توليد بالذكاء الاصطناعي»."
                  : "Open the Blog Editor and click \"Generate with AI\"."}
              </li>
            </ol>
          </Card>

          <Card className="p-4 shadow-card">
            <h3 className="mb-2 text-sm font-bold">
              {isAr ? "الأمان" : "Security"}
            </h3>
            <ul className="space-y-1.5 text-xs text-muted-foreground">
              <li className="flex items-start gap-1.5">
                <CheckCircle2 className="mt-0.5 h-3 w-3 shrink-0 text-success" />
                {isAr
                  ? "المفتاح يُخزَّن في كوكيز HTTP-only — لا يمكن لـ JS قراءته."
                  : "Key stored in HTTP-only cookies — JS can't read it."}
              </li>
              <li className="flex items-start gap-1.5">
                <CheckCircle2 className="mt-0.5 h-3 w-3 shrink-0 text-success" />
                {isAr
                  ? "لا يُعاد المفتاح لأي طلب من المتصفح."
                  : "Never returned to any browser request."}
              </li>
              <li className="flex items-start gap-1.5">
                <CheckCircle2 className="mt-0.5 h-3 w-3 shrink-0 text-success" />
                {isAr
                  ? "يمكن أيضاً استخدام متغيرات البيئة كقيمة افتراضية."
                  : "Env vars also work as a default source."}
              </li>
              <li className="flex items-start gap-1.5">
                <CheckCircle2 className="mt-0.5 h-3 w-3 shrink-0 text-success" />
                {isAr
                  ? "التبديل بين المزودين لا يتطلب أي تغيير في الكود."
                  : "Switching providers requires zero code changes."}
              </li>
            </ul>
          </Card>

          <Card className="p-4 shadow-card">
            <h3 className="mb-2 text-sm font-bold">
              {isAr ? "المزودون المدعومون" : "Supported providers"}
            </h3>
            <div className="flex flex-wrap gap-1.5">
              {providers.map((p) => (
                <Badge
                  key={p.id}
                  variant={p.id === provider ? "default" : "outline"}
                  className="text-[10px]"
                >
                  {p.id}
                </Badge>
              ))}
            </div>
            <p className="mt-2 text-[10px] text-muted-foreground">
              {isAr
                ? "أي endpoint متوافق مع OpenAI سيعمل عبر حقل Base URL."
                : "Any OpenAI-compatible endpoint works via the Base URL field."}
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
}
