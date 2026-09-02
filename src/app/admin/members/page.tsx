import { redirect } from "next/navigation";

/**
 * /admin/members — Phase 103 (owner: «كلهم نفس الغرض مفروض صفحة واحده»):
 * the members table merged into the UNIFIED clients page /admin/clients
 * (every account type + lifecycle + the accounts tools). This redirect
 * keeps old bookmarks/links working.
 */
export default function MembersRedirect() {
  redirect("/admin/clients");
}
