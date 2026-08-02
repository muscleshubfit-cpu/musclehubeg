/**
 * ZAI (z.ai) API client — reads config from environment variables.
 *
 * The official z-ai-web-dev-sdk reads from a .z-ai-config file, which doesn't
 * work in serverless environments like Vercel. This module builds the config
 * from env vars instead and calls the z.ai API directly.
 *
 * Required env vars:
 *   ZAI_BASE_URL  — e.g. https://internal-api.z.ai/v1
 *   ZAI_API_KEY   — the API key (e.g. "Z.ai")
 *   ZAI_TOKEN     — the bearer token (JWT)
 *   ZAI_CHAT_ID   — optional chat session id
 *   ZAI_USER_ID   — optional user id
 */

export type ZaiConfig = {
  baseUrl: string;
  apiKey: string;
  token?: string;
  chatId?: string;
  userId?: string;
};

export type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export type ChatCompletionResponse = {
  choices: Array<{
    message: { role: string; content: string };
    finish_reason: string;
    index: number;
  }>;
  id: string;
  model: string;
  usage: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
};

export function getZaiConfig(): ZaiConfig {
  const baseUrl = process.env.ZAI_BASE_URL;
  const apiKey = process.env.ZAI_API_KEY;
  const token = process.env.ZAI_TOKEN;
  const chatId = process.env.ZAI_CHAT_ID;
  const userId = process.env.ZAI_USER_ID;

  if (!baseUrl || !apiKey) {
    throw new Error(
      "ZAI not configured. Set ZAI_BASE_URL and ZAI_API_KEY env vars.",
    );
  }

  return { baseUrl, apiKey, token, chatId, userId };
}

export async function chatCompletion(
  messages: ChatMessage[],
  options: { temperature?: number; max_tokens?: number } = {},
): Promise<string> {
  const config = getZaiConfig();
  const url = `${config.baseUrl}/chat/completions`;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${config.apiKey}`,
  };
  if (config.token) {
    headers["X-Zai-Token"] = config.token;
  }

  const body: Record<string, unknown> = {
    messages,
    ...options,
  };
  if (config.chatId) body.chat_id = config.chatId;
  if (config.userId) body.user_id = config.userId;

  const res = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`ZAI API error ${res.status}: ${text.slice(0, 200)}`);
  }

  const data: ChatCompletionResponse = await res.json();
  return data.choices[0]?.message?.content?.trim() || "";
}
