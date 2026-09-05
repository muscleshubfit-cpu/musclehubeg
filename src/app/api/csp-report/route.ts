import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/csp-report — Content-Security-Policy violation sink.
 *
 * C4 (audit 2026-09-05): the site ships a Report-Only CSP first (see
 * vercel.json). Browsers POST violations here; they land in the
 * Vercel function logs where `vercel logs --since=1h` reveals exactly
 * which directives need adjusting before the policy is enforced.
 *
 * Deliberately unauthenticated (browsers send these automatically) —
 * it only reads/logs, writes nothing, and every response is a bare
 * 204. Rate limiting is unnecessary: Report-Only is temporary and
 * the endpoint does no work.
 */
export const runtime = "nodejs";

type CspReportBody = {
  "csp-report"?: Record<string, unknown>;
  report?: { body?: Record<string, unknown> };
};

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as CspReportBody;
    // Normalize both the legacy ({"csp-report": …}) and Report-To
    // ({"report": {"body": …}}) envelope shapes.
    const report = body["csp-report"] ?? body.report?.body ?? body;
    const {
      "document-uri": documentUri,
      "violated-directive": violatedDirective,
      "blocked-uri": blockedUri,
      "source-file": sourceFile,
      "line-number": lineNumber,
    } = report as Record<string, unknown>;

    console.warn(
      "[csp-report]",
      JSON.stringify({
        documentUri: String(documentUri ?? "").slice(0, 300),
        violatedDirective: String(violatedDirective ?? "").slice(0, 200),
        blockedUri: String(blockedUri ?? "").slice(0, 300),
        sourceFile: String(sourceFile ?? "").slice(0, 300),
        lineNumber: typeof lineNumber === "number" ? lineNumber : null,
      }),
    );
  } catch {
    // Malformed body — ignore (browsers occasionally send odd payloads).
  }
  return new NextResponse(null, { status: 204 });
}

export async function GET() {
  return new NextResponse(null, { status: 204 });
}
