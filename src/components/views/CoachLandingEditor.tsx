"use client";

import { useEffect, useMemo, useState } from "react";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/lib/supabase/client";
import type { CoachResultPhoto, CoachCertificate } from "@/lib/coach-landing-server";

/**
 * MULTI-COACH PHASE 2B — coach public landing page editor.
 * The coach self-promotes his page (owner answer 3): slug, headline,
 * bio, specialties (one per line) + publish toggle + copy-link.
 * NOT in any public menu — the URL is the coach's own marketing asset.
 *
 * 0037 COACH BOOST — public profile enrichment: personal photo, client
 * results photos (max 6, public "coach-public" bucket) and social
 * profile links. Photos upload DIRECTLY from the browser to the public
 * bucket under the coach's own folder (storage RLS), and only the
 * resulting public URLs travel to the API (server re-validates).
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
  photo_url?: string;
  results_photos?: CoachResultPhoto[];
  // 0049 — coach certificates (OPTIONAL, migration RUN_ON_SUPABASE_0049)
  certificates?: CoachCertificate[];
  instagram_url?: string;
  facebook_url?: string;
  tiktok_url?: string;
  youtube_url?: string;
  // 0046 — admin review state (migration RUN_ON_SUPABASE_0046)
  review_status?: "pending" | "approved" | "rejected";
  review_note?: string;
} | null;

const MAX_RESULTS_PHOTOS = 6;
const MAX_CERTIFICATES = 8;
const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // matches the bucket limit (0037)

/**
 * Upload an image to the public coach-public bucket under the coach's
 * own folder and return the SAME-ORIGIN public path (origin stripped —
 * the server only accepts that shape or https://, never bare hosts).
 */
