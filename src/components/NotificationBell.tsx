"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
 Popover,
 PopoverContent,
 PopoverTrigger,
} from "@/components/ui/popover";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/hooks/use-auth";
import { useNav } from "@/hooks/use-nav";
import { cn } from "@/lib/utils";
import { listNotifications, markNotificationsRead, markNotificationRead } from "@/lib/data";

export function NotificationBell() {
 const { t } = useI18n();
 const { profile } = useAuth();
 const { navigate } = useNav();
 const router = useRouter();
 const [open, setOpen] = useState(false);
 const [items, setItems] = useState<any[]>([]);
 const [loading, setLoading] = useState(true);

 useEffect(() => {
 if (!profile) return;
 let interval: any;
 const load = async () => {
 try {
 const data = await listNotifications(profile.id);
 setItems(data);
 } catch (e) {
 console.error("[NotificationBell] load failed:", e);
 } finally {
 setLoading(false);
 }
 };
 load();
 // Poll every 30s, but pause when the tab is hidden (saves battery + bandwidth)
 const handleVisibility = () => {
 if (document.hidden) {
 clearInterval(interval);
 } else {
 load();
 interval = setInterval(load, 30000);
 }
 };
 document.addEventListener("visibilitychange", handleVisibility);
 interval = setInterval(load, 30000); // refresh every 30s
 return () => {
 clearInterval(interval);
 document.removeEventListener("visibilitychange", handleVisibility);
 };
 }, [profile]);

 const unread = items.filter((n) => !n.read).length;

 const handleMarkRead = async () => {
 if (!profile) return;
 await markNotificationsRead(profile.id);
 setItems((prev) => prev.map((n) => ({ ...n, read: true })));
 };

 // 0049 — clicking a notification = READ. Optimistic flip (badge drops,
 // highlight clears instantly) + fire-and-forget DB update; RLS covers
 // self-update. Any link that is a real path opens directly — the old
 // five-entry allowlist dead-ended referral/progress/payout links.
 const handleItemClick = (n: { id: string; read: boolean; link?: string | null }) => {
 setOpen(false);
 if (!n.read) {
 setItems((prev) => prev.map((x) => (x.id === n.id ? { ...x, read: true } : x)));
 void markNotificationRead(n.id).catch((e) =>
 console.error("[NotificationBell] mark read failed:", e),
 );
 }
 const link = typeof n.link === "string" ? n.link : "";
 if (!link.startsWith("/")) return;
 if (link === "/dashboard") navigate("dashboard");
 else if (link === "/memberships") navigate("memberships");
 else if (link === "/questionnaires") navigate("questionnaires");
 else if (link === "/plans") navigate("plans");
 else if (link === "/support") navigate("support");
 else router.push(link);
 };

 return (
 <Popover open={open} onOpenChange={setOpen}>
 <PopoverTrigger asChild>
 <Button variant="ghost" size="sm" className="relative px-2">
 <Bell className="h-4 w-4" />
 {unread > 0 && (
 <span className="absolute -end-0.5 -top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
 {unread > 9 ? "9+" : unread}
 </span>
 )}
 </Button>
 </PopoverTrigger>
 <PopoverContent align="end" className="w-80 p-0">
 <div className="flex items-center justify-between border-b border-border px-3 py-2">
 <span className="text-sm font-semibold">{t("notif.title")}</span>
 {unread > 0 && (
 <button
 onClick={handleMarkRead}
 className="flex items-center gap-1 text-xs text-primary hover:underline"
 >
 <Check className="h-3 w-3" />
 {t("notif.markRead")}
 </button>
 )}
 </div>
 <div className="max-h-80 overflow-y-auto scrollbar-thin">
 {loading ? (
 <p className="px-3 py-8 text-center text-sm text-muted-foreground">{t("common.loading")}</p>
 ) : items.length === 0 ? (
 <p className="px-3 py-8 text-center text-sm text-muted-foreground">{t("notif.empty")}</p>
 ) : (
 items.map((n) => (
 <button
 key={n.id}
 onClick={() => handleItemClick(n)}
 className={cn(
 "flex w-full flex-col gap-0.5 border-b border-border/60 px-3 py-2.5 text-start transition-colors hover:bg-secondary",
 !n.read && "bg-primary/5",
 )}
 >
 <span className="text-sm font-medium">{n.title}</span>
 {n.body && <span className="line-clamp-2 text-xs text-muted-foreground">{n.body}</span>}
 <span className="text-[10px] text-muted-foreground">
 {new Date(n.created_at).toLocaleString()}
 </span>
 </button>
 ))
 )}
 </div>
 </PopoverContent>
 </Popover>
 );
}
