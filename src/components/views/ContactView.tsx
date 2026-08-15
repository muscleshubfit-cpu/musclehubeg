"use client";

import { useState } from "react";
import { useI18n } from "@/lib/i18n";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { LanguageToggle } from "@/components/LanguageToggle";
import { useNav } from "@/hooks/use-nav";
import { useAuth } from "@/hooks/use-auth";
import { createTicket } from "@/lib/data";
import { toast } from "sonner";
import { Reveal, PageFade } from "@/components/motion";

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
      if (profile) {
        await createTicket(profile.id, `[تواصل] ${subject}`, `${message}\n\n— ${name} (${email})`);
        toast.success(isAr ? "تم إرسال رسالتك! سنرد عليك قريباً." : "Message sent! We'll reply soon.");
      } else {
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
    <div className="flex min-h-screen flex-col bg-white text-[#1d1d1f]">
      <header className="sticky top-0 z-40 border-b border-[#d2d2d7] bg-white/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4 sm:px-6">
          <button
            onClick={() => navigate("landing")}
            className="text-lg font-semibold tracking-tight"
          >
            MuscleHub
          </button>
          <LanguageToggle />
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-20 sm:px-6 md:py-28">
        <div className="text-center">
          <h1 className="text-4xl font-semibold tracking-tight md:text-6xl">
            {isAr ? "تواصل معنا" : "Contact Us"}
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-lg font-normal text-[#6e6e73] md:text-xl">
            {isAr
              ? "عندك سؤال أو استفسار؟ ابعتلنا رسالة وهنرد عليك في أقرب وقت."
              : "Have a question? Send us a message and we'll get back to you."}
          </p>
        </div>

        <div className="mt-16 grid gap-12 md:grid-cols-2 md:gap-16">
          {/* Contact info — Apple-style clean text */}
          <div className="space-y-8">
            <div>
              <h3 className="text-xs font-normal uppercase tracking-wide text-[#6e6e73]">
                {isAr ? "البريد الإلكتروني" : "Email"}
              </h3>
              <p className="mt-2 text-lg font-normal" dir="ltr">support@musclehubeg.com</p>
            </div>
            <div>
              <h3 className="text-xs font-normal uppercase tracking-wide text-[#6e6e73]">
                {isAr ? "واتساب" : "WhatsApp"}
              </h3>
              <p className="mt-2 text-lg font-normal" dir="ltr">+20 100 000 0000</p>
            </div>
            <div>
              <h3 className="text-xs font-normal uppercase tracking-wide text-[#6e6e73]">
                {isAr ? "دعم سريع" : "Quick Support"}
              </h3>
              <p className="mt-2 text-lg font-normal text-[#6e6e73]">
                {isAr ? "سجل دخول وافتح تذكرة دعم من لوحة التحكم" : "Log in and open a support ticket from dashboard"}
              </p>
            </div>
            <div>
              <h3 className="text-xs font-normal uppercase tracking-wide text-[#6e6e73]">
                {isAr ? "الموقع" : "Location"}
              </h3>
              <p className="mt-2 text-lg font-normal">{isAr ? "القاهرة، مصر — أونلاين" : "Cairo, Egypt — Online"}</p>
            </div>
          </div>

          {/* Contact form — Apple-style clean */}
          <div className="rounded-3xl bg-[#f5f5f7] p-8 md:p-10">
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-sm font-medium">
                  {isAr ? "الاسم" : "Name"}
                </Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="rounded-xl border-[#d2d2d7] bg-white px-4 py-3 text-base"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium">
                  {isAr ? "البريد الإلكتروني" : "Email"}
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="rounded-xl border-[#d2d2d7] bg-white px-4 py-3 text-base"
                  dir="ltr"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="subject" className="text-sm font-medium">
                  {isAr ? "الموضوع" : "Subject"}
                </Label>
                <Input
                  id="subject"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  required
                  className="rounded-xl border-[#d2d2d7] bg-white px-4 py-3 text-base"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="message" className="text-sm font-medium">
                  {isAr ? "الرسالة" : "Message"}
                </Label>
                <Textarea
                  id="message"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  required
                  className="min-h-[120px] rounded-xl border-[#d2d2d7] bg-white px-4 py-3 text-base"
                />
              </div>
              <button
                type="submit"
                disabled={sending}
                className="w-full rounded-full bg-[#0071e3] px-6 py-3 text-base font-normal text-white transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                {sending ? (isAr ? "جاري الإرسال..." : "Sending...") : (isAr ? "إرسال الرسالة" : "Send Message")}
              </button>
            </form>
          </div>
        </div>
      </main>

      <footer className="mt-auto border-t border-[#d2d2d7] py-6 text-center text-xs font-normal text-[#6e6e73]">
        © {new Date().getFullYear()} MuscleHub. {isAr ? "كل الحقوق محفوظة." : "All rights reserved."}
      </footer>
 </div>
 );
}