async function uploadCoachImage(
  file: File,
  coachId: string,
  kind: "photo" | "result" | "cert",
): Promise<string> {
  if (!supabase) {
    throw new Error("Supabase client unavailable");
  }
  const ext = (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "");
  const path = `${coachId}/${kind}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const { error } = await supabase.storage
    .from("coach-public")
    .upload(path, file, { upsert: false, cacheControl: "31536000" });
  if (error) throw error;
  const { data } = supabase.storage.from("coach-public").getPublicUrl(path);
  const full = data?.publicUrl || "";
  try {
    // Same-origin relative path (works on the public page + passes the
    // server validator); falls back to the absolute URL when needed.
    const u = new URL(full);
    return u.pathname + u.search;
  } catch {
    return full;
  }
}
export function CoachLandingEditor() {
  const { lang } = useI18n();
  const isAr = lang === "ar";
  const { profile } = useAuth();

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
  // 0046 — review state shown as a banner (pending / rejected + reason)
  const [reviewStatus, setReviewStatus] = useState<"pending" | "approved" | "rejected">("approved");
  const [reviewNote, setReviewNote] = useState("");
  // 0037 — public profile enrichment state
  const [photoUrl, setPhotoUrl] = useState("");
  const [resultsPhotos, setResultsPhotos] = useState<CoachResultPhoto[]>([]);
  // 0049 — coach certificates (OPTIONAL section)
  const [certificates, setCertificates] = useState<CoachCertificate[]>([]);
  const [instagram, setInstagram] = useState("");
  const [facebook, setFacebook] = useState("");
  const [tiktok, setTiktok] = useState("");
  const [youtube, setYoutube] = useState("");
  // 0037 — the coach's own WhatsApp number (shown to his activated clients)
  const [whatsapp, setWhatsapp] = useState("");
  const [busyUpload, setBusyUpload] = useState<"photo" | "results" | "certs" | null>(null);
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
          setReviewStatus(json.page?.review_status ?? "approved");
          setReviewNote(json.page?.review_note ?? "");
          setPhotoUrl(json.page?.photo_url ?? "");
          setResultsPhotos(Array.isArray(json.page?.results_photos) ? json.page.results_photos : []);
          setCertificates(Array.isArray(json.page?.certificates) ? json.page.certificates : []);
          setInstagram(json.page?.instagram_url ?? "");
          setFacebook(json.page?.facebook_url ?? "");
          setTiktok(json.page?.tiktok_url ?? "");
          setYoutube(json.page?.youtube_url ?? "");
          setWhatsapp(json.page?.whatsapp_phone ?? "");
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
          photo_url: photoUrl,
          results_photos: resultsPhotos,
          certificates,
          instagram_url: instagram.trim(),
          facebook_url: facebook.trim(),
          tiktok_url: tiktok.trim(),
          youtube_url: youtube.trim(),
          whatsapp_phone: whatsapp.trim(),
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (res.ok) {
        setPublished(publish);
        setPage(json.page);
        // 0046 — the server answers with the fresh review state
        setReviewStatus(json.page?.review_status ?? "approved");
        setReviewNote(json.page?.review_note ?? "");
        setMessage({
          kind: "ok",
          text:
            (json.page?.review_status ?? "approved") === "pending"
              ? isAr
                ? "تم الحفظ — صفحتك دلوقتي في انتظار مراجعة الأدمن وهي تظهر للزوار بعد موافقته"
                : "Saved — your page is now PENDING admin review and goes public once approved"
              : publish
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

  const coachId = profile?.id || page?.coach_id || "";

  function guardImage(file: File): string | null {
    if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
      return isAr ? "الصورة لازم تكون JPG أو PNG أو WEBP" : "Image must be JPG, PNG or WEBP";
    }
    if (file.size > MAX_IMAGE_BYTES) {
      return isAr ? "أقصى حجم للصورة ٥ ميجابايت" : "Max image size is 5 MB";
    }
    if (!coachId) {
      return isAr ? "سجّل دخولك تاني قبل رفع الصور" : "Sign in again before uploading";
    }
    return null;
  }

  async function handlePhotoUpload(file: File) {
    const err = guardImage(file);
    if (err) {
      setMessage({ kind: "err", text: err });
      return;
    }
    setBusyUpload("photo");
    setMessage(null);
    try {
      const url = await uploadCoachImage(file, coachId, "photo");
      setPhotoUrl(url);
      setMessage({ kind: "ok", text: isAr ? "تم رفع الصورة — اضغط نشر لحفظها على صفحتك" : "Photo uploaded — press publish to save it to your page" });
    } catch (e: any) {
      setMessage({
        kind: "err",
        text: isAr
          ? `تعذر رفع الصورة — لو الخطأ تكرر شغّل هجرة 0037 (${e?.message || "upload failed"})`
          : `Upload failed — if it repeats, run migration 0037 (${e?.message || "upload failed"})`,
      });
    } finally {
      setBusyUpload(null);
    }
  }

  async function handleResultsUpload(files: FileList) {
    const room = MAX_RESULTS_PHOTOS - resultsPhotos.length;
    if (room <= 0) {
      setMessage({ kind: "err", text: isAr ? `الحد الأقصى ${MAX_RESULTS_PHOTOS} صور نتائج` : `Max ${MAX_RESULTS_PHOTOS} result photos` });
      return;
    }
    const list = Array.from(files).slice(0, room);
    for (const f of list) {
      const err = guardImage(f);
      if (err) {
        setMessage({ kind: "err", text: err });
        return;
      }
    }
    setBusyUpload("results");
    setMessage(null);
    try {
      const uploaded: CoachResultPhoto[] = [];
      for (const f of list) {
        const url = await uploadCoachImage(f, coachId, "result");
        uploaded.push({ url, caption: "" });
      }
      setResultsPhotos((prev) => [...prev, ...uploaded].slice(0, MAX_RESULTS_PHOTOS));
      setMessage({ kind: "ok", text: isAr ? `تم رفع ${uploaded.length} صورة — اضغط نشر لحفظها` : `Uploaded ${uploaded.length} photo(s) — press publish to save` });
    } catch (e: any) {
      setMessage({
        kind: "err",
        text: isAr
          ? `تعذر رفع الصور — لو الخطأ تكرر شغّل هجرة 0037 (${e?.message || "upload failed"})`
          : `Upload failed — if it repeats, run migration 0037 (${e?.message || "upload failed"})`,
      });
    } finally {
      setBusyUpload(null);
    }
  }

  // 0049 — coach certificates upload (OPTIONAL section, max 8)
  async function handleCertsUpload(files: FileList) {
    const room = MAX_CERTIFICATES - certificates.length;
    if (room <= 0) {
      setMessage({ kind: "err", text: isAr ? `الحد الأقصى ${MAX_CERTIFICATES} شهادات` : `Max ${MAX_CERTIFICATES} certificates` });
      return;
    }
    const list = Array.from(files).slice(0, room);
    for (const f of list) {
      const err = guardImage(f);
      if (err) {
        setMessage({ kind: "err", text: err });
        return;
      }
    }
    setBusyUpload("certs");
    setMessage(null);
    try {
      const uploaded: CoachCertificate[] = [];
      for (const f of list) {
        const url = await uploadCoachImage(f, coachId, "cert");
        uploaded.push({ url, title: "" });
      }
      setCertificates((prev) => [...prev, ...uploaded].slice(0, MAX_CERTIFICATES));
      setMessage({ kind: "ok", text: isAr ? `تم رفع ${uploaded.length} شهادة — اكتب اسم كل شهادة ثم اضغط نشر` : `Uploaded ${uploaded.length} certificate(s) — type each name then press publish` });
    } catch (e: any) {
      setMessage({
        kind: "err",
        text: isAr
          ? `تعذر رفع الشهادات — لو الخطأ تكرر شغّل هجرات 0037 و 0049 (${e?.message || "upload failed"})`
          : `Upload failed — if it repeats, run migrations 0037 & 0049 (${e?.message || "upload failed"})`,
      });
    } finally {
      setBusyUpload(null);
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
        {/* 0046 — REVIEW STATE BANNER (reason delivery channel) */}
        {reviewStatus === "rejected" && (
          <div className="rounded-2xl border border-[#ff3b30]/30 bg-[#ff3b30]/5 p-4">
            <p className="text-sm font-bold text-[#ff3b30]">
              {isAr ? "الأدمن رفض الصفحة — عدّل المحتوى وابعته تاني" : "The admin rejected your page — edit it and resubmit"}
            </p>
            {reviewNote && (
              <p className="mt-1.5 text-sm leading-relaxed text-[#ff3b30]/90">
                {isAr ? "سبب الرفض: " : "Reason: "}
                {reviewNote}
              </p>
            )}
            <p className="mt-1 text-xs text-[#6e6e73]">
              {isAr
                ? "صفحتك مش ظاهرة للزوار حاليًا — أول ما تعدّل وتضغط نشر بترجع للمراجعة."
                : "Your page is hidden from visitors — edit and press publish to send it back to review."}
            </p>
          </div>
        )}
        {reviewStatus === "pending" && (
          <div className="rounded-2xl border border-[#ff9500]/30 bg-[#ff9500]/5 p-4">
            <p className="text-sm font-bold text-[#ff9500]">
              {isAr ? "صفحتك في انتظار مراجعة الأدمن" : "Your page is pending admin review"}
            </p>
            <p className="mt-1 text-xs text-[#6e6e73]">
              {isAr
                ? "بتقدر تعدّل براحتك — لكن التعديلات مش بتظهر للزوار غير بعد موافقة الأدمن."
                : "You can keep editing — changes go live only after the admin approves."}
            </p>
          </div>
        )}
        <div className={`mt-2 inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium ${
          reviewStatus === "pending"
            ? "bg-[#ff9500]/10 text-[#ff9500]"
            : reviewStatus === "rejected"
              ? "bg-[#ff3b30]/10 text-[#ff3b30]"
              : published
                ? "bg-[#34c759]/10 text-[#34c759]"
                : "bg-[#ff9500]/10 text-[#ff9500]"
        }`}>
          <span className={`h-2 w-2 rounded-full ${
            reviewStatus === "rejected" ? "bg-[#ff3b30]" : published && reviewStatus === "approved" ? "bg-[#34c759]" : "bg-[#ff9500]"
          }`} />
          {reviewStatus === "pending"
            ? isAr ? "في انتظار موافقة الأدمن — غير ظاهرة للعامة" : "Pending admin approval — not public"
            : reviewStatus === "rejected"
              ? isAr ? "مرفوضة — محتاجة تعديل" : "Rejected — needs edits"
              : published
                ? isAr ? "معتمدة ومنشورة للعامة" : "Approved & published"
                : isAr ? "غير منشورة (مسودة)" : "Draft (unpublished)"}
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

        {/* 0037 — personal photo */}
        <div className="rounded-2xl border border-[#d2d2d7] bg-white p-5">
          <label className="mb-3 block text-sm font-medium">
            {isAr ? "صورتك الشخصية" : "Your personal photo"}
          </label>
          <div className="flex flex-wrap items-center gap-4">
            {photoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={photoUrl}
                alt={isAr ? "صورتك الشخصية" : "Your photo"}
                className="h-20 w-20 rounded-full object-cover ring-4 ring-[#f5f5f7]"
              />
            ) : (
              <div className="grid h-20 w-20 place-items-center rounded-full bg-[#f5f5f7] text-xl font-semibold text-[#6e6e73]">
                {isAr ? "لا صورة" : "None"}
              </div>
            )}
            <div className="flex flex-wrap items-center gap-3">
              <label className={`cursor-pointer rounded-full bg-[#0071e3] px-5 py-2.5 text-sm font-normal text-white transition-opacity hover:opacity-90 ${busyUpload === "photo" ? "pointer-events-none opacity-60" : ""}`}>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="sr-only"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) void handlePhotoUpload(f);
                    e.currentTarget.value = "";
                  }}
                />
                {busyUpload === "photo" ? (isAr ? "جارٍ الرفع…" : "Uploading…") : photoUrl ? (isAr ? "تغيير الصورة" : "Change photo") : (isAr ? "رفع صورة" : "Upload photo")}
              </label>
              {photoUrl && (
                <button
                  type="button"
                  onClick={() => setPhotoUrl("")}
                  className="rounded-full border border-[#d2d2d7] bg-white px-5 py-2.5 text-sm font-normal transition-opacity hover:opacity-70"
                >
                  {isAr ? "إزالة" : "Remove"}
                </button>
              )}
            </div>
          </div>
          <p className="mt-3 text-xs font-normal text-[#6e6e73]">
            {isAr
              ? "JPG / PNG / WEBP — حتى ٥ ميجا. بتظهر دائرة في أعلى صفحتك العامة."
              : "JPG / PNG / WEBP — up to 5 MB. Shown as a circle at the top of your public page."}
          </p>
        </div>

        {/* 0037 — client results photos */}
        <div className="rounded-2xl border border-[#d2d2d7] bg-white p-5">
          <label className="mb-1 block text-sm font-medium">
            {isAr ? "صور نتائج العملاء" : "Client results photos"}
          </label>
          <p className="mb-4 text-xs font-normal text-[#6e6e73]">
            {isAr
              ? `حتى ${MAX_RESULTS_PHOTOS} صور — اكتب وصفًا قصيرًا تحت كل صورة (اختياري). لازم يكون العميل موافق على نشر صورته.`
              : `Up to ${MAX_RESULTS_PHOTOS} photos — add a short caption under each (optional). Make sure the client consented to publishing his photo.`}
          </p>
          {resultsPhotos.length > 0 && (
            <div className="mb-4 grid grid-cols-2 gap-4 sm:grid-cols-3">
              {resultsPhotos.map((photo, i) => (
                <div key={`${photo.url}-${i}`} className="rounded-2xl border border-[#e5e5ea] p-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={photo.url} alt={photo.caption || `${i + 1}`} className="aspect-[3/4] w-full rounded-xl object-cover" />
                  <input
                    value={photo.caption}
                    onChange={(e) =>
                      setResultsPhotos((prev) =>
                        prev.map((p, j) => (j === i ? { ...p, caption: e.target.value.slice(0, 120) } : p)),
                      )
                    }
                    maxLength={120}
                    placeholder={isAr ? "وصف قصير (اختياري)" : "Short caption (optional)"}
                    className="mt-2 w-full rounded-lg border border-[#d2d2d7] px-2.5 py-1.5 text-xs outline-none focus:border-[#0071e3]"
                  />
                  <button
                    type="button"
                    onClick={() => setResultsPhotos((prev) => prev.filter((_, j) => j !== i))}
                    className="mt-1.5 w-full rounded-lg px-2 py-1 text-xs font-medium text-[#ff3b30] transition-colors hover:bg-[#ff3b30]/10"
                  >
                    {isAr ? "حذف" : "Remove"}
                  </button>
                </div>
              ))}
            </div>
          )}
          {resultsPhotos.length < MAX_RESULTS_PHOTOS && (
            <label className={`inline-block cursor-pointer rounded-full border border-[#d2d2d7] bg-white px-5 py-2.5 text-sm font-normal transition-opacity hover:opacity-70 ${busyUpload === "results" ? "pointer-events-none opacity-60" : ""}`}>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                className="sr-only"
                onChange={(e) => {
                  if (e.target.files?.length) void handleResultsUpload(e.target.files);
                  e.currentTarget.value = "";
                }}
              />
              {busyUpload === "results" ? (isAr ? "جارٍ الرفع…" : "Uploading…") : isAr ? "+ إضافة صور نتائج" : "+ Add result photos"}
            </label>
          )}
        </div>

        {/* 0049 — coach certificates (OPTIONAL section) */}
        <div className="rounded-2xl border border-[#d2d2d7] bg-white p-5">
          <label className="mb-1 block text-sm font-medium">
            {isAr ? "شهاداتك واعتماداتك (اختياري)" : "Your certificates (optional)"}
          </label>
          <p className="mb-4 text-xs font-normal text-[#6e6e73]">
            {isAr
              ? `ارفع صور شهاداتك واعتماداتك (حتى ${MAX_CERTIFICATES} شهادة) واكتب اسم كل شهادة. لو سيبت القسم فاضي مش هيظهر على صفحتك العامة.`
              : `Upload photos of your certificates (up to ${MAX_CERTIFICATES}) and type each name. Leave empty to skip — the section stays hidden on your public page.`}
          </p>
          {certificates.length > 0 && (
            <div className="mb-4 grid grid-cols-2 gap-4 sm:grid-cols-3">
              {certificates.map((cert, i) => (
                <div key={`${cert.url}-${i}`} className="rounded-2xl border border-[#e5e5ea] p-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={cert.url} alt={cert.title || `${i + 1}`} className="aspect-[4/3] w-full rounded-xl object-cover" />
                  <input
                    value={cert.title}
                    onChange={(e) =>
                      setCertificates((prev) =>
                        prev.map((c, j) => (j === i ? { ...c, title: e.target.value.slice(0, 120) } : c)),
                      )
                    }
                    maxLength={120}
                    placeholder={isAr ? "اسم الشهادة (مثال: مدرب لياقة معتمد)" : "Certificate name"}
                    className="mt-2 w-full rounded-lg border border-[#d2d2d7] px-2.5 py-1.5 text-xs outline-none focus:border-[#0071e3]"
                  />
                  <button
                    type="button"
                    onClick={() => setCertificates((prev) => prev.filter((_, j) => j !== i))}
                    className="mt-1.5 w-full rounded-lg px-2 py-1 text-xs font-medium text-[#ff3b30] transition-colors hover:bg-[#ff3b30]/10"
                  >
                    {isAr ? "حذف" : "Remove"}
                  </button>
                </div>
              ))}
            </div>
          )}
          {certificates.length < MAX_CERTIFICATES && (
            <label className={`inline-block cursor-pointer rounded-full border border-[#d2d2d7] bg-white px-5 py-2.5 text-sm font-normal transition-opacity hover:opacity-70 ${busyUpload === "certs" ? "pointer-events-none opacity-60" : ""}`}>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                className="sr-only"
                onChange={(e) => {
                  if (e.target.files?.length) void handleCertsUpload(e.target.files);
                  e.currentTarget.value = "";
                }}
              />
              {busyUpload === "certs" ? (isAr ? "جارٍ الرفع…" : "Uploading…") : isAr ? "+ إضافة شهادة" : "+ Add certificate"}
            </label>
          )}
        </div>

        {/* 0037 — social links */}
        <div className="rounded-2xl border border-[#d2d2d7] bg-white p-5">
          <label className="mb-1 block text-sm font-medium">
            {isAr ? "روابط السوشيال ميديا" : "Social media links"}
          </label>
          <p className="mb-4 text-xs font-normal text-[#6e6e73]">
            {isAr
              ? "اتسيبها فاضية لو مش عايزها — اللنكات اللي هتضيفها بتظهر كأزرار على صفحتك العامة."
              : "Leave empty to skip — added links render as buttons on your public page."}
          </p>
          <div className="grid gap-3 sm:grid-cols-2" dir="ltr">
            <div>
              <label className="mb-1 block text-xs font-medium text-[#6e6e73]">Instagram</label>
              <input
                value={instagram}
                onChange={(e) => setInstagram(e.target.value)}
                maxLength={300}
                placeholder="https://instagram.com/username"
                className="w-full rounded-xl border border-[#d2d2d7] bg-white px-4 py-2.5 text-sm outline-none focus:border-[#0071e3]"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-[#6e6e73]">Facebook</label>
              <input
                value={facebook}
                onChange={(e) => setFacebook(e.target.value)}
                maxLength={300}
                placeholder="https://facebook.com/username"
                className="w-full rounded-xl border border-[#d2d2d7] bg-white px-4 py-2.5 text-sm outline-none focus:border-[#0071e3]"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-[#6e6e73]">TikTok</label>
              <input
                value={tiktok}
                onChange={(e) => setTiktok(e.target.value)}
                maxLength={300}
                placeholder="https://tiktok.com/@username"
                className="w-full rounded-xl border border-[#d2d2d7] bg-white px-4 py-2.5 text-sm outline-none focus:border-[#0071e3]"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-[#6e6e73]">YouTube</label>
              <input
                value={youtube}
                onChange={(e) => setYoutube(e.target.value)}
                maxLength={300}
                placeholder="https://youtube.com/@username"
                className="w-full rounded-xl border border-[#d2d2d7] bg-white px-4 py-2.5 text-sm outline-none focus:border-[#0071e3]"
              />
            </div>
          </div>

          {/* 0037 — WhatsApp contact number (for his ACTIVATED clients) */}
          <div className="mt-4 rounded-2xl bg-[#f5f5f7] p-4">
            <label className="mb-1 block text-sm font-medium">
              {isAr ? "رقم الواتساب لتواصل عملائك" : "WhatsApp number for your clients"}
            </label>
            <p className="mb-3 text-xs font-normal text-[#6e6e73]">
              {isAr
                ? "الرقم ده بيظهر كزر «تواصل واتساب» عند عملائك المفعّل اشتراكهم فقط — مش بيظهر على صفحتك العامة ولا لأي زائر. اكتبه بأي صيغة (مثال: 01012345678) وهو هيتحفظ تلقائيًا بالصيغة الدولية."
                : "This number renders as a «WhatsApp your coach» button for your ACTIVATED clients only — never on your public page or to visitors. Any format works (e.g. 01012345678); it is saved normalized automatically."}
            </p>
            <input
              value={whatsapp}
              onChange={(e) => setWhatsapp(e.target.value)}
              maxLength={20}
              inputMode="tel"
              dir="ltr"
              placeholder="01012345678"
              className="w-full rounded-xl border border-[#d2d2d7] bg-white px-4 py-2.5 text-sm outline-none focus:border-[#0071e3]"
            />
          </div>
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
