import { NextRequest, NextResponse } from "next/server";
import { testConnection, type AIProvider } from "@/lib/ai-provider";
import { getOverrideFromRequest } from "@/app/api/ai/settings/route";

/**
 * Test Connection — POST /api/ai/test
 *
 * Body:
 *   - { use: "saved" }     → test whatever is in the saved cookies/env
 *   - { use: "preview", provider, apiKey, model, baseUrl } → test the form
 *     values BEFORE saving them, so the admin can validate before commit.
 */
export async function POST(request: NextRequest) {
  try {
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
