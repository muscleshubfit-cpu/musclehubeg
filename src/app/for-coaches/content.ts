/**
 * FOR-COACHES shared content — FAQ pairs consumed by BOTH the client
 * landing page (src/app/for-coaches/page.tsx) and the server layout's
 * JSON-LD FAQPage schema (src/app/for-coaches/layout.tsx).
 * One source of truth so the visible copy and the structured data
 * can never drift apart.
 *
 * NOTE (seo.ts law): FAQPage rich results were retired by Google in
 * May 2026 — this schema is kept for non-Google semantic value, per
 * the existing site convention (getFAQSchema is still exported).
 */

export const COACH_FAQ_AR: Array<{ q: string; a: string }> = [
  {
    q: "التسجيل بفلوس؟",
    a: "لا، التسجيل كمدرب على المنصة مجاني. بتدفع رسم تفعيل شهري ثابت لكل عميل وقت تفعيل اشتراكه من محفظتك — ومفيش أي نسبة من دخلك.",
  },
  {
    q: "مين اللي بيحدد أسعار عملائي؟",
    a: "أنت وحدك. سعر كل عميل قرارك بالكامل، وبتحصّله بنفسك بره المنصة بالوسيلة اللي تريحك — كاش أو محفظة إلكترونية أو تحويل بنكي.",
  },
  {
    q: "إزاي بحصّل فلوسي من العملاء؟",
    a: "العميل بيدفع لك مباشرة — المنصة مش وسيط دفع بينك وبين عميلك. انت بتحدد السعر، العميل بيحوله لك، وبعدها تفعّل اشتراكه من محفظتك على المنصة.",
  },
  {
    q: "إيه اللي بيدفعه المدرب للمنصة؟",
    a: "رسم تفعيل شهري ثابت ومعلن لكل عميل مفعّل، بيتخصم من محفظتك على المنصة. تشحن المحفظة بـ انستاباي أو فودافون كاش أو PayPal.",
  },
  {
    q: "إيه حدود الذكاء الاصطناعي؟",
    a: "4 خطط تغذية + 4 خطط تمارين لكل عميل كل شهر. والتعديل على الخطط ورفع خطط يدوية غير محدود تمامًا — العداد بيتصفّر أول الشهر.",
  },
  {
    q: "هل عملائي هيبقوا تابعين للموقع؟",
    a: "لأ. عملاؤك مسجلين باسمك أنت وصلاحيات إدارتهم كلها لك — والموقع مش بيقدملهم كوتشينج من عنده ولا بيستخدم بياناتهم في شغله.",
  },
  {
    q: "أقدر أشترك في مميزات الموقع كمدرب؟",
    a: "أكيد. زي أي عضو، تقدر تشترك في عضوية Premium أو Pro وتاخد مميزات المنصة كاملة: شات EVO بلا حدود، مخطط الوجبات، وحفظ وتصدير نتائجك.",
  },
];

export const COACH_FAQ_EN: Array<{ q: string; a: string }> = [
  {
    q: "Does registration cost anything?",
    a: "No — registering as a coach is free. You pay a fixed monthly activation fee per client when you activate his subscription from your wallet, and never a percentage of your income.",
  },
  {
    q: "Who sets my clients' prices?",
    a: "You alone. Every client's price is entirely your call, and you collect it yourself outside the platform however you prefer — cash, mobile wallet, or bank transfer.",
  },
  {
    q: "How do I get paid?",
    a: "Clients pay you directly — the platform is not a payment middleman between you and them. You set the price, the client pays you, then you activate his subscription from your on-platform wallet.",
  },
  {
    q: "What does the coach pay the platform?",
    a: "A fixed, published monthly activation fee per activated client, debited from your on-platform wallet. You top the wallet up via InstaPay, Vodafone Cash, or PayPal.",
  },
  {
    q: "What are the AI limits?",
    a: "4 nutrition plans + 4 workout plans per client per month. Editing plans and uploading manual plans is completely unlimited — the counter resets on the 1st.",
  },
  {
    q: "Will my clients belong to the site?",
    a: "No. Your clients are registered under your name and every management permission is yours — the site never coaches them itself and never uses their data for its own business.",
  },
  {
    q: "Can I subscribe to the site's features as a coach?",
    a: "Absolutely. Like any member, you can subscribe to Premium or Pro and unlock everything: unlimited EVO chat, the meal planner, and exportable saved results.",
  },
];
