"use client";

import Link from "next/link";
import Image from "next/image";
import { useI18n } from "@/lib/i18n";
import { SiteHeader } from "@/components/SiteHeader";
import { CoachShareButtons } from "@/components/CoachShareButtons";
import { COACH_FAQ_AR, COACH_FAQ_EN } from "./content";

import heroCoach from "../../../public/images/coach-portrait.jpg";
import imgDumbbell from "../../../public/images/dumbbell-gym.jpg";
import imgMeal from "../../../public/images/meal-nutrition.jpg";
import imgCoaching from "../../../public/images/hero/coaching-1.jpg";

/**
 * FOR-COACHES — recruitment landing page (owner directive 2026-08-29:
 * «صفحة داخل الموقع عربى وانجليزى دعايا وشرح لجذب المدربين»).
 *
 * OWNER LAW baked into the copy:
 *   - Coach authority is over HIS OWN clients, never the site's
 *     («صلاحيات المدربين تكون مع عملائهم وليس للموقع والشات الذكى»).
 *   - Client prices belong to the coach: he sets them freely and
 *     collects them freely («اسعار عملائهم خاصة بيهم يحددوها براحتهم
 *     ويحصلوا براحتهم») — the site takes a FIXED activation fee, never
 *     a percentage (business model law).
 *   - Coaches can subscribe to site memberships for the site's own
 *     premium features («يمكنهم الاشتراك فى عضويات الموقع»).
 *   - No icons / no emojis on this page — text, cards and buttons only.
 *
 * Images are STATIC imports — next/image turns them into responsive
 * AVIF/WebP at the edge (owner: «استيراد كامل مع التحويل لتخفيف السرعة»).
 */

const REGISTER_HREF_BASE = "/for-coaches/register";

