/**
 * Any OpenAI-compatible chat API. Groq is simply the provider Fuzit ships with
 * — its endpoint speaks the same protocol, so there is one client, not two.
 *
 * Nothing here touches stored config: every function takes the provider it
 * should talk to, which keeps this module free of a cycle with config.ts.
 */

export interface Provider {
  id: string;
  label: string;
  /** Base URL up to and including the version segment, e.g. …/openai/v1 */
  baseUrl: string;
  apiKey: string;
  /** Model ids the user chose to show. Empty means "show everything fetched". */
  visible: string[];
  /** Last successful /models response. */
  cached: string[];
  cachedAt: number;
  /** Shipped with Fuzit — can be edited but not deleted. */
  builtin?: boolean;
}

export const GROQ_PROVIDER_ID = "groq";

export function defaultProviders(): Provider[] {
  return [
    {
      id: GROQ_PROVIDER_ID,
      label: "Groq",
      baseUrl: "https://api.groq.com/openai/v1",
      apiKey: "",
      visible: [
        "llama-3.3-70b-versatile",
        "openai/gpt-oss-120b",
        "openai/gpt-oss-20b",
        "llama-3.1-8b-instant",
      ],
      cached: [],
      cachedAt: 0,
      builtin: true,
    },
  ];
}

export function makeProviderId(label: string, taken: string[]): string {
  const base =
    label
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "provider";
  let id = base;
  let n = 2;
  while (taken.includes(id)) {
    id = `${base}-${n}`;
    n += 1;
  }
  return id;
}

/** Trailing slashes make `${baseUrl}/models` produce a double slash. */
export function normaliseBaseUrl(url: string): string {
  return url.trim().replace(/\/+$/, "");
}

function headers(provider: Provider): Record<string, string> {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${provider.apiKey}`,
  };
}

async function readError(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as {
      error?: { message?: string };
      message?: string;
    };
    return body.error?.message ?? body.message ?? `HTTP ${response.status}`;
  } catch {
    return `HTTP ${response.status}`;
  }
}

/** GET /models. Doubles as the credential check — cheaper than a completion. */
export async function fetchModels(provider: Provider): Promise<string[]> {
  const response = await fetch(`${normaliseBaseUrl(provider.baseUrl)}/models`, {
    method: "GET",
    headers: headers(provider),
  });

  if (!response.ok) throw new Error(await readError(response));

  const body = (await response.json()) as { data?: Array<{ id?: string }> };
  const ids = (body.data ?? [])
    .map((m) => m.id)
    .filter((id): id is string => typeof id === "string" && id.length > 0);

  return ids.sort((a, b) => a.localeCompare(b));
}

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface StreamOptions {
  provider: Provider;
  model: string;
  messages: ChatMessage[];
  signal?: AbortSignal;
}

/**
 * Yields content deltas as they arrive.
 *
 * `response_format: json_object` is not universal across OpenAI-compatible
 * servers, so a 400 gets one retry without it — the prompt already demands
 * JSON on its own.
 */
export async function* streamChat({
  provider,
  model,
  messages,
  signal,
}: StreamOptions): AsyncGenerator<string, void, unknown> {
  const url = `${normaliseBaseUrl(provider.baseUrl)}/chat/completions`;
  const base = {
    model,
    messages,
    temperature: 0.1,
    max_tokens: 1024,
    stream: true,
  };

  let response = await fetch(url, {
    method: "POST",
    headers: headers(provider),
    body: JSON.stringify({ ...base, response_format: { type: "json_object" } }),
    signal,
  });

  if (response.status === 400) {
    response = await fetch(url, {
      method: "POST",
      headers: headers(provider),
      body: JSON.stringify(base),
      signal,
    });
  }

  if (!response.ok) throw new Error(await readError(response));
  if (!response.body) throw new Error("The provider returned an empty stream.");

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });

    // SSE frames are separated by a blank line; keep the tail for the next read.
    const frames = buffer.split("\n");
    buffer = frames.pop() ?? "";

    for (const frame of frames) {
      const line = frame.trim();
      if (!line.startsWith("data:")) continue;

      const payload = line.slice(5).trim();
      if (payload === "[DONE]") return;

      try {
        const chunk = JSON.parse(payload) as {
          choices?: Array<{ delta?: { content?: string } }>;
        };
        const delta = chunk.choices?.[0]?.delta?.content;
        if (delta) yield delta;
      } catch {
        // A partial frame; the next read completes it.
      }
    }
  }
}
