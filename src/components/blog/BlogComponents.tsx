"use client";

import { Dumbbell, ArrowRight, Check, Mail, Send, Facebook, Linkedin, Twitter, MessageCircle, Copy, Check as CheckIcon } from "lucide-react";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function BlogCTA({ lang }: { lang: "en" | "ar" }) {
 const isAr = lang === "ar";
 return (
 <div className="my-12 overflow-hidden rounded-3xl border border-primary/30 bg-gradient-to-br from-primary/5 to-card p-8 text-center">
 <span className="grid mx-auto h-12 w-12 place-items-center rounded-2xl bg-gradient-primary shadow-glow">
 <Dumbbell className="h-6 w-6 text-primary-foreground" />
 </span>
 <h3 className="mt-4 text-2xl font-bold">
 {isAr ? "جاهز لتبدأ تحوّلك؟" : "Ready to start your transformation?"}
 </h3>
 <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
 {isAr
 ? "احصل على خطة مخصصة بالذكاء الاصطناعي + إشراف مباشر من الكوتش أحمد زكي. ابدأ اليوم."
 : "Get an AI-personalized plan + direct coaching from Ahmed Zake. Start today."}
 </p>
 <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
 <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
 <Check className="h-4 w-4 text-success" /> {isAr ? "خطة مخصصة" : "Personalized plan"}
 </div>
 <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
 <Check className="h-4 w-4 text-success" /> {isAr ? "مساعد EVO الذكي" : "EVO AI coach"}
 </div>
 <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
 <Check className="h-4 w-4 text-success" /> {isAr ? "تتبع تقدم" : "Progress tracking"}
 </div>
 </div>
 <div className="mt-6 flex flex-wrap justify-center gap-3">
 <a href={isAr ? "/ar" : "/"}>
 <Button size="lg" className="gap-2 shadow-glow">
 {isAr ? "ابدأ الكوتشينج" : "Start Your Coaching"}
 <ArrowRight className="h-4 w-4 rtl:rotate-180" />
 </Button>
 </a>
 <a href={isAr ? "/ar/contact" : "/contact"}>
 <Button size="lg" variant="outline">
 {isAr ? "احجز استشارة" : "Book Consultation"}
 </Button>
 </a>
 </div>
 </div>
 );
}

export function NewsletterBlock({ lang }: { lang: "en" | "ar" }) {
 const isAr = lang === "ar";
 const [email, setEmail] = useState("");
 const [done, setDone] = useState(false);

 const subscribe = (e: React.FormEvent) => {
 e.preventDefault();
 if (!email.trim()) return;
 const subs = JSON.parse(localStorage.getItem("mhe:newsletter") || "[]");
 subs.push({ email, date: new Date().toISOString() });
 localStorage.setItem("mhe:newsletter", JSON.stringify(subs));
 setDone(true);
 setEmail("");
 };

 return (
 <div className="my-12 rounded-2xl border border-border bg-card p-6 text-center">
 <Mail className="mx-auto h-8 w-8 text-primary" />
 <h3 className="mt-3 text-lg font-bold">
 {isAr ? "اشترك في النشرة البريدية" : "Subscribe to Newsletter"}
 </h3>
 <p className="mt-1 text-sm text-muted-foreground">
 {isAr ? "احصل على أحدث المقالات والنصائح مباشرة في بريدك" : "Get the latest articles and tips in your inbox"}
 </p>
 {done ? (
 <p className="mt-4 text-sm font-medium text-success">
 {isAr ? " تم الاشتراك! شكراً لك." : " Subscribed! Thank you."}
 </p>
 ) : (
 <form onSubmit={subscribe} className="mx-auto mt-4 flex max-w-sm gap-2">
 <Input
 type="email"
 value={email}
 onChange={(e) => setEmail(e.target.value)}
 placeholder={isAr ? "بريدك الإلكتروني" : "Your email"}
 required
 dir="ltr"
 />
 <Button type="submit" className="gap-2 shrink-0">
 <Send className="h-4 w-4" />
 </Button>
 </form>
 )}
 </div>
 );
}

export function SocialShare({ url, title, lang }: { url: string; title: string; lang: "en" | "ar" }) {
 const isAr = lang === "ar";
 const [copied, setCopied] = useState(false);
 const encodedUrl = encodeURIComponent(url);
 const encodedTitle = encodeURIComponent(title);

 const share = (platform: string) => {
 const links: Record<string, string> = {
 facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
 linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`,
 twitter: `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}`,
 whatsapp: `https://wa.me/?text=${encodedTitle}%20${encodedUrl}`,
 };
 window.open(links[platform], "_blank", "noopener,noreferrer,width=600,height=400");
 };

 const copyLink = () => {
 navigator.clipboard.writeText(url);
 setCopied(true);
 setTimeout(() => setCopied(false), 2000);
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
