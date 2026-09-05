"use client";

import { useI18n } from "@/lib/i18n";
import { SiteHeader } from "@/components/SiteHeader";
import { useNav, type View } from "@/hooks/use-nav";

export function StaticPageView({ page }: { page: "about" | "privacy" | "terms" | "faq" }) {
  const { t, lang } = useI18n();
  const { navigate } = useNav();
  const isAr = lang === "ar";

  const content = getContent(page, isAr);

  return (
    <div className="flex min-h-screen flex-col bg-white text-[#1d1d1f]">
      <SiteHeader variant="landing" />

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-20 sm:px-6 md:py-28">
        <h1 className="text-4xl font-semibold tracking-tight md:text-6xl">{content.title}</h1>
        <p className="mt-3 text-sm font-normal text-[#6e6e73]">{content.updated}</p>

        <div className="mt-16 space-y-12">
          {content.sections.map((section, i) => (
            <section key={i}>
              <h2 className="text-xl font-semibold tracking-tight md:text-2xl">{section.heading}</h2>
              <div className="mt-4 space-y-4 text-base font-normal leading-relaxed text-[#1d1d1f] md:text-lg">
                {section.paragraphs.map((p, j) => (
                  <p key={j}>{p}</p>
                ))}
                {section.list && (
                  <ul className="mt-4 space-y-2 ps-5">
                    {section.list.map((item, j) => (
                      <li key={j} className="list-disc">{item}</li>
                    ))}
                  </ul>
                )}
              </div>
            </section>
          ))}
        </div>

        {/* FAQ specific */}
        {page === "faq" && (
          <div className="mt-20 rounded-2xl bg-[#f5f5f7] p-10 text-center">
            <p className="text-base font-normal text-[#6e6e73]">
              {isAr ? "لديك سؤال آخر؟" : "Have another question?"}
            </p>
            <button
              onClick={() => navigate("contact")}
              className="mt-4 text-base font-normal text-[#0071e3] transition-opacity hover:opacity-70"
            >
              {isAr ? "تواصل معنا ›" : "Contact us ›"}
            </button>
          </div>
        )}
      </main>

      <footer className="mt-auto border-t border-[#d2d2d7] py-6 text-center text-xs font-normal text-[#6e6e73]">
        © {new Date().getFullYear()} Alkemos. {isAr ? "كل الحقوق محفوظة." : "All rights reserved."}
      </footer>
 </div>
 );
}

