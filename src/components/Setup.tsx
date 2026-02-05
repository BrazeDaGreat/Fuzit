import React, { useState } from "react";
import { Box, Text } from "ink";
import TextInput from "ink-text-input";
import Spinner from "ink-spinner";
import { validateApiKey } from "../services/ai.js";
import { setApiKey } from "../services/config.js";

interface SetupProps {
  onComplete: () => void;
}

export default function Setup({ onComplete }: SetupProps) {
  const [key, setKey] = useState("");
  const [validating, setValidating] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return;

    setValidating(true);
    setError("");

    const valid = await validateApiKey(trimmed);
    if (valid) {
      setApiKey(trimmed);
      onComplete();
    } else {
      setError("Invalid API key. Please try again.");
      setValidating(false);
    }
  };

  return (
    <Box flexDirection="column" padding={1}>
      <Text bold color="cyan">
        Welcome to Fuzit!
      </Text>
      <Text dimColor>
        A natural language git command helper powered by AI.
      </Text>
      <Box marginTop={1}>
        <Text>Enter your Groq API key: </Text>
        {validating ? (
          <Text>
            <Spinner type="dots" />{" "}
            <Text dimColor>Validating...</Text>
          </Text>
        ) : (
          <TextInput
            value={key}
            onChange={setKey}
            onSubmit={handleSubmit}
            mask="*"
          />
        )}
      </Box>
      {error && (
        <Box marginTop={1}>
          <Text color="red">{error}</Text>
        </Box>
      )}
      <Box marginTop={1}>
        <Text dimColor>
          Get your free API key at https://console.groq.com
        </Text>
      </Box>
    </Box>
  );
}
