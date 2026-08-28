"use client";

import Link from "next/link";
import Image from "next/image";
import { useState, useEffect, useRef } from "react";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/hooks/use-auth";
import { useMembershipTier } from "@/hooks/use-membership-tier";
import { useNav } from "@/hooks/use-nav";
import { SiteHeader } from "@/components/SiteHeader";
import { openEvoFloatingChat } from "@/lib/evo-chat-context";
import { supabase } from "@/lib/supabase/client";
import { MEMBERSHIPS, getLimits, type MembershipTier } from "@/lib/memberships";
import { EXERCISES } from "@/lib/exercises";
import { FOODS } from "@/lib/foods";
import { WORKOUT_PROGRAMS } from "@/lib/workout-programs";
import {
  User,
  Camera,
  Save,
  Loader2,
  Crown,
  ShieldCheck,
  Bell,
  Dumbbell,
  Apple,
  FileText,
  Calculator,
  Settings,
  Bookmark,
  Trash2,
  Utensils,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function ProfilePage() {
  const { lang } = useI18n();
  const isAr = lang === "ar";
  const { profile, loading, signOutAsync, isCoach, isAdmin } = useAuth();
  const { navigate } = useNav();

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Determine membership tier via the useMembershipTier hook
  // (queries subscriptions table — NOT the missing profile.membership_tier field)
  const { tier } = useMembershipTier(profile);
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
      .update(updates as any)
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

  // Stats cards — M4 fix: dynamic counts from actual datasets
  const stats = [
    { icon: Dumbbell, label: isAr ? "تمارين" : "Exercises", value: `${EXERCISES.length}+`, color: "#0071e3" },
    { icon: Apple, label: isAr ? "أكلات" : "Foods", value: `${FOODS.length.toLocaleString()}+`, color: "#34c759" },
    { icon: Calculator, label: isAr ? "أدوات" : "Tools", value: "6", color: "#ff9500" },
    { icon: FileText, label: isAr ? "برامج" : "Programs", value: `${WORKOUT_PROGRAMS.length}`, color: "#8b5cf6" },
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
                  <Image src={avatarUrl} alt={fullName || "Avatar"} fill className="object-cover" />
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
              {/* Membership badge — staff (coach/admin) get a ROLE badge
                  instead: the platform owner is not a subscriber of his
                  own product, and never sees an upgrade CTA. */}
              <div className="mt-3 flex flex-wrap items-center justify-center gap-2 sm:justify-start">
                {isCoach ? (
                  <span
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium",
                      isAdmin
                        ? "bg-[#1d1d1f] text-white"
                        : "bg-[#8b5cf6]/10 text-[#8b5cf6]",
                    )}
                  >
                    <ShieldCheck className="h-3 w-3" />
                    {isAdmin
                      ? isAr ? "إدارة المنصة" : "Platform Admin"
                      : isAr ? "مدرب معتمد" : "Coach"}
                  </span>
                ) : (
                  <>
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
                  </>
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

        {/* Saved meal plans */}
        <SavedMealPlansSection isAr={isAr} userId={profile?.id} />

        {/* Quick links */}
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {[
            { label: isAr ? "لوحة التحكم" : "Dashboard", href: "/dashboard", icon: Dumbbell },
            { label: isAr ? "خططي" : "My Plans", href: "/plans", icon: FileText },
            { label: isAr ? "مخطط الوجبات" : "Meal Planner", href: "/meal-planner", icon: Utensils },
            { label: isAr ? "تقدمي" : "Progress", href: "/progress", icon: Calculator },
            // EVO CHAT SURFACE LAW: opens the floating widget — /chat is removed.
            { label: isAr ? "كوتش EVO" : "EVO Coach", href: "#evo-chat", icon: Bell, evoChat: true },
            { label: isAr ? "الإحالات" : "Referral", href: "/referral", icon: Crown },
            { label: isAr ? "الدعم" : "Support", href: "/support", icon: Settings },
          ].map((link, i) => {
            const Icon = link.icon;
            if ("evoChat" in link && link.evoChat) {
              return (
                <button
                  key={i}
                  type="button"
                  onClick={openEvoFloatingChat}
                  className="flex cursor-pointer items-center gap-2 rounded-2xl bg-white p-4 text-start text-sm font-medium transition-colors hover:bg-[#f5f5f7]"
                >
                  <Icon className="h-4 w-4 text-[#6e6e73]" />
                  {link.label}
                </button>
              );
            }
            return (
              <Link
                key={i}
                href={link.href}
                className="flex items-center gap-2 rounded-2xl bg-white p-4 text-sm font-medium transition-colors hover:bg-[#f5f5f7]"
              >
                <Icon className="h-4 w-4 text-[#6e6e73]" />
                {link.label}
              </Link>
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
    "water-tracker": isAr ? "متتبع الماء" : "Water Tracker",
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

// Saved meal plans section component
function SavedMealPlansSection({ isAr, userId }: { isAr: boolean; userId?: string }) {
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }
    (async () => {
      try {
        const res = await fetch("/api/tools/saved-meal-plans");
        if (res.ok) {
          const data = await res.json();
          setPlans(data.results || []);
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
      await fetch(`/api/tools/saved-meal-plans?id=${id}`, { method: "DELETE" });
      setPlans((prev) => prev.filter((p) => p.id !== id));
      toast.success(isAr ? "تم الحذف" : "Deleted");
    } catch {
      toast.error(isAr ? "فشل الحذف" : "Failed");
    }
  };

  return (
    <div className="mt-4 rounded-3xl bg-white p-6 md:p-8">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold tracking-tight">
          {isAr ? "جداول الوجبات المحفوظة" : "Saved Meal Plans"}
        </h2>
        <span className="text-xs font-normal text-[#6e6e73]">
          {plans.length} {isAr ? "جدول" : "plans"}
        </span>
      </div>

      {loading ? (
        <div className="mt-4 flex justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-[#0071e3]" />
        </div>
      ) : plans.length === 0 ? (
        <div className="mt-4 rounded-2xl bg-[#f5f5f7] p-8 text-center">
          <Utensils className="mx-auto h-8 w-8 text-[#d2d2d7]" />
          <p className="mt-3 text-sm font-normal text-[#6e6e73]">
            {isAr
              ? "مفيش جداول محفوظة بعد. ابدأ ببناء جدول وجباتك."
              : "No saved meal plans yet. Start building your meal plan."}
          </p>
          <a
            href="/meal-planner"
            className="mt-3 inline-block text-sm font-medium text-[#0071e3] hover:underline"
          >
            {isAr ? "افتح مخطط الوجبات ›" : "Open Meal Planner ›"}
          </a>
        </div>
      ) : (
        <div className="mt-4 space-y-2">
          {plans.map((p) => {
            const isExpanded = expandedId === p.id;
            const totals = {
              calories: p.total_calories ?? 0,
              protein: p.total_protein ?? 0,
              carbs: p.total_carbs ?? 0,
              fat: p.total_fat ?? 0,
            };
            const mealCount = p.meal_count ?? p.plan_data?.meals?.length ?? 0;
            return (
              <div
                key={p.id}
                className="rounded-xl bg-[#f5f5f7] p-3"
              >
                <div className="flex items-center justify-between gap-3">
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : p.id)}
                    className="flex min-w-0 flex-1 items-center gap-3 text-start"
                  >
                    <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#8b5cf6]/10 text-[#8b5cf6]">
                      <Utensils className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">
                        {p.title || (isAr ? "جدول وجبات" : "Meal Plan")}
                      </p>
                      <p className="mt-0.5 text-xs font-normal text-[#6e6e73]" dir="ltr">
                        {totals.calories} kcal · P{totals.protein}g · C{totals.carbs}g · F{totals.fat}g · {mealCount} {isAr ? "وجبات" : "meals"} · {new Date(p.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </button>
                  <div className="flex items-center gap-1">
                    <a
                      href="/meal-planner"
                      className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-[#0071e3] transition-colors hover:bg-[#0071e3]/5"
                      title={isAr ? "افتح المخطط" : "Open planner"}
                    >
                      <Utensils className="h-4 w-4" />
                    </a>
                    <button
                      onClick={() => handleDelete(p.id)}
                      className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-[#ff3b30] transition-colors hover:bg-[#ff3b30]/5"
                      title={isAr ? "حذف" : "Delete"}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {isExpanded && p.plan_data?.meals && (
                  <div className="mt-3 space-y-2 border-t border-[#d2d2d7] pt-3">
                    {p.plan_data.meals.map((meal: any, mi: number) => {
                      let mCal = 0, mP = 0, mC = 0, mF = 0;
                      for (const item of meal.items || []) {
                        const factor = (item.grams || 0) / 100;
                        mCal += Math.round((item.per100g?.calories || 0) * factor);
                        mP   += Math.round((item.per100g?.protein  || 0) * factor);
                        mC   += Math.round((item.per100g?.carbs    || 0) * factor);
                        mF   += Math.round((item.per100g?.fat      || 0) * factor);
                      }
                      return (
                        <div key={mi} className="rounded-lg bg-white p-3">
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-sm font-medium">{meal.name}</p>
                            <p className="text-xs font-normal text-[#6e6e73]" dir="ltr">
                              {mCal} kcal · P{mP}g · C{mC}g · F{mF}g
                            </p>
                          </div>
                          {(meal.items || []).length > 0 && (
                            <ul className="mt-2 space-y-0.5">
                              {meal.items.map((item: any, ii: number) => (
                                <li
                                  key={ii}
                                  className="flex items-center justify-between text-xs text-[#6e6e73]"
                                  dir="ltr"
                                >
                                  <span className="truncate">{item.name}</span>
                                  <span className="shrink-0 ms-2">
                                    {item.grams}g · {Math.round((item.per100g?.calories || 0) * (item.grams || 0) / 100)} kcal
                                  </span>
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
