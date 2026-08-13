import { NextRequest, NextResponse } from "next/server";
import { testConnection, getOverrideFromRequest, type AIProvider } from "@/lib/ai-provider";
import { requireCoach, isAuthConfigured } from "@/lib/auth-server";

/**
 * Test Connection — POST /api/ai/test
 *
 * Body:
 * - { use: "saved" } → test whatever is in the saved cookies/env
 * - { use: "preview", provider, apiKey, model, baseUrl } → test the form
 * values BEFORE saving them, so the admin can validate before commit.
 *
 * Coach-only — could otherwise be abused to validate stolen API keys.
 */
export async function POST(request: NextRequest) {
 try {
 // Coach-only — don't let anonymous callers validate arbitrary API keys.
 if (isAuthConfigured) {
 const auth = await requireCoach(request);
 if (auth instanceof Response) return auth;
 }

 const body = await request.json();

 let override: any = null;
 if (body?.use === "preview") {
 override = {
 provider: body.provider as AIProvider,
 apiKey: body.apiKey as string,
 model: body.model as string,
 baseUrl: body.baseUrl as string,
 };
 } else {
 override = getOverrideFromRequest(request);
 }

 const result = await testConnection(override);
 return NextResponse.json(result);
 } catch (e: any) {
 return NextResponse.json(
 { ok: false, error: e.message || "Connection test failed" },
 { status: 200 }, // 200 with ok=false so the UI can show the error nicely
 );
 }
}
