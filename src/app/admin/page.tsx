import { redirect } from "next/navigation";

/**
 * /admin — Admin Panel 2.0 (Phase 101): the console home is now the
 * dashboard. This redirect keeps every old bookmark/link working while
 * the sidebar's «الرئيسية» item points at /admin/dashboard directly.
 */
export default function AdminIndexRedirect() {
  redirect("/admin/dashboard");
}
