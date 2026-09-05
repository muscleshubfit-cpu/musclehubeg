import { NextResponse } from "next/server";

/**
 * DEPLOY BEACON — anti-regression observability.
 *
 * Owner pain being solved: "edits vanished / reverted" incidents were
 * partly stale-parallel-code and partly NOT knowing which commit the
 * live deployment actually runs. This endpoint answers that instantly.
 *
 * Usage guide (owner):
 *   1. Open  https://<your-domain>/api/build-info
 *   2. Compare `commitShort` with the latest SHA on GitHub main
 *      (the 7-char prefix is enough).
 *        • match    → production runs your latest push; any bug you see
 *                     is real logic, not a stale deploy.
 *        • mismatch → Vercel has not finished deploying yet (or deploy
 *                     failed) — wait for the Vercel build or check its
 *                     dashboard BEFORE debugging code that already works.
 *
 * No secrets are exposed — Vercel injects these variables at BUILD time
 * and they are plain metadata (repo/branch/commit).
 *
 * GET /api/build-info → { ok, commit, commitShort, branch, checkedAt }
 */
export const dynamic = "force-dynamic";

export async function GET() {
  const commit =
    process.env.VERCEL_GIT_COMMIT_SHA ||
    process.env.GITHUB_SHA ||
    null;
  const branch =
    process.env.VERCEL_GIT_COMMIT_REF ||
    process.env.GITHUB_REF_NAME ||
    null;

  return NextResponse.json(
    {
      ok: true,
      service: "alkemos",
      // Deploy-beacon contract kept (commit/commitShort/branch) — used by
      // the owner's live-verification workflow. The internal AI topology
      // string was removed (audit H4, 2026-09-05): deploy verification
      // never needed it, and it handed architectural details to anyone.
      commit,
      commitShort: commit ? commit.slice(0, 7) : null,
      branch,
      checkedAt: new Date().toISOString(),
    },
    { headers: { "cache-control": "no-store" } },
  );
}