function getContent(page: string, isAr: boolean) {
 const date = new Date().toLocaleDateString(isAr ? "ar-EG" : "en-US", { year: "numeric", month: "long", day: "numeric" });

 if (page === "about") {
 return isAr ? {
 title: "عن Alkemos",
 updated: `آخر تحديث: ${date}`,
 sections: [
 { heading: "من نحن", paragraphs: ["Alkemos هي منصة تحسين أداء بشري بالذكاء الاصطناعي. نجمع بين محرك الذكاء الاصطناعي EVO وقاعدة بيانات ضخمة لتمارين (٨٦٨+) وأكلات (٨٬٨٣٠+) لتقديم تجربة لياقة وتغذية لا مثيل لها.", "تأسست Alkemos برؤية بسيطة: المستقبل ليس إنسان ضد AI، بل إنسان + AI. نحن نؤمن بأن أفضل النتائج تأتي من الجمع بين حكمة الإنسان وذكاء الآلة."] },
 { heading: "رؤيتنا", paragraphs: ["أن نكون المنصة الأولى للكوتشينج الرياضي والتغذوي في العالم العربي، ونقدم تجربة عالمية المستوى لكل عضو."] },
 { heading: "EVO — محرك الأداء الذكي", paragraphs: ["EVO ليس شات بوت عادي. بل محرك ذكاء اصطناعي يقرأ بياناتك وهدفك، يبني لك خطط تغذية وتمارين مخصصة، ويقترح تبديلات ذكية للوجبات والتمارين. متاح لجميع الأعضاء مع حدود حسب العضوية."] },
 { heading: "العضويات", paragraphs: ["Alkemos تقدم 3 باقات: مجاني (وصول محدود)، بريميوم $14.99/شهر أو $119/سنة (EVO غير محدود + خطط شهرية)، برو $29.99/شهر أو $239/سنة (حدود مضاعفة + بدون إعلانات). وكوتشينج بشري منفصل بـ $39.99/شهر أو $359/سنة للمهتمين بمتابعة فردية."] },
 ],
 } : {
 title: "About Alkemos",
 updated: `Last updated: ${date}`,
 sections: [
 { heading: "Who We Are", paragraphs: ["Alkemos is an AI-powered human optimization platform. We combine the EVO AI engine with a massive database of exercises (868+) and foods (8,830+) to deliver an unmatched fitness and nutrition experience.", "Alkemos was founded on a simple vision: the future isn't Human vs AI, it's Human + AI. We believe the best results come from combining human wisdom with machine intelligence."] },
 { heading: "Our Vision", paragraphs: ["To be the leading fitness and nutrition platform in the Arab world, delivering a world-class experience to every member."] },
 { heading: "EVO — The AI Performance Engine", paragraphs: ["EVO is not a regular chatbot. It's an AI engine that reads your data and goal, builds personalized nutrition and workout plans, and suggests smart meal and exercise swaps. Available to all members with tier-based limits."] },
 { heading: "Memberships", paragraphs: ["Alkemos offers 3 tiers: Free (limited access), Premium $14.99/mo or $119/yr (unlimited EVO + monthly plans), Pro $29.99/mo or $239/yr (doubled limits + no ads). Human coaching is available separately at $39.99/mo or $359/yr for those who want 1-on-1 supervision."] },
 ],
 };
 }

 if (page === "privacy") {
 return isAr ? {
 title: "سياسة الخصوصية",
 updated: `آخر تحديث: ${date}`,
 sections: [
 { heading: "جمع البيانات", paragraphs: ["نجمع البيانات التالية عند تسجيلك: الاسم، البريد الإلكتروني، رقم الهاتف، والبيانات الصحية (الوزن، الطول، الهدف، الحساسية الغذائية)."], list: ["البيانات تُستخدم لتوليد خطط مخصصة لك", "لا نشارك بياناتك مع أي طرف ثالث", "بياناتك محفوظة بشكل مشفر على Supabase"] },
 { heading: "استخدام البيانات", paragraphs: ["بياناتك تُستخدم حصراً لـ:"], list: ["توليد خطط تغذية وتمارين مخصصة", "تتبع تقدمك وعرضه لك وللكوتش", "الرد على أسئلتك عبر المساعد الذكي", "إرسال إشعارات تتعلق بحسابك"] },
 { heading: "أمان البيانات", paragraphs: ["نستخدم Supabase الذي يوفر تشفير على مستوى قاعدة البيانات. كما نستخدم سياسات RLS (Row Level Security) لضمان أن بياناتك لا يراها أحد سواك والكوتش."] },
 { heading: "محتوى المدربين", paragraphs: ["الصور والمحتوى الذي ينشره المدرب على صفحته العامة (بما فيه صور نتائج العملاء) يقع تحت مسؤوليته هو، ويلتزم بنشره بموافقة أصحابه. للاستفسار أو حذف أي محتوى يتعلق بك، تواصل مع مدربك مباشرة أو معنا عبر صفحة الاتصال."] },
 { heading: "حقوقك", paragraphs: ["لديك الحق في:"], list: ["طلب نسخة من بياناتك", "طلب حذف حسابك وبياناتك", "تعديل بياناتك في أي وقت من لوحة التحكم"] },
 { heading: "ملفات تعريف الارتباط (Cookies)", paragraphs: ["نستخدم cookies أساسية لتشغيل الموقع (جلسة المصادقة). لا نستخدم cookies تتبع إعلانية."] },
 { heading: "التواصل", paragraphs: ["لأي استفسار حول الخصوصية، تواصل معنا عبر صفحة الاتصال."] },
 ],
 } : {
 title: "Privacy Policy",
 updated: `Last updated: ${date}`,
 sections: [
 { heading: "Data Collection", paragraphs: ["We collect the following when you sign up: name, email, phone number, and health data (weight, height, goal, dietary allergies)."], list: ["Data is used to generate personalized plans", "We never share your data with third parties", "Data is encrypted on Supabase"] },
 { heading: "Data Usage", paragraphs: ["Your data is used exclusively for:"], list: ["Generating personalized nutrition and workout plans", "Tracking your progress (visible only to you and your coach)", "Answering your questions via the AI assistant", "Sending account-related notifications"] },
 { heading: "Data Security", paragraphs: ["We use Supabase which provides database-level encryption. We also use RLS (Row Level Security) policies to ensure your data is only visible to you and your coach."] },
 { heading: "Coach-Authored Content", paragraphs: ["Photos and content a coach publishes on his public page (including client results photos) are his own responsibility, published with the consent of their owners. To inquire about or remove any content concerning you, contact your coach directly or reach us via the Contact page."] },
 { heading: "Your Rights", paragraphs: ["You have the right to:"], list: ["Request a copy of your data", "Request deletion of your account and data", "Edit your data anytime from the dashboard"] },
 { heading: "Cookies", paragraphs: ["We use essential cookies for site operation (auth session). We do not use advertising tracking cookies."] },
 { heading: "Contact", paragraphs: ["For any privacy inquiries, contact us via the Contact page."] },
 ],
 };
 }

 if (page === "terms") {
 return isAr ? {
 title: "الشروط والأحكام",
 updated: `آخر تحديث: ${date}`,
 sections: [
 { heading: "قبول الشروط", paragraphs: ["باستخدامك لموقع Alkemos، فإنك توافق على هذه الشروط والأحكام. إذا لم توافق، يرجى عدم استخدام الموقع."] },
 { heading: "الاشتراك", paragraphs: ["الاشتراك في Alkemos يمنحك وصول لخطط مخصصة، مساعد ذكي، وتتبع تقدم. الأسعار موضحة في صفحة الأسعار.", "يمكنك عدم التجديد في أي وقت. لا توجد عقود ملزمة."] },
 { heading: "الخطط المخصصة", paragraphs: ["الخطط الغذائية والتدريبية مولّدة بالذكاء الاصطناعي ومراجعة من الكوتش. النتائج تختلف من شخص لآخر حسب الالتزام والجينات.", "Alkemos لا يقدم نصائح طبية. استشر طبيبك قبل بدء أي برنامج غذائي أو رياضي."] },
 { heading: "التبديلات", paragraphs: ["حد التبديلات الأسبوعي يعتمد على باقتك:", "مجاني: لا يوجد. Premium: 3 تبديلات/أسبوع. Pro: 6 تبديلات/أسبوع. Coaching: 3 تبديلات/أسبوع.", "التبديلات تتجدد كل اثنين."] },
 { heading: "المسؤولية", paragraphs: ["منصة Alkemos غير مسؤولة عن أي إصابة أو ضرر صحي ناتج عن اتباع البرنامج دون استشارة طبية."] },
 { heading: "مسؤولية المدربين وعملائهم", paragraphs: ["Alkemos منصة تقنية تسهّل تواصل المدربين مع عملائهم وتدير أدوات العمل فقط — والموقع ليس طرفًا في العلاقة بين المدرب وعميله.", "كل مدرب هو المسؤول الوحيد والمكتمل عن نصائحه وخططه وتوصياته وأي محتوى ينشره على صفحته العامة (بما في ذلك صوره وصور عملائه وروابطه)، وعن تحصيل مبالغ عملائه وتعاملاته معهم خارج المنصة.", "دعم العملاء مسؤولية المدرب نفسه — فريق الموقع يدعم المدربين في شؤون المنصة فقط (المحفظة، التفعيل، الإعلانات، الصفحات العامة). الموقع غير مسؤول عن أي نزاع أو مطالبة أو ضرر ينشأ بين المدرب وعميله، والمسؤولية بالكامل على كل مدرب تجاه عملائه."] },
 { heading: "الملكية الفكرية", paragraphs: ["جميع المحتويات (الخطط، المقالات، التصميم) مملوكة لـ Alkemos ولا يجوز نسخها أو إعادة استخدامها."] },
 { heading: "تعديل الشروط", paragraphs: ["نحتفظ بحق تعديل هذه الشروط في أي وقت. سيتم إشعار المستخدمين بالتغييرات الجوهرية."] },
 ],
 } : {
 title: "Terms & Conditions",
 updated: `Last updated: ${date}`,
 sections: [
 { heading: "Acceptance", paragraphs: ["By using Alkemos, you agree to these terms. If you disagree, please do not use the site."] },
 { heading: "Subscription", paragraphs: ["Subscribing to Alkemos grants access to personalized plans, AI assistant, and progress tracking. Prices are listed on the pricing page.", "You can choose not to renew at any time. No binding contracts."] },
 { heading: "Personalized Plans", paragraphs: ["Nutrition and workout plans are AI-generated and reviewed by the coach. Results vary by individual based on adherence and genetics.", "Alkemos does not provide medical advice. Consult your doctor before starting any nutrition or exercise program."] },
 { heading: "Swaps", paragraphs: ["Weekly swap limits depend on your plan:", "Free: none. Premium: 3 swaps/week. Pro: 6 swaps/week. Coaching: 3 swaps/week.", "Swaps reset every Monday."] },
 { heading: "Liability", paragraphs: ["Alkemos is not liable for any injury or health damage resulting from following the program without medical consultation."] },
 { heading: "Coach & Client Responsibility", paragraphs: ["Alkemos is a technology platform that facilitates the relationship between coaches and their clients and manages the work tools — the site is not a party to the coach–client relationship.", "Each coach is the sole and full party responsible for his advice, plans, recommendations and any content he publishes on his public page (including his photos, his clients' photos and his links), and for collecting his clients' payments and his dealings with them outside the platform.", "Client support is the coach's own responsibility — the site team supports coaches on platform matters only (wallet, activation, ads, public pages). The site is not liable for any dispute, claim or damage arising between a coach and his client; responsibility rests entirely on each coach towards his clients."] },
 { heading: "Intellectual Property", paragraphs: ["All content (plans, articles, design) is owned by Alkemos and may not be copied or reused."] },
 { heading: "Changes to Terms", paragraphs: ["We reserve the right to modify these terms at any time. Users will be notified of significant changes."] },
 ],
 };
 }

 // FAQ
 return isAr ? {
 title: "الأسئلة الشائعة",
 updated: `آخر تحديث: ${date}`,
 sections: [
 { heading: "ما هو Alkemos؟", paragraphs: ["منصة تحسين أداء بشري تجمع بين محرك الذكاء الاصطناعي EVO وقاعدة بيانات ضخمة (تمارين وأكلات) لتقديم خطط مخصصة وتتبع ذكي."] },
 { heading: "من هو EVO؟", paragraphs: ["EVO هو محرك الأداء الذكي. يقرأ بياناتك وهدفك، يبني لك خطط تغذية وتمارين مخصصة، ويقترح تبديلات ذكية. متاح لجميع الأعضاء مع حدود حسب العضوية."] },
 { heading: "هل فيه كوتش بشري؟", paragraphs: ["EVO هو كوتش ذكاء اصطناعي. لو حابب متابعة بشرية، فيه قسم كوتشينج بشري منفصل يمكنك حجزه عبر صفحة الكوتشينج."] },
 { heading: "كم تبديل أسبوعياً مسموح؟", paragraphs: ["الباقة المجانية: لا يوجد. Premium: 3 تبديلات أسبوعياً. Pro: 6 تبديلات أسبوعياً. Coaching: 3 تبديلات أسبوعياً. تتجدد كل اثنين."] },
 { heading: "ما طرق الدفع؟", paragraphs: ["PayPal (الطريقة الرئيسية — فورية وآمنة)، InstaPay، و Vodafone Cash. PayPal يعالج الدفع تلقائياً؛ أما الطرق اليدوية فتتطلب رفع إيصال يقوم الكوتش بمراجعته خلال 24 ساعة."] },
 { heading: "هل بياناتي آمنة؟", paragraphs: ["نعم. جميع البيانات مشفرة على Supabase مع سياسات RLS. لا يراها أحد سواك والكوتش."] },
 { heading: "هل يدعم العربية؟", paragraphs: ["نعم، المنصة ثنائية اللغة (عربي/إنجليزي) بالكامل مع دعم RTL."] },
 { heading: "هل يعمل على الموبايل؟", paragraphs: ["نعم، الموقع متجاوب بالكامل ويمكن تثبيته كتطبيق (PWA) على الموبايل."] },
 { heading: "كم يستغرق رؤية نتائج؟", paragraphs: ["مع الالتزام، تبدأ برؤية نتائج خلال 2-4 أسابيع. نتائج ملحوظة خلال 8-12 أسبوع."] },
 ],
 } : {
 title: "Frequently Asked Questions",
 updated: `Last updated: ${date}`,
 sections: [
 { heading: "What is Alkemos?", paragraphs: ["A human optimization platform combining the EVO AI engine with a massive exercise and food database for personalized plans and smart tracking."] },
 { heading: "Who is EVO?", paragraphs: ["EVO is the AI performance engine. It reads your data and goal, builds personalized nutrition and workout plans, and suggests smart swaps. Available to all members with tier-based limits."] },
 { heading: "Is there a human coach?", paragraphs: ["EVO is an AI coach. If you want human supervision, there's a separate human coaching section you can book via the coaching page."] },
 { heading: "How many weekly swaps?", paragraphs: ["Free: 0. Premium: 3 swaps/week. Pro: 6 swaps/week. Coaching: 3 swaps/week. Resets every Monday."] },
 { heading: "Payment methods?", paragraphs: ["PayPal (primary — instant and secure), InstaPay, and Vodafone Cash. PayPal processes automatically; manual methods require uploading a receipt which the coach reviews within 24 hours."] },
 { heading: "Is my data secure?", paragraphs: ["Yes. All data is encrypted on Supabase with RLS policies. Only you and the coach can see it."] },
 { heading: "Arabic support?", paragraphs: ["Yes, the platform is fully bilingual (Arabic/English) with RTL support."] },
 { heading: "Mobile friendly?", paragraphs: ["Yes, fully responsive and installable as a PWA app on mobile."] },
 { heading: "When will I see results?", paragraphs: ["With commitment, results start in 2-4 weeks. Noticeable results in 8-12 weeks."] },
 ],
 };
}
