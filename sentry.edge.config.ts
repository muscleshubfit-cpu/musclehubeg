/**
 * Sentry edge runtime config.
 *
 * Initializes on the edge runtime (middleware) only if SENTRY_DSN
 * env var is set.
 */

import * as Sentry from "@sentry/nextjs";

const SENTRY_DSN = process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN;

if (SENTRY_DSN && SENTRY_DSN.startsWith("https://")) {
  Sentry.init({
    dsn: SENTRY_DSN,
    tracesSampleRate: process.env.NODE_ENV === "production" ? 0.05 : 1.0,
  });
}
