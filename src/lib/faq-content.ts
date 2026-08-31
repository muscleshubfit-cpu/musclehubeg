/**
 * FAQ content — single source of truth for BOTH language versions.
 *
 * FULL-SITE AUDIT + AR EXPANSION (2026-08-30): previously these arrays
 * lived inline in src/app/faq/page.tsx and fed that page's FAQPage
 * JSON-LD. With the new /ar/faq mirror (same commit) the AR page needs
 * the same data for its Arabic-first schema — so the arrays moved here
 * and both pages import them.
 */

export const FAQS_EN = [
  { q: "What is Musclehubeg?", a: "A human optimization platform combining the EVO AI engine with a massive exercise and food database for personalized plans and smart tracking." },
  { q: "Who is EVO?", a: "EVO is the AI performance engine. It reads your data and goal, builds personalized nutrition and workout plans, and suggests smart swaps. Available to all members with tier-based limits." },
  { q: "Is there a human coach?", a: "EVO is an AI coach. If you want human supervision, there's a separate human coaching section you can book via the coaching page." },
  { q: "How many weekly swaps?", a: "Free: 0. Premium: 3 swaps/week. Pro: 6/week. Coaching: 3/week. Resets every Monday." },
  { q: "Payment methods?", a: "PayPal (primary — instant and secure), InstaPay, and Vodafone Cash. PayPal processes automatically; manual methods require uploading a receipt which the team reviews within 24 hours." },
  { q: "Is my data secure?", a: "Yes. All data is encrypted on Supabase with RLS policies. Only you and the team can see it." },
  { q: "Arabic support?", a: "Yes, the platform is fully bilingual (Arabic/English) with RTL support." },
  { q: "Mobile friendly?", a: "Yes, fully responsive and installable as a PWA app on mobile." },
  { q: "When will I see results?", a: "With commitment, results start in 2-4 weeks. Noticeable results in 8-12 weeks." },
];

export const FAQS_AR = [
  { q: "ما هي منصة Musclehubeg؟", a: "منصة متكاملة لللياقة والتغذية تجمع بين محرك الذكاء الاصطناعي EVO وقاعدة بيانات ضخمة للتمارين والأطعمة لتقديم خطط مخصصة وتتبع ذكي لكل مستخدم." },
  { q: "ما هو EVO؟", a: "EVO هو محرك الأداء الذكي في المنصة. يقرأ بياناتك وهدفك، ويبني لك خطط تغذية وتمارين مخصصة، ويقترح تبديلات ذكية. متاح لجميع الأعضاء وفق حدود العضوية." },
  { q: "هل يوجد مدرب بشري؟", a: "EVO هو مدرب ذكاء اصطناعي. إذا كنت ترغب في متابعة بشرية مباشرة، يتوفر قسم منفصل للكوتشينج البشري يمكنك حجزه عبر صفحة الكوتشينج." },
  { q: "كم عدد الاستبدالات أسبوعياً؟", a: "الباقة المجانية: لا يوجد. Premium: 3 استبدالات أسبوعياً. Pro: 6 أسبوعياً. Coaching: 3 أسبوعياً. يتم التجديد كل اثنين." },
  { q: "ما هي طرق الدفع المتاحة؟", a: "PayPal (الطريقة الرئيسية — فورية وآمنة)، InstaPay، و Vodafone Cash. PayPal يعالج الدفع تلقائياً؛ أما الطرق اليدوية فتتطلب رفع إيصال يقوم الفريق بمراجعته خلال 24 ساعة." },
  { q: "هل بياناتي آمنة؟", a: "نعم. جميع البيانات مشفرة على Supabase باستخدام سياسات RLS (أمان على مستوى الصفوف). لا يمكن لأحد رؤية بياناتك سواك وفريق التدريب." },
  { q: "هل تدعم المنصة اللغة العربية؟", a: "نعم، المنصة ثنائية اللغة بالكامل (عربي/إنجليزي) مع دعم كامل للكتابة من اليمين إلى اليسار (RTL)." },
  { q: "هل المنصة متوافقة مع الجوال؟", a: "نعم، الموقع متجاوب بالكامل ويمكن تثبيته كتطبيق PWA على الجوال." },
  { q: "متى سأرى النتائج؟", a: "مع الالتزام، تبدأ النتائج الأولية خلال 2-4 أسابيع. النتائج الملموسة تظهر خلال 8-12 أسبوعاً." },
];
