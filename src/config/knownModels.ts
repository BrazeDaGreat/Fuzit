/**
 * Hand-written notes for models Fuzit knows well. Model lists now come from
 * each provider's /models endpoint, so this is a lookup that enriches ids we
 * recognise rather than the source of truth for what exists.
 */

export interface ModelMeta {
  label: string;
  short: string;
  description: string;
  /** 1–5, how fast it answers. */
  speed: number;
  /** 1–5, how well it handles gnarly requests. */
  power: number;
}

const KNOWN: Record<string, ModelMeta> = {
  "llama-3.3-70b-versatile": {
    label: "Llama 3.3 70B Versatile",
    short: "L3.3 70B",
    description: "Balanced speed and reasoning. A good default.",
    speed: 4,
    power: 4,
  },
  "openai/gpt-oss-120b": {
    label: "GPT OSS 120B",
    short: "GPT-OSS 120B",
    description: "Best at multi-step and unusual requests.",
    speed: 2,
    power: 5,
  },
  "openai/gpt-oss-20b": {
    label: "GPT OSS 20B",
    short: "GPT-OSS 20B",
    description: "Middle ground when the larger models are busy.",
    speed: 3,
    power: 3,
  },
  "llama-3.1-8b-instant": {
    label: "Llama 3.1 8B Instant",
    short: "L3.1 8B",
    description: "Near-instant, for one-liners you already know.",
    speed: 5,
    power: 2,
  },
};

/** Trims a provider-qualified id down to something a header bar can hold. */
function shorten(id: string): string {
  const tail = id.includes("/") ? id.slice(id.lastIndexOf("/") + 1) : id;
  return tail.length > 18 ? `${tail.slice(0, 17)}…` : tail;
}

export function modelMeta(id: string): ModelMeta | undefined {
  return KNOWN[id];
}

export function modelLabel(id: string): string {
  return KNOWN[id]?.label ?? id;
}

export function modelShort(id: string): string {
  return KNOWN[id]?.short ?? shorten(id);
}
