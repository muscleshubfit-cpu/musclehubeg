"use client";

import { ArrowRight, Check, Facebook, Linkedin, Twitter, MessageCircle, Copy, Check as CheckIcon, Share2, Crown, Gift } from "lucide-react";
import { useState, useEffect } from "react";

/**
 * BlogMembershipCard — compact single-card CTA shown inside blog articles.
 *
 * Two sections:
 * 1. Coaching CTA — book a coaching session
 * 2. Membership plans — Free / Premium / Pro tiers
 */
export function BlogMembershipCard({ lang }: { lang: "en" | "ar" }) {
 const isAr = lang === "ar";

 const tiers = [
 { id: "free", nameAr: "مجاني", nameEn: "Free", price: "$0", highlight: false },
 { id: "premium", nameAr: "بريميوم", nameEn: "Premium", price: "$14.99", highlight: true },
 { id: "pro", nameAr: "برو", nameEn: "Pro", price: "$29.99", highlight: false },
 ];

 return (
 <div className="my-12 space-y-6">
 {/* Section 1: Coaching CTA */}
 <div className="overflow-hidden rounded-3xl border border-[#0071e3]/20 bg-gradient-to-br from-[#0071e3]/5 to-[#0071e3]/10 p-6 md:p-8">
 <div className="flex flex-col items-center text-center">
 <span className="grid mx-auto h-12 w-12 place-items-center rounded-2xl border border-[var(--edge)] bg-[var(--tint)] text-[var(--muted-2)] shadow-lg">
 <Crown className="h-6 w-6" />
 </span>
 <h3 className="mt-4 text-xl font-semibold tracking-tight md:text-2xl">
 {isAr ? "احجز جلسة كوتشينج مع Alkemos" : "Book a Coaching Session with Alkemos"}
 </h3>
 <p className="mx-auto mt-2 max-w-md text-sm font-normal text-[var(--muted-foreground)]">
 {isAr
 ? "احصل على خطة مخصصة من مدرب معتمد — تغذية + تمارين + متابعة أسبوعية. ابدأ رحلتك اليوم."
 : "Get a personalized plan from a certified coach — nutrition + training + weekly tracking. Start your journey today."}
 </p>
 <a
 href="/coaching"
 className="btn-chrome mt-5 inline-flex items-center gap-2 px-6 py-2.5 text-sm"
 >
 {isAr ? "احجز جلسة الآن" : "Book a session"}
 <ArrowRight className="h-4 w-4 rtl:rotate-180" />
 </a>
 </div>
 </div>

 {/* Section 2: Membership plans */}
 <div className="marble-card overflow-hidden p-6 md:p-8">
 <div className="flex flex-col items-center text-center">
 <h3 className="text-xl font-semibold tracking-tight md:text-2xl">
 {isAr ? "أو اختر عضوية Alkemos" : "Or pick a Alkemos plan"}
 </h3>
 <p className="mx-auto mt-2 max-w-md text-sm font-normal text-[var(--muted-foreground)]">
 {isAr
 ? "EVO ذكاء اصطناعي، خطط تغذية وتمارين مخصصة، ومتابعة أسبوعية — كله في مكان واحد."
 : "EVO AI coach, personalized nutrition + workout plans, weekly tracking — all in one place."}
 </p>
 </div>

 {/* Tiers row */}
 <div className="mt-6 grid grid-cols-3 gap-2 md:gap-3">
 {tiers.map((tier) => (
 <a
 key={tier.id}
 href="/memberships"
 className={`block rounded-2xl p-3 text-center transition-all hover:opacity-90 ${
 tier.highlight
 ? "bg-[#1d1d1f] text-white"
 : "bg-[var(--card)] text-[var(--text)] border border-[var(--edge)]"
 }`}
 >
 <p className="text-xs font-medium opacity-80">
 {isAr ? tier.nameAr : tier.nameEn}
 </p>
 <p className="mt-1 text-base font-semibold tracking-tight">
 {tier.price}
 <span className="ms-0.5 text-[10px] font-normal opacity-60">/mo</span>
 </p>
 </a>
 ))}
 </div>

 <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
 <div className="flex items-center gap-1.5 text-xs text-[var(--muted-foreground)]">
 <Check className="h-3.5 w-3.5 text-[#34c759]" />
 {isAr ? "EVO غير محدود (Premium+)" : "Unlimited EVO (Premium+)"}
 </div>
 <div className="flex items-center gap-1.5 text-xs text-[var(--muted-foreground)]">
 <Check className="h-3.5 w-3.5 text-[#34c759]" />
 {isAr ? "خطط مخصصة" : "Personalized plans"}
 </div>
 <div className="flex items-center gap-1.5 text-xs text-[var(--muted-foreground)]">
 <Check className="h-3.5 w-3.5 text-[#34c759]" />
 {isAr ? "868+ تمرين و ٨٬٨٣٠+ أكلة" : "868+ exercises, 8,830+ foods"}
 </div>
 </div>

 <div className="mt-6 text-center">
 <a
 href="/memberships"
 className="btn-chrome inline-flex items-center gap-2 px-6 py-2.5 text-sm"
 >
 {isAr ? "قارن العضويات" : "Compare plans"}
 <ArrowRight className="h-4 w-4 rtl:rotate-180" />
 </a>
 </div>
 </div>

 {/* Section 3: Affiliate Program CTA */}
 <div className="overflow-hidden rounded-3xl border border-[#34c759]/20 bg-gradient-to-br from-[#34c759]/5 to-[#34c759]/10 p-6 md:p-8">
 <div className="flex flex-col items-center text-center">
 <span className="grid mx-auto h-12 w-12 place-items-center rounded-2xl bg-[#1d8a3d] text-white shadow-lg">
 <Gift className="h-6 w-6" />
 </span>
 <h3 className="mt-4 text-xl font-semibold tracking-tight md:text-2xl">
 {isAr ? "حوّل تأثيرك إلى دخل مع برنامج الأفلييت" : "Turn Your Influence Into Income — Affiliate Program"}
 </h3>
 <p className="mx-auto mt-2 max-w-md text-sm font-normal text-[var(--muted-foreground)]">
 {isAr
 ? "شارك Alkemos مع جمهورك واكسب 20% عمولة من كل اشتراك مؤهل. كوكيز 30 يوم."
 : "Share Alkemos with your audience and earn 20% commission on every eligible subscription. 30-day cookie."}
 </p>
 <a
 href="/affiliate"
 className="mt-5 inline-flex items-center gap-2 rounded-full bg-[#1d8a3d] px-6 py-2.5 text-sm font-normal text-white transition-opacity hover:opacity-90"
 >
 {isAr ? "تعرف على البرنامج" : "Learn about the program"}
 <ArrowRight className="h-4 w-4 rtl:rotate-180" />
 </a>
 </div>
 </div>
 </div>
 );
}

