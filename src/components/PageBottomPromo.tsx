"use client";

// NOTE: plain <a href> cross-links (same pattern as OtherTools / tools hub)
// — crawlable and keeps useNav's View-typed navigate out of public pages.

/**
 * DELIVERY 0050 — Promotional sections placed at the bottom of public
 * library pages (exercises / foods), per owner request:
 * «ضيف اقسام دعائية اسفل الصفحات».
 *
 * Two blocks, Apple-style to match the site:
 *  1) MembershipPromo — dark gradient banner driving to /memberships
 *     (and /coaching for personalized coaching).
 *  2) ExploreMore — cross-navigation grid to other main site pages,
 *     excluding the page it is rendered on.
 *
 * `isAr` is a prop (not useI18n context) because the /ar mirrors force
 * Arabic via the page's langProp while the context may report "en".
 */

type ExploreKey = "exercises" | "foods" | "meal-planner" | "programs" | "tools" | "blog";

const EXPLORE_ITEMS: {
  key: ExploreKey;
  href: string;
  nameAr: string;
  nameEn: string;
  descAr: string;
  descEn: string;
  emoji: string;
  color: string;
}[] = [
  {
    key: "exercises",
    href: "/exercises",
    nameAr: "مكتبة التمارين",
    nameEn: "Exercise Library",
    descAr: "868+ تمرين بالصور والشرح والمستويات",
    descEn: "868+ exercises with images and guides",
    emoji: "💪",
    color: "#0071e3",
  },
  {
    key: "foods",
    href: "/foods",
    nameAr: "مكتبة الأكلات",
    nameEn: "Food Library",
    descAr: "8,830+ أكلة بالسعرات والماكروز",
    descEn: "8,830+ foods with calories and macros",
    emoji: "🥗",
    color: "#34c759",
  },
  {
    key: "meal-planner",
    href: "/meal-planner",
    nameAr: "مخطط الوجبات",
    nameEn: "Meal Planner",
    descAr: "ابنِ وجباتك واحسب الماكروز تلقائياً",
    descEn: "Build meals with automatic macros",
    emoji: "🍽️",
    color: "#8b5cf6",
  },
  {
    key: "programs",
    href: "/programs",
    nameAr: "برامج التدريب",
    nameEn: "Workout Programs",
    descAr: "برامج جاهزة لكل المستويات والأهداف",
    descEn: "Ready programs for every goal",
    emoji: "🏋️",
    color: "#ff9500",
  },
  {
    key: "tools",
    href: "/tools",
    nameAr: "الحاسبات المجانية",
    nameEn: "Free Tools",
    descAr: "حاسبات سعرات وBMI ودهون وماكروز",
    descEn: "Calorie, BMI, body fat and macro calculators",
    emoji: "🧮",
    color: "#00b8d9",
  },
  {
    key: "blog",
    href: "/blog",
    nameAr: "المدونة",
    nameEn: "Blog",
    descAr: "مقالات تدريب وتغذية بشرح مبسط",
    descEn: "Training and nutrition articles",
    emoji: "📖",
    color: "#ff3b30",
  },
];

export function MembershipPromo({ isAr }: { isAr: boolean }) {
  return (
    <section className="mt-16 overflow-hidden rounded-3xl bg-[#1d1d1f] px-6 py-10 text-center text-white md:px-12 md:py-14">
      <h2 className="text-2xl font-semibold tracking-tight md:text-4xl">
        {isAr ? "جاهز توصل لمستوى أعلى؟" : "Ready to level up?"}
      </h2>
      <p className="mx-auto mt-3 max-w-xl text-base font-normal text-[#a1a1a6] md:text-lg">
        {isAr
          ? "اشترك في عضوية Alkemos: خطط تدريب وتغذية مخصصة، متابعة مع مدربين معتمدين، وكل الأدوات البريميوم بدون إعلانات."
          : "Join a Alkemos membership: personalized training and nutrition plans, certified coach follow-up, and all premium tools ad-free."}
      </p>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <a
          href={isAr ? "/ar/memberships" : "/memberships"}
          className="rounded-full bg-white px-6 py-3 text-sm font-medium text-[#1d1d1f] transition-opacity hover:opacity-90"
        >
          {isAr ? "شوف خطط الاشتراك ›" : "See membership plans ›"}
        </a>
        <a
          href="/coaching"
          className="rounded-full border border-white/30 px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-white/10"
        >
          {isAr ? "الكوتشينج المخصص ›" : "Personal coaching ›"}
        </a>
      </div>
    </section>
  );
}

export function ExploreMore({
  isAr,
  exclude,
}: {
  isAr: boolean;
  exclude?: ExploreKey;
}) {
  const items = EXPLORE_ITEMS.filter((it) => it.key !== exclude);
  return (
    <section className="mt-12">
      <h3 className="text-xl font-semibold tracking-tight md:text-2xl">
        {isAr ? "استكشف المزيد من الموقع" : "Explore more"}
      </h3>
      <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
        {items.map((it) => (
          <a
            key={it.key}
            href={it.href}
            className="group flex items-center gap-4 rounded-3xl bg-[#f5f5f7] p-5 text-start transition-opacity hover:opacity-90"
          >
            <span
              className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl text-xl"
              style={{ backgroundColor: `${it.color}15` }}
            >
              {it.emoji}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-base font-semibold tracking-tight">
                {isAr ? it.nameAr : it.nameEn}
              </span>
              <span className="mt-0.5 block text-xs font-normal text-[#6e6e73]">
                {isAr ? it.descAr : it.descEn}
              </span>
            </span>
            <span className="text-xl text-[#6e6e73] rtl:rotate-180">›</span>
          </a>
        ))}
      </div>
    </section>
  );
}
