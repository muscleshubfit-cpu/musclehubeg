"use client";

import { useState, useEffect, useRef } from "react";

/**
 * CookieConsent — GDPR/AdSense consent banner.
 *
 * Shows a bottom bar asking users to accept/reject cookies.
 * Stores consent in localStorage (365 days).
 * Calls gtag to update consent mode for AdSense.
 *
 * AdSense will only serve personalized ads if consent is granted.
 */

const CONSENT_KEY = "mhe_cookie_consent";
const CONSENT_DURATION = 365 * 24 * 60 * 60 * 1000; // 365 days

function updateConsent(granted: boolean) {
  try {
    // @ts-ignore — gtag is loaded by AdSense/GA
    window.gtag = window.gtag || [];
    // @ts-ignore
    window.gtag("consent", "update", {
      ad_storage: granted ? "granted" : "denied",
      ad_user_data: granted ? "granted" : "denied",
      ad_personalization: granted ? "granted" : "denied",
      analytics_storage: granted ? "granted" : "denied",
    });
  } catch {}
}

export function CookieConsent() {
  const [show, setShow] = useState(false);
  const [lang, setLang] = useState<"ar" | "en">("en");
  const barRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Detect language from <html lang="...">
    const htmlLang = document.documentElement.lang;
    setLang(htmlLang === "ar" ? "ar" : "en");

    // Check if user already gave consent
    try {
      const stored = localStorage.getItem(CONSENT_KEY);
      if (stored) {
        const data = JSON.parse(stored);
        const age = Date.now() - data.timestamp;
        if (age < CONSENT_DURATION) {
          // Consent still valid — update gtag
          updateConsent(data.granted);
          return;
        }
      }
    } catch {}

    // No valid consent — show banner
    setShow(true);
  }, []);

  // NO-COVER LAW (2026-08-27): while this banner is visible it must NEVER
  // hide fixed bottom-corner UI — specifically the EVO floating chat icon
  // (z-50 < this banner's z-[100] covered it entirely on mobile, so new
  // visitors could not open EVO at all). The banner publishes its height
  // as --mhe-cookie-bar-h on :root; fixed bottom elements lift themselves
  // with bottom: calc(<offset> + var(--mhe-cookie-bar-h, 0px)).
  useEffect(() => {
    const root = document.documentElement;
    if (!show) {
      root.style.setProperty("--mhe-cookie-bar-h", "0px");
      root.removeAttribute("data-mhe-cookie-banner");
      return;
    }
    const el = barRef.current;
    if (!el) return;
    const publish = () =>
      root.style.setProperty("--mhe-cookie-bar-h", `${el.offsetHeight}px`);
    publish();
    root.setAttribute("data-mhe-cookie-banner", "open");
    const ro = new ResizeObserver(publish);
    ro.observe(el);
    return () => {
      ro.disconnect();
      root.style.setProperty("--mhe-cookie-bar-h", "0px");
      root.removeAttribute("data-mhe-cookie-banner");
    };
  }, [show]);

  const handleAccept = () => {
    const data = { granted: true, timestamp: Date.now() };
    try {
      localStorage.setItem(CONSENT_KEY, JSON.stringify(data));
    } catch {}
    updateConsent(true);
    setShow(false);
  };

  const handleReject = () => {
    const data = { granted: false, timestamp: Date.now() };
    try {
      localStorage.setItem(CONSENT_KEY, JSON.stringify(data));
    } catch {}
    updateConsent(false);
    setShow(false);
  };

  if (!show) return null;

  const isAr = lang === "ar";

  return (
    <div
      ref={barRef}
      className="marble-card fixed bottom-0 left-0 right-0 z-[100] rounded-none! p-4 shadow-lg md:p-6"
    >
      <div className="mx-auto flex max-w-4xl flex-col items-center gap-4 md:flex-row md:justify-between">
        <p className="text-center text-sm font-normal text-[var(--muted-2)] md:text-start">
          {isAr
            ? "نستخدم ملفات تعريف الارتباط لتحسين تجربتك وعرض الإعلانات. بمتابعتك استخدام الموقع، فإنك توافق على سياسة الخصوصية."
            : "We use cookies to improve your experience and show ads. By continuing to use this site, you agree to our privacy policy."}
        </p>
        <div className="flex shrink-0 gap-3">
          <button
            onClick={handleReject}
            className="btn-outline px-5 py-2 text-sm"
          >
            {isAr ? "رفض" : "Reject"}
          </button>
          <button
            onClick={handleAccept}
            className="btn-chrome px-5 py-2 text-sm"
          >
            {isAr ? "قبول" : "Accept"}
          </button>
        </div>
      </div>
    </div>
  );
}