export function SocialShare({ url, ogUrl, title, description, image, lang }: { url: string; ogUrl?: string; title: string; description?: string; image?: string; lang: "en" | "ar" }) {
 const isAr = lang === "ar";
 const [copied, setCopied] = useState(false);
 const encodedUrl = encodeURIComponent(url);
 const encodedTitle = encodeURIComponent(title);
 const encodedDesc = description ? encodeURIComponent(description) : "";

 // Language-aware share text — always include a summary
 const shortDesc = description ? description.slice(0, 150) + (description.length > 150 ? "..." : "") : (title ? title : "");
 const shareText = isAr
   ? `${title}\n\n${shortDesc}\n\nاقرأ المقال كاملاً على Alkemos:`
   : `${title}\n\n${shortDesc}\n\nRead the full article on Alkemos:`;
 const encodedShareText = encodeURIComponent(shareText);

 const share = (platform: string) => {
   const links: Record<string, string> = {
     // Facebook: just needs the URL — it scrapes OG tags for title/image/description
     facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}&quote=${encodedShareText}`,
     // LinkedIn: uses OG tags from the URL
     linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`,
     // X (Twitter): include title + description + URL in the tweet text
     twitter: `https://twitter.com/intent/tweet?text=${encodedShareText}&url=${encodedUrl}`,
     // WhatsApp: include title + description + URL
     whatsapp: `https://wa.me/?text=${encodedShareText}%20${encodedUrl}`,
   };
   window.open(links[platform], "_blank", "noopener,noreferrer,width=600,height=400");
 };

 const copyLink = () => {
   navigator.clipboard.writeText(url);
   setCopied(true);
   setTimeout(() => setCopied(false), 2000);
 };

 // Native share API (mobile) — includes title, text, image if supported
 const nativeShare = async () => {
   if (navigator.share) {
     try {
       await navigator.share({
         title: title,
         text: shareText,
         url: url,
       });
       return;
     } catch {
       // user cancelled — fall through to copy
     }
   }
   copyLink();
 };

 return (
   <div className="my-8 flex items-center gap-2">
     <span className="text-sm text-muted-foreground">{isAr ? "شارك:" : "Share:"}</span>
     <button onClick={() => share("facebook")} className="grid h-9 w-9 place-items-center rounded-lg border border-border hover:border-primary/40 hover:text-primary" aria-label="Facebook">
       <Facebook className="h-4 w-4" />
     </button>
     <button onClick={() => share("linkedin")} className="grid h-9 w-9 place-items-center rounded-lg border border-border hover:border-primary/40 hover:text-primary" aria-label="LinkedIn">
       <Linkedin className="h-4 w-4" />
     </button>
     <button onClick={() => share("twitter")} className="grid h-9 w-9 place-items-center rounded-lg border border-border hover:border-primary/40 hover:text-primary" aria-label="X">
       <Twitter className="h-4 w-4" />
     </button>
     <button onClick={() => share("whatsapp")} className="grid h-9 w-9 place-items-center rounded-lg border border-border hover:border-primary/40 hover:text-primary" aria-label="WhatsApp">
       <MessageCircle className="h-4 w-4" />
     </button>
     {typeof navigator !== "undefined" && typeof navigator.share === "function" && (
       <button onClick={nativeShare} className="grid h-9 w-9 place-items-center rounded-lg border border-border hover:border-primary/40 hover:text-primary" aria-label={isAr ? "مشاركة" : "Share"}>
         <Share2 className="h-4 w-4" />
       </button>
     )}
     <button onClick={copyLink} className="grid h-9 w-9 place-items-center rounded-lg border border-border hover:border-primary/40 hover:text-primary" aria-label="Copy link">
       {copied ? <CheckIcon className="h-4 w-4 text-success" /> : <Copy className="h-4 w-4" />}
     </button>
   </div>
 );
}

