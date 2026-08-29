"use client";
import { AdminPaymentsView } from "@/components/views/AdminPaymentsView";

/**
 * ADMIN — SITE MEMBERSHIP PAYMENT REQUESTS (0043).
 * TERMINOLOGY LAW (AGENTS.md §10): subscription_requests = SITE COACHING
 * (B2C) purchase attempts with a manual receipt (InstaPay / Vodafone
 * Cash). Only the ADMIN reviews them — coaches never see this surface
 * (their B2B money flow is wallet + coach_payments, not site requests).
 * Protected by the /admin layout AdminGate (role='admin' only — coaches
 * bounce to /coach, clients to /dashboard).
 */
export default function Page() {
  return <AdminPaymentsView />;
}
