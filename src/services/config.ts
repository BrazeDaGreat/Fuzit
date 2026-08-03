import Conf from "conf";
import {
  defaultProviders,
  GROQ_PROVIDER_ID,
  type Provider,
} from "./providers.js";

export interface HistoryEntry {
  request: string;
  commands: string[];
  explanation: string;
  timestamp: number;
}

interface FuzitConfig {
  /** Legacy single-provider fields, migrated on first read. */
  groqApiKey: string;
  model: string;
  history: HistoryEntry[];
  guardDestructive: boolean;
  allowGh: boolean;
  providers: Provider[];
  activeProviderId: string;
  activeModelId: string;
}

const MAX_HISTORY = 50;
const DEFAULT_MODEL_ID = "llama-3.3-70b-versatile";

const config = new Conf<FuzitConfig>({
  projectName: "fuzit",
  schema: {
    groqApiKey: { type: "string", default: "" },
    model: { type: "string", default: DEFAULT_MODEL_ID },
    history: { type: "array", default: [] },
    guardDestructive: { type: "boolean", default: true },
    allowGh: { type: "boolean", default: true },
    providers: { type: "array", default: [] },
    activeProviderId: { type: "string", default: GROQ_PROVIDER_ID },
    activeModelId: { type: "string", default: DEFAULT_MODEL_ID },
  },
});

/**
 * Folds the old `groqApiKey` + `model` pair into the provider list. Runs once;
 * afterwards the legacy keys are ignored.
 */
function migrate(): void {
  const existing = (config.get("providers") as Provider[]) ?? [];
  if (existing.length > 0) return;

  const providers = defaultProviders();
  const legacyKey = config.get("groqApiKey");
  if (legacyKey) {
    providers[0]!.apiKey = legacyKey;
  }

  config.set("providers", providers);
  config.set("activeProviderId", GROQ_PROVIDER_ID);
  config.set("activeModelId", config.get("model") || DEFAULT_MODEL_ID);
}

migrate();

export function getProviders(): Provider[] {
  const list = (config.get("providers") as Provider[]) ?? [];
  return list.length > 0 ? list : defaultProviders();
}

export function saveProviders(providers: Provider[]): void {
  config.set("providers", providers);
}

export function upsertProvider(provider: Provider): void {
  const providers = getProviders();
  const index = providers.findIndex((p) => p.id === provider.id);
  if (index === -1) providers.push(provider);
  else providers[index] = provider;
  saveProviders(providers);
}

export function removeProvider(id: string): void {
  const providers = getProviders().filter((p) => p.id !== id || p.builtin);
  saveProviders(providers);
  if (getActiveProviderId() === id) {
    const fallback = providers[0];
    if (fallback) setActive(fallback.id, fallback.visible[0] ?? "");
  }
}

export function getActiveProviderId(): string {
  return config.get("activeProviderId") || GROQ_PROVIDER_ID;
}

export function getActiveProvider(): Provider | undefined {
  const providers = getProviders();
  return (
    providers.find((p) => p.id === getActiveProviderId()) ?? providers[0]
  );
}

export function getActiveModelId(): string {
  return config.get("activeModelId") || DEFAULT_MODEL_ID;
}

export function setActive(providerId: string, modelId: string): void {
  config.set("activeProviderId", providerId);
  config.set("activeModelId", modelId);
}

/** True once the active provider has a key — the gate on the setup screen. */
export function isConfigured(): boolean {
  const provider = getActiveProvider();
  return Boolean(provider && provider.apiKey);
}

export function maskedKey(apiKey: string): string {
  if (!apiKey) return "not set";
  if (apiKey.length <= 8) return "set";
  return `${apiKey.slice(0, 4)}…${apiKey.slice(-4)}`;
}

export function getHistory(): HistoryEntry[] {
  return (config.get("history") as HistoryEntry[]) ?? [];
}

export function addHistory(entry: HistoryEntry): void {
  const history = getHistory();
  history.unshift(entry);
  config.set("history", history.slice(0, MAX_HISTORY));
}

export function clearHistory(): void {
  config.set("history", []);
}

export function getGuardDestructive(): boolean {
  return config.get("guardDestructive") ?? true;
}

export function setGuardDestructive(value: boolean): void {
  config.set("guardDestructive", value);
}

export function getAllowGh(): boolean {
  return config.get("allowGh") ?? true;
}

export function setAllowGh(value: boolean): void {
  config.set("allowGh", value);
}

export function configPath(): string {
  return config.path;
}
