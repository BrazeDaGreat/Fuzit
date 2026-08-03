import React, { useState } from "react";
import { Box, Text } from "ink";
import Spinner from "ink-spinner";
import { color, glyph } from "../theme/theme.js";
import Rule from "./ui/Rule.js";
import TextField from "./ui/TextField.js";
import { upsertProvider } from "../services/config.js";
import { fetchModels, type Provider } from "../services/providers.js";

interface SetupProps {
  width: number;
  provider: Provider | undefined;
  onComplete: () => void;
  /** Set when replacing an existing key rather than on first run. */
  onCancel?: () => void;
}

export default function Setup({
  width,
  provider,
  onComplete,
  onCancel,
}: SetupProps) {
  const [key, setKey] = useState("");
  const [validating, setValidating] = useState(false);
  const [error, setError] = useState("");

  const label = provider?.label ?? "your provider";

  const handleSubmit = async (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) {
      onCancel?.();
      return;
    }
    if (!provider) {
      setError("No provider configured.");
      return;
    }

    setValidating(true);
    setError("");

    const candidate = { ...provider, apiKey: trimmed };
    try {
      // The model list is the cheapest proof the key works, and it fills the
      // picker at the same time.
      const models = await fetchModels(candidate);
      upsertProvider({ ...candidate, cached: models, cachedAt: Date.now() });
      onComplete();
    } catch (err) {
      setError(
        err instanceof Error
          ? `${label} rejected that key: ${err.message}`
          : "That key did not work.",
      );
      setKey("");
      setValidating(false);
    }
  };

  return (
    <Box flexDirection="column" width={width} paddingY={1}>
      <Box>
        <Text color={color.brand} bold>
          {glyph.mark}FUZIT
        </Text>
        <Text color={color.rule}>{`  ${glyph.sep}  `}</Text>
        <Text color={color.muted}>plain English in, git commands out</Text>
      </Box>

      <Box marginTop={1}>
        <Rule width={width} label="connect" />
      </Box>

      <Box marginTop={1} width={Math.min(width, 68)}>
        <Text color={color.text} wrap="wrap">
          Fuzit needs an API key for {label} to translate your requests. The key
          is stored on this machine only.
        </Text>
      </Box>

      {provider?.builtin && (
        <Box marginTop={1}>
          <Text color={color.muted}>Groq is free. Get a key at </Text>
          <Text color={color.info}>https://console.groq.com/keys</Text>
        </Box>
      )}

      <Box
        marginTop={1}
        width={Math.min(width, 68)}
        borderStyle="round"
        borderColor={error ? color.bad : color.brand}
        paddingX={1}
      >
        <Text color={color.focus} bold>
          {glyph.caret}{" "}
        </Text>
        {validating ? (
          <Box>
            <Text color={color.info}>
              <Spinner type="dots" />
            </Text>
            <Text color={color.muted}> checking the key with {label}</Text>
          </Box>
        ) : (
          <Box flexGrow={1}>
            <TextField
              value={key}
              onChange={setKey}
              onSubmit={handleSubmit}
              placeholder="paste your key and press enter"
              mask="•"
            />
          </Box>
        )}
      </Box>

      {error && (
        <Box marginTop={1} width={Math.min(width, 68)}>
          <Text color={color.bad} wrap="wrap">
            {glyph.bad} {error}
          </Text>
        </Box>
      )}

      {onCancel && !validating && (
        <Box marginTop={1}>
          <Text color={color.rule}>
            Press enter on an empty prompt to keep the current key.
          </Text>
        </Box>
      )}

      <Box marginTop={1}>
        <Text color={color.rule} wrap="wrap">
          Other OpenAI-compatible providers can be added from the model panel.
        </Text>
      </Box>
    </Box>
  );
}
