"use client";

import { useState } from "react";
import {
  Sparkles,
  Loader2,
  X,
  Wand2,
  AlertCircle,
  CheckCircle2,
  Copy,
  FileText,
  Globe,
  Image as ImageIcon,
  Share2,
  Link2,
  HelpCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { useI18n } from "@/lib/i18n";
import { BLOG_CATEGORIES } from "@/lib/blog";
import { toast } from "sonner";
import { renderMarkdown } from "@/lib/blog";

type SeoBlock = {
  seoTitle: string;
  metaTitle: string;
  metaDescription: string;
  slug: string;
};

export type GeneratedBundle = {
  research: {
    angle: string;
    searchIntent: string;
    rationale: string;
  } | null;
  seo: {
    focusKeyword: string;
    secondaryKeywords: string[];
    en: SeoBlock;
    ar: SeoBlock;
  };
  englishArticle: string;
  arabicArticle: string;
  faq: Array<{ question: string; answer: string }>;
  internalLinks: Array<{ slug: string; anchorText: string; reason: string }>;
  externalLinks: Array<{ url: string; anchorText: string; reason: string }>;
  imagePrompts: {
    featuredImage: string;
    facebookImage: string;
    openGraphImage: string;
  };
  socialPosts: {
    facebook: string;
    linkedin: string;
    instagram: string;
    x: string;
  };
  estimatedReadingTime: number;
  image?: { url: string; alt: string; credit: string } | null;
  language: "en" | "ar";
  source: string;
};

export function AIGenerateModal({
  open,
  onClose,
  onApply,
  defaultLanguage,
}: {
  open: boolean;
  onClose: () => void;
  onApply: (bundle: GeneratedBundle, language: "en" | "ar") => void;
  defaultLanguage: "en" | "ar";
}) {
  const { lang } = useI18n();
  const isAr = lang === "ar";

  const [topic, setTopic] = useState("");
  const [focusKeyword, setFocusKeyword] = useState("");
  const [category, setCategory] = useState("nutrition");
  const [language, setLanguage] = useState<"en" | "ar">(defaultLanguage);

  const [generating, setGenerating] = useState(false);
  const [researching, setResearching] = useState(false);
  const [researchData, setResearchData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [bundle, setBundle] = useState<GeneratedBundle | null>(null);

  if (!open) return null;

  const canGenerate = topic.trim() || focusKeyword.trim();

  const handleAutoGenerate = async () => {
    setGenerating(true);
    setError(null);
    setBundle(null);
    setResearchData(null);

    try {
      // Step 1: Auto-pick a topic (same as the cron job)
      setResearching(true);
      const topicRes = await fetch("/api/ai/pick-topic", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category }),
      });
      if (!topicRes.ok) {
        const errData = await topicRes.json().catch(() => null);
        throw new Error(
          errData?.error ||
            (isAr ? "تعذر اختيار الموضوع تلقائياً" : "Failed to pick topic"),
        );
      }
      const topicData = await topicRes.json();
      const pickedTopic = topicData.topic || "";
      const pickedKeyword = topicData.focusKeyword || "";
      setTopic(pickedTopic);
      setFocusKeyword(pickedKeyword);
      if (topicData.category) setCategory(topicData.category);
      setResearching(false);

      // Step 2: Research the topic via web search
      let research = null;
      try {
        const researchRes = await fetch("/api/ai/research-topic", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            topic: pickedTopic,
            focusKeyword: pickedKeyword,
          }),
        });
        if (researchRes.ok) {
          research = await researchRes.json();
          setResearchData(research);
        }
      } catch (researchErr: any) {
        console.warn("[AIGenerateModal] Research step notice:", researchErr?.message);
      }

      // Step 3: Generate the article
      const res = await fetch("/api/ai/generate-article", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic: pickedTopic,
          focusKeyword: pickedKeyword,
          category: topicData.category || category,
          language,
          research,
        }),
      });
      const data = await res.json();
      if (!res.ok || data.error)
        throw new Error(data.error || `Failed (${res.status})`);
      setBundle(data as GeneratedBundle);
      toast.success(isAr ? "تم توليد المقال بنجاح!" : "Content generated successfully!");
    } catch (e: any) {
      setError(e.message);
      toast.error(e.message);
    } finally {
      setGenerating(false);
      setResearching(false);
    }
  };

  const handleGenerate = async () => {
    if (!canGenerate) {
      setError(
        isAr
          ? "يرجى كتابة الموضوع أو الكلمة المفتاحية، أو الضغط على زر 'توليد تلقائي' لاختيار موضوع وتريند ذكي."
          : "Please enter a topic or focus keyword, or click 'Auto Generate' to automatically pick a trending topic.",
      );
      return;
    }
    setGenerating(true);
    setError(null);
    setBundle(null);
    setResearchData(null);

    try {
      // Step 1: Research the topic via web search
      setResearching(true);
      let research = null;
      try {
        const researchRes = await fetch("/api/ai/research-topic", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            topic: topic.trim() || undefined,
            focusKeyword: focusKeyword.trim() || undefined,
          }),
        });
        if (researchRes.ok) {
          research = await researchRes.json();
          setResearchData(research);
        }
      } catch (researchErr: any) {
        console.warn("[AIGenerateModal] Research notice:", researchErr?.message);
      }
      setResearching(false);

      // Step 2: Generate the article using the research data
      const res = await fetch("/api/ai/generate-article", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic: topic.trim() || undefined,
          focusKeyword: focusKeyword.trim() || undefined,
          category,
          language,
          research,
        }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || `Failed (${res.status})`);
      }
      setBundle(data as GeneratedBundle);
      toast.success(isAr ? "تم توليد المقال بنجاح!" : "Content generated successfully!");
    } catch (e: any) {
      setError(e.message);
      toast.error(e.message);
    } finally {
      setGenerating(false);
      setResearching(false);
    }
  };

  const handleApply = (langChoice: "en" | "ar") => {
    if (!bundle) return;
    onApply(bundle, langChoice);
    setBundle(null);
    setTopic("");
    setFocusKeyword("");
    setError(null);
    onClose();
  };

  const copyText = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(isAr ? `تم نسخ ${label}` : `Copied ${label}`);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-background/80 backdrop-blur-sm p-4 sm:p-8">
      <div className="relative my-4 w-full max-w-5xl rounded-2xl border border-border bg-card shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-card/95 p-4 backdrop-blur">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/15 text-primary">
              <Wand2 className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold">
                {isAr
                  ? "مولّد المحتوى بالذكاء الاصطناعي"
                  : "AI Content Generator"}
              </h2>
              <p className="text-xs text-muted-foreground">
                {isAr
                  ? "أدخل الموضوع أو الكلمة المفتاحية — والذكاء الاصطناعي يبني المقال كاملاً"
                  : "Enter a topic or focus keyword — AI builds the full article"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-muted-foreground hover:bg-muted"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-5 p-5">
          {/* Input form */}
          {!bundle && (
            <>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label className="text-sm font-semibold">
                    {isAr ? "الموضوع" : "Topic"}
                  </Label>
                  <Input
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    placeholder={
                      isAr
                        ? "مثال: كيف تبني عضلات الصدر بدون جيم"
                        : "e.g. How to build a chest without a gym"
                    }
                    className="mt-1.5"
                  />
                  <p className="mt-1 text-[10px] text-muted-foreground">
                    {isAr
                      ? "أو اتركه فارغاً واستخدم الكلمة المفتاحية"
                      : "Or leave empty and use focus keyword"}
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-semibold">
                    {isAr ? "الكلمة المفتاحية" : "Focus Keyword"}
                  </Label>
                  <Input
                    value={focusKeyword}
                    onChange={(e) => setFocusKeyword(e.target.value)}
                    placeholder={
                      isAr ? "مثال: تمارين الصدر" : "e.g. chest exercises"
                    }
                    className="mt-1.5"
                    dir="ltr"
                  />
                  <p className="mt-1 text-[10px] text-muted-foreground">
                    {isAr
                      ? "أو اتركها فارغة واستخدم الموضوع"
                      : "Or leave empty and use topic"}
                  </p>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label className="text-sm font-semibold">
                    {isAr
                      ? "اللغة الافتراضية للمقال"
                      : "Default Article Language"}
                  </Label>
                  <select
                    value={language}
                    onChange={(e) => setLanguage(e.target.value as "en" | "ar")}
                    className="mt-1.5 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm"
                  >
                    <option value="en">English</option>
                    <option value="ar">العربية</option>
                  </select>
                  <p className="mt-1 text-[10px] text-muted-foreground">
                    {isAr
                      ? "تولّد اللغتان معاً (إنجليزي + عربي محلي) في كل مرة"
                      : "Both languages (EN + localized AR) are generated each time"}
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-semibold">
                    {isAr ? "التصنيف" : "Category"}
                  </Label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="mt-1.5 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm"
                  >
                    {BLOG_CATEGORIES.map((c) => (
                      <option key={c.id} value={c.id}>
                        {isAr ? c.ar : c.en}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Optimizations reminder */}
              <Card className="p-3">
                <p className="mb-2 text-xs font-semibold text-muted-foreground">
                  {isAr ? "كل مقال محسّن لـ:" : "السطور التالية"}
                </p>
              </Card>

              {error && (
                <div className="flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span className="break-words">{error}</span>
                </div>
              )}

              <div className="flex flex-wrap justify-end gap-2">
                <Button variant="ghost" onClick={onClose}>
                  {isAr ? "إلغاء" : "Cancel"}
                </Button>
                {/* Auto-generate — picks a topic automatically, no user input needed */}
                <Button
                  variant="secondary"
                  className="gap-2"
                  onClick={handleAutoGenerate}
                  disabled={generating}
                >
                  {generating && researching ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Wand2 className="h-4 w-4" />
                  )}
                  {isAr
                    ? "توليد تلقائي (بحث + كتابة)"
                    : "Auto-Generate (Research + Write)"}
                </Button>
                {/* Manual generate — user provides topic/keyword */}
                <Button
                  className="gap-2"
                  onClick={handleGenerate}
                  disabled={generating || !canGenerate}
                >
                  {generating && !researching ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Sparkles className="h-4 w-4" />
                  )}
                  {generating && !researching
                    ? isAr
                      ? "جارٍ التوليد…"
                      : "Generating…"
                    : isAr
                      ? "توليد بالكلمة المفتاحية"
                      : "Generate with Keyword"}
                </Button>
              </div>

              {generating && (
                <Card className="p-4">
                  <div className="flex items-center gap-3 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                    <div>
                      <p className="font-medium text-foreground">
                        {researching
                          ? isAr
                            ? "جارٍ البحث واختيار الموضوع…"
                            : "Researching & picking topic…"
                          : isAr
                            ? "كتابة المقال بالذكاء الاصطناعي…"
                            : "Writing article with AI…"}
                      </p>
                      {topic && (
                        <p className="mt-1 text-xs text-primary">
                          {isAr ? "الموضوع: " : "Topic: "}
                          {topic}
                        </p>
                      )}
                      <ul className="mt-1 space-y-0.5 text-xs">
                        <li>
                          •{" "}
                          {isAr
                            ? "البحث في جوجل والمواقع المنافسة"
                            : "Searching Google + competitor sites"}
                        </li>
                        <li>
                          •{" "}
                          {isAr
                            ? "تحليل الأسئلة الشائعة"
                            : "Analyzing related questions"}
                        </li>
                        <li>
                          • {isAr ? "توليد بيانات SEO" : "Generating SEO data"}
                        </li>
                        <li>
                          •{" "}
                          {isAr
                            ? "كتابة المقال الإنجليزي والعربي"
                            : "Writing EN + AR articles"}
                        </li>
                        <li>
                          •{" "}
                          {isAr
                            ? "توليد FAQ وروابط ومحتوى تسويقي"
                            : "Building FAQ, links, social posts"}
                        </li>
                      </ul>
                    </div>
                  </div>
                  {researchData && (
                    <div className="mt-3 rounded-lg border border-border bg-muted/30 p-2 text-xs">
                      <p className="font-semibold text-primary">
                        {isAr
                          ? `تم العثور على ${researchData.totalResults || 0} نتيجة بحث`
                          : `Found ${researchData.totalResults || 0} search results`}
                      </p>
                      {researchData.relatedQuestions?.length > 0 && (
                        <p className="mt-1 text-muted-foreground">
                          {isAr
                            ? `${researchData.relatedQuestions.length} سؤال شائع`
                            : `${researchData.relatedQuestions.length} related questions`}
                        </p>
                      )}
                    </div>
                  )}
                </Card>
              )}
            </>
          )}

          {/* Results preview */}
          {bundle && (
            <div className="space-y-4">
              {/* Research summary */}
              {bundle.research && (
                <Card className="p-4">
                  <h3 className="mb-2 flex items-center gap-2 text-sm font-bold">
                    <Sparkles className="h-4 w-4 text-primary" />
                    {isAr ? "ملخص البحث" : "Research Summary"}
                  </h3>
                  <div className="space-y-2 text-xs">
                    <div>
                      <span className="font-semibold text-muted-foreground">
                        {isAr ? "الزاوية: " : "Angle: "}
                      </span>
                      <span>{bundle.research.angle}</span>
                    </div>
                    <div>
                      <span className="font-semibold text-muted-foreground">
                        {isAr ? "نية البحث: " : "Search Intent: "}
                      </span>
                      <Badge variant="outline" className="text-[10px]">
                        {bundle.research.searchIntent}
                      </Badge>
                    </div>
                    <div>
                      <span className="font-semibold text-muted-foreground">
                        {isAr ? "السبب: " : "Rationale: "}
                      </span>
                      <span>{bundle.research.rationale}</span>
                    </div>
                  </div>
                </Card>
              )}

              {/* SEO data */}
              <Card className="p-4">
                <h3 className="mb-2 flex items-center gap-2 text-sm font-bold">
                  <Globe className="h-4 w-4 text-primary" />
                  {isAr ? "بيانات SEO" : "SEO Data"}
                </h3>
                <div className="space-y-3 text-xs">
                  <div>
                    <span className="font-semibold text-muted-foreground">
                      {isAr ? "الكلمة المفتاحية الرئيسية:" : "Focus Keyword:"}
                    </span>
                    <Badge variant="default" className="ms-1.5 text-[10px]">
                      {bundle.seo.focusKeyword}
                    </Badge>
                  </div>
                  <div>
                    <span className="font-semibold text-muted-foreground">
                      {isAr ? "الكلمات الثانوية:" : "Secondary Keywords:"}
                    </span>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {bundle.seo.secondaryKeywords.map((k, i) => (
                        <Badge
                          key={i}
                          variant="outline"
                          className="text-[10px]"
                        >
                          {k}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  {(["en", "ar"] as const).map((lang) => {
                    const s = bundle.seo[lang];
                    return (
                      <div
                        key={lang}
                        className="rounded-lg border border-border p-2.5"
                      >
                        <span className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-primary">
                          {lang === "en" ? "English" : "العربية"}
                        </span>
                        <div className="grid gap-2 sm:grid-cols-2">
                          <div>
                            <span className="font-semibold text-muted-foreground">
                              {isAr ? "عنوان SEO:" : "SEO Title:"}
                            </span>
                            <p
                              className="mt-0.5"
                              dir={lang === "ar" ? "rtl" : "ltr"}
                            >
                              {s.seoTitle}
                            </p>
                          </div>
                          <div>
                            <span className="font-semibold text-muted-foreground">
                              Slug:
                            </span>
                            <code
                              className="mt-0.5 block font-mono text-[11px]"
                              dir="ltr"
                            >
                              {s.slug}
                            </code>
                          </div>
                        </div>
                        <div className="mt-2">
                          <span className="font-semibold text-muted-foreground">
                            {isAr ? "وصف ميتا:" : "Meta Description:"}
                          </span>
                          <p
                            className="mt-0.5"
                            dir={lang === "ar" ? "rtl" : "ltr"}
                          >
                            {s.metaDescription}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Card>

              {/* Articles preview (tabbed) */}
              <ArticlePreview bundle={bundle} isAr={isAr} />

              {/* FAQ */}
              {bundle.faq.length > 0 && (
                <Card className="p-4">
                  <h3 className="mb-2 flex items-center gap-2 text-sm font-bold">
                    <HelpCircle className="h-4 w-4 text-primary" />
                    {isAr ? "الأسئلة الشائعة" : "FAQ"} ({bundle.faq.length})
                  </h3>
                  <div className="space-y-2 text-xs">
                    {bundle.faq.map((f, i) => (
                      <div
                        key={i}
                        className="rounded-lg border border-border/60 p-2"
                      >
                        <p className="font-semibold">{f.question}</p>
                        <p className="mt-0.5 text-muted-foreground">
                          {f.answer}
                        </p>
                      </div>
                    ))}
                  </div>
                </Card>
              )}

              {/* Link suggestions */}
              {(bundle.internalLinks.length > 0 ||
                bundle.externalLinks.length > 0) && (
                <Card className="p-4">
                  <h3 className="mb-2 flex items-center gap-2 text-sm font-bold">
                    <Link2 className="h-4 w-4 text-primary" />
                    {isAr ? "اقتراحات الروابط" : "Link Suggestions"}
                  </h3>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {bundle.internalLinks.length > 0 && (
                      <div>
                        <p className="mb-1 text-[10px] font-semibold uppercase text-muted-foreground">
                          {isAr ? "روابط داخلية" : "Internal"}
                        </p>
                        <ul className="space-y-1 text-xs">
                          {bundle.internalLinks.map((l, i) => (
                            <li key={i}>
                              <code className="font-mono text-[10px]" dir="ltr">
                                /{l.slug}
                              </code>
                              <span className="ms-1.5 text-muted-foreground">
                                — {l.anchorText}
                              </span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {bundle.externalLinks.length > 0 && (
                      <div>
                        <p className="mb-1 text-[10px] font-semibold uppercase text-muted-foreground">
                          {isAr ? "روابط خارجية" : "External"}
                        </p>
                        <ul className="space-y-1 text-xs">
                          {bundle.externalLinks.map((l, i) => (
                            <li key={i} className="truncate">
                              <a
                                href={l.url}
                                target="_blank"
                                rel="noreferrer"
                                className="font-mono text-[10px] text-primary hover:underline"
                                dir="ltr"
                              >
                                {l.url}
                              </a>
                              <span className="ms-1.5 text-muted-foreground">
                                — {l.anchorText}
                              </span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </Card>
              )}

              {/* Image prompts */}
              <Card className="p-4">
                <h3 className="mb-2 flex items-center gap-2 text-sm font-bold">
                  <ImageIcon className="h-4 w-4 text-primary" />
                  {isAr ? "برومبتات الصور" : "Image Prompts"}
                  <button
                    onClick={() =>
                      copyText(
                        [
                          bundle.imagePrompts.featuredImage,
                          bundle.imagePrompts.facebookImage,
                          bundle.imagePrompts.openGraphImage,
                        ].join("\n\n---\n\n"),
                        isAr ? "كل البرومبتات" : "all prompts",
                      )
                    }
                    className="ms-auto flex items-center gap-1 text-[10px] text-primary hover:underline"
                  >
                    <Copy className="h-3 w-3" />
                    {isAr ? "نسخ الكل" : "Copy all"}
                  </button>
                </h3>
                <div className="space-y-2 text-xs">
                  {[
                    {
                      label: isAr ? "الصورة المميزة" : "Featured",
                      value: bundle.imagePrompts.featuredImage,
                    },
                    {
                      label: isAr ? "فيسبوك" : "Facebook",
                      value: bundle.imagePrompts.facebookImage,
                    },
                    {
                      label: "Open Graph",
                      value: bundle.imagePrompts.openGraphImage,
                    },
                  ].map((p, i) => (
                    <div
                      key={i}
                      className="rounded-lg border border-border/60 p-2"
                    >
                      <div className="mb-1 flex items-center justify-between">
                        <span className="font-semibold text-muted-foreground">
                          {p.label}
                        </span>
                        <button
                          onClick={() => copyText(p.value, p.label)}
                          className="text-[10px] text-primary hover:underline"
                        >
                          {isAr ? "نسخ" : "Copy"}
                        </button>
                      </div>
                      <p
                        className="text-[11px] text-muted-foreground"
                        dir="ltr"
                      >
                        {p.value}
                      </p>
                    </div>
                  ))}
                </div>
              </Card>

              {/* Social posts */}
              <Card className="p-4">
                <h3 className="mb-2 flex items-center gap-2 text-sm font-bold">
                  <Share2 className="h-4 w-4 text-primary" />
                  {isAr ? "منشورات السوشيال ميديا" : "Social Media Posts"}
                </h3>
                <div className="grid gap-2 sm:grid-cols-2">
                  {[
                    { label: "Facebook", value: bundle.socialPosts.facebook },
                    { label: "LinkedIn", value: bundle.socialPosts.linkedin },
                    { label: "Instagram", value: bundle.socialPosts.instagram },
                    { label: "X", value: bundle.socialPosts.x },
                  ].map((p, i) => (
                    <div
                      key={i}
                      className="rounded-lg border border-border/60 p-2"
                    >
                      <div className="mb-1 flex items-center justify-between">
                        <span className="font-semibold text-muted-foreground">
                          {p.label}
                        </span>
                        <button
                          onClick={() => copyText(p.value, p.label)}
                          className="text-[10px] text-primary hover:underline"
                        >
                          <Copy className="h-3 w-3 inline" />{" "}
                          {isAr ? "نسخ" : "Copy"}
                        </button>
                      </div>
                      <pre
                        className="whitespace-pre-wrap text-[11px] text-muted-foreground max-h-32 overflow-y-auto scrollbar-thin"
                        dir="auto"
                      >
                        {p.value}
                      </pre>
                    </div>
                  ))}
                </div>
              </Card>

              {/* Action bar */}
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-muted/30 p-3">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <CheckCircle2 className="h-4 w-4 text-success" />
                  {isAr
                    ? "اختر المقال الذي تريد إدراجه في المحرر. يمكنك تعديله قبل الحفظ."
                    : "Pick which article to load into the editor. You can edit before saving."}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    className="gap-2"
                    onClick={() => handleApply("en")}
                  >
                    <FileText className="h-4 w-4" />
                    {isAr ? "استخدم الإنجليزي" : "Use English"}
                  </Button>
                  <Button
                    size="sm"
                    className="gap-2"
                    onClick={() => handleApply("ar")}
                  >
                    <FileText className="h-4 w-4" />
                    {isAr ? "استخدم العربي" : "Use Arabic"}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ArticlePreview({
  bundle,
  isAr,
}: {
  bundle: GeneratedBundle;
  isAr: boolean;
}) {
  const [tab, setTab] = useState<"en" | "ar">("en");
  const article = tab === "en" ? bundle.englishArticle : bundle.arabicArticle;
  const isRTL = tab === "ar";

  return (
    <Card className="p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-sm font-bold">
          <FileText className="h-4 w-4 text-primary" />
          {isAr ? "معاينة المقال" : "Article Preview"} (
          {bundle.estimatedReadingTime} {isAr ? "د" : "min"})
        </h3>
        <div className="flex gap-1">
          <button
            onClick={() => setTab("en")}
            className={`rounded-full px-3 py-1 text-xs font-medium ${
              tab === "en"
                ? "bg-primary text-primary-foreground"
                : "border border-border text-muted-foreground"
            }`}
          >
            English
          </button>
          <button
            onClick={() => setTab("ar")}
            className={`rounded-full px-3 py-1 text-xs font-medium ${
              tab === "ar"
                ? "bg-primary text-primary-foreground"
                : "border border-border text-muted-foreground"
            }`}
          >
            العربية
          </button>
        </div>
      </div>
      <div
        className="prose prose-sm max-w-none max-h-[500px] overflow-y-auto scrollbar-thin rounded-lg border border-border/60 bg-background/40 p-4 [&_h2]:mt-4 [&_h2]:mb-2 [&_h2]:font-bold [&_h3]:mt-3 [&_h3]:mb-1 [&_h3]:font-semibold [&_p]:leading-relaxed [&_ul]:my-2 [&_li]:my-0.5 [&_table]:my-3 [&_th]:border [&_th]:border-border [&_th]:p-1.5 [&_th]:bg-muted [&_td]:border [&_td]:border-border [&_td]:p-1.5"
        dir={isRTL ? "rtl" : "ltr"}
        dangerouslySetInnerHTML={{ __html: renderMarkdown(article) }}
      />
    </Card>
  );
}