export function ReadingProgress() {
 const [progress, setProgress] = useState(0);

 useEffect(() => {
 const handleScroll = () => {
 const scrolled = window.scrollY;
 const height = document.documentElement.scrollHeight - window.innerHeight;
 setProgress(height > 0 ? (scrolled / height) * 100 : 0);
 };
 window.addEventListener("scroll", handleScroll);
 return () => window.removeEventListener("scroll", handleScroll);
 }, []);

 return (
 <div className="fixed top-0 left-0 z-[60] h-1 w-full bg-transparent">
 <div
 className="h-full bg-gradient-primary transition-all duration-150"
 style={{ width: `${progress}%` }}
 />
 </div>
 );
}

export function TableOfContents({ items, lang }: { items: Array<{ level: number; text: string; id: string }>; lang: "en" | "ar" }) {
 const isAr = lang === "ar";
 if (items.length === 0) return null;
 return (
 <nav className="sticky top-20 hidden rounded-2xl border border-border bg-card p-4 lg:block">
 <h4 className="mb-3 text-sm font-bold">{isAr ? "محتويات المقال" : "Table of Contents"}</h4>
 <ul className="space-y-1.5 text-sm">
 {items.map((item, i) => (
 <li key={i} className={item.level === 3 ? "ps-4" : ""}>
 <a
 href={`#${item.id}`}
 className="text-muted-foreground transition-colors hover:text-primary"
 onClick={(e) => {
 e.preventDefault();
 document.getElementById(item.id)?.scrollIntoView({ behavior: "smooth" });
 }}
 >
 {item.text}
 </a>
 </li>
 ))}
 </ul>
 </nav>
 );
}
