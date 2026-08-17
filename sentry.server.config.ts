/**
 * Sentry server-side config.
 *
 * Initializes on the server only if SENTRY_DSN env var is set.
 * Captures errors thrown in API routes, server components, and
 * server actions.
 */

import * as Sentry from "@sentry/nextjs";

const SENTRY_DSN = process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN;

if (SENTRY_DSN && SENTRY_DSN.startsWith("https://")) {
  Sentry.init({
    dsn: SENTRY_DSN,

    // Lower trace sample rate on the server (API routes generate more spans)
    tracesSampleRate: process.env.NODE_ENV === "production" ? 0.05 : 1.0,

    // Don't send PII
    beforeSend(event) {
      if (event.request?.headers) {
        delete event.request.headers["authorization"];
        delete event.request.headers["cookie"];
      }
      return event;
    },
  });
}
