/**
 * Empty stub for the "server-only" package (see vitest.config.ts alias).
 *
 * In Next.js builds, importing "server-only" from a client component
 * fails the build — exactly the guard we want. Vitest runs under
 * browser module conditions where the real package would throw even
 * for legitimate server-side unit tests, so tests get this no-op.
 */
export {};
