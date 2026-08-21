import type { Metadata } from "next";
import { StaticPageView } from "@/components/views/StaticPageView";

/**
 * FAQ page — server component so we can attach metadata + FAQPage JSON-LD
 * for Google rich results.
 */

const FAQS_EN = [
  { q: "What is MuscleHub?", a: "A human optimization platform combining the EVO AI engine with a massive exercise and food database for personalized plans and smart tracking." },
  { q: "Who is EVO?", a: "EVO is the AI performance engine. It analyzes your data, predicts outcomes, recommends improvements, and updates plans automatically. Available to all members with tier-based limits." },
  { q: "Is there a human coach?", a: "EVO is an AI coach. If you want human supervision, there's a separate human coaching section you can book via the coaching page." },
  { q: "How many daily swaps?", a: "Free: 0. Premium: 3 meal + 3 exercise swaps/week. Pro: 6/week. Coaching: unlimited. Resets weekly." },
  { q: "Payment methods?", a: "InstaPay and Vodafone Cash. Upload a payment receipt and the team reviews it within 24 hours." },
  { q: "Is my data secure?", a: "Yes. All data is encrypted on Supabase with RLS policies. Only you and the team can see it." },
  { q: "Arabic support?", a: "Yes, the platform is fully bilingual (Arabic/English) with RTL support." },
  { q: "Mobile friendly?", a: "Yes, fully responsive and installable as a PWA app on mobile." },
  { q: "When will I see results?", a: "With commitment, results start in 2-4 weeks. Noticeable results in 8-12 weeks." },
];

export const metadata: Metadata = {
  title: "FAQ — MuscleHub | Frequently Asked Questions",
  description:
    "Answers to common questions about MuscleHub: how EVO AI works, membership tiers, payment methods, data security, Arabic support, and results timeline.",
  alternates: {
    canonical: "https://musclehubeg.vercel.app/faq",
  },
  openGraph: {
    title: "FAQ — MuscleHub",
    description:
      "Answers to common questions about MuscleHub: EVO AI, memberships, payments, security, and more.",
    url: "https://musclehubeg.vercel.app/faq",
    type: "website",
  },
};

export default function Page() {
  // FAQPage JSON-LD — enables Google rich results (accordion FAQ in SERP)
  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQS_EN.map((faq) => ({
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
