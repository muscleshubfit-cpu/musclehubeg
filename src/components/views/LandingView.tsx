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

// Apple-style reveal wrapper — gentle fade only, no scale/slide
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

// Premium images — Apple-style full-bleed photography
const HERO_IMG = "https://z-cdn.chatglm.cn/image-search-mcp/images-ppt/6f2587b25688.jpeg";
const AI_IMG = "https://z-cdn.chatglm.cn/image-search-mcp/images-ppt/28994da5426f.jpg";
const TRANSFORM_IMG = "https://z-cdn.chatglm.cn/image-search-mcp/images-ppt/d107f788f4a2.jpg";
const MEAL_IMG = "https://z-cdn.chatglm.cn/image-search-mcp/images-ppt/75179d5df07d.jpg";

export function LandingView() {
  const { t, lang } = useI18n();
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
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader variant="landing" />

      {/* ===================== 1. HERO — Apple-style full-bleed ===================== */}
      <section className="relative flex min-h-[90vh] flex-col items-center justify-center overflow-hidden bg-background px-4 text-center">
        <Reveal>
          <p className="mb-4 text-sm font-normal text-primary md:text-base">
            {isAr ? "منصة تحسين الأداء البشري" : "Human Optimization Platform"}
          </p>
        </Reveal>
        <Reveal delay={100}>
          <h1 className="mx-auto max-w-4xl text-5xl font-semibold leading-[1.05] tracking-tight md:text-7xl lg:text-8xl">
            {isAr ? (
              <>
                ابنِ نسخة
                <br />
                أقوى منك.
              </>
            ) : (
              <>
                Build a
                <br />
                Stronger You.
              </>
            )}
          </h1>
        </Reveal>
        <Reveal delay={300}>
          <p className="mx-auto mt-6 max-w-xl text-lg font-normal leading-relaxed text-muted-foreground md:text-xl md:leading-relaxed">
            {isAr
              ? "كوتشينج حقيقي. ذكاء اصطناعي يفهم جسمك. خطط تتكيف معك."
              : "Real coaching. AI that understands your body. Plans that adapt to you."}
          </p>
        </Reveal>
        <Reveal delay={500}>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-6 text-base md:gap-8">
            <button
              onClick={() => navigate("auth", { mode: "signup" })}
              className="rounded-full bg-primary px-8 py-3 font-normal text-primary-foreground transition-opacity hover:opacity-90"
            >
              {isAr ? "ابدأ تحوّلك" : "Start your transformation"}
            </button>
            <button
              onClick={() => navigate("pricing")}
              className="font-normal text-primary transition-opacity hover:opacity-70"
            >
              {isAr ? "تعرّف على الأسعار ›" : "Learn about pricing ›"}
            </button>
          </div>
        </Reveal>
      </section>

      {/* ===================== 2. HERO IMAGE — full-bleed ===================== */}
      <section className="relative h-[60vh] w-full overflow-hidden md:h-[80vh]">
        <img
          src={HERO_IMG}
          alt={isAr ? "رياضي محترف" : "Professional athlete"}
          className="h-full w-full object-cover"
          loading="eager"
        />
      </section>

      {/* ===================== 3. WHAT IS MUSCLEHUB — Apple section ===================== */}
      <section className="bg-secondary px-4 py-24 text-center md:py-32">
        <div className="mx-auto max-w-3xl">
          <Reveal>
            <h2 className="text-4xl font-semibold leading-[1.1] tracking-tight md:text-6xl">
              {isAr ? "ليست منصة لياقة." : "Not a fitness platform."}
            </h2>
          </Reveal>
          <Reveal delay={150}>
            <h2 className="mt-2 text-4xl font-semibold leading-[1.1] tracking-tight text-muted-foreground md:text-6xl">
              {isAr ? "بل نظام تحسين بشري." : "A human optimization system."}
            </h2>
          </Reveal>
          <Reveal delay={300}>
            <p className="mx-auto mt-8 max-w-2xl text-lg font-normal leading-relaxed text-muted-foreground md:text-xl">
              {isAr
                ? "نجمع بين خبرة الكوتش أحمد زكي وعلم الرياضة والتغذية والذكاء الاصطناعي وتحليل البيانات في نظام بيئي واحد. الهدف ليس فقط تغيير جسمك، بل تحسين أدائك الكامل."
                : "We combine Coach Ahmed Zake's expertise with sports science, nutrition, AI, and data analysis in one ecosystem. The goal isn't just to change your body — it's to optimize your entire performance."}
            </p>
          </Reveal>
        </div>
      </section>

      {/* ===================== 4. STATS — Apple-style large numbers ===================== */}
      <section className="bg-background px-4 py-24 md:py-32">
        <div className="mx-auto max-w-5xl">
          <div className="grid gap-16 md:grid-cols-4 md:gap-8">
            {[
              { v: "+500", l: isAr ? "عميل نجح" : "clients succeeded" },
              { v: "95%", l: isAr ? "نسبة رضا" : "satisfaction rate" },
              { v: "-8.5kg", l: isAr ? "متوسط الفقد" : "avg. weight loss" },
              { v: "12wk", l: isAr ? "متوسط المدة" : "avg. duration" },
            ].map((s, i) => (
              <Reveal key={s.l} delay={i * 100} className="text-center">
                <div className="text-5xl font-semibold tracking-tight text-foreground md:text-7xl">
                  {s.v}
                </div>
                <div className="mt-2 text-sm font-normal text-muted-foreground md:text-base">
                  {s.l}
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ===================== 5. EVO — Dark section (Apple-style black) ===================== */}
      <section className="relative h-[80vh] w-full overflow-hidden bg-black md:h-[90vh]">
        <img
          src={AI_IMG}
          alt={isAr ? "ذكاء اصطناعي" : "AI intelligence"}
          className="h-full w-full object-cover opacity-60"
          loading="lazy"
        />
        <div className="absolute inset-0 flex flex-col items-center justify-center px-4 text-center">
          <Reveal>
            <h2 className="text-4xl font-semibold leading-[1.1] tracking-tight text-white md:text-6xl lg:text-7xl">
              {isAr ? "EVO." : "EVO."}
            </h2>
          </Reveal>
          <Reveal delay={150}>
            <p className="mx-auto mt-4 max-w-xl text-lg font-normal leading-relaxed text-gray-300 md:text-xl">
              {isAr
                ? "ليس شات بوت. بل محرك أداء ذكي يحلل بياناتك، يتنبأ بنتائجك، ويحدّث خططك تلقائياً."
                : "Not a chatbot. An intelligent engine that analyzes your data, predicts outcomes, and updates your plans automatically."}
            </p>
          </Reveal>
        </div>
      </section>

      {/* ===================== 6. HOW IT WORKS — Apple-style numbered steps ===================== */}
      <section className="bg-background px-4 py-24 md:py-32">
        <div className="mx-auto max-w-5xl">
          <Reveal>
            <h2 className="text-center text-4xl font-semibold leading-[1.1] tracking-tight md:text-6xl">
              {isAr ? "رحلتك في ٤ خطوات." : "Your journey in 4 steps."}
            </h2>
          </Reveal>
          <div className="mt-20 space-y-16 md:space-y-24">
            {[
              {
                n: "01",
                title: isAr ? "أنشئ حسابك" : "Create your account",
                desc: isAr ? "في ثوانٍ. بالإيميل أو Google." : "In seconds. Email or Google.",
              },
              {
                n: "02",
                title: isAr ? "أكمل الاستبيانات" : "Complete questionnaires",
                desc: isAr ? "أخبرنا عن هدفك، وزنك، عاداتك، إصاباتك." : "Tell us your goal, weight, habits, injuries.",
              },
              {
                n: "03",
                title: isAr ? "EVO يحلل ويخطط" : "EVO analyzes & plans",
                desc: isAr ? "الكوتش + EVO يولّدون خططك ويوافقون عليها." : "Coach + EVO generate and approve your plans.",
              },
              {
                n: "04",
                title: isAr ? "ابدأ التحوّل" : "Start transforming",
                desc: isAr ? "تتبع تقدمك، استبدل، واسأل EVO أي وقت." : "Track progress, swap, and ask EVO anytime.",
              },
            ].map((s, i) => (
              <Reveal key={s.n} delay={i * 100}>
                <div className="flex flex-col gap-4 border-t border-border pt-8 md:flex-row md:items-baseline md:gap-12">
                  <div className="text-sm font-normal text-muted-foreground md:w-24 md:flex-shrink-0">
                    {s.n}
                  </div>
                  <div className="flex-1">
                    <h3 className="text-2xl font-semibold tracking-tight md:text-4xl">
                      {s.title}
                    </h3>
                    <p className="mt-2 text-lg font-normal text-muted-foreground md:text-xl">
                      {s.desc}
                    </p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ===================== 7. ADAPTIVE COACHING — Apple-style split section ===================== */}
      <section className="bg-secondary px-4 py-24 md:py-32">
        <div className="mx-auto max-w-5xl">
          <Reveal>
            <h2 className="text-4xl font-semibold leading-[1.1] tracking-tight md:text-6xl">
              {isAr ? "خطط تتغير كأنها حية." : "Plans that evolve."}
            </h2>
          </Reveal>
          <Reveal delay={150}>
            <p className="mt-6 max-w-2xl text-lg font-normal leading-relaxed text-muted-foreground md:text-xl">
              {isAr
                ? "خطتك ليست ملف PDF ثابت. كل أسبوع، EVO يحلل تقدمك ويعدّل السعرات، الماكروز، التمارين، والكثافة — تلقائياً."
                : "Your plan isn't a static PDF. Every week, EVO analyzes your progress and adjusts calories, macros, exercises, and intensity — automatically."}
            </p>
          </Reveal>
          <Reveal delay={300}>
            <div className="mt-12 overflow-hidden rounded-2xl">
              <img
                src={MEAL_IMG}
                alt={isAr ? "وجبة صحية" : "Healthy meal"}
                className="aspect-[16/10] w-full object-cover"
                loading="lazy"
              />
            </div>
          </Reveal>
        </div>
      </section>

      {/* ===================== 8. TESTIMONIALS — Apple-style quotes ===================== */}
      <section className="bg-background px-4 py-24 md:py-32">
        <div className="mx-auto max-w-4xl">
          <Reveal>
            <h2 className="text-center text-4xl font-semibold leading-[1.1] tracking-tight md:text-6xl">
              {isAr ? "عملاء حقيون. نتائج حقيقية." : "Real clients. Real results."}
            </h2>
          </Reveal>
          <div className="mt-20 space-y-20">
            {[
              {
                name: isAr ? "محمد العشري" : "Mohamed ElAshry",
                result: isAr ? "-12 كجم في 3 أشهر" : "-12kg in 3 months",
                text: isAr
                  ? "أحسن كوتش جربته. EVO بيرد على أسئلتي في أي وقت وحسابات التبديلات مظبوطة 100%."
                  : "Best coach I've tried. EVO answers my questions anytime and swap calculations are 100% accurate.",
              },
              {
                name: isAr ? "سارة منصور" : "Sara Mansour",
                result: isAr ? "-2 مقاس في 4 أشهر" : "-2 sizes in 4 months",
                text: isAr
                  ? "كنت حاسة إني ضايعه، بس أحمد فهم حالتي وعمللي خطة تناسبني. التتبع الأسبوعي خلاني ملتزمة."
                  : "I felt lost, but Ahmed understood my situation and made a plan that fits me. Weekly tracking kept me committed.",
              },
              {
                name: isAr ? "أحمد فؤاد" : "Ahmed Fouad",
                result: isAr ? "+6 كجم عضلات" : "+6kg muscle",
                text: isAr
                  ? "برنامج التمارين احترافي جداً. كل تمرين متفسر بالعربي وفيه نصايح. التبديلات سريعة ومريحة في الجيم."
                  : "The workout program is very professional. Every exercise explained in Arabic with tips. Swaps are quick at the gym.",
              },
            ].map((tm, i) => (
              <Reveal key={i} delay={i * 100}>
                <blockquote className="text-center">
                  <p className="mx-auto max-w-2xl text-2xl font-normal leading-relaxed tracking-tight md:text-4xl md:leading-relaxed">
                    "{tm.text}"
                  </p>
                  <footer className="mt-8">
                    <div className="text-base font-semibold text-foreground">{tm.name}</div>
                    <div className="mt-1 text-sm font-normal text-success">{tm.result}</div>
                  </footer>
                </blockquote>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ===================== 9. PRICING — Apple-style simple pricing ===================== */}
      <section className="bg-secondary px-4 py-24 md:py-32">
        <div className="mx-auto max-w-5xl">
          <Reveal>
            <h2 className="text-center text-4xl font-semibold leading-[1.1] tracking-tight md:text-6xl">
              {isAr ? "استثمر في نفسك." : "Invest in yourself."}
            </h2>
          </Reveal>
          <Reveal delay={150}>
            <p className="mx-auto mt-4 max-w-xl text-center text-lg font-normal text-muted-foreground md:text-xl">
              {isAr ? "باقتين تناسب كل هدف وميزانية." : "Two plans for every goal and budget."}
            </p>
          </Reveal>
          <div className="mt-16 grid gap-8 md:grid-cols-2">
            {[
              {
                name: "Starter",
                price: "$10",
                period: isAr ? "/شهر" : "/mo",
                egp: "≈ 500 ج.م",
                features: [
                  isAr ? "2 تبديل يومي" : "2 daily swaps",
                  isAr ? "خطة تغذية + تمارين" : "Nutrition + workout plan",
                  isAr ? "مساعد EVO الذكي" : "EVO AI coach",
                  isAr ? "تتبع تقدم" : "Progress tracking",
                ],
                highlight: false,
              },
              {
                name: "Elite",
                price: "$20",
                period: isAr ? "/شهر" : "/mo",
                egp: "≈ 1000 ج.م",
                features: [
                  isAr ? "تبديلات غير محدودة" : "Unlimited swaps",
                  isAr ? "كوتشينج VIP" : "VIP coaching",
                  isAr ? "استجابة فورية" : "Instant response",
                  isAr ? "أقصى مساءلة" : "Max accountability",
                ],
                highlight: true,
              },
            ].map((p, i) => (
              <Reveal key={i} delay={i * 150}>
                <div
                  className={`h-full rounded-2xl p-8 ${
                    p.highlight ? "bg-foreground text-background" : "bg-background text-foreground"
                  }`}
                >
                  <h3 className="text-2xl font-semibold tracking-tight">{p.name}</h3>
                  <div className="mt-4 flex items-baseline gap-1">
                    <span className="text-5xl font-semibold tracking-tight">{p.price}</span>
                    <span className="text-lg font-normal opacity-60">{p.period}</span>
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
                    className={`mt-8 w-full rounded-full px-6 py-3 text-base font-normal transition-opacity hover:opacity-90 ${
                      p.highlight
                        ? "bg-background text-foreground"
                        : "bg-primary text-primary-foreground"
                    }`}
                  >
                    {isAr ? "ابدأ الآن" : "Get Started"}
                  </button>
                </div>
              </Reveal>
            ))}
          </div>
          <Reveal delay={400}>
            <div className="mt-12 text-center">
              <button
                onClick={() => navigate("pricing")}
                className="font-normal text-primary transition-opacity hover:opacity-70"
              >
                {isAr ? "شوف كل التفاصيل ›" : "See all details ›"}
              </button>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ===================== 10. FAQ — Apple-style clean accordion ===================== */}
      <section className="bg-background px-4 py-24 md:py-32">
        <div className="mx-auto max-w-3xl">
          <Reveal>
            <h2 className="text-center text-4xl font-semibold leading-[1.1] tracking-tight md:text-6xl">
              {isAr ? "أسئلة شائعة." : "Frequently Asked."}
            </h2>
          </Reveal>
          <Reveal delay={150}>
            <Accordion type="single" collapsible className="mt-16">
              {[
                { q: isAr ? "ما هو MuscleHub؟" : "What is MuscleHub?", a: isAr ? "منصة تحسين أداء بشري تجمع بين خبرة الكوتش أحمد زكي ومحرك الذكاء الاصطناعي EVO لتقديم خطط تغذية وتمارين مخصصة، تتبع تقدم ذكي، ومساعد ذكي بذاكرة عن بياناتك." : "A human optimization platform combining Coach Ahmed Zake's expertise with the EVO AI engine for personalized nutrition, workout plans, smart tracking, and an AI coach with memory of your data." },
                { q: isAr ? "من هو EVO؟" : "Who is EVO?", a: isAr ? "محرك الأداء الذكي. ليس شات بوت عادي، بل نظام يحلل بياناتك، يتنبأ بالنتائج، يوصي بالتحسينات، ويحدّث خططك تلقائياً." : "The intelligent performance engine. Not a regular chatbot — a system that analyzes your data, predicts outcomes, recommends improvements, and updates your plans automatically." },
                { q: isAr ? "هل الخطط مخصصة فعلاً لي؟" : "Are the plans truly personalized?", a: isAr ? "نعم. كل خطة تُبنى بناءً على استبياناتك ويتم تحديثها تلقائياً حسب تقدمك الأسبوعي." : "Yes. Every plan is built from your questionnaires and automatically updated based on your weekly progress." },
                { q: isAr ? "كم تبديل يومياً مسموح؟" : "How many daily swaps?", a: isAr ? "حسب باقتك: Starter = 2 تبديل يومياً. Elite = غير محدود." : "Based on your plan: Starter = 2 daily. Elite = unlimited." },
                { q: isAr ? "هل الكوتش حقيقي؟" : "Is the coach real?", a: isAr ? "نعم. الكوتش أحمد زكي حقيقي تماماً. يراجع استبياناتك ويوافق على خططك بنفسه." : "Yes. Coach Ahmed Zake is 100% real. He reviews your questionnaires and approves your plans personally." },
                { q: isAr ? "ما طرق الدفع؟" : "Payment methods?", a: isAr ? "InstaPay و Vodafone Cash." : "InstaPay and Vodafone Cash." },
                { q: isAr ? "هل بياناتي آمنة؟" : "Is my data secure?", a: isAr ? "نعم. جميع البيانات محفوظة بشكل مشفر على Supabase مع سياسات RLS." : "Yes. All data is encrypted on Supabase with RLS policies." },
                { q: isAr ? "هل يدعم العربية؟" : "Does it support Arabic?", a: isAr ? "نعم، المنصة ثنائية اللغة بالكامل مع دعم RTL." : "Yes, fully bilingual with RTL support." },
              ].map((faq, i) => (
                <AccordionItem key={i} value={`item-${i}`} className="border-b border-border">
                  <AccordionTrigger className="py-5 text-start text-lg font-normal hover:no-underline">
                    {faq.q}
                  </AccordionTrigger>
                  <AccordionContent className="pb-5 text-base font-normal leading-relaxed text-muted-foreground">
                    {faq.a}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </Reveal>
        </div>
      </section>

      {/* ===================== 11. LATEST ARTICLES — Apple-style grid ===================== */}
      {latestPosts.length > 0 && (
        <section className="bg-secondary px-4 py-24 md:py-32">
          <div className="mx-auto max-w-6xl">
            <Reveal>
              <div className="mb-16 text-center">
                <h2 className="text-4xl font-semibold leading-[1.1] tracking-tight md:text-6xl">
                  {isAr ? "من المدونة." : "From the blog."}
                </h2>
              </div>
            </Reveal>
            <div className="grid gap-8 md:grid-cols-3">
              {latestPosts.map((post, i) => (
                <Reveal key={post.id} delay={i * 100}>
                  <a
                    href={`${isAr ? "/ar" : ""}/blog/${encodeURIComponent(post.slug)}`}
                    className="group block"
                  >
                    <div className="overflow-hidden rounded-2xl bg-background">
                      {post.featured_image && (
                        <img
                          src={post.featured_image}
                          alt={post.cover_alt || post.title}
                          className="aspect-[16/10] w-full object-cover"
                          loading="lazy"
                        />
                      )}
                      <div className="p-6">
                        <p className="text-xs font-normal uppercase tracking-wide text-muted-foreground">
                          {getCategoryLabel(post.category, lang)}
                        </p>
                        <h3 className="mt-3 text-xl font-semibold leading-tight tracking-tight">
                          {post.title}
                        </h3>
                        {post.excerpt && (
                          <p className="mt-2 line-clamp-2 text-base font-normal text-muted-foreground">
                            {post.excerpt}
                          </p>
                        )}
                        <p className="mt-4 text-sm font-normal text-primary">
                          {isAr ? "اقرأ المزيد ›" : "Read more ›"}
                        </p>
                      </div>
                    </div>
                  </a>
                </Reveal>
              ))}
            </div>
            <Reveal delay={400}>
              <div className="mt-16 text-center">
                <a
                  href={blogHref}
                  className="font-normal text-primary transition-opacity hover:opacity-70"
                >
                  {isAr ? "كل المقالات ›" : "View all articles ›"}
                </a>
              </div>
            </Reveal>
          </div>
        </section>
      )}

      {/* ===================== 12. FINAL CTA — Apple-style minimal ===================== */}
      <section className="bg-background px-4 py-32 text-center md:py-48">
        <Reveal>
          <h2 className="mx-auto max-w-3xl text-5xl font-semibold leading-[1.05] tracking-tight md:text-7xl">
            {isAr ? "جسمك الجديد بيستناك." : "Your new body is waiting."}
          </h2>
        </Reveal>
        <Reveal delay={200}>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-6">
            <button
              onClick={() => navigate("auth", { mode: "signup" })}
              className="rounded-full bg-primary px-8 py-3 text-base font-normal text-primary-foreground transition-opacity hover:opacity-90"
            >
              {isAr ? "ابدأ تحوّلي" : "Start my transformation"}
            </button>
            <button
              onClick={() => navigate("pricing")}
              className="font-normal text-primary transition-opacity hover:opacity-70"
            >
              {isAr ? "شوف الأسعار ›" : "View pricing ›"}
            </button>
          </div>
        </Reveal>
      </section>

      {/* ===================== FOOTER — Apple-style minimal ===================== */}
      <footer className="border-t border-border bg-secondary px-4 py-12">
        <div className="mx-auto max-w-6xl">
          <div className="grid gap-8 md:grid-cols-4">
            <div className="md:col-span-1">
              <p className="text-base font-semibold">MuscleHub</p>
              <p className="mt-2 text-sm font-normal text-muted-foreground">
                {isAr ? "منصة تحسين أداء بشري." : "Human optimization platform."}
              </p>
            </div>
            <div>
              <p className="text-xs font-normal uppercase tracking-wide text-muted-foreground">
                {isAr ? "روابط" : "Links"}
              </p>
              <ul className="mt-3 space-y-2 text-sm font-normal">
                <li><button onClick={() => navigate("pricing")} className="text-primary hover:opacity-70">{isAr ? "الأسعار" : "Pricing"}</button></li>
                <li><button onClick={() => navigate("about")} className="text-primary hover:opacity-70">{isAr ? "من نحن" : "About"}</button></li>
                <li><button onClick={() => navigate("blog")} className="text-primary hover:opacity-70">{isAr ? "المدونة" : "Blog"}</button></li>
                <li><button onClick={() => navigate("faq")} className="text-primary hover:opacity-70">{isAr ? "الأسئلة الشائعة" : "FAQ"}</button></li>
              </ul>
            </div>
            <div>
              <p className="text-xs font-normal uppercase tracking-wide text-muted-foreground">
                {isAr ? "قانوني" : "Legal"}
              </p>
              <ul className="mt-3 space-y-2 text-sm font-normal">
                <li><button onClick={() => navigate("privacy")} className="text-primary hover:opacity-70">{isAr ? "الخصوصية" : "Privacy"}</button></li>
                <li><button onClick={() => navigate("terms")} className="text-primary hover:opacity-70">{isAr ? "الشروط" : "Terms"}</button></li>
              </ul>
            </div>
            <div>
              <p className="text-xs font-normal uppercase tracking-wide text-muted-foreground">
                {isAr ? "تواصل" : "Contact"}
              </p>
              <ul className="mt-3 space-y-2 text-sm font-normal text-muted-foreground">
                <li>WhatsApp</li>
                <li>Instagram</li>
                <li>{isAr ? "دعم 24/7" : "24/7 support"}</li>
              </ul>
            </div>
          </div>
          <div className="mt-12 border-t border-border pt-6 text-center text-xs font-normal text-muted-foreground">
            © {new Date().getFullYear()} MuscleHub. {isAr ? "كل الحقوق محفوظة." : "All rights reserved."}
          </div>
        </div>
      </footer>
    </div>
  );
}

// Import SiteHeader at the top of the file
import { SiteHeader } from "@/components/SiteHeader";
