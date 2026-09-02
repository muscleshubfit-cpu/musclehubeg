import { redirect } from "next/navigation";

/**
 * /admin/accounts — Phase 103 (owner: «كلهم نفس الغرض مفروض صفحة واحده»):
 * the accounts manager (test-mark + delete tools) merged into the UNIFIED
 * clients page /admin/clients. This redirect keeps old bookmarks working.
 */
export default function AccountsRedirect() {
  redirect("/admin/clients");
}
