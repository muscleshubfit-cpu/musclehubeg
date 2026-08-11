"use client";

import { Dumbbell, ArrowRight, Mail, Phone, MapPin, MessageSquare, Send, Loader2 } from "lucide-react";
import { useState } from "react";
import { useI18n } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { LanguageToggle } from "@/components/LanguageToggle";
import { useNav } from "@/hooks/use-nav";
import { useAuth } from "@/hooks/use-auth";
import { createTicket } from "@/lib/data";
import { toast } from "sonner";

export function ContactView() {
 const { t, lang } = useI18n();
 const { navigate } = useNav();
 const { profile } = useAuth();
 const isAr = lang === "ar";
 const [name, setName] = useState(profile?.full_name || "");
 const [email, setEmail] = useState("");
 const [subject, setSubject] = useState("");
 const [message, setMessage] = useState("");
 const [sending, setSending] = useState(false);

 const handleSubmit = async (e: React.FormEvent) => {
 e.preventDefault();
 if (!name.trim() || !email.trim() || !subject.trim() || !message.trim()) {
 toast.error(isAr ? "يرجى ملء جميع الحقول" : "Please fill all fields");
 return;
 }
 setSending(true);
 try {
 // If logged in, create a support ticket
 if (profile) {
 await createTicket(profile.id, `[تواصل] ${subject}`, `${message}\n\n— ${name} (${email})`);
 toast.success(isAr ? "تم إرسال رسالتك! سنرد عليك قريباً." : "Message sent! We'll reply soon.");
 } else {
 // Not logged in — store in localStorage as a "contact message"
 const contactMessages = JSON.parse(localStorage.getItem("mhe:contact_messages") || "[]");
 contactMessages.push({ name, email, subject, message, created_at: new Date().toISOString() });
 localStorage.setItem("mhe:contact_messages", JSON.stringify(contactMessages));
 toast.success(isAr ? "تم إرسال رسالتك! سنرد عليك قريباً." : "Message sent! We'll reply soon.");
 }
 setSubject("");
 setMessage("");
 } catch (e: any) {
 toast.error(e.message || (isAr ? "حدث خطأ" : "Something went wrong"));
 } finally {
 setSending(false);
 }
 };

 return (
 <div className="min-h-screen flex flex-col bg-background">
 <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-xl">
 <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4 sm:px-6">
 <button onClick={() => navigate("landing")} className="flex items-center gap-2">
 <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-primary">
 <Dumbbell className="h-5 w-5 text-primary-foreground" />
 </span>
 <span className="font-display text-lg font-bold">Muscle<span className="text-primary">Hub</span></span>
 </button>
 <LanguageToggle />
 </div>
 </header>

 <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-12 sm:px-6">
 <div className="text-center">
 <h1 className="text-4xl font-extrabold md:text-5xl">
 {isAr ? "تواصل معنا" : "Contact Us"}
 </h1>
 <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
 {isAr
 ? "عندك سؤال أو استفسار؟ ابعتلنا رسالة وهنرد عليك في أقرب وقت."
 : "Have a question? Send us a message and we'll get back to you."}
 </p>
 </div>

 <div className="mt-12 grid gap-8 md:grid-cols-2">
 {/* Contact info */}
 <div className="space-y-6">
 <div className="flex items-start gap-4">
 <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-primary/10 text-primary">
 <Mail className="h-5 w-5" />
 </span>
 <div>
 <h3 className="font-semibold">{isAr ? "البريد الإلكتروني" : "Email"}</h3>
 <p className="text-sm text-muted-foreground" dir="ltr">support@musclehubeg.com</p>
 </div>
 </div>
 <div className="flex items-start gap-4">
 <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-primary/10 text-primary">
 <Phone className="h-5 w-5" />
 </span>
 <div>
 <h3 className="font-semibold">{isAr ? "واتساب" : "WhatsApp"}</h3>
 <p className="text-sm text-muted-foreground" dir="ltr">+20 100 000 0000</p>
 </div>
 </div>
 <div className="flex items-start gap-4">
 <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-primary/10 text-primary">
 <MessageSquare className="h-5 w-5" />
 </span>
 <div>
 <h3 className="font-semibold">{isAr ? "دعم سريع" : "Quick Support"}</h3>
 <p className="text-sm text-muted-foreground">
 {isAr ? "سجل دخول وافتح تذكرة دعم من لوحة التحكم" : "Log in and open a support ticket from dashboard"}
 </p>
 </div>
 </div>
 <div className="flex items-start gap-4">
 <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-primary/10 text-primary">
 <MapPin className="h-5 w-5" />
 </span>
 <div>
 <h3 className="font-semibold">{isAr ? "الموقع" : "Location"}</h3>
 <p className="text-sm text-muted-foreground">{isAr ? "القاهرة، مصر — أونلاين" : "Cairo, Egypt — Online"}</p>
 </div>
 </div>
 </div>

 {/* Contact form */}
 <div className="rounded-3xl border border-border bg-card p-6 shadow-card">
 <form onSubmit={handleSubmit} className="space-y-4">
 <div>
 <Label htmlFor="name">{isAr ? "الاسم" : "Name"}</Label>
 <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required className="mt-1.5" />
 </div>
 <div>
 <Label htmlFor="email">{isAr ? "البريد الإلكتروني" : "Email"}</Label>
 <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="mt-1.5" dir="ltr" />
 </div>
 <div>
 <Label htmlFor="subject">{isAr ? "الموضوع" : "Subject"}</Label>
 <Input id="subject" value={subject} onChange={(e) => setSubject(e.target.value)} required className="mt-1.5" />
 </div>
 <div>
 <Label htmlFor="message">{isAr ? "الرسالة" : "Message"}</Label>
 <Textarea id="message" value={message} onChange={(e) => setMessage(e.target.value)} required className="mt-1.5 min-h-[120px]" />
 </div>
 <Button type="submit" className="w-full gap-2" disabled={sending}>
 {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
 {isAr ? "إرسال الرسالة" : "Send Message"}
 </Button>
 </form>
 </div>
 </div>
 </main>

 <footer className="mt-auto border-t border-border py-6 text-center text-sm text-muted-foreground">
 © {new Date().getFullYear()} MuscleHub. {isAr ? "كل الحقوق محفوظة." : "All rights reserved."}
 </footer>
 </div>
 );
}
