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
import { useNav } from "@/hooks/use-nav";
import { cn } from "@/lib/utils";
import { listAdminNotifications, markAdminNotificationsRead, markAdminNotificationRead } from "@/lib/data";

export function AdminNotificationBell() {
 const { t } = useI18n();
 const { navigate } = useNav();
 const router = useRouter();
 const [open, setOpen] = useState(false);
 const [items, setItems] = useState<any[]>([]);
 const [loading, setLoading] = useState(true);

 useEffect(() => {
 let interval: any;
 const load = async () => {
 const data = await listAdminNotifications();
 setItems(data);
 setLoading(false);
 };
 load();
 interval = setInterval(load, 30000);
 return () => clearInterval(interval);
 }, []);

 const unread = items.filter((n) => !n.read).length;

 const handleMarkRead = async () => {
 await markAdminNotificationsRead();
 setItems((prev) => prev.map((n) => ({ ...n, read: true })));
 };

 const handleNavigate = (link?: string | null) => {
 if (!link) return;
 if (link === "coach") navigate("coach");
 else if (link === "coach-support") navigate("coach-support");
 // 0043: legacy rows carry "coach-payments"; new rows carry
 // "/admin/payments" — both land on the admin-only review page.
 else if (link === "coach-payments" || link === "/admin/payments") navigate("admin-payments");
 // 0049 — anything else that is a real path (e.g. the coach-pages
 // review queue "/admin/coach-pages") opens directly.
 else if (link.startsWith("/")) router.push(link);
 };

 // 0049 — clicking a notification = READ (same rule as the client bell).
 // Optimistic flip + fire-and-forget DB update; RLS lets admins update
 // any row and staff update their own/broadcast rows.
 const handleItemClick = (n: { id: string; read: boolean; link?: string | null }) => {
 setOpen(false);
 if (!n.read) {
 setItems((prev) => prev.map((x) => (x.id === n.id ? { ...x, read: true } : x)));
 void markAdminNotificationRead(n.id).catch((e) =>
 console.error("[AdminNotificationBell] mark read failed:", e),
 );
 }
 handleNavigate(n.link);
 };

 return (
 <Popover open={open} onOpenChange={setOpen}>
 <PopoverTrigger asChild>
 <Button variant="ghost" size="sm" className="relative px-2">
 <Bell className="h-4 w-4" />
 {unread > 0 && (
 <span className="absolute -end-0.5 -top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-gold px-1 text-[10px] font-bold text-gold-foreground">
 {unread > 9 ? "9+" : unread}
 </span>
 )}
 </Button>
 </PopoverTrigger>
 <PopoverContent align="end" className="w-80 p-0">
 <div className="flex items-center justify-between border-b border-border px-3 py-2">
 <span className="text-sm font-semibold">إشعارات الكوتش</span>
 {unread > 0 && (
 <button
 onClick={handleMarkRead}
 className="flex items-center gap-1 text-xs text-gold hover:underline"
 >
 <Check className="h-3 w-3" />
 تعليم الكل كمقروء
 </button>
 )}
 </div>
 <div className="max-h-80 overflow-y-auto scrollbar-thin">
 {loading ? (
 <p className="px-3 py-8 text-center text-sm text-muted-foreground">{t("common.loading")}</p>
 ) : items.length === 0 ? (
 <p className="px-3 py-8 text-center text-sm text-muted-foreground">لا توجد إشعارات</p>
 ) : (
 items.map((n) => (
 <button
 key={n.id}
 onClick={() => handleItemClick(n)}
 className={cn(
 "flex w-full flex-col gap-0.5 border-b border-border/60 px-3 py-2.5 text-start transition-colors hover:bg-secondary",
 !n.read && "bg-gold/5",
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
