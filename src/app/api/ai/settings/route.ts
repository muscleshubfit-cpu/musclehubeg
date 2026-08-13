import { NextRequest, NextResponse } from "next/server";
import {
 AI_PROVIDERS,
 getStatus,
 mergeOverride,
 getOverrideFromRequest as getOverrideFromCookies,
 AI_SETTINGS_COOKIES,
 type AIProvider,
} from "@/lib/ai-provider";
import { requireCoach, isAuthConfigured } from "@/lib/auth-server";

/**
 * AI Settings — GET returns the current status (key never exposed).
 * POST saves an override (provider + key + model + baseUrl) into HTTP-only
 * cookies so subsequent /api/ai/* calls use it without any code changes.
 *
 * This is server-only: the API key is never returned to the browser, and it
 * is never logged.
 *
 * The cookie-reading helper and cookie names live in `@/lib/ai-provider`
 * so other server routes can use them without a circular import on this
 * route handler.
 */

const COOKIE_PROVIDER = AI_SETTINGS_COOKIES.provider;
const COOKIE_KEY = AI_SETTINGS_COOKIES.apiKey;
const COOKIE_MODEL = AI_SETTINGS_COOKIES.model;
const COOKIE_BASE = AI_SETTINGS_COOKIES.baseUrl;
const COOKIE_OPTS = {
 httpOnly: true,
 secure: process.env.NODE_ENV === "production",
 sameSite: "lax" as const,
 path: "/",
 maxAge: 60 * 60 * 24 * 365, // 1 year
};

export async function GET(request: NextRequest) {
 const override = getOverrideFromCookies(request);
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
 // Coach-only — stores an AI provider key in admin's cookies.
 if (isAuthConfigured) {
 const auth = await requireCoach(request);
 if (auth instanceof Response) return auth;
 }

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
 * Backward-compat re-export. Other server routes used to import this from
 * the settings route handler; the implementation now lives in
 * `@/lib/ai-provider` to avoid a circular dependency on a route file.
 * Update imports to `@/lib/ai-provider` — this re-export will be removed
 * in a future cleanup.
 */
export { getOverrideFromRequest } from "@/lib/ai-provider";

export { mergeOverride };
