"use client";

import { useEffect, useState } from "react";
import { Users, Gift, Share2, Copy, Check, TrendingUp } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/hooks/use-auth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { getReferralStats, createReferral } from "@/lib/data";
import { toast } from "sonner";

export function ReferralView() {
 const { t, lang } = useI18n();
 const { profile } = useAuth();
 const [stats, setStats] = useState({ total: 0, completed: 0, pending: 0, referrals: [] as any[] });
 const [email, setEmail] = useState("");
 const [loading, setLoading] = useState(true);
 const [sending, setSending] = useState(false);
 const [copied, setCopied] = useState(false);
 const isAr = lang === "ar";

 useEffect(() => {
 if (!profile) return;
 (async () => {
 const s = await getReferralStats(profile.id);
 setStats(s);
 setLoading(false);
 })();
 }, [profile]);

 const referralLink = profile ? `${typeof window !== "undefined" ? window.location.origin : ""}/?ref=${profile.id}` : "";

 const sendInvite = async () => {
 if (!profile || !email.trim()) return;
 setSending(true);
 try {
 await createReferral(profile.id, email.trim());
 const s = await getReferralStats(profile.id);
 setStats(s);
 setEmail("");
 toast.success(isAr ? "تم إرسال الدعوة! هتاخد خصم 10% لما صديقك يشترك." : "Invitation sent! You'll get 10% discount when your friend subscribes.");
 } catch (e: any) {
 toast.error(e.message || (isAr ? "حدث خطأ" : "Something went wrong"));
 } finally {
 setSending(false);
 }
 };

 const copyLink = () => {
 navigator.clipboard.writeText(referralLink);
 setCopied(true);
 toast.success(isAr ? "تم نسخ الرابط!" : "Link copied!");
 setTimeout(() => setCopied(false), 2000);
 };

 if (loading) return <div className="text-muted-foreground">{t("common.loading")}</div>;

 return (
 <div className="space-y-6">
 <div>
 <h1 className="text-2xl font-bold md:text-3xl">
 {isAr ? "برنامج الإحالة" : "Referral Program"}
 </h1>
 <p className="mt-1 text-sm text-muted-foreground">
 {isAr
 ? "ادعي أصدقاؤك واكسب خصم 10% على اشتراكك لكل صديق يشترك!"
 : "Invite your friends and earn 10% discount for each friend who subscribes!"}
 </p>
 </div>

 {/* Stats */}
 <div className="grid gap-4 sm:grid-cols-3">
 <Card className="p-5 shadow-card">
 <div className="flex items-center gap-3">
 <span className="grid h-10 w-10 place-items-center rounded-xl bg-primary/15 text-primary">
 <Users className="h-5 w-5" />
 </span>
 <div>
 <p className="font-display text-2xl font-bold">{stats.total}</p>
 <p className="text-xs text-muted-foreground">{isAr ? "إجمالي الدعوات" : "Total invites"}</p>
 </div>
 </div>
 </Card>
 <Card className="p-5 shadow-card">
 <div className="flex items-center gap-3">
 <span className="grid h-10 w-10 place-items-center rounded-xl bg-success/15 text-success">
 <Check className="h-5 w-5" />
 </span>
 <div>
 <p className="font-display text-2xl font-bold text-success">{stats.completed}</p>
 <p className="text-xs text-muted-foreground">{isAr ? "اشتركوا" : "Subscribed"}</p>
 </div>
 </div>
 </Card>
 <Card className="p-5 shadow-card">
 <div className="flex items-center gap-3">
 <span className="grid h-10 w-10 place-items-center rounded-xl bg-warning/15 text-warning">
 <TrendingUp className="h-5 w-5" />
 </span>
 <div>
 <p className="font-display text-2xl font-bold text-warning">{stats.pending}</p>
 <p className="text-xs text-muted-foreground">{isAr ? "في الانتظار" : "Pending"}</p>
 </div>
 </div>
 </Card>
 </div>

 {/* Invite by email */}
 <Card className="p-6 shadow-card">
 <h2 className="flex items-center gap-2 text-lg font-semibold">
 <Gift className="h-5 w-5 text-primary" />
 {isAr ? "ادعي صديق بالإيميل" : "Invite a friend by email"}
 </h2>
 <p className="mt-1 text-sm text-muted-foreground">
 {isAr ? "هنبعتله دعوة بالإيميل، ولما يشترك هتاخد خصم 10% تلقائياً." : "We'll send them an email invitation. When they subscribe, you get 10% discount automatically."}
 </p>
 <div className="mt-4 flex flex-col gap-2 sm:flex-row">
 <Input
 type="email"
 value={email}
 onChange={(e) => setEmail(e.target.value)}
 placeholder={isAr ? "صديقك@example.com" : "friend@example.com"}
 dir="ltr"
 />
 <Button onClick={sendInvite} disabled={sending || !email.trim()} className="gap-2">
 {sending ? (isAr ? "جارٍ الإرسال..." : "Sending...") : (isAr ? "أرسل الدعوة" : "Send invite")}
 </Button>
 </div>
 </Card>

 {/* Share link */}
 <Card className="p-6 shadow-card">
 <h2 className="flex items-center gap-2 text-lg font-semibold">
 <Share2 className="h-5 w-5 text-primary" />
 {isAr ? "رابط الإحالة الخاص بك" : "Your referral link"}
 </h2>
 <p className="mt-1 text-sm text-muted-foreground">
 {isAr ? "شارك الرابط ده على وسائل التواصل واحصل على خصم لكل اشتراك." : "Share this link on social media and get discount for each subscription."}
 </p>
 <div className="mt-4 flex flex-col gap-2 sm:flex-row">
 <Input
 value={referralLink}
 readOnly
 dir="ltr"
 className="font-mono text-sm"
 />
 <Button onClick={copyLink} variant="secondary" className="gap-2 shrink-0">
 {copied ? <Check className="h-4 w-4 text-success" /> : <Copy className="h-4 w-4" />}
 {copied ? (isAr ? "اتنسخ!" : "Copied!") : (isAr ? "نسخ" : "Copy")}
 </Button>
 </div>
 </Card>

 {/* Referrals list */}
 {stats.referrals.length > 0 && (
 <Card className="p-6 shadow-card">
 <h2 className="text-lg font-semibold">{isAr ? "الدعوات المُرسلة" : "Sent invitations"}</h2>
 <div className="mt-4 space-y-2">
 {stats.referrals.map((r: any) => (
 <div key={r.id} className="flex items-center justify-between rounded-xl border border-border p-3">
 <div>
 <p className="text-sm font-medium">{r.referred_email}</p>
 <p className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleDateString()}</p>
 </div>
 <Badge variant="outline" className={
 r.status === "completed" ? "border-success text-success" :
 r.status === "pending" ? "border-warning text-warning" : ""
 }>
 {r.status === "completed" ? (isAr ? "اكتمل " : "Completed ") :
 r.status === "pending" ? (isAr ? "في الانتظار" : "Pending") : r.status}
 </Badge>
 </div>
 ))}
 </div>
 </Card>
 )}
 </div>
 );
}
