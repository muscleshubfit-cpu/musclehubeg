"use client";

import { useI18n } from "@/lib/i18n";
import { LanguageToggle } from "@/components/LanguageToggle";
import { useNav, type View } from "@/hooks/use-nav";

export function StaticPageView({ page }: { page: "about" | "privacy" | "terms" | "faq" }) {
  const { t, lang } = useI18n();
  const { navigate } = useNav();
  const isAr = lang === "ar";

  const content = getContent(page, isAr);

  return (
    <div className="flex min-h-screen flex-col bg-white text-[#1d1d1f]">
      <header className="sticky top-0 z-40 border-b border-[#d2d2d7] bg-white/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 w-full max-w-4xl items-center justify-between px-4 sm:px-6">
          <button
            onClick={() => navigate("landing")}
            className="text-lg font-semibold tracking-tight"
          >
            MuscleHubEG
          </button>
          <LanguageToggle />
        </div>
      </header>

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
        © {new Date().getFullYear()} MuscleHubEG. {isAr ? "كل الحقوق محفوظة." : "All rights reserved."}
      </footer>
 </div>
 );
}

function getContent(page: string, isAr: boolean) {
 const date = new Date().toLocaleDateString(isAr ? "ar-EG" : "en-US", { year: "numeric", month: "long", day: "numeric" });

 if (page === "about") {
 return isAr ? {
 title: "عن MuscleHubEG",
 updated: `آخر تحديث: ${date}`,
 sections: [
 { heading: "من نحن", paragraphs: ["MuscleHubEG هي منصة تحسين أداء بشري بالذكاء الاصطناعي. نجمع بين محرك الذكاء الاصطناعي EVO وقاعدة بيانات ضخمة لتمارين (٨٦٨+) وأكلات (٨٬٨٣٠+) لتقديم تجربة لياقة وتغذية لا مثيل لها.", "تأسست MuscleHubEG برؤية بسيطة: المستقبل ليس إنسان ضد AI، بل إنسان + AI. نحن نؤمن بأن أفضل النتائج تأتي من الجمع بين حكمة الإنسان وذكاء الآلة."] },
 { heading: "رؤيتنا", paragraphs: ["أن نكون المنصة الأولى للكوتشينج الرياضي والتغذوي في العالم العربي، ونقدم تجربة عالمية المستوى لكل عضو."] },
 { heading: "EVO — محرك الأداء الذكي", paragraphs: ["EVO ليس شات بوت عادي. بل محرك ذكاء اصطناعي يحلل بياناتك، يتنبأ بالنتائج، يوصي بالتحسينات، ويحدّث خططك تلقائياً. متاح لجميع الأعضاء مع حدود حسب العضوية."] },
 { heading: "العضويات", paragraphs: ["MuscleHubEG تقدم 3 باقات: مجاني (وصول محدود)، بريميوم $14.99/شهر أو $119/سنة (EVO غير محدود + خطط شهرية)، برو $29.99/شهر أو $239/سنة (محتوى مميز + خطط مضاعفة). وكوتشينج بشري منفصل بـ $39.99/شهر أو $359/سنة للمهتمين بمتابعة فردية."] },
 ],
 } : {
 title: "About MuscleHubEG",
 updated: `Last updated: ${date}`,
 sections: [
 { heading: "Who We Are", paragraphs: ["MuscleHubEG is an AI-powered human optimization platform. We combine the EVO AI engine with a massive database of exercises (868+) and foods (8,830+) to deliver an unmatched fitness and nutrition experience.", "MuscleHubEG was founded on a simple vision: the future isn't Human vs AI, it's Human + AI. We believe the best results come from combining human wisdom with machine intelligence."] },
 { heading: "Our Vision", paragraphs: ["To be the leading fitness and nutrition platform in the Arab world, delivering a world-class experience to every member."] },
 { heading: "EVO — The AI Performance Engine", paragraphs: ["EVO is not a regular chatbot. It's an AI engine that analyzes your data, predicts outcomes, recommends improvements, and updates your plans automatically. Available to all members with tier-based limits."] },
 { heading: "Memberships", paragraphs: ["MuscleHubEG offers 3 tiers: Free (limited access), Premium $14.99/mo or $119/yr (unlimited EVO + monthly plans), Pro $29.99/mo or $239/yr (premium content + doubled plans). Human coaching is available separately at $39.99/mo or $359/yr for those who want 1-on-1 supervision."] },
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
 { heading: "قبول الشروط", paragraphs: ["باستخدامك لموقع MuscleHubEG، فإنك توافق على هذه الشروط والأحكام. إذا لم توافق، يرجى عدم استخدام الموقع."] },
 { heading: "الاشتراك", paragraphs: ["الاشتراك في MuscleHubEG يمنحك accès لخطط مخصصة، مساعد ذكي، وتتبع تقدم. الأسعار موضحة في صفحة الأسعار.", "يمكنك عدم التجديد في أي وقت. لا توجد عقود ملزمة."] },
 { heading: "الخطط المخصصة", paragraphs: ["الخطط الغذائية والتدريبية مولّدة بالذكاء الاصطناعي ومراجعة من الكوتش. النتائج تختلف من شخص لآخر حسب الالتزام والجينات.", "MuscleHubEG لا يقدم نصائح طبية. استشر طبيبك قبل بدء أي برنامج غذائي أو رياضي."] },
 { heading: "التبديلات", paragraphs: ["حد التبديلات اليومية يعتمد على باقتك:", "Starter: 2 تبديل/يوم لكل نوع. Elite: غير محدود.", "التبديلات تتجدد يومياً."] },
 { heading: "المسؤولية", paragraphs: ["منصة MuscleHubEG غير مسؤولة عن أي إصابة أو ضرر صحي ناتج عن اتباع البرنامج دون استشارة طبية."] },
 { heading: "الملكية الفكرية", paragraphs: ["جميع المحتويات (الخطط، المقالات، التصميم) مملوكة لـ MuscleHubEG ولا يجوز نسخها أو إعادة استخدامها."] },
 { heading: "تعديل الشروط", paragraphs: ["نحتفظ بحق تعديل هذه الشروط في أي وقت. سيتم إشعار المستخدمين بالتغييرات الجوهرية."] },
 ],
 } : {
 title: "Terms & Conditions",
 updated: `Last updated: ${date}`,
 sections: [
 { heading: "Acceptance", paragraphs: ["By using MuscleHubEG, you agree to these terms. If you disagree, please do not use the site."] },
 { heading: "Subscription", paragraphs: ["Subscribing to MuscleHubEG grants access to personalized plans, AI assistant, and progress tracking. Prices are listed on the pricing page.", "You can choose not to renew at any time. No binding contracts."] },
 { heading: "Personalized Plans", paragraphs: ["Nutrition and workout plans are AI-generated and reviewed by the coach. Results vary by individual based on adherence and genetics.", "MuscleHubEG does not provide medical advice. Consult your doctor before starting any nutrition or exercise program."] },
 { heading: "Swaps", paragraphs: ["Daily swap limits depend on your plan:", "Starter: 2 swaps/day per type. Elite: unlimited.", "Swaps reset daily."] },
 { heading: "Liability", paragraphs: ["MuscleHubEG is not liable for any injury or health damage resulting from following the program without medical consultation."] },
 { heading: "Intellectual Property", paragraphs: ["All content (plans, articles, design) is owned by MuscleHubEG and may not be copied or reused."] },
 { heading: "Changes to Terms", paragraphs: ["We reserve the right to modify these terms at any time. Users will be notified of significant changes."] },
 ],
 };
 }

 // FAQ
 return isAr ? {
 title: "الأسئلة الشائعة",
 updated: `آخر تحديث: ${date}`,
 sections: [
 { heading: "ما هو MuscleHubEG؟", paragraphs: ["منصة تحسين أداء بشري تجمع بين محرك الذكاء الاصطناعي EVO وقاعدة بيانات ضخمة (تمارين وأكلات) لتقديم خطط مخصصة وتتبع ذكي."] },
 { heading: "من هو EVO؟", paragraphs: ["EVO هو محرك الأداء الذكي. يحلل بياناتك، يتنبأ بالنتائج، يوصي بالتحسينات، ويحدّث خططك تلقائياً. متاح لجميع الأعضاء مع حدود حسب العضوية."] },
 { heading: "هل فيه كوتش بشري؟", paragraphs: ["EVO هو كوتش ذكاء اصطناعي. لو حابب متابعة بشرية، فيه قسم كوتشينج بشري منفصل يمكنك حجزه عبر صفحة الكوتشينج."] },
 { heading: "كم تبديل يومياً مسموح؟", paragraphs: ["Starter: 2 تبديل وجبات + 2 تبديل تمارين يومياً. Elite: غير محدود. تتجدد يومياً."] },
 { heading: "ما طرق الدفع؟", paragraphs: ["InstaPay و Vodafone Cash. ترفع إيصال الدفع والكوتش يراجعه ويوافق عليه."] },
 { heading: "هل بياناتي آمنة؟", paragraphs: ["نعم. جميع البيانات مشفرة على Supabase مع سياسات RLS. لا يراها أحد سواك والكوتش."] },
 { heading: "هل يدعم العربية؟", paragraphs: ["نعم، المنصة ثنائية اللغة (عربي/إنجليزي) بالكامل مع دعم RTL."] },
 { heading: "هل يعمل على الموبايل؟", paragraphs: ["نعم، الموقع متجاوب بالكامل ويمكن تثبيته كتطبيق (PWA) على الموبايل."] },
 { heading: "كم يستغرق رؤية نتائج؟", paragraphs: ["مع الالتزام، تبدأ برؤية نتائج خلال 2-4 أسابيع. نتائج ملحوظة خلال 8-12 أسبوع."] },
 ],
 } : {
 title: "Frequently Asked Questions",
 updated: `Last updated: ${date}`,
 sections: [
 { heading: "What is MuscleHubEG?", paragraphs: ["A human optimization platform combining the EVO AI engine with a massive exercise and food database for personalized plans and smart tracking."] },
 { heading: "Who is EVO?", paragraphs: ["EVO is the AI performance engine. It analyzes your data, predicts outcomes, recommends improvements, and updates plans automatically. Available to all members with tier-based limits."] },
 { heading: "Is there a human coach?", paragraphs: ["EVO is an AI coach. If you want human supervision, there's a separate human coaching section you can book via the coaching page."] },
 { heading: "How many daily swaps?", paragraphs: ["Starter: 2 meal + 2 exercise swaps/day. Elite: unlimited. Resets daily."] },
 { heading: "Payment methods?", paragraphs: ["InstaPay and Vodafone Cash. Upload a payment receipt and the coach reviews it."] },
 { heading: "Is my data secure?", paragraphs: ["Yes. All data is encrypted on Supabase with RLS policies. Only you and the coach can see it."] },
 { heading: "Arabic support?", paragraphs: ["Yes, the platform is fully bilingual (Arabic/English) with RTL support."] },
 { heading: "Mobile friendly?", paragraphs: ["Yes, fully responsive and installable as a PWA app on mobile."] },
 { heading: "When will I see results?", paragraphs: ["With commitment, results start in 2-4 weeks. Noticeable results in 8-12 weeks."] },
 ],
 };
}
