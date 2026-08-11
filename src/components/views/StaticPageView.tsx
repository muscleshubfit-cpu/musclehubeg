"use client";

import { Dumbbell } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { LanguageToggle } from "@/components/LanguageToggle";
import { useNav, type View } from "@/hooks/use-nav";

export function StaticPageView({ page }: { page: "about" | "privacy" | "terms" | "faq" }) {
 const { t, lang } = useI18n();
 const { navigate } = useNav();
 const isAr = lang === "ar";

 const content = getContent(page, isAr);

 return (
 <div className="min-h-screen flex flex-col bg-background">
 <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-xl">
 <div className="mx-auto flex h-16 w-full max-w-4xl items-center justify-between px-4 sm:px-6">
 <button onClick={() => navigate("landing")} className="flex items-center gap-2">
 <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-primary">
 <Dumbbell className="h-5 w-5 text-primary-foreground" />
 </span>
 <span className="font-display text-lg font-bold">Muscle<span className="text-primary">Hub</span></span>
 </button>
 <LanguageToggle />
 </div>
 </header>

 <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-12 sm:px-6">
 <h1 className="text-4xl font-extrabold">{content.title}</h1>
 <p className="mt-2 text-sm text-muted-foreground">{content.updated}</p>

 <div className="mt-8 space-y-6">
 {content.sections.map((section, i) => (
 <section key={i}>
 <h2 className="text-xl font-bold">{section.heading}</h2>
 <div className="mt-2 space-y-2 text-sm leading-relaxed text-muted-foreground">
 {section.paragraphs.map((p, j) => (
 <p key={j}>{p}</p>
 ))}
 {section.list && (
 <ul className="mt-2 space-y-1 ps-5">
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
 <div className="mt-12 rounded-2xl border border-border bg-card p-6 text-center">
 <p className="text-sm text-muted-foreground">
 {isAr ? "لديك سؤال آخر؟" : "Have another question?"}
 </p>
 <button
 onClick={() => navigate("contact")}
 className="mt-3 font-semibold text-primary hover:underline"
 >
 {isAr ? "تواصل معنا →" : "Contact us →"}
 </button>
 </div>
 )}
 </main>

 <footer className="mt-auto border-t border-border py-6 text-center text-sm text-muted-foreground">
 © {new Date().getFullYear()} MuscleHub. {isAr ? "كل الحقوق محفوظة." : "All rights reserved."}
 </footer>
 </div>
 );
}

function getContent(page: string, isAr: boolean) {
 const date = new Date().toLocaleDateString(isAr ? "ar-EG" : "en-US", { year: "numeric", month: "long", day: "numeric" });

 if (page === "about") {
 return isAr ? {
 title: "عن MuscleHub",
 updated: `آخر تحديث: ${date}`,
 sections: [
 { heading: "من نحن", paragraphs: ["MuscleHub هي منصة تحسين أداء بشري بالذكاء الاصطناعي. نجمع بين خبرة الكوتش أحمد زكي ومحرك الذكاء الاصطناعي EVO لتقديم تجربة كوتشينج لا مثيل لها.", "تأسست MuscleHub برؤية بسيطة: المستقبل ليس إنسان ضد AI، بل إنسان + AI. نحن نؤمن بأن أفضل النتائج تأتي من الجمع بين حكمة الإنسان وذكاء الآلة."] },
 { heading: "رؤيتنا", paragraphs: ["أن نكون المنصة الأولى للكوتشينج الرياضي والتغذوي في العالم العربي، ونقدم تجربة عالمية المستوى لكل عميل."] },
 { heading: "الكوتش أحمد زكي", paragraphs: ["أحمد زكي هو كوتش تغذية ولياقة معتمد بخبرة +8 سنوات. درّب أكثر من 500 عميل وساعد آلاف الأشخاص على تحقيق أهدافهم. أحمد يراجع كل استبيان ويوافق على كل خطة بنفسه — ليست مجرد AI، بل إشراف بشري حقيقي."] },
 { heading: "EVO — محرك الأداء الذكي", paragraphs: ["EVO ليس شات بوت عادي. بل محرك ذكاء اصطناعي يحلل بياناتك، يتنبأ بالنتائج، يوصي بالتحسينات، ويحدّث خططك تلقائياً. يعمل مع الكوتش وليس بدلاً منه."] },
 ],
 } : {
 title: "About MuscleHub",
 updated: `Last updated: ${date}`,
 sections: [
 { heading: "Who We Are", paragraphs: ["MuscleHub is an AI-powered human optimization platform. We combine Coach Ahmed Zake's expertise with the EVO AI engine to deliver an unmatched coaching experience.", "MuscleHub was founded on a simple vision: the future isn't Human vs AI, it's Human + AI. We believe the best results come from combining human wisdom with machine intelligence."] },
 { heading: "Our Vision", paragraphs: ["To be the leading fitness and nutrition coaching platform in the Arab world, delivering a world-class experience to every client."] },
 { heading: "Coach Ahmed Zake", paragraphs: ["Ahmed Zake is a certified nutrition and fitness coach with +8 years of experience. He has trained over 500 clients and helped thousands achieve their goals. Ahmed personally reviews every questionnaire and approves every plan — not just AI, but real human supervision."] },
 { heading: "EVO — The AI Performance Engine", paragraphs: ["EVO is not a regular chatbot. It's an AI engine that analyzes your data, predicts outcomes, recommends improvements, and updates your plans automatically. It works with the coach, not instead of the coach."] },
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
 { heading: "قبول الشروط", paragraphs: ["باستخدامك لموقع MuscleHub، فإنك توافق على هذه الشروط والأحكام. إذا لم توافق، يرجى عدم استخدام الموقع."] },
 { heading: "الاشتراك", paragraphs: ["الاشتراك في MuscleHub يمنحك accès لخطط مخصصة، مساعد ذكي، وتتبع تقدم. الأسعار موضحة في صفحة الأسعار.", "يمكنك عدم التجديد في أي وقت. لا توجد عقود ملزمة."] },
 { heading: "الخطط المخصصة", paragraphs: ["الخطط الغذائية والتدريبية مولّدة بالذكاء الاصطناعي ومراجعة من الكوتش. النتائج تختلف من شخص لآخر حسب الالتزام والجينات.", "MuscleHub لا يقدم نصائح طبية. استشر طبيبك قبل بدء أي برنامج غذائي أو رياضي."] },
 { heading: "التبديلات", paragraphs: ["حد التبديلات اليومية يعتمد على باقتك:", "Starter: 2 تبديل/يوم لكل نوع. Elite: غير محدود.", "التبديلات تتجدد يومياً."] },
 { heading: "المسؤولية", paragraphs: ["MuscleHub والكوتش أحمد زكي غير مسؤولين عن أي إصابة أو ضرر صحي ناتج عن اتباع البرنامج دون استشارة طبية."] },
 { heading: "الملكية الفكرية", paragraphs: ["جميع المحتويات (الخطط، المقالات، التصميم) مملوكة لـ MuscleHub ولا يجوز نسخها أو إعادة استخدامها."] },
 { heading: "تعديل الشروط", paragraphs: ["نحتفظ بحق تعديل هذه الشروط في أي وقت. سيتم إشعار المستخدمين بالتغييرات الجوهرية."] },
 ],
 } : {
 title: "Terms & Conditions",
 updated: `Last updated: ${date}`,
 sections: [
 { heading: "Acceptance", paragraphs: ["By using MuscleHub, you agree to these terms. If you disagree, please do not use the site."] },
 { heading: "Subscription", paragraphs: ["Subscribing to MuscleHub grants access to personalized plans, AI assistant, and progress tracking. Prices are listed on the pricing page.", "You can choose not to renew at any time. No binding contracts."] },
 { heading: "Personalized Plans", paragraphs: ["Nutrition and workout plans are AI-generated and reviewed by the coach. Results vary by individual based on adherence and genetics.", "MuscleHub does not provide medical advice. Consult your doctor before starting any nutrition or exercise program."] },
 { heading: "Swaps", paragraphs: ["Daily swap limits depend on your plan:", "Starter: 2 swaps/day per type. Elite: unlimited.", "Swaps reset daily."] },
 { heading: "Liability", paragraphs: ["MuscleHub and Coach Ahmed Zake are not liable for any injury or health damage resulting from following the program without medical consultation."] },
 { heading: "Intellectual Property", paragraphs: ["All content (plans, articles, design) is owned by MuscleHub and may not be copied or reused."] },
 { heading: "Changes to Terms", paragraphs: ["We reserve the right to modify these terms at any time. Users will be notified of significant changes."] },
 ],
 };
 }

 // FAQ
 return isAr ? {
 title: "الأسئلة الشائعة",
 updated: `آخر تحديث: ${date}`,
 sections: [
 { heading: "ما هو MuscleHub؟", paragraphs: ["منصة تحسين أداء بشري تجمع بين الكوتش أحمد زكي ومحرك الذكاء الاصطناعي EVO لتقديم خطط مخصصة وتتبع ذكي."] },
 { heading: "من هو EVO؟", paragraphs: ["EVO هو محرك الأداء الذكي. يحلل بياناتك، يتنبأ بالنتائج، يوصي بالتحسينات، ويحدّث خططك تلقائياً. يعمل مع الكوتش وليس بدلاً منه."] },
 { heading: "هل الكوتش حقيقي؟", paragraphs: ["نعم! الكوتش أحمد زكي يراجع استبياناتك ويوافق على خططك بنفسه ويرد على تذاكر الدعم."] },
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
 { heading: "What is MuscleHub?", paragraphs: ["A human optimization platform combining Coach Ahmed Zake with the EVO AI engine for personalized plans and smart tracking."] },
 { heading: "Who is EVO?", paragraphs: ["EVO is the AI performance engine. It analyzes your data, predicts outcomes, recommends improvements, and updates plans automatically."] },
 { heading: "Is the coach real?", paragraphs: ["Yes! Coach Ahmed Zake personally reviews your questionnaires, approves your plans, and replies to support tickets."] },
 { heading: "How many daily swaps?", paragraphs: ["Starter: 2 meal + 2 exercise swaps/day. Elite: unlimited. Resets daily."] },
 { heading: "Payment methods?", paragraphs: ["InstaPay and Vodafone Cash. Upload a payment receipt and the coach reviews it."] },
 { heading: "Is my data secure?", paragraphs: ["Yes. All data is encrypted on Supabase with RLS policies. Only you and the coach can see it."] },
 { heading: "Arabic support?", paragraphs: ["Yes, the platform is fully bilingual (Arabic/English) with RTL support."] },
 { heading: "Mobile friendly?", paragraphs: ["Yes, fully responsive and installable as a PWA app on mobile."] },
 { heading: "When will I see results?", paragraphs: ["With commitment, results start in 2-4 weeks. Noticeable results in 8-12 weeks."] },
 ],
 };
}
