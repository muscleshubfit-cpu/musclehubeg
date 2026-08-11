"use client";

import { useEffect, useState } from "react";
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
import { listNotifications, markNotificationsRead } from "@/lib/data";

export function NotificationBell() {
 const { t } = useI18n();
 const { profile } = useAuth();
 const { navigate } = useNav();
 const [open, setOpen] = useState(false);
 const [items, setItems] = useState<any[]>([]);
 const [loading, setLoading] = useState(true);

 useEffect(() => {
 if (!profile) return;
 let interval: any;
 const load = async () => {
 const data = await listNotifications(profile.id);
 setItems(data);
 setLoading(false);
 };
 load();
 interval = setInterval(load, 30000); // refresh every 30s
 return () => clearInterval(interval);
 }, [profile]);

 const unread = items.filter((n) => !n.read).length;

 const handleMarkRead = async () => {
 if (!profile) return;
 await markNotificationsRead(profile.id);
 setItems((prev) => prev.map((n) => ({ ...n, read: true })));
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
 onClick={() => {
 setOpen(false);
 if (n.link === "/dashboard") navigate("dashboard");
 else if (n.link === "/pricing") navigate("pricing");
 else if (n.link === "/questionnaires") navigate("questionnaires");
 else if (n.link === "/plans") navigate("plans");
 else if (n.link === "/support") navigate("support");
 }}
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
