import { redirect } from "next/navigation";

/**
 * /admin/coach-system — Admin Panel 2.0 (Phase 101): the coach hub moved
 * to /admin/coaches (the sidebar's Coaches section landing). This redirect
 * keeps old links (sidebar history, bookmarks, notifications) working.
 */
export default function CoachSystemRedirect() {
  redirect("/admin/coaches");
}
