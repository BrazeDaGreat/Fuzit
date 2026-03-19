import Conf from "conf";
import { DEFAULT_MODEL_ID } from "../config/models.js";

export interface HistoryEntry {
  request: string;
  commands: string[];
  explanation: string;
  timestamp: number;
}

interface FuzitConfig {
  groqApiKey: string;
  model: string;
  history: HistoryEntry[];
}

const MAX_HISTORY = 50;

const config = new Conf<FuzitConfig>({
  projectName: "fuzit",
  schema: {
    groqApiKey: {
      type: "string",
      default: "",
    },
    model: {
      type: "string",
      default: DEFAULT_MODEL_ID,
    },
    history: {
      type: "array",
      default: [],
    },
  },
});

export function getApiKey(): string {
  return config.get("groqApiKey");
}

export function setApiKey(key: string): void {
  config.set("groqApiKey", key);
}

export function hasApiKey(): boolean {
  return config.get("groqApiKey") !== "";
}

export function getModel(): string {
  return config.get("model") || DEFAULT_MODEL_ID;
}

export function setModel(model: string): void {
  config.set("model", model);
}

export function getHistory(): HistoryEntry[] {
  return (config.get("history") as HistoryEntry[]) ?? [];
}

export function addHistory(entry: HistoryEntry): void {
  const history = getHistory();
  history.unshift(entry);
  config.set("history", history.slice(0, MAX_HISTORY));
}
