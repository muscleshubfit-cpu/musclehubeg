"use client";
import { AdminWalletsView } from "@/components/views/AdminWalletsView";

/**
 * ADMIN — COACH WALLETS (0035).
 * Protected by the /admin layout AdminGate (role='admin' only — coaches
 * bounce to /coach, clients to /dashboard). noindex comes from the
 * admin layout metadata.
 */
export default function Page() {
  return <AdminWalletsView />;
}
