import Conf from "conf";

interface FuzitConfig {
  groqApiKey: string;
}

const config = new Conf<FuzitConfig>({
  projectName: "fuzit",
  schema: {
    groqApiKey: {
      type: "string",
      default: "",
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
