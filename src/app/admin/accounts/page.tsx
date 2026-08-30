"use client";
import { AdminAccountsView } from "@/components/views/AdminAccountsView";

/**
 * ADMIN — ACCOUNTS MANAGER (0045).
 * Owner request: «ضيف فى داشبورد الادمن طريقة للتعليم على الحسابات وزرار مسح»
 * One place to mark test accounts (badged) and delete accounts (guarded,
 * cascade delete). Protected by the /admin layout AdminGate (role='admin'
 * only — coaches bounce to /coach, clients to /dashboard).
 */
export default function Page() {
  return <AdminAccountsView />;
}
