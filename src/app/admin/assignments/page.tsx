"use client";
import { AdminAssignmentsView } from "@/components/views/AdminAssignmentsView";

/**
 * MULTI-COACH PHASE 2B (follow-up) — dedicated admin assignments page.
 * Protected by the /admin layout AdminGate (role='admin' only — coaches
 * bounce to /coach, clients to /dashboard). noindex comes from the
 * admin layout metadata.
 */
export default function Page() {
  return <AdminAssignmentsView />;
}
