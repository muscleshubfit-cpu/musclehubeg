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
    a: "توليد الخطط لعميلك بيسحب من رصيده حسب باقته: بريميوم 4 تغذية + 4 تمارين شهرياً، برو 8 + 8، وكوتشينج 4 + 4 — بحد أسبوعي 1 + 1 (برو 2 + 2) عشان الرصيد يتوزّع على الشهر. وهو نفس الرصيد اللي بيستخدمه عميلك بنفسه من إيفو؛ الحد الأسبوعي بيتصفّر يوم الاثنين والإجمالي الشهري بيتصفّر أول الشهر. أما التعديل بيدك ورفع الخطط اليدوية وإعادة توليد أي وجبة أو صنف غذائي أو يوم تدريب أو تمرين بالذكاء الاصطناعي — فكلها غير محدودة تمامًا.",
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
    a: "Generating a client's plans draws from his own balance by tier: Premium 4 nutrition + 4 workouts per month, Pro 8 + 8, Coaching 4 + 4 — with a weekly cap of 1 + 1 (Pro 2 + 2) so the balance spreads across the month. It is the same pool your client spends through EVO; the weekly window resets Monday, the monthly total on the 1st. Hand-editing, manual uploads, and AI-regenerating any meal, food item, workout day, or exercise are all unlimited.",
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
