"use client";

import { useEffect } from "react";
import { LandingView } from "@/components/views/LandingView";

export default function Page() {
 // Show a friendly toast if the OAuth callback redirected back with an error.
 useEffect(() => {
 if (typeof window === "undefined") return;
 const url = new URL(window.location.href);
 const authError = url.searchParams.get("auth_error");
 if (authError) {
 window.history.replaceState({}, document.title, url.pathname);
 import("sonner").then(({ toast }) => {
 toast.error(
 authError === "server-config"
 ? "Server configuration error. Please contact support."
 : `Login failed: ${authError}`,
 );
 });
 }
 }, []);

 return <LandingView />;
}
