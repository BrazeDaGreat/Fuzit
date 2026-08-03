import React, { useState } from "react";
import { Box, Text, useInput } from "ink";
import Spinner from "ink-spinner";
import { color, glyph } from "../../../theme/theme.js";
import TextField from "../../ui/TextField.js";
import {
  fetchModels,
  makeProviderId,
  normaliseBaseUrl,
  type Provider,
} from "../../../services/providers.js";

interface ProviderFormProps {
  width: number;
  height: number;
  isActive: boolean;
  /** Null when adding. */
  provider: Provider | null;
  existingIds: string[];
  onSave: (provider: Provider) => void;
  onCancel: () => void;
}

const FIELDS = ["label", "baseUrl", "apiKey"] as const;
type Field = (typeof FIELDS)[number];

const HINTS: Record<Field, string> = {
  label: "What to call it in the picker",
  baseUrl: "Base URL up to /v1, e.g. https://api.openai.com/v1",
  apiKey: "Sent as a bearer token. Stored on this machine only.",
};

const LABELS: Record<Field, string> = {
  label: "Name",
  baseUrl: "Base URL",
  apiKey: "API key",
};

export default function ProviderForm({
  width,
  isActive,
  provider,
  existingIds,
  onSave,
  onCancel,
}: ProviderFormProps) {
  const [values, setValues] = useState({
    label: provider?.label ?? "",
    baseUrl: provider?.baseUrl ?? "",
    apiKey: provider?.apiKey ?? "",
  });
  const [field, setField] = useState<Field>("label");
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState("");

  const set = (key: Field, value: string) =>
    setValues((v) => ({ ...v, [key]: value }));

  const save = async () => {
    const label = values.label.trim();
    const baseUrl = normaliseBaseUrl(values.baseUrl);
    const apiKey = values.apiKey.trim();

    if (!label) return setError("Give the provider a name.");
    if (!baseUrl) return setError("A base URL is required.");
    if (!/^https?:\/\//i.test(baseUrl)) {
      return setError("The base URL must start with http:// or https://");
    }
    if (!apiKey) return setError("An API key is required.");

    const next: Provider = {
      id: provider?.id ?? makeProviderId(label, existingIds),
      label,
      baseUrl,
      apiKey,
      visible: provider?.visible ?? [],
      cached: provider?.cached ?? [],
      cachedAt: provider?.cachedAt ?? 0,
      builtin: provider?.builtin,
    };

    setChecking(true);
    setError("");
    try {
      // Fetching the model list proves the URL and key together, and fills the
      // picker in the same round trip.
      const ids = await fetchModels(next);
      onSave({ ...next, cached: ids, cachedAt: Date.now() });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not reach that URL.");
      setChecking(false);
    }
  };

  useInput(
    (_input, key) => {
      if (checking) return;
      if (key.escape) {
        onCancel();
        return;
      }
      if (key.tab || key.downArrow) {
        setField((f) => FIELDS[(FIELDS.indexOf(f) + 1) % FIELDS.length]!);
        return;
      }
      if (key.upArrow) {
        setField(
          (f) => FIELDS[(FIELDS.indexOf(f) - 1 + FIELDS.length) % FIELDS.length]!,
        );
      }
    },
    { isActive: isActive && !checking },
  );

  const handleSubmit = () => {
    const index = FIELDS.indexOf(field);
    if (index < FIELDS.length - 1) setField(FIELDS[index + 1]!);
    else void save();
  };

  const labelWidth = 11;
  const boxWidth = Math.min(width, 64);

  return (
    <Box flexDirection="column">
      <Text color={color.rule}>
        tab moves between fields · enter saves on the last one · esc cancels
      </Text>

      <Box flexDirection="column" marginTop={1}>
        {FIELDS.map((name) => {
          const focused = field === name && !checking;
          return (
            <Box key={name} flexDirection="column">
              <Box width={boxWidth}>
                <Text color={focused ? color.focus : color.rule}>
                  {focused ? `${glyph.mark} ` : "  "}
                </Text>
                <Box width={labelWidth}>
                  <Text color={focused ? color.focus : color.muted}>
                    {LABELS[name]}
                  </Text>
                </Box>
                <Box flexGrow={1}>
                  <TextField
                    value={values[name]}
                    onChange={(v) => set(name, v)}
                    onSubmit={handleSubmit}
                    focus={focused}
                    placeholder={name === "apiKey" ? "sk-…" : ""}
                    mask={name === "apiKey" ? "•" : undefined}
                  />
                </Box>
              </Box>
              {focused && (
                <Box paddingLeft={2 + labelWidth}>
                  <Text color={color.rule} wrap="truncate-end">
                    {HINTS[name]}
                  </Text>
                </Box>
              )}
            </Box>
          );
        })}
      </Box>

      {checking && (
        <Box marginTop={1}>
          <Text color={color.info}>
            <Spinner type="dots" />
          </Text>
          <Text color={color.muted}> checking the URL and key</Text>
        </Box>
      )}

      {error && !checking && (
        <Box marginTop={1} width={boxWidth}>
          <Text color={color.bad} wrap="wrap">
            {glyph.bad} {error}
          </Text>
        </Box>
      )}
    </Box>
  );
}
