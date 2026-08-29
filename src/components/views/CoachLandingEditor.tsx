"use client";

import { useEffect, useMemo, useState } from "react";
import { useI18n } from "@/lib/i18n";

/**
 * MULTI-COACH PHASE 2B — coach public landing page editor.
 * The coach self-promotes his page (owner answer 3): slug, headline,
 * bio, specialties (one per line) + publish toggle + copy-link.
 * NOT in any public menu — the URL is the coach's own marketing asset.
 */

type LandingPage = {
  coach_id: string;
  slug: string;
  headline: string;
  bio: string;
  specialties: string;
  headline_en?: string;
  bio_en?: string;
  specialties_en?: string;
  is_published: boolean;
} | null;

export function CoachLandingEditor() {
  const { lang } = useI18n();
  const isAr = lang === "ar";

  const [page, setPage] = useState<LandingPage>(null);
  const [slug, setSlug] = useState("");
  const [headline, setHeadline] = useState("");
  const [bio, setBio] = useState("");
  const [specialties, setSpecialties] = useState("");
  // English copy (migration 0032) — optional, falls back to the AR
  // fields on the public page when left empty.
  const [headlineEn, setHeadlineEn] = useState("");
  const [bioEn, setBioEn] = useState("");
  const [specialtiesEn, setSpecialtiesEn] = useState("");
  const [published, setPublished] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/coach/landing");
        if (res.ok) {
          const json = await res.json();
          setPage(json.page);
          setSlug(json.suggestedSlug ?? "");
          setHeadline(json.page?.headline ?? "");
          setBio(json.page?.bio ?? "");
          setSpecialties(json.page?.specialties ?? "");
          setHeadlineEn(json.page?.headline_en ?? "");
          setBioEn(json.page?.bio_en ?? "");
          setSpecialtiesEn(json.page?.specialties_en ?? "");
          setPublished(Boolean(json.page?.is_published));
        } else {
          setMessage({
            kind: "err",
            text: isAr ? "تعذر تحميل الصفحة — تأكد من تشغيل هجرة 0031" : "Failed to load — make sure migration 0031 ran",
          });
        }
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const publicUrl = useMemo(
    () => (slug ? `${typeof window !== "undefined" ? window.location.origin : ""}/coaches/${slug}` : ""),
    [slug],
  );

  const specialtiesList = useMemo(
    () => specialties.split("\n").map((s) => s.trim()).filter(Boolean),
    [specialties],
  );

  const specialtiesEnList = useMemo(
    () => specialtiesEn.split("\n").map((s) => s.trim()).filter(Boolean),
    [specialtiesEn],
  );

  async function save(publish: boolean) {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/coach/landing", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug,
          headline,
          bio,
          specialties: specialtiesList,
          headline_en: headlineEn,
          bio_en: bioEn,
          specialties_en: specialtiesEnList,
          is_published: publish,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (res.ok) {
        setPublished(publish);
        setPage(json.page);
        setMessage({
          kind: "ok",
          text: publish
            ? isAr ? "تم النشر — شارك رابط صفحتك مع عملائك" : "Published — share your page link with clients"
            : isAr ? "تم حفظ المسودة (غير منشورة)" : "Draft saved (not published)",
        });
      } else {
        setMessage({ kind: "err", text: json.message || json.error || (isAr ? "فشل الحفظ" : "Save failed") });
      }
    } finally {
      setSaving(false);
    }
  }

  async function copyLink() {
    if (!publicUrl) return;
    try {
      await navigator.clipboard.writeText(publicUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard unavailable — the URL is visible in the input
    }
  }

  if (loading) {
    return (
      <div className="py-20 text-center text-base font-normal text-[#6e6e73]">
        {isAr ? "جارٍ التحميل…" : "Loading…"}
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">
          {isAr ? "صفحتي العامة" : "My Public Page"}
        </h1>
        <p className="mt-2 text-base font-normal text-[#6e6e73] md:text-lg">
          {isAr
            ? "صفحة تعريفية خاصة بك على الموقع — أنت المسؤول عن الترويج لها. شارك الرابط مع عملائك وعلى صفحاتك."
            : "Your personal public page on the site — you promote it yourself. Share the link with your clients."}
        </p>
      </div>

      {/* Public URL + copy */}
      <div className="rounded-2xl bg-[#f5f5f7] p-6">
        <label className="mb-2 block text-xs font-normal uppercase tracking-wide text-[#6e6e73]">
          {isAr ? "رابط صفحتك" : "Your page URL"}
        </label>
        <div className="flex flex-wrap items-center gap-3">
          <code className="flex-1 truncate rounded-xl border border-[#d2d2d7] bg-white px-4 py-2.5 text-sm" dir="ltr">
            {publicUrl || "—"}
          </code>
          <button
            onClick={copyLink}
            disabled={!publicUrl}
            className="rounded-full bg-[#1d1d1f] px-5 py-2.5 text-sm font-normal text-white transition-opacity hover:opacity-90 disabled:opacity-40"
          >
            {copied ? (isAr ? "تم النسخ ✓" : "Copied ✓") : isAr ? "نسخ الرابط" : "Copy link"}
          </button>
          {publicUrl && (
            <>
              <a
                href={`/coaches/${slug}`}
                target="_blank"
                rel="noreferrer"
                className="rounded-full border border-[#d2d2d7] bg-white px-5 py-2.5 text-sm font-normal transition-opacity hover:opacity-70"
              >
                {isAr ? "معاينة (EN) ↗" : "Preview (EN) ↗"}
              </a>
              <a
                href={`/ar/coaches/${slug}`}
                target="_blank"
                rel="noreferrer"
                className="rounded-full border border-[#d2d2d7] bg-white px-5 py-2.5 text-sm font-normal transition-opacity hover:opacity-70"
              >
                {isAr ? "معاينة (AR) ↗" : "Preview (AR) ↗"}
              </a>
            </>
          )}
        </div>
        <div className={`mt-2 inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium ${
          published ? "bg-[#34c759]/10 text-[#34c759]" : "bg-[#ff9500]/10 text-[#ff9500]"
        }`}>
          <span className={`h-2 w-2 rounded-full ${published ? "bg-[#34c759]" : "bg-[#ff9500]"}`} />
          {published ? (isAr ? "منشورة للعامة" : "Published") : (isAr ? "غير منشورة (مسودة)" : "Draft (unpublished)")}
        </div>
      </div>

      {/* Form */}
      <div className="space-y-6 rounded-3xl bg-[#f5f5f7] p-6 md:p-8">
        <div>
          <label className="mb-2 block text-sm font-medium">
            {isAr ? "الرابط (بالإنجليزية)" : "Slug (English)"}
          </label>
          <div className="flex items-center gap-2" dir="ltr">
            <span className="text-sm text-[#6e6e73]">/coaches/</span>
            <input
              value={slug}
              onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-"))}
              placeholder="coach-ahmed"
              className="flex-1 rounded-xl border border-[#d2d2d7] bg-white px-4 py-2.5 text-sm outline-none focus:border-[#0071e3]"
            />
          </div>
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium">
            {isAr ? "العنوان التعريفي" : "Headline"}
          </label>
          <input
            value={headline}
            onChange={(e) => setHeadline(e.target.value)}
            maxLength={140}
            placeholder={isAr ? "مدرب لياقة معتمد — خطة تغذية وتمرين مخصصة لك" : "Certified fitness coach — a custom nutrition & training plan for you"}
            className="w-full rounded-xl border border-[#d2d2d7] bg-white px-4 py-2.5 text-sm outline-none focus:border-[#0071e3]"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium">
            {isAr ? "نبذة عنك" : "About you"}
          </label>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            rows={6}
            maxLength={4000}
            placeholder={isAr ? "اكتب نبذة قصيرة عن خبرتك ومنهجيتك ونتائج عملائك…" : "Write a short bio: experience, method, client results…"}
            className="w-full rounded-xl border border-[#d2d2d7] bg-white px-4 py-2.5 text-sm outline-none focus:border-[#0071e3]"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium">
            {isAr ? "التخصصات (سطر لكل تخصص)" : "Specialties (one per line)"}
          </label>
          <textarea
            value={specialties}
            onChange={(e) => setSpecialties(e.target.value)}
            rows={4}
            maxLength={800}
            placeholder={isAr ? "خسارة الوزن\nبناء العضلات\nتغذية رياضية" : "Weight loss\nMuscle building\nSports nutrition"}
            className="w-full rounded-xl border border-[#d2d2d7] bg-white px-4 py-2.5 text-sm outline-none focus:border-[#0071e3]"
          />
        </div>

        {/* English copy — optional (migration 0032). The public page
            falls back to the Arabic fields above when left empty. */}
        <div className="rounded-2xl border border-[#d2d2d7] bg-white p-5">
          <p className="mb-4 text-xs font-medium uppercase tracking-wide text-[#6e6e73]" dir="ltr">
            English version — optional
            <span className="ms-2 normal-case">{isAr ? "(النسخة الإنجليزية — اختيارية)" : "(optional)"}</span>
          </p>

          <div className="space-y-5" dir="ltr">
            <div>
              <label className="mb-2 block text-sm font-medium">Headline (EN)</label>
              <input
                value={headlineEn}
                onChange={(e) => setHeadlineEn(e.target.value)}
                maxLength={140}
                placeholder="Certified fitness coach — a custom nutrition & training plan for you"
                className="w-full rounded-xl border border-[#d2d2d7] bg-white px-4 py-2.5 text-sm outline-none focus:border-[#0071e3]"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">About you (EN)</label>
              <textarea
                value={bioEn}
                onChange={(e) => setBioEn(e.target.value)}
                rows={5}
                maxLength={4000}
                placeholder="Write a short bio: experience, method, client results…"
                className="w-full rounded-xl border border-[#d2d2d7] bg-white px-4 py-2.5 text-sm outline-none focus:border-[#0071e3]"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">Specialties (EN — one per line)</label>
              <textarea
                value={specialtiesEn}
                onChange={(e) => setSpecialtiesEn(e.target.value)}
                rows={4}
                maxLength={800}
                placeholder={"Weight loss\nMuscle building\nSports nutrition"}
                className="w-full rounded-xl border border-[#d2d2d7] bg-white px-4 py-2.5 text-sm outline-none focus:border-[#0071e3]"
              />
            </div>
          </div>
          <p className="mt-3 text-xs font-normal text-[#6e6e73]">
            {isAr
              ? "لو سيبتها فاضية، الصفحة الإنجليزية هتعرض المحتوى العربي تلقائيًا — والعكس صحيح."
              : "Left empty, the English page automatically shows the Arabic content — and vice versa."}
          </p>
        </div>

        {message && (
          <p className={`rounded-xl px-4 py-3 text-sm font-medium ${
            message.kind === "ok" ? "bg-[#34c759]/10 text-[#34c759]" : "bg-[#ff3b30]/10 text-[#ff3b30]"
          }`}>
            {message.text}
          </p>
        )}

        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => save(true)}
            disabled={saving}
            className="rounded-full bg-[#0071e3] px-6 py-2.5 text-sm font-normal text-white transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {saving ? (isAr ? "جارٍ الحفظ…" : "Saving…") : published ? (isAr ? "تحديث النشر" : "Update published") : (isAr ? "نشر الصفحة" : "Publish")}
          </button>
          <button
            onClick={() => save(false)}
            disabled={saving}
            className="rounded-full border border-[#d2d2d7] bg-white px-6 py-2.5 text-sm font-normal transition-opacity hover:opacity-70 disabled:opacity-50"
          >
            {isAr ? "حفظ كمسودة" : "Save draft"}
          </button>
        </div>
      </div>
    </div>
  );
}
