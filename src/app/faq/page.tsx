import type { Metadata } from "next";
import { SiteHeader } from "@/components/SiteHeader";
import { StaticPageView } from "@/components/views/StaticPageView";

/**
 * FAQ page — server component so we can attach metadata + FAQPage JSON-LD
 * for Google rich results.
 */

const FAQS_EN = [
  { q: "What is MuscleHubEG?", a: "A human optimization platform combining the EVO AI engine with a massive exercise and food database for personalized plans and smart tracking." },
  { q: "Who is EVO?", a: "EVO is the AI performance engine. It analyzes your data, predicts outcomes, recommends improvements, and updates plans automatically. Available to all members with tier-based limits." },
  { q: "Is there a human coach?", a: "EVO is an AI coach. If you want human supervision, there's a separate human coaching section you can book via the coaching page." },
  { q: "How many daily swaps?", a: "Free: 0. Premium: 3 meal + 3 exercise swaps/week. Pro: 6/week. Coaching: unlimited. Resets weekly." },
  { q: "Payment methods?", a: "PayPal (primary — instant and secure), InstaPay, and Vodafone Cash. PayPal processes automatically; manual methods require uploading a receipt which the team reviews within 24 hours." },
  { q: "Is my data secure?", a: "Yes. All data is encrypted on Supabase with RLS policies. Only you and the team can see it." },
  { q: "Arabic support?", a: "Yes, the platform is fully bilingual (Arabic/English) with RTL support." },
  { q: "Mobile friendly?", a: "Yes, fully responsive and installable as a PWA app on mobile." },
  { q: "When will I see results?", a: "With commitment, results start in 2-4 weeks. Noticeable results in 8-12 weeks." },
];

const FAQS_AR = [
  { q: "ما هي منصة MuscleHubEG؟", a: "منصة متكاملة لللياقة والتغذية تجمع بين محرك الذكاء الاصطناعي EVO وقاعدة بيانات ضخمة للتمارين والأطعمة لتقديم خطط مخصصة وتتبع ذكي لكل مستخدم." },
  { q: "ما هو EVO؟", a: "EVO هو محرك الأداء الذكي في المنصة. يقوم بتحليل بياناتك، والتنبؤ بالنتائج، واقتراح التحسينات، وتحديث خططك بشكل تلقائي. متاح لجميع الأعضاء وفق حدود العضوية." },
  { q: "هل يوجد مدرب بشري؟", a: "EVO هو مدرب ذكاء اصطناعي. إذا كنت ترغب في متابعة بشرية مباشرة، يتوفر قسم منفصل للكوتشينج البشري يمكنك حجزه عبر صفحة الكوتشينج." },
  { q: "كم عدد عمليات الاستبدال اليومية؟", a: "الباقة المجانية: لا يوجد. Premium: 3 استبدال وجبات + 3 استبدال تمارين أسبوعياً. Pro: 6 أسبوعياً. Coaching: غير محدود. يتم التجديد كل أسبوع." },
  { q: "ما هي طرق الدفع المتاحة؟", a: "PayPal (الطريقة الرئيسية — فورية وآمنة)، InstaPay، و Vodafone Cash. PayPal يعالج الدفع تلقائياً؛ أما الطرق اليدوية فتتطلب رفع إيصال يقوم الفريق بمراجعته خلال 24 ساعة." },
  { q: "هل بياناتي آمنة؟", a: "نعم. جميع البيانات مشفرة على Supabase باستخدام سياسات RLS (أمان على مستوى الصفوف). لا يمكن لأحد رؤية بياناتك سواك وفريق التدريب." },
  { q: "هل تدعم المنصة اللغة العربية؟", a: "نعم، المنصة ثنائية اللغة بالكامل (عربي/إنجليزي) مع دعم كامل للكتابة من اليمين إلى اليسار (RTL)." },
  { q: "هل المنصة متوافقة مع الجوال؟", a: "نعم، الموقع متجاوب بالكامل ويمكن تثبيته كتطبيق PWA على الجوال." },
  { q: "متى سأرى النتائج؟", a: "مع الالتزام، تبدأ النتائج الأولية خلال 2-4 أسابيع. النتائج الملموسة تظهر خلال 8-12 أسبوعاً." },
];

export const metadata: Metadata = {
  title: "الأسئلة الشائعة — MuscleHubEG | دليل شامل للمنصة",
  description:
    "إجابات على أكثر الأسئلة شيوعاً حول MuscleHubEG: كيف يعمل محرك EVO الذكي، باقات العضوية، طرق الدفع، أمان البيانات، دعم اللغة العربية، والجدول الزمني للنتائج.",
  alternates: {
    canonical: "https://musclehubeg.vercel.app/faq",
    languages: {
      "en": "https://musclehubeg.vercel.app/faq",
      "ar": "https://musclehubeg.vercel.app/faq",
    },
  },
  openGraph: {
    title: "الأسئلة الشائعة — MuscleHubEG",
    description:
      "إجابات شاملة حول منصة MuscleHubEG: محرك EVO الذكي، العضويات، الدفع، الأمان، والمزيد.",
    url: "https://musclehubeg.vercel.app/faq",
    type: "website",
    locale: "ar_EG",
  },
};

export default function Page() {
  // FAQPage JSON-LD — both EN + AR versions for SEO
  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [...FAQS_EN, ...FAQS_AR].map((faq) => ({
      "@type": "Question",
      name: faq.q,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.a,
      },
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
      <StaticPageView page="faq" />
    </>
  );
}
