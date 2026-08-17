/**
 * Sentry client-side config.
 *
 * Only initializes if NEXT_PUBLIC_SENTRY_DSN env var is set — so the
 * site runs fine without Sentry configured (useful for local dev
 * and for first deployment before Sentry is set up).
 *
 * To enable Sentry:
 *   1. Create a project at https://sentry.io (free tier: 5K errors/mo)
 *   2. Copy the DSN from Project Settings → Client Keys
 *   3. Set NEXT_PUBLIC_SENTRY_DSN in Vercel env vars (Exposure: Public)
 *   4. (Optional) Set SENTRY_AUTH_TOKEN + SENTRY_ORG + SENTRY_PROJECT
 *      for source map upload during builds.
 *
 * After deploy, errors thrown in the browser will automatically
 * appear in your Sentry dashboard.
 */

import * as Sentry from "@sentry/nextjs";

const SENTRY_DSN = process.env.NEXT_PUBLIC_SENTRY_DSN;

if (SENTRY_DSN && SENTRY_DSN.startsWith("https://")) {
  Sentry.init({
    dsn: SENTRY_DSN,

    // Adjust sampling in production for performance + replays
    tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,

    // Session replays — capture 10% of normal sessions, 100% of errors
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,

    integrations: [
      Sentry.replayIntegration({
        // Mask all text + input content for privacy
        maskAllText: true,
        blockAllMedia: true,
      }),
    ],

    // Ignore noisy non-error events
    ignoreErrors: [
      // Browser extension noise
      "top.GLOBALS",
      "ResizeObserver loop limit exceeded",
      "ResizeObserver loop completed with undelivered notifications",
      // Network errors users can't act on
      "Network request failed",
      "Failed to fetch",
      // Auth canceled by user
      "AUTH_CANCELED",
    ],

    // Don't send PII
    beforeSend(event) {
      // Strip user IP
      if (event.request?.headers) {
        delete event.request.headers["x-forwarded-for"];
        delete event.request.headers["x-real-ip"];
      }
      return event;
    },
  });
}
