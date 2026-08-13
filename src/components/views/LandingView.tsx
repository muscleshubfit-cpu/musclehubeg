"use client";

import { useState, useEffect } from "react";
import { useI18n } from "@/lib/i18n";
import { useNav } from "@/hooks/use-nav";
import { useAuth } from "@/hooks/use-auth";
import { useScrollAnimation } from "@/hooks/use-scroll-animation";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { listBlogPosts, getCategoryLabel, type BlogPost } from "@/lib/blog";
import { SiteHeader } from "@/components/SiteHeader";

// Apple-style gentle reveal
function Reveal({
  children,
  className = "",
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  const { ref, isVisible } = useScrollAnimation<HTMLDivElement>();
  return (
    <div
      ref={ref}
      className={`${isVisible ? "animate-fade-in" : "scroll-hidden"} ${className}`}
      style={delay ? { animationDelay: `${delay}ms` } : undefined}
    >
      {children}
    </div>
  );
}

// Apple-style product card (rounded, hover scale)
function ProductCard({
  title,
  subtitle,
  image,
  cta,
  isDark = false,
}: {
  title: string;
  subtitle: string;
  image: string;
  cta?: { label: string; onClick: () => void };
  isDark?: boolean;
}) {
  const bg = isDark ? "bg-black" : "bg-[#f5f5f7]";
  const text = isDark ? "text-white" : "text-[#1d1d1f]";
  const subText = isDark ? "text-gray-400" : "text-[#6e6e73]";
  return (
    <div className={`overflow-hidden rounded-3xl ${bg} ${text}`}>
      <div className="px-6 pt-10 text-center md:px-10 md:pt-16">
        <h3 className="text-2xl font-semibold tracking-tight md:text-4xl">{title}</h3>
        <p className={`mt-2 text-sm font-normal md:text-lg ${subText}`}>{subtitle}</p>
        {cta && (
          <button
            onClick={cta.onClick}
            className="mt-4 inline-flex items-center gap-1 text-sm font-normal text-[#0071e3] transition-opacity hover:opacity-70 md:text-base"
          >
            {cta.label} <span aria-hidden>›</span>
          </button>
        )}
      </div>
      <div className="mt-6 px-6 pb-6 md:px-10 md:pb-10">
        <img
          src={image}
          alt={title}
          className="aspect-[4/3] w-full rounded-2xl object-cover"
          loading="lazy"
        />
      </div>
    </div>
  );
}

// Apple-style sticky scroll section
// The outer section is 200vh tall so the inner sticky content has room
// to stay pinned for one extra viewport of scrolling before the next
// section pushes it away. This matches apple.com/iphone's behavior.
function StickySection({
  children,
  bg = "bg-white",
}: {
  children: React.ReactNode;
  bg?: string;
}) {
  return (
    <section className={`${bg} relative h-[200vh]`}>
      <div className="sticky top-0 flex h-screen items-center justify-center overflow-hidden">
        {children}
      </div>
    </section>
  );
}

// Premium images — athletic, masculine, modest
const IMAGES = {
  hero: "https://z-cdn.chatglm.cn/image-search-mcp/images-ppt/a28280c607b4.jpeg",
  gym: "https://z-cdn.chatglm.cn/image-search-mcp/images-ppt/6fa2e1c76f06.jpg",
  meal: "https://z-cdn.chatglm.cn/image-search-mcp/images-ppt/b9505b73db59.jpg",
  progress: "https://z-cdn.chatglm.cn/image-search-mcp/images-ppt/d391a754150e.png",
  running: "https://z-cdn.chatglm.cn/image-search-mcp/images-ppt/80c7abf220de.jpg",
  data: "https://z-cdn.chatglm.cn/image-search-mcp/images-ppt/4f572a6110df.jpeg",
};

export function LandingView() {
  const { lang } = useI18n();
  const { navigate } = useNav();
  const { profile, isCoach } = useAuth();
  const isLoggedIn = !!profile;
  const isAr = lang === "ar";

  const [latestPosts, setLatestPosts] = useState<BlogPost[]>([]);
  useEffect(() => {
    (async () => {
      const posts = await listBlogPosts(lang);
      setLatestPosts(posts.slice(0, 3));
    })();
  }, [lang]);

  const blogHref = isCoach ? "/admin/blog" : isAr ? "/ar/blog" : "/blog";

  return (
    <div className="min-h-screen bg-white text-[#1d1d1f]">
      <SiteHeader variant="landing" />

      {/* ===================== 1. HERO — Apple product page style ===================== */}
      <section className="flex min-h-[85vh] flex-col items-center justify-center bg-white px-4 pt-20 text-center">
        <Reveal>
          <p className="mb-3 text-sm font-normal text-[#6e6e73] md:text-base">
            {isAr ? "منصة MuscleHub" : "MuscleHub"}
          </p>
        </Reveal>
        <Reveal delay={100}>
          <h1 className="text-5xl font-semibold leading-[1.05] tracking-tight md:text-7xl lg:text-[80px]">
            {isAr ? "أقوى نسخة منك." : "A stronger you."}
          </h1>
        </Reveal>
        <Reveal delay={200}>
          <p className="mx-auto mt-4 max-w-xl text-xl font-normal leading-snug text-[#1d1d1f] md:text-2xl">
            {isAr ? "كوتشينج حقيقي. ذكاء اصطناعي. نتائج حقيقية." : "Real coaching. Real AI. Real results."}
          </p>
        </Reveal>
        <Reveal delay={300}>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-4 text-base md:gap-6">
            <button
              onClick={() => navigate("auth", { mode: "signup" })}
              className="rounded-full bg-[#0071e3] px-6 py-2.5 font-normal text-white transition-opacity hover:opacity-90 md:px-7 md:py-3"
            >
              {isAr ? "ابدأ تحوّلك" : "Start your transformation"}
            </button>
            <button
              onClick={() => navigate("pricing")}
              className="font-normal text-[#0071e3] transition-opacity hover:opacity-70"
            >
              {isAr ? "الأسعار ›" : "Pricing ›"}
            </button>
          </div>
        </Reveal>
      </section>

      {/* ===================== 2. HERO IMAGE — full-bleed ===================== */}
      <section className="relative h-[70vh] w-full overflow-hidden bg-black md:h-[85vh]">
        <img
          src={IMAGES.hero}
          alt={isAr ? "رياضي في صالة ألعاب رياضية" : "Athlete in gym"}
          className="h-full w-full object-cover opacity-90"
          loading="eager"
        />
      </section>

      {/* ===================== 3. STICKY SCROLL — "Not just fitness" ===================== */}
      <StickySection bg="bg-white">
        <div className="px-4 text-center">
          <p className="text-sm font-normal text-[#6e6e73] md:text-base">
            {isAr ? "ما هي MuscleHub؟" : "What is MuscleHub?"}
          </p>
          <h2 className="mx-auto mt-4 max-w-4xl text-4xl font-semibold leading-[1.08] tracking-tight md:text-6xl lg:text-7xl">
            {isAr ? (
              <>
                ليست منصة لياقة.
                <br />
                بل نظام تحسين بشري.
              </>
            ) : (
              <>
                Not a fitness platform.
                <br />
                A human optimization system.
              </>
            )}
          </h2>
          <p className="mx-auto mt-6 max-w-2xl text-lg font-normal leading-relaxed text-[#6e6e73] md:text-xl">
            {isAr
              ? "نجمع بين خبرة الكوتش أحمد زكي وعلم الرياضة والتغذية والذكاء الاصطناعي في نظام بيئي واحد."
              : "Combining Coach Ahmed Zake's expertise with sports science, nutrition, and AI in one ecosystem."}
          </p>
        </div>
      </StickySection>

      {/* ===================== 4. PRODUCT GRID — Apple-style cards ===================== */}
      <section className="bg-[#f5f5f7] px-4 py-20 md:px-6 md:py-28">
        <div className="mx-auto max-w-6xl">
          <Reveal>
            <h2 className="mb-12 text-center text-3xl font-semibold tracking-tight md:mb-16 md:text-5xl">
              {isAr ? "كل ما تحتاجه في مكان واحد." : "Everything in one place."}
            </h2>
          </Reveal>
          <div className="grid gap-5 md:grid-cols-2 md:gap-6">
            <Reveal>
              <ProductCard
                title={isAr ? "خطط تغذية" : "Nutrition Plans"}
                subtitle={isAr ? "مخصصة بالجرام والسعرات" : "Personalized to the gram."}
                image={IMAGES.meal}
                cta={{ label: isAr ? "اعرف أكثر" : "Learn more", onClick: () => navigate("auth", { mode: "signup" }) }}
              />
            </Reveal>
            <Reveal delay={100}>
              <ProductCard
                title={isAr ? "برامج تمارين" : "Workout Programs"}
                subtitle={isAr ? "تتكيف مع تقدمك" : "Adapt to your progress."}
                image={IMAGES.gym}
                isDark
                cta={{ label: isAr ? "اعرف أكثر" : "Learn more", onClick: () => navigate("auth", { mode: "signup" }) }}
              />
            </Reveal>
            <Reveal delay={200}>
              <ProductCard
                title={isAr ? "تتبع التقدم" : "Progress Tracking"}
                subtitle={isAr ? "صور، قياسات، أرقام" : "Photos, measurements, data."}
                image={IMAGES.progress}
                cta={{ label: isAr ? "اعرف أكثر" : "Learn more", onClick: () => navigate("auth", { mode: "signup" }) }}
              />
            </Reveal>
            <Reveal delay={300}>
              <ProductCard
                title={isAr ? "محرك EVO" : "EVO Engine"}
                subtitle={isAr ? "ذكاء اصطناعي يفهمك" : "AI that understands you."}
                image={IMAGES.data}
                isDark
                cta={{ label: isAr ? "اعرف أكثر" : "Learn more", onClick: () => navigate("auth", { mode: "signup" }) }}
              />
            </Reveal>
          </div>
        </div>
      </section>

      {/* ===================== 5. STICKY SCROLL — EVO spotlight ===================== */}
      <StickySection bg="bg-black">
        <div className="px-4 text-center text-white">
          <p className="text-sm font-normal text-gray-400 md:text-base">
            {isAr ? "تعرّف على" : "Meet"}
          </p>
          <h2 className="mx-auto mt-4 max-w-4xl text-5xl font-semibold leading-[1.05] tracking-tight md:text-7xl lg:text-[80px]">
            EVO.
          </h2>
          <p className="mx-auto mt-6 max-w-2xl text-lg font-normal leading-relaxed text-gray-300 md:text-xl">
            {isAr
              ? "ليس شات بوت. محرك أداء ذكي يحلل بياناتك، يتنبأ بنتائجك، ويحدّث خططك تلقائياً — 24/7."
              : "Not a chatbot. An intelligent engine that analyzes your data, predicts outcomes, and updates your plans automatically — 24/7."}
          </p>
          <div className="mt-8 flex justify-center">
            <img
              src={IMAGES.data}
              alt="EVO"
              className="aspect-[16/9] w-full max-w-3xl rounded-2xl object-cover opacity-80"
              loading="lazy"
            />
          </div>
        </div>
      </StickySection>

      {/* ===================== 6. STATS — Apple-style large numbers ===================== */}
      <section className="bg-white px-4 py-20 md:py-28">
        <div className="mx-auto max-w-5xl">
          <div className="grid gap-12 md:grid-cols-4 md:gap-8">
            {[
              { v: "+500", l: isAr ? "عميل نجح" : "clients" },
              { v: "95%", l: isAr ? "نسبة رضا" : "satisfaction" },
              { v: "-8.5kg", l: isAr ? "متوسط الفقد" : "avg. loss" },
              { v: "12", l: isAr ? "أسبوع" : "weeks" },
            ].map((s, i) => (
              <Reveal key={i} delay={i * 100} className="text-center">
                <div className="text-4xl font-semibold tracking-tight text-[#1d1d1f] md:text-6xl">
                  {s.v}
                </div>
                <div className="mt-2 text-sm font-normal text-[#6e6e73] md:text-base">
                  {s.l}
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ===================== 7. FULL-BLEED IMAGE — running ===================== */}
      <section className="relative h-[60vh] w-full overflow-hidden bg-black md:h-[75vh]">
        <img
          src={IMAGES.running}
          alt={isAr ? "رياضي يجري" : "Athlete running"}
          className="h-full w-full object-cover opacity-85"
          loading="lazy"
        />
        <div className="absolute inset-0 flex items-end justify-center pb-16">
          <Reveal>
            <p className="text-center text-2xl font-semibold tracking-tight text-white md:text-4xl">
              {isAr ? "ابدأ رحلتك اليوم." : "Start your journey today."}
            </p>
          </Reveal>
        </div>
      </section>

      {/* ===================== 8. HOW IT WORKS — Apple-style numbered steps ===================== */}
      <section className="bg-white px-4 py-20 md:py-28">
        <div className="mx-auto max-w-4xl">
          <Reveal>
            <h2 className="text-center text-3xl font-semibold tracking-tight md:text-5xl">
              {isAr ? "رحلتك في ٤ خطوات." : "Your journey in 4 steps."}
            </h2>
          </Reveal>
          <div className="mt-16 space-y-12 md:mt-20 md:space-y-16">
            {[
              { n: "01", title: isAr ? "أنشئ حسابك" : "Create your account", desc: isAr ? "في ثوانٍ. بالإيميل أو Google." : "In seconds. Email or Google." },
              { n: "02", title: isAr ? "أكمل الاستبيانات" : "Complete questionnaires", desc: isAr ? "أخبرنا عن هدفك، وزنك، عاداتك." : "Tell us your goal, weight, habits." },
              { n: "03", title: isAr ? "EVO يحلل ويخطط" : "EVO analyzes & plans", desc: isAr ? "الكوتش + EVO يولّدون خططك." : "Coach + EVO generate your plans." },
              { n: "04", title: isAr ? "ابدأ التحوّل" : "Start transforming", desc: isAr ? "تتبع، استبدل، واسأل EVO." : "Track, swap, and ask EVO." },
            ].map((s, i) => (
              <Reveal key={s.n} delay={i * 80}>
                <div className="grid grid-cols-[auto_1fr] gap-6 border-t border-[#d2d2d7] pt-6 md:grid-cols-[120px_1fr] md:gap-12 md:pt-8">
                  <div className="text-sm font-normal text-[#6e6e73]">{s.n}</div>
                  <div>
                    <h3 className="text-xl font-semibold tracking-tight md:text-3xl">{s.title}</h3>
                    <p className="mt-2 text-base font-normal text-[#6e6e73] md:text-lg">{s.desc}</p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ===================== 9. TESTIMONIALS — Apple-style large quotes ===================== */}
      <section className="bg-[#f5f5f7] px-4 py-20 md:py-28">
        <div className="mx-auto max-w-4xl">
          <Reveal>
            <h2 className="text-center text-3xl font-semibold tracking-tight md:text-5xl">
              {isAr ? "نتائج حقيقية." : "Real results."}
            </h2>
          </Reveal>
          <div className="mt-16 space-y-16 md:mt-20 md:space-y-20">
            {[
              { name: isAr ? "محمد العشري" : "Mohamed ElAshry", result: isAr ? "-12 كجم في 3 أشهر" : "-12kg in 3 months", text: isAr ? "أحسن كوتش جربته. EVO بيرد على أسئلتي في أي وقت." : "Best coach I've tried. EVO answers my questions anytime." },
              { name: isAr ? "سارة منصور" : "Sara Mansour", result: isAr ? "-2 مقاس في 4 أشهر" : "-2 sizes in 4 months", text: isAr ? "أحمد فهم حالتي وعمللي خطة تناسبني. التتبع خلاني ملتزمة." : "Ahmed understood my situation and made a plan that fits me." },
              { name: isAr ? "أحمد فؤاد" : "Ahmed Fouad", result: isAr ? "+6 كجم عضلات" : "+6kg muscle", text: isAr ? "برنامج التمارين احترافي جداً. التبديلات سريعة في الجيم." : "The workout program is very professional. Swaps are quick at the gym." },
            ].map((tm, i) => (
              <Reveal key={i} delay={i * 100}>
                <blockquote className="text-center">
                  <p className="mx-auto max-w-2xl text-xl font-normal leading-relaxed tracking-tight md:text-3xl md:leading-relaxed">
                    "{tm.text}"
                  </p>
                  <footer className="mt-6">
                    <div className="text-sm font-semibold">{tm.name}</div>
                    <div className="mt-1 text-sm font-normal text-[#0071e3]">{tm.result}</div>
                  </footer>
                </blockquote>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ===================== 10. PRICING — Apple-style simple ===================== */}
      <section className="bg-white px-4 py-20 md:py-28">
        <div className="mx-auto max-w-5xl">
          <Reveal>
            <h2 className="text-center text-3xl font-semibold tracking-tight md:text-5xl">
              {isAr ? "استثمر في نفسك." : "Invest in yourself."}
            </h2>
          </Reveal>
          <Reveal delay={150}>
            <p className="mx-auto mt-4 max-w-xl text-center text-lg font-normal text-[#6e6e73] md:text-xl">
              {isAr ? "باقتين تناسب كل هدف." : "Two plans for every goal."}
            </p>
          </Reveal>
          <div className="mt-16 grid gap-5 md:grid-cols-2 md:gap-6">
            {[
              { name: "Starter", price: "$10", period: isAr ? "/شهر" : "/mo", egp: "≈ 500 ج.م", features: [isAr ? "2 تبديل يومي" : "2 daily swaps", isAr ? "خطة تغذية + تمارين" : "Nutrition + workout", isAr ? "مساعد EVO" : "EVO AI coach", isAr ? "تتبع تقدم" : "Progress tracking"], highlight: false },
              { name: "Elite", price: "$20", period: isAr ? "/شهر" : "/mo", egp: "≈ 1000 ج.م", features: [isAr ? "تبديلات غير محدودة" : "Unlimited swaps", isAr ? "كوتشينج VIP" : "VIP coaching", isAr ? "استجابة فورية" : "Instant response", isAr ? "أقصى مساءلة" : "Max accountability"], highlight: true },
            ].map((p, i) => (
              <Reveal key={i} delay={i * 150}>
                <div className={`h-full rounded-3xl p-8 md:p-10 ${p.highlight ? "bg-black text-white" : "bg-[#f5f5f7] text-[#1d1d1f]"}`}>
                  <h3 className="text-xl font-semibold tracking-tight md:text-2xl">{p.name}</h3>
                  <div className="mt-4 flex items-baseline gap-1">
                    <span className="text-4xl font-semibold tracking-tight md:text-5xl">{p.price}</span>
                    <span className="text-base font-normal opacity-60">{p.period}</span>
                  </div>
                  <p className="mt-1 text-sm font-normal opacity-60">{p.egp}{p.period}</p>
                  <ul className="mt-8 space-y-3 text-base font-normal">
                    {p.features.map((f, j) => (
                      <li key={j} className="flex items-start gap-3">
                        <span className="mt-2 h-1 w-1 flex-shrink-0 rounded-full bg-current opacity-40" />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                  <button
                    onClick={() => navigate("pricing")}
                    className={`mt-8 w-full rounded-full px-6 py-3 text-base font-normal transition-opacity hover:opacity-90 ${p.highlight ? "bg-white text-black" : "bg-[#0071e3] text-white"}`}
                  >
                    {isAr ? "ابدأ الآن" : "Get Started"}
                  </button>
                </div>
              </Reveal>
            ))}
          </div>
          <Reveal delay={400}>
            <div className="mt-12 text-center">
              <button onClick={() => navigate("pricing")} className="font-normal text-[#0071e3] transition-opacity hover:opacity-70">
                {isAr ? "كل التفاصيل ›" : "See all details ›"}
              </button>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ===================== 11. FAQ — Apple-style ===================== */}
      <section className="bg-[#f5f5f7] px-4 py-20 md:py-28">
        <div className="mx-auto max-w-3xl">
          <Reveal>
            <h2 className="text-center text-3xl font-semibold tracking-tight md:text-5xl">
              {isAr ? "أسئلة شائعة." : "Questions?"}
            </h2>
          </Reveal>
          <Reveal delay={150}>
            <Accordion type="single" collapsible className="mt-12">
              {[
                { q: isAr ? "ما هو MuscleHub؟" : "What is MuscleHub?", a: isAr ? "منصة تحسين أداء بشري تجمع بين خبرة الكوتش أحمد زكي ومحرك EVO." : "A human optimization platform combining Coach Ahmed Zake with the EVO AI engine." },
                { q: isAr ? "من هو EVO؟" : "Who is EVO?", a: isAr ? "محرك الأداء الذكي. يحلل بياناتك ويحدّث خططك تلقائياً." : "The intelligent engine. Analyzes your data and updates plans automatically." },
                { q: isAr ? "هل الخطط مخصصة؟" : "Are plans personalized?", a: isAr ? "نعم، كل خطة تُبنى من استبياناتك وتتحدث أسبوعياً." : "Yes, built from your questionnaires, updated weekly." },
                { q: isAr ? "هل الكوتش حقيقي؟" : "Is the coach real?", a: isAr ? "نعم، الكوتش أحمد زكي حقيقي ويراجع خططك بنفسه." : "Yes, Coach Ahmed Zake is real and reviews your plans personally." },
                { q: isAr ? "طرق الدفع؟" : "Payment methods?", a: isAr ? "InstaPay و Vodafone Cash." : "InstaPay and Vodafone Cash." },
                { q: isAr ? "بياناتي آمنة؟" : "Is my data secure?", a: isAr ? "نعم، مشفرة على Supabase مع RLS." : "Yes, encrypted on Supabase with RLS." },
              ].map((faq, i) => (
                <AccordionItem key={i} value={`item-${i}`} className="border-b border-[#d2d2d7]">
                  <AccordionTrigger className="py-5 text-start text-lg font-normal hover:no-underline">
                    {faq.q}
                  </AccordionTrigger>
                  <AccordionContent className="pb-5 text-base font-normal leading-relaxed text-[#6e6e73]">
                    {faq.a}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </Reveal>
        </div>
      </section>

      {/* ===================== 12. BLOG — Apple-style minimal grid ===================== */}
      {latestPosts.length > 0 && (
        <section className="bg-white px-4 py-20 md:py-28">
          <div className="mx-auto max-w-6xl">
            <Reveal>
              <h2 className="mb-12 text-center text-3xl font-semibold tracking-tight md:mb-16 md:text-5xl">
                {isAr ? "من المدونة." : "From the blog."}
              </h2>
            </Reveal>
            <div className="grid gap-5 md:grid-cols-3 md:gap-6">
              {latestPosts.map((post, i) => (
                <Reveal key={post.id} delay={i * 100}>
                  <a
                    href={`${isAr ? "/ar" : ""}/blog/${encodeURIComponent(post.slug)}`}
                    className="group block overflow-hidden rounded-2xl bg-[#f5f5f7]"
                  >
                    {post.featured_image && (
                      <img
                        src={post.featured_image}
                        alt={post.cover_alt || post.title}
                        className="aspect-[16/10] w-full object-cover"
                        loading="lazy"
                      />
                    )}
                    <div className="p-6">
                      <p className="text-xs font-normal uppercase tracking-wide text-[#6e6e73]">
                        {getCategoryLabel(post.category, lang)}
                      </p>
                      <h3 className="mt-3 text-lg font-semibold leading-tight tracking-tight">{post.title}</h3>
                      {post.excerpt && (
                        <p className="mt-2 line-clamp-2 text-sm font-normal text-[#6e6e73]">{post.excerpt}</p>
                      )}
                      <p className="mt-4 text-sm font-normal text-[#0071e3]">{isAr ? "اقرأ ›" : "Read ›"}</p>
                    </div>
                  </a>
                </Reveal>
              ))}
            </div>
            <Reveal delay={400}>
              <div className="mt-12 text-center">
                <a href={blogHref} className="font-normal text-[#0071e3] transition-opacity hover:opacity-70">
                  {isAr ? "كل المقالات ›" : "View all ›"}
                </a>
              </div>
            </Reveal>
          </div>
        </section>
      )}

      {/* ===================== 13. FINAL CTA — Apple-style ===================== */}
      <section className="bg-white px-4 py-28 text-center md:py-40">
        <Reveal>
          <h2 className="mx-auto max-w-3xl text-4xl font-semibold leading-[1.05] tracking-tight md:text-6xl lg:text-7xl">
            {isAr ? "جسمك الجديد بيستناك." : "Your new body is waiting."}
          </h2>
        </Reveal>
        <Reveal delay={200}>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4 md:gap-6">
            <button
              onClick={() => navigate("auth", { mode: "signup" })}
              className="rounded-full bg-[#0071e3] px-7 py-3 text-base font-normal text-white transition-opacity hover:opacity-90"
            >
              {isAr ? "ابدأ تحوّلي" : "Start my transformation"}
            </button>
            <button
              onClick={() => navigate("pricing")}
              className="font-normal text-[#0071e3] transition-opacity hover:opacity-70"
            >
              {isAr ? "الأسعار ›" : "Pricing ›"}
            </button>
          </div>
        </Reveal>
      </section>

      {/* ===================== FOOTER — Apple-style ===================== */}
      <footer className="border-t border-[#d2d2d7] bg-[#f5f5f7] px-4 py-10 text-[#6e6e73]">
        <div className="mx-auto max-w-6xl">
          <div className="grid gap-8 md:grid-cols-4">
            <div>
              <p className="text-sm font-semibold text-[#1d1d1f]">MuscleHub</p>
              <p className="mt-2 text-xs font-normal">{isAr ? "منصة تحسين أداء بشري." : "Human optimization platform."}</p>
            </div>
            <div>
              <p className="text-xs font-normal uppercase tracking-wide">{isAr ? "روابط" : "Links"}</p>
              <ul className="mt-3 space-y-2 text-xs">
                <li><button onClick={() => navigate("pricing")} className="hover:underline">{isAr ? "الأسعار" : "Pricing"}</button></li>
                <li><button onClick={() => navigate("about")} className="hover:underline">{isAr ? "من نحن" : "About"}</button></li>
                <li><button onClick={() => navigate("blog")} className="hover:underline">{isAr ? "المدونة" : "Blog"}</button></li>
                <li><button onClick={() => navigate("faq")} className="hover:underline">{isAr ? "أسئلة شائعة" : "FAQ"}</button></li>
              </ul>
            </div>
            <div>
              <p className="text-xs font-normal uppercase tracking-wide">{isAr ? "قانوني" : "Legal"}</p>
              <ul className="mt-3 space-y-2 text-xs">
                <li><button onClick={() => navigate("privacy")} className="hover:underline">{isAr ? "الخصوصية" : "Privacy"}</button></li>
                <li><button onClick={() => navigate("terms")} className="hover:underline">{isAr ? "الشروط" : "Terms"}</button></li>
              </ul>
            </div>
            <div>
              <p className="text-xs font-normal uppercase tracking-wide">{isAr ? "تواصل" : "Contact"}</p>
              <ul className="mt-3 space-y-2 text-xs">
                <li>WhatsApp</li>
                <li>Instagram</li>
                <li>{isAr ? "دعم 24/7" : "24/7 support"}</li>
              </ul>
            </div>
          </div>
          <div className="mt-8 border-t border-[#d2d2d7] pt-6 text-center text-xs">
            © {new Date().getFullYear()} MuscleHub. {isAr ? "كل الحقوق محفوظة." : "All rights reserved."}
          </div>
        </div>
      </footer>
    </div>
  );
}
