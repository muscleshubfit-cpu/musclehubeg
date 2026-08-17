"use client";

import { useState, useEffect, useRef } from "react";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/hooks/use-auth";
import { useNav } from "@/hooks/use-nav";
import { SiteHeader } from "@/components/SiteHeader";
import { supabase } from "@/lib/supabase/client";
import { MEMBERSHIPS, getLimits, type MembershipTier } from "@/lib/memberships";
import {
  User,
  Camera,
  Save,
  Loader2,
  Crown,
  Bell,
  Dumbbell,
  Apple,
  FileText,
  Calculator,
  Settings,
  Bookmark,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function ProfilePage() {
  const { lang } = useI18n();
  const isAr = lang === "ar";
  const { profile, loading, signOutAsync } = useAuth();
  const { navigate } = useNav();

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Determine membership tier (default: free)
  const tier: MembershipTier = (profile as any)?.membership_tier || "free";
  const limits = getLimits(tier);
  const membership = MEMBERSHIPS.find((m) => m.id === tier);

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || "");
      setPhone(profile.phone || "");
      setAvatarUrl(profile.avatar_url);
    }
  }, [profile]);

  // Redirect to auth if not logged in
  useEffect(() => {
    if (!loading && !profile) {
      navigate("auth", { mode: "login" });
    }
  }, [loading, profile, navigate]);

  const handleAvatarUpload = async (file: File) => {
    if (!profile || !supabase) {
      toast.error(isAr ? "غير قادر على رفع الصورة" : "Unable to upload");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error(isAr ? "الصورة كبيرة (حد أقصى 2 ميجا)" : "Image too large (max 2MB)");
      return;
    }

    setUploadingAvatar(true);
    try {
      const ext = file.name.split(".").pop() || "jpg";
      const path = `${profile.id}/avatar-${Date.now()}.${ext}`;

      // Try Supabase Storage upload
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("questionnaire-photos")
        .upload(path, file, { upsert: true });

      if (uploadError) {
        // Fallback: base64 data URL
        const reader = new FileReader();
        reader.onload = () => {
          const dataUrl = reader.result as string;
          setAvatarUrl(dataUrl);
          updateProfile({ avatar_url: dataUrl });
        };
        reader.readAsDataURL(file);
      } else {
        const { data: urlData } = supabase.storage
          .from("questionnaire-photos")
          .getPublicUrl(path);
        const url = urlData.publicUrl;
        setAvatarUrl(url);
        await updateProfile({ avatar_url: url });
      }

      toast.success(isAr ? "تم رفع الصورة!" : "Avatar updated!");
    } catch (e: any) {
      toast.error(e?.message || (isAr ? "فشل رفع الصورة" : "Upload failed"));
    } finally {
      setUploadingAvatar(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const updateProfile = async (updates: Record<string, any>) => {
    if (!profile || !supabase) return;
    const { error } = await supabase
      .from("profiles")
      .update(updates)
      .eq("id", profile.id);
    if (error) {
      console.error("[profile] Update failed:", error.message);
    }
  };

  const handleSave = async () => {
    if (!profile) return;
    setSaving(true);
    try {
      await updateProfile({
        full_name: fullName.trim(),
        phone: phone.trim(),
      });
      toast.success(isAr ? "تم حفظ التغييرات" : "Changes saved");
    } catch (e: any) {
      toast.error(e?.message || (isAr ? "فشل الحفظ" : "Save failed"));
    } finally {
      setSaving(false);
    }
  };

  if (loading || !profile) {
    return (
      <div className="min-h-screen bg-white">
        <SiteHeader variant="landing" />
        <div className="flex min-h-[60vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-[#0071e3]" />
        </div>
      </div>
    );
  }

  // Stats cards
  const stats = [
    { icon: Dumbbell, label: isAr ? "تمارين" : "Exercises", value: "868+", color: "#0071e3" },
    { icon: Apple, label: isAr ? "أكلات" : "Foods", value: "8,830+", color: "#34c759" },
    { icon: Calculator, label: isAr ? "أدوات" : "Tools", value: "4", color: "#ff9500" },
    { icon: FileText, label: isAr ? "برامج" : "Programs", value: "7", color: "#8b5cf6" },
  ];

  return (
    <div className="min-h-screen bg-[#f5f5f7] text-[#1d1d1f]">
      <SiteHeader variant="landing" />

      <main className="mx-auto max-w-3xl px-4 py-8 md:py-12">
        {/* Profile header */}
        <div className="rounded-3xl bg-white p-6 md:p-8">
          <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
            {/* Avatar */}
            <div className="relative">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="relative h-24 w-24 overflow-hidden rounded-full ring-4 ring-[#0071e3]/20 transition-all hover:ring-[#0071e3]/40"
                disabled={uploadingAvatar}
              >
                {avatarUrl ? (
                  <img src={avatarUrl} alt={fullName || "Avatar"} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-[#0071e3] text-3xl font-semibold text-white">
                    {(fullName || "U")[0].toUpperCase()}
                  </div>
                )}
              </button>
              {/* Camera button overlay */}
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingAvatar}
                className="absolute bottom-0 end-0 grid h-8 w-8 place-items-center rounded-full bg-[#0071e3] text-white shadow-lg transition-opacity hover:opacity-90"
              >
                {uploadingAvatar ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Camera className="h-4 w-4" />
                )}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleAvatarUpload(f);
                }}
              />
            </div>

            {/* Name + membership */}
            <div className="flex-1 text-center sm:text-start">
              <h1 className="text-2xl font-semibold tracking-tight">
                {fullName || (isAr ? "مستخدم" : "User")}
              </h1>
              <p className="mt-0.5 text-sm font-normal text-[#6e6e73]" dir="ltr">
                {profile.phone || ""}
              </p>
              {/* Membership badge */}
              <div className="mt-3 flex flex-wrap items-center justify-center gap-2 sm:justify-start">
                <span
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium",
                    tier === "pro" && "bg-[#1d1d1f] text-white",
                    tier === "premium" && "bg-[#0071e3]/10 text-[#0071e3]",
                    tier === "free" && "bg-[#6e6e73]/10 text-[#6e6e73]",
                    tier === "coaching" && "bg-[#8b5cf6]/10 text-[#8b5cf6]",
                  )}
                >
                  <Crown className="h-3 w-3" />
                  {isAr ? membership?.nameAr : membership?.nameEn}
                </span>
                {tier === "free" && (
                  <a
                    href="/memberships"
                    className="text-xs font-medium text-[#0071e3] hover:underline"
                  >
                    {isAr ? "ترقية العضوية ›" : "Upgrade ›"}
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Stats grid */}
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {stats.map((s, i) => {
            const Icon = s.icon;
            return (
              <div key={i} className="rounded-2xl bg-white p-4 text-center">
                <Icon className="mx-auto h-5 w-5" style={{ color: s.color }} />
                <p className="mt-2 text-lg font-semibold">{s.value}</p>
                <p className="text-xs font-normal text-[#6e6e73]">{s.label}</p>
              </div>
            );
          })}
        </div>

        {/* Edit profile */}
        <div className="mt-4 rounded-3xl bg-white p-6 md:p-8">
          <h2 className="text-lg font-semibold tracking-tight">
            {isAr ? "تعديل الملف الشخصي" : "Edit Profile"}
          </h2>
          <div className="mt-4 space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium">
                {isAr ? "الاسم" : "Full Name"}
              </label>
              <input
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full rounded-xl border border-[#d2d2d7] bg-[#f5f5f7] px-4 py-2.5 text-base font-normal outline-none focus:border-[#0071e3]"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium">
                {isAr ? "رقم الهاتف" : "Phone"}
              </label>
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                dir="ltr"
                className="w-full rounded-xl border border-[#d2d2d7] bg-[#f5f5f7] px-4 py-2.5 text-base font-normal outline-none focus:border-[#0071e3]"
              />
            </div>
            <button
              onClick={handleSave}
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-full bg-[#0071e3] px-6 py-2.5 text-sm font-normal text-white transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              {isAr ? "حفظ" : "Save"}
            </button>
          </div>
        </div>

        {/* Saved tool results */}
        <SavedResultsSection isAr={isAr} userId={profile?.id} />

        {/* Quick links */}
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {[
            { label: isAr ? "لوحة التحكم" : "Dashboard", href: "/dashboard", icon: Dumbbell },
            { label: isAr ? "خططي" : "My Plans", href: "/plans", icon: FileText },
            { label: isAr ? "تقدمي" : "Progress", href: "/progress", icon: Calculator },
            { label: isAr ? "كوتش EVO" : "EVO Coach", href: "/chat", icon: Bell },
            { label: isAr ? "الإحالات" : "Referral", href: "/referral", icon: Crown },
            { label: isAr ? "الدعم" : "Support", href: "/support", icon: Settings },
          ].map((link, i) => {
            const Icon = link.icon;
            return (
              <a
                key={i}
                href={link.href}
                className="flex items-center gap-2 rounded-2xl bg-white p-4 text-sm font-medium transition-colors hover:bg-[#f5f5f7]"
              >
                <Icon className="h-4 w-4 text-[#6e6e73]" />
                {link.label}
              </a>
            );
          })}
        </div>

        {/* Membership limits summary */}
        <div className="mt-4 rounded-3xl bg-white p-6 md:p-8">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold tracking-tight">
              {isAr ? "حدود عضويتك" : "Your Plan Limits"}
            </h2>
            <a href="/memberships" className="text-xs font-medium text-[#0071e3] hover:underline">
              {isAr ? "ترقية ›" : "Upgrade ›"}
            </a>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3">
            {[
              { label: isAr ? "EVO رسائل/يوم" : "EVO msgs/day", value: limits.evoChatDailyLimit === null ? "∞" : `${limits.evoChatDailyLimit}` },
              { label: isAr ? "خطط تغذية/شهر" : "Nutrition plans/mo", value: limits.evoNutritionPlanLimit === 0 ? "—" : limits.evoNutritionPlanLimit === null ? "∞" : `${limits.evoNutritionPlanLimit}` },
              { label: isAr ? "خطط تمرين/شهر" : "Workout plans/mo", value: limits.evoWorkoutPlanLimit === 0 ? "—" : limits.evoWorkoutPlanLimit === null ? "∞" : `${limits.evoWorkoutPlanLimit}` },
              { label: isAr ? "تبديلات/أسبوع" : "Swaps/week", value: limits.evoSwapLimit === 0 ? "—" : limits.evoSwapLimit === null ? "∞" : `${limits.evoSwapLimit}` },
              { label: isAr ? "حفظ نتائج" : "Saved results", value: limits.savedResultsLimit === null ? "∞" : `${limits.savedResultsLimit}` },
              { label: isAr ? "جداول وجبات" : "Meal plans saved", value: limits.mealPlannerMaxSaved === null ? "∞" : `${limits.mealPlannerMaxSaved}` },
            ].map((item, i) => (
              <div key={i} className="rounded-xl bg-[#f5f5f7] p-3">
                <p className="text-xs font-normal text-[#6e6e73]">{item.label}</p>
                <p className="mt-0.5 text-lg font-semibold">{item.value}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Logout */}
        <button
          onClick={async () => {
            await signOutAsync();
            navigate("landing");
          }}
          className="mt-4 w-full rounded-2xl bg-white py-3.5 text-center text-sm font-medium text-[#ff3b30] transition-colors hover:bg-[#ff3b30]/5"
        >
          {isAr ? "تسجيل الخروج" : "Log out"}
        </button>
      </main>
    </div>
  );
}

// Saved results section component
function SavedResultsSection({ isAr, userId }: { isAr: boolean; userId?: string }) {
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }
    (async () => {
      try {
        const res = await fetch("/api/tools/saved-results");
        if (res.ok) {
          const data = await res.json();
          setResults(data.results || []);
        }
      } catch {
        // silent
      } finally {
        setLoading(false);
      }
    })();
  }, [userId]);

  const handleDelete = async (id: string) => {
    try {
      await fetch(`/api/tools/saved-results?id=${id}`, { method: "DELETE" });
      setResults((prev) => prev.filter((r) => r.id !== id));
      toast.success(isAr ? "تم الحذف" : "Deleted");
    } catch {
      toast.error(isAr ? "فشل الحذف" : "Failed");
    }
  };

  const TOOL_NAMES: Record<string, string> = {
    "calorie-calculator": isAr ? "حاسبة السعرات" : "Calorie Calculator",
    "bmi-calculator": isAr ? "حاسبة BMI" : "BMI Calculator",
    "macro-calculator": isAr ? "حاسبة الماكروز" : "Macro Calculator",
    "body-fat-calculator": isAr ? "حاسبة الدهون" : "Body Fat Calculator",
  };

  return (
    <div className="mt-4 rounded-3xl bg-white p-6 md:p-8">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold tracking-tight">
          {isAr ? "النتائج المحفوظة" : "Saved Results"}
        </h2>
        <span className="text-xs font-normal text-[#6e6e73]">
          {results.length} {isAr ? "نتيجة" : "results"}
        </span>
      </div>

      {loading ? (
        <div className="mt-4 flex justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-[#0071e3]" />
        </div>
      ) : results.length === 0 ? (
        <div className="mt-4 rounded-2xl bg-[#f5f5f7] p-8 text-center">
          <Bookmark className="mx-auto h-8 w-8 text-[#d2d2d7]" />
          <p className="mt-3 text-sm font-normal text-[#6e6e73]">
            {isAr
              ? "مفيش نتائج محفوظة بعد. استخدم الأدوات واحفظ نتائجك."
              : "No saved results yet. Use the tools and save your results."}
          </p>
          <a
            href="/tools"
            className="mt-3 inline-block text-sm font-medium text-[#0071e3] hover:underline"
          >
            {isAr ? "تصفح الأدوات ›" : "Browse tools ›"}
          </a>
        </div>
      ) : (
        <div className="mt-4 space-y-2">
          {results.map((r) => (
            <div
              key={r.id}
              className="flex items-center justify-between gap-3 rounded-xl bg-[#f5f5f7] p-3"
            >
              <div className="min-w-0 flex-1">
                <a
                  href={`/tools/${r.tool_slug}`}
                  className="block truncate text-sm font-medium text-[#1d1d1f] hover:text-[#0071e3]"
                  title={isAr ? "افتح الأداة" : "Open tool"}
                >
                  {r.title || TOOL_NAMES[r.tool_slug] || r.tool_slug}
                </a>
                <p className="mt-0.5 text-xs font-normal text-[#6e6e73]">
                  {TOOL_NAMES[r.tool_slug] || r.tool_slug} ·{" "}
                  {new Date(r.created_at).toLocaleDateString()}
                </p>
              </div>
              <div className="flex items-center gap-1">
                <a
                  href={`/tools/${r.tool_slug}`}
                  className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-[#0071e3] transition-colors hover:bg-[#0071e3]/5"
                  title={isAr ? "فتح الأداة" : "Open tool"}
                >
                  <Calculator className="h-4 w-4" />
                </a>
                <button
                  onClick={() => handleDelete(r.id)}
                  className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-[#ff3b30] transition-colors hover:bg-[#ff3b30]/5"
                  title={isAr ? "حذف" : "Delete"}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
