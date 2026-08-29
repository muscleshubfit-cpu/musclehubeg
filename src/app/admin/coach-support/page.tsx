"use client";
import { AdminCoachSupportView } from "@/components/views/AdminCoachSupportView";

/**
 * ADMIN — COACH SUPPORT (0037).
 * Protected by the /admin layout AdminGate (role='admin' only — coaches
 * bounce to /coach, clients to /dashboard). noindex comes from the
 * admin layout metadata. The in-app reply channel for the coach → site
 * support threads («دعم المدربين» — separate from client support).
 */
export default function Page() {
  return <AdminCoachSupportView />;
}