export default function ForCoachesPage() {
  const { lang } = useI18n();
  const isAr = lang === "ar";
  // AR mirror (2026-08-30): the register CTA follows the mirror so an
  // /ar/for-coaches visitor lands on the Arabic registration URL.
  const REGISTER_HREF = isAr ? `/ar${REGISTER_HREF_BASE}` : REGISTER_HREF_BASE;

  const shareMsg = isAr
    ? "اشتغل كوتش على Musclehubeg — عملاؤك بأسعارك وفلوسك في إيدك:"
    : "Coach on Musclehubeg — your clients, your prices, your money:";

  return (
    <div className="min-h-screen bg-white text-[#1d1d1f]">
      <SiteHeader variant="landing" />

      {/* ================= HERO ================= */}
      <section className="mx-auto grid max-w-6xl items-center gap-10 px-4 pb-14 pt-10 md:grid-cols-2 md:pt-16">
        <div>
          <span className="inline-block rounded-full bg-[#0071e3]/10 px-4 py-1.5 text-xs font-bold text-[#0071e3]">
            {isAr ? "للكوتشات وأخصائيي التغذية" : "For coaches & nutrition specialists"}
          </span>
          <h1 className="mt-4 text-3xl font-semibold leading-tight tracking-tight md:text-5xl md:leading-tight">
            {isAr ? (
              <>
                درِّب عملاءك بأسعارك
                <br />
                وفلوسك في إيدك
              </>
            ) : (
              <>
                Train your clients at your prices —
                <br />
                and keep your money
              </>
            )}
          </h1>
          <p className="mt-4 max-w-xl text-base font-normal leading-relaxed text-[#6e6e73] md:text-lg">
            {isAr
              ? "Musclehubeg بيديك منصة كاملة تدير شغلك بيها: خطط تغذية وتمارين بالذكاء الاصطناعي، متابعة تقدم لكل عميل، وصفحة عامة باسمك. أنت اللي بتحدد سعر اشتراك عميلك، وأنت اللي بتقبض منه — المنصة مش بتاخد منك أي نسبة."
              : "Musclehubeg gives you a complete platform to run your business: AI-generated nutrition and workout plans, progress tracking for every client, and your own public page. You set each client's price and you get paid directly — the site never takes a cut."}
          </p>
          <div className="mt-7 flex flex-wrap items-center gap-4">
            <Link
              href={REGISTER_HREF}
              className="rounded-full bg-[#0071e3] px-7 py-3 text-sm font-semibold text-white shadow-lg shadow-[#0071e3]/25 transition-all duration-300 hover:bg-[#0077ed]"
            >
              {isAr ? "سجّل كمدرب مجانًا — في دقيقة" : "Register as a coach — free, 1 minute"}
            </Link>
            <Link
              href="#money"
              className="rounded-full border border-[#d2d2d7] px-7 py-3 text-sm font-semibold text-[#1d1d1f] transition-colors duration-300 hover:border-[#0071e3] hover:text-[#0071e3]"
            >
              {isAr ? "اعرف التفاصيل" : "See the details"}
            </Link>
          </div>
          <p className="mt-5 text-xs font-medium text-[#6e6e73]">
            {isAr
              ? "تفعيل فوري بدون انتظار • بدون بطاقة ائتمان • عملاؤك على المنصة عملاؤك أنت"
              : "Instant activation • No credit card • Your clients stay yours"}
          </p>
        </div>
        <div className="relative mx-auto w-full max-w-md overflow-hidden rounded-3xl shadow-2xl shadow-[#1d1d1f]/10">
          <Image
            src={heroCoach}
            alt={isAr ? "مدرب شخصي في الجيم" : "Personal trainer in the gym"}
            className="h-auto w-full object-cover"
            priority
            sizes="(max-width: 768px) 90vw, 420px"
          />
        </div>
      </section>

      {/* Trust strip */}
      <section className="border-y border-[#e5e5ea] bg-[#f5f5f7]">
        <div className="mx-auto grid max-w-6xl grid-cols-2 gap-6 px-4 py-8 text-center md:grid-cols-4">
          {[
            {
              n: "868+",
              t: isAr ? "تمرين بالشرح والفيديو" : "Exercises with guides",
            },
            {
              n: "8,830+",
              t: isAr ? "أكلة بالسعرات والماكروز" : "Foods with full macros",
            },
            {
              n: "EVO",
              t: isAr ? "محرك ذكاء اصطناعي للخطط" : "AI plan engine",
            },
            {
              n: isAr ? "0%" : "0%",
              t: isAr ? "نسبة من دخلك — لنا رسم ثابت بس" : "Commission — fixed fee only",
            },
          ].map((s) => (
            <div key={s.t}>
              <p className="text-2xl font-semibold tracking-tight text-[#0071e3] md:text-3xl">
                {s.n}
              </p>
              <p className="mt-1 text-xs font-medium text-[#6e6e73] md:text-sm">{s.t}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ================= YOUR PRICES, YOUR MONEY ================= */}
      <section id="money" className="mx-auto max-w-6xl px-4 py-16 md:py-20">
        <div className="text-center">
          <h2 className="text-2xl font-semibold tracking-tight md:text-4xl">
            {isAr ? "سعر عميلك... قرارك وحدك" : "Your client's price — your call alone"}
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-base leading-relaxed text-[#6e6e73]">
            {isAr
              ? "عندنا قاعدة واضحة: أسعار عملائك ملكك. إنت بتحدد قيمة الاشتراك، وإنت بتقبض، والمنصة دورها إنها تسلّحك بأدوات تشتغل بيها — مش إنها تتدخل في سعرك."
              : "One clear rule: your clients' prices belong to you. You decide what to charge, you collect the payment, and the platform's job is to arm you with the tools — not to touch your pricing."}
          </p>
        </div>
        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {[
            {
              title: isAr ? "حدّد سعرك بحرية" : "Price freely",
              body: isAr
                ? "شهري أو بباقة — قيمة اشتراك كل عميل قرارك أنت، لكل عميل سعر يناسب شغله، ومن غير ما حد يتدخل."
                : "Monthly or per package — what each client pays is entirely your decision. Every client gets the price that fits your service, with zero interference.",
            },
            {
              title: isAr ? "اقبض بنفسك" : "Collect yourself",
              body: isAr
                ? "كاش، فودافون كاش، انستاباي، أو PayPal — العميل بيدفع لك مباشرة بره المنصة. فلوسك عندك من أول ثانية ومن غير أي وسيط."
                : "Cash, Vodafone Cash, InstaPay, or PayPal — clients pay you directly, outside the platform. Your money reaches you first, no middleman in between.",
            },
            {
              title: isAr ? "من غير أي نسبة" : "Zero commission",
              body: isAr
                ? "الموقع مش بياخد نسبة مئوية من دخلك خالص. بس رسم تفعيل شهري ثابت ومعلن لكل عميل — واضح من أول يوم، من غير مفاجآت."
                : "The site never takes a percentage of your income. Just a fixed, published monthly activation fee per client — transparent from day one, no surprises.",
            },
          ].map((c) => (
            <div
              key={c.title}
              className="rounded-3xl bg-[#f5f5f7] p-7 ring-1 ring-[#e5e5ea] transition-all duration-300 hover:shadow-lg hover:shadow-[#1d1d1f]/5"
            >
              <h3 className="text-lg font-bold tracking-tight">{c.title}</h3>
              <p className="mt-2.5 text-sm leading-relaxed text-[#6e6e73]">{c.body}</p>
            </div>
          ))}
        </div>
        <div className="mt-6 rounded-3xl border border-[#0071e3]/20 bg-[#0071e3]/5 p-6 text-center">
          <p className="text-sm font-medium leading-relaxed text-[#1d1d1f]">
            {isAr
              ? "تفعيل اشتراكات عملائك بيتم من محفظتك على المنصة: تشحن محفظتك (انستاباي / فودافون كاش / PayPal) وتفعّل اشتراك عميلك بضغطة واحدة."
              : "Client activations run from your on-platform wallet: top it up (InstaPay / Vodafone Cash / PayPal) and activate a client's subscription with one click."}
          </p>
        </div>
      </section>

      {/* ================= YOUR CLIENTS, YOUR AUTHORITY ================= */}
      <section className="bg-[#f5f5f7] py-16 md:py-20">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 md:grid-cols-2">
          <div className="order-2 md:order-1">
            <h2 className="text-2xl font-semibold tracking-tight md:text-4xl">
              {isAr ? "عملاؤك أنت... وصلاحياتك معاهم" : "Your clients — and your authority over them"}
            </h2>
            <p className="mt-4 text-base leading-relaxed text-[#6e6e73]">
              {isAr
                ? "المدرب في Musclehubeg شريك مش موظف. عملاؤك على المنصة عملاؤك أنت — مش عملاء الموقع — وصلاحيات إدارتهم كلها في إيدك: استبياناتهم، خططهم، تقدمهم، ودعمهم. والشات الذكي (EVO) بيشتغل في خدمة شغلك أنت مع عملائك، مش بيقدّم كوتشينج لعملاء من عند المنصة."
                : "A coach on Musclehubeg is a partner, not an employee. Your clients on the platform are YOUR clients — not the site's — and every management tool is in your hands: their questionnaires, plans, progress, and support. The AI chat (EVO) works for YOUR business with YOUR clients — the site never coaches them behind your back."}
            </p>
            <ul className="mt-6 space-y-3">
              {[
                isAr ? "إدارة كل عملائك من مكان واحد" : "Manage every client in one place",
                isAr ? "استبيان صحي كامل لكل عميل" : "Full health questionnaire per client",
                isAr ? "متابعة أوزان وصور تقدم" : "Weight logs and progress photos",
                isAr ? "شات دعم مباشر مع كل عميل" : "Direct chat with each client",
              ].map((li) => (
                <li key={li} className="flex items-start gap-2.5 text-sm font-medium">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#0071e3]" />
                  {li}
                </li>
              ))}
            </ul>
            <div className="mt-6 rounded-3xl bg-white p-6 ring-1 ring-[#e5e5ea]">
              <h3 className="text-sm font-bold">
                {isAr ? "خطط الذكاء الاصطناعي — رصيد واضح (أسبوعي + شهري)" : "AI plans — a clear balance (weekly + monthly)"}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-[#6e6e73]">
                {isAr
                  ? "توليد الخطط لعميلك بيسحب من رصيده حسب باقته: بريميوم 4 تغذية + 4 تمارين شهرياً · برو 8 + 8 · كوتشينج 4 + 4 — بحد أسبوعي 1 + 1 (برو 2 + 2) عشان الرصيد يتوزّع على الشهر. وهو نفس الرصيد اللي بيستخدمه عميلك من إيفو؛ الحد الأسبوعي بيتصفّر يوم الاثنين والإجمالي الشهري أول الشهر. والتعديل بيدك ورفع الخطط اليدوية وإعادة توليد أي وجبة أو صنف أو يوم تدريب أو تمرين بالذكاء الاصطناعي — كلها غير محدودة خالص."
                  : "Generating a client's plans draws from his own tier balance: Premium 4 nutrition + 4 workouts per month, Pro 8 + 8, Coaching 4 + 4 — with a weekly cap of 1 + 1 (Pro 2 + 2) so the balance spreads across the month. It is the same pool he spends through EVO; the weekly window resets Monday, the monthly total on the 1st. Hand-editing, manual uploads, and AI-regenerating any meal, item, workout day, or exercise are all unlimited."}
              </p>
            </div>
          </div>
          <div className="order-1 md:order-2">
            <div className="overflow-hidden rounded-3xl shadow-xl shadow-[#1d1d1f]/10">
              <Image
                src={imgCoaching}
                alt={isAr ? "كوتش بيتابع عميله في التمرين" : "Coach guiding a client through training"}
                className="h-auto w-full object-cover"
                sizes="(max-width: 768px) 90vw, 520px"
              />
            </div>
          </div>
        </div>
      </section>

      {/* ================= MEMBERSHIPS UPSELL ================= */}
      <section className="mx-auto max-w-6xl px-4 py-16 md:py-20">
        <div className="rounded-3xl bg-gradient-to-b from-[#1d1d1f] to-[#2a2a2e] p-8 text-white md:p-12">
          <h2 className="text-2xl font-semibold tracking-tight md:text-3xl">
            {isAr ? "عايز مميزات الموقع كاملة؟ اشترك في عضوية" : "Want every site feature? Grab a membership"}
          </h2>
          <p className="mt-3 max-w-3xl text-base leading-relaxed text-gray-300">
            {isAr
              ? "وزي أي حد على المنصة، تقدر تشترك في عضوية Premium أو Pro وتاخد كل مميزات الموقع لنفسك: شات EVO بلا حدود، مخطط الوجبات الذكي، حفظ وتصدير نتائج الحاسبات — كل ده جنب شغلك مع عملائك."
              : "Like anyone on the platform, you can subscribe to Premium or Pro and unlock the full site for yourself: unlimited EVO chat, the smart meal planner, and saved, exportable calculator results — all alongside your work with your own clients."}
          </p>
          <div className="mt-6">
            <Link
              href="/memberships"
              className="inline-block rounded-full bg-white px-7 py-3 text-sm font-semibold text-[#1d1d1f] transition-colors duration-300 hover:bg-gray-100"
            >
              {isAr ? "شوف العضويات" : "Explore memberships"}
            </Link>
          </div>
        </div>
      </section>

      {/* ================= HOW IT WORKS ================= */}
      <section id="how" className="mx-auto max-w-6xl px-4 pb-16 md:pb-20">
        <div className="text-center">
          <h2 className="text-2xl font-semibold tracking-tight md:text-4xl">
            {isAr ? "ابدأ شغلك في 4 خطوات" : "Start in 4 steps"}
          </h2>
        </div>
        <div className="mt-10 grid gap-5 md:grid-cols-4">
          {[
            {
              n: "1",
              t: isAr ? "سجّل مجانًا" : "Register free",
              b: isAr
                ? "دقيقة واحدة وتفعيل فوري — من غير انتظار مراجعة ولا أوراق."
                : "One minute, instant activation — no review queue, no paperwork.",
            },
            {
              n: "2",
              t: isAr ? "ضيف عملاءك" : "Add your clients",
              b: isAr
                ? "كل عميل له مساحته الخاصة: استبيانه، خططه، ومتابعة تقدمه."
                : "Each client gets a private space: questionnaire, plans, progress.",
            },
            {
              n: "3",
              t: isAr ? "جهّز الخطط" : "Build the plans",
              b: isAr
                ? "ولّد خططًا بالذكاء الاصطناعي أو ارفع خططك اليدوية — الاثنين متاحين."
                : "Generate plans with AI or upload your own — both work, always.",
            },
            {
              n: "4",
              t: isAr ? "حدد سعرك وفعّل" : "Price it & activate",
              b: isAr
                ? "انت بتقبض من عميلك، وتفعّل اشتراكه من محفظتك على المنصة."
                : "You get paid by your client, then activate him from your wallet.",
            },
          ].map((s) => (
            <div key={s.n} className="rounded-3xl border border-[#e5e5ea] p-6">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#0071e3] text-sm font-bold text-white">
                {s.n}
              </span>
              <h3 className="mt-3.5 text-base font-bold tracking-tight">{s.t}</h3>
              <p className="mt-2 text-sm leading-relaxed text-[#6e6e73]">{s.b}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ================= FEATURES WITH IMAGES ================= */}
      <section className="mx-auto max-w-6xl space-y-10 px-4 pb-16 md:pb-20">
        {[
          {
            img: imgMeal,
            alt: isAr ? "خطة تغذية صحية" : "Healthy nutrition plan",
            t: isAr ? "خطط تغذية بالذكاء الاصطناعي" : "AI nutrition plans",
            b: isAr
              ? "محرك EVO بيولّد لكل عميل خطة تغذية مناسبة لهدفه وحاسباته بالسعرات والماكروز — تعدّل كل وجبة بيدك، أو تعيد توليد أي وجبة أو صنف غذائي بالذكاء الاصطناعي بضغطة زر لحد ما تظبطها على ذوق عميلك."
              : "The EVO engine builds each client a nutrition plan around his goal, with full calorie and macro targets — hand-tune every meal, or AI-regenerate any meal or food item with one tap until it fits your client perfectly.",
          },
          {
            img: imgDumbbell,
            alt: isAr ? "دمبل في الجيم" : "Dumbbells in the gym",
            t: isAr ? "برامج تمارين من مكتبة 868+ تمرين" : "Workout programs from an 868+ exercise library",
            b: isAr
              ? "برامج تمارين متكيفة بمستويات مختلفة، ومكتبة تمارين مشروحة بالفيديو اللي تقدر تبني منها أي جلسة — وتقدر كمان تعيد توليد أي يوم تدريبي كامل أو تستبدل أي تمرين بالذكاء الاصطناعي."
              : "Adaptive workout programs across levels, plus a video-explained exercise library you can build any session from — and you can AI-regenerate any full training day or swap any exercise.",
          },
        ].map((f) => (
          <div
            key={f.t}
            className="grid items-center gap-8 rounded-3xl bg-[#f5f5f7] p-6 md:grid-cols-2 md:p-8"
          >
            <div className="overflow-hidden rounded-2xl">
              <Image
                src={f.img}
                alt={f.alt}
                className="h-auto w-full object-cover"
                sizes="(max-width: 768px) 90vw, 480px"
              />
            </div>
            <div>
              <h3 className="text-xl font-bold tracking-tight md:text-2xl">{f.t}</h3>
              <p className="mt-3 text-base leading-relaxed text-[#6e6e73]">{f.b}</p>
            </div>
          </div>
        ))}
      </section>

      {/* ================= FAQ ================= */}
      <section id="faq" className="mx-auto max-w-4xl px-4 pb-16 md:pb-20">
        <div className="text-center">
          <h2 className="text-2xl font-semibold tracking-tight md:text-4xl">
            {isAr ? "أسئلة الكوتشات" : "Coach FAQs"}
          </h2>
        </div>
        <div className="mt-10 space-y-4">
          {(isAr ? COACH_FAQ_AR : COACH_FAQ_EN).map((f) => (
            <div key={f.q} className="rounded-3xl bg-[#f5f5f7] p-6 ring-1 ring-[#e5e5ea]">
              <h3 className="text-base font-bold tracking-tight">{f.q}</h3>
              <p className="mt-2 text-sm leading-relaxed text-[#6e6e73]">{f.a}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ================= SHARE (TEXT-ONLY BUTTONS) ================= */}
      <section className="border-t border-[#e5e5ea] bg-[#f5f5f7] py-14">
        <div className="mx-auto max-w-3xl px-4 text-center">
          <h2 className="text-xl font-semibold tracking-tight md:text-2xl">
            {isAr ? "تعرف كوتش يستهل يشتغل معانا؟" : "Know a coach who should be here?"}
          </h2>
          <p className="mt-2 text-sm text-[#6e6e73]">
            {isAr
              ? "ابعتله الصفحة دي — شغل كامل بأسعاره وفلوسه في إيده."
              : "Send him this page — a full business at his own prices, in his own hands."}
          </p>
          <div className="mt-6">
            <CoachShareButtons
              message={shareMsg}
              labels={{
                facebook: isAr ? "فيسبوك" : "Facebook",
                x: "X",
                telegram: "Telegram",
                copy: isAr ? "نسخ الرابط" : "Copy link",
                copied: isAr ? "تم النسخ" : "Copied",
              }}
            />
          </div>
        </div>
      </section>

      {/* ================= FINAL CTA ================= */}
      <section className="mx-auto max-w-4xl px-4 py-16 text-center md:py-20">
        <h2 className="text-2xl font-semibold tracking-tight md:text-4xl">
          {isAr ? "جاهز تبني شغلك على منصة تليق بيه؟" : "Ready to build your business on a platform that fits it?"}
        </h2>
        <p className="mx-auto mt-3 max-w-xl text-base text-[#6e6e73]">
          {isAr
            ? "سجّل دلوقتي — حسابك يتفعّل فورًا، وتبدأ تضيف عملائك وتحدد أسعارك من أول يوم."
            : "Sign up now — your account activates instantly, and you can add clients and set your prices from day one."}
        </p>
        <Link
          href={REGISTER_HREF}
          className="mt-7 inline-block rounded-full bg-[#0071e3] px-9 py-3.5 text-sm font-semibold text-white shadow-lg shadow-[#0071e3]/25 transition-all duration-300 hover:bg-[#0077ed]"
        >
          {isAr ? "أنشئ حسابك كمدرب — مجانًا" : "Create your coach account — free"}
        </Link>
      </section>
    </div>
  );
}
