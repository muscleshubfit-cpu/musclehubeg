import { NextRequest, NextResponse } from "next/server";
import {
  AI_PROVIDERS,
  getStatus,
  mergeOverride,
  type AIProvider,
} from "@/lib/ai-provider";

/**
 * AI Settings — GET returns the current status (key never exposed).
 * POST saves an override (provider + key + model + baseUrl) into HTTP-only
 * cookies so subsequent /api/ai/* calls use it without any code changes.
 *
 * This is server-only: the API key is never returned to the browser, and it
 * is never logged.
 */

const COOKIE_PROVIDER = "ai_provider";
const COOKIE_KEY = "ai_api_key";
const COOKIE_MODEL = "ai_model";
const COOKIE_BASE = "ai_base_url";
const COOKIE_OPTS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge: 60 * 60 * 24 * 365, // 1 year
};

function readOverrideFromCookies(req: NextRequest) {
  const provider = req.cookies.get(COOKIE_PROVIDER)?.value as AIProvider | undefined;
  const apiKey = req.cookies.get(COOKIE_KEY)?.value;
  const model = req.cookies.get(COOKIE_MODEL)?.value;
  const baseUrl = req.cookies.get(COOKIE_BASE)?.value;
  if (!provider && !apiKey) return null;
  return {
    provider: provider || undefined,
    apiKey: apiKey || undefined,
    model: model || undefined,
    baseUrl: baseUrl || undefined,
  };
}

export async function GET(request: NextRequest) {
  const override = readOverrideFromCookies(request);
  const status = getStatus(override);
  return NextResponse.json({
    status,
    providers: Object.entries(AI_PROVIDERS).map(([id, meta]) => ({
      id,
      label: meta.label,
      defaultModel: meta.defaultModel,
      baseUrl: meta.baseUrl,
      docsUrl: meta.docsUrl,
      keyPrefix: meta.keyPrefix,
      envKey: meta.envKey,
    })),
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body as { action?: "save" | "clear" };

    if (action === "clear") {
      const res = NextResponse.json({ ok: true, cleared: true });
      res.cookies.delete(COOKIE_PROVIDER);
      res.cookies.delete(COOKIE_KEY);
      res.cookies.delete(COOKIE_MODEL);
      res.cookies.delete(COOKIE_BASE);
      return res;
    }

    const provider = (body.provider as AIProvider) || "openrouter";
    if (!AI_PROVIDERS[provider]) {
      return NextResponse.json({ error: `Unknown provider: ${provider}` }, { status: 400 });
    }

    const apiKey = (body.apiKey as string | undefined)?.trim();
    const model = (body.model as string | undefined)?.trim();
    const baseUrl = (body.baseUrl as string | undefined)?.trim();

    // If the caller didn't supply a key, we keep the existing cookie value
    // (so they can change provider/model without re-entering the key).
    const existingKey = request.cookies.get(COOKIE_KEY)?.value;
    const finalKey = apiKey || existingKey || "";

    if (!finalKey) {
      return NextResponse.json(
        { error: "An API key is required to save settings." },
        { status: 400 },
      );
    }

    const meta = AI_PROVIDERS[provider];
    const finalModel = model || meta.defaultModel;
    const finalBaseUrl = baseUrl || meta.baseUrl;

    const res = NextResponse.json({
      ok: true,
      status: getStatus({
        provider,
        apiKey: finalKey,
        model: finalModel,
        baseUrl: finalBaseUrl,
      }),
    });
    res.cookies.set(COOKIE_PROVIDER, provider, COOKIE_OPTS);
    res.cookies.set(COOKIE_KEY, finalKey, COOKIE_OPTS);
    res.cookies.set(COOKIE_MODEL, finalModel, COOKIE_OPTS);
    res.cookies.set(COOKIE_BASE, finalBaseUrl, COOKIE_OPTS);
    return res;
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Failed to save settings" }, { status: 500 });
  }
}

/**
 * Helper used by other server routes to read the AI override config from
 * the request cookies. Exported so /api/ai/test and /api/ai/generate-article
 * can share the same override resolution logic.
 */
export function getOverrideFromRequest(request: NextRequest) {
  return readOverrideFromCookies(request);
}

export { mergeOverride };
