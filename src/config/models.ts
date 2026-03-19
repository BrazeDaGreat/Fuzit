export interface GroqModel {
  id: string;
  label: string;
  description: string;
}

export const GROQ_MODELS: GroqModel[] = [
  {
    id: "llama-3.3-70b-versatile",
    label: "Llama 3.3 70B Versatile",
    description: "Balanced performance and speed (default)",
  },
  {
    id: "openai/gpt-oss-20b",
    label: "GPT OSS 20B",
    description: "OpenAI open-source 20B model",
  },
  {
    id: "openai/gpt-oss-120b",
    label: "GPT OSS 120B",
    description: "OpenAI open-source 120B model, most capable",
  },
  {
    id: "llama-3.1-8b-instant",
    label: "Llama 3.1 8B Instant",
    description: "Fastest responses, smallest model",
  },
];

export const DEFAULT_MODEL_ID = "llama-3.3-70b-versatile";

export function getModelLabel(id: string): string {
  return GROQ_MODELS.find((m) => m.id === id)?.label ?? id;
}
