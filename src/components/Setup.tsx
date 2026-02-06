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
      <Box borderStyle="round" borderColor="magenta" paddingX={2} paddingY={1} marginBottom={2} flexDirection="column">
        <Text bold color="magenta">
          ✨ Welcome to Fuzit!
        </Text>
        <Box marginTop={1}>
          <Text dimColor>
            A natural language git command helper powered by AI.
          </Text>
        </Box>
      </Box>

      <Box
        borderStyle="round"
        borderColor="cyan"
        paddingX={2}
        paddingY={1}
        marginBottom={2}
        flexDirection="column"
      >
        <Box>
          <Text bold color="cyan">
            🔑 API Setup
          </Text>
        </Box>
        <Box marginTop={1}>
          <Text>Enter your Groq API key: </Text>
          {validating ? (
            <Box marginLeft={1}>
              <Text color="cyan">
                <Spinner type="dots" />
              </Text>
              <Box marginLeft={1}>
                <Text dimColor>
                  Validating...
                </Text>
              </Box>
            </Box>
          ) : (
            <TextInput
              value={key}
              onChange={setKey}
              onSubmit={handleSubmit}
              mask="*"
            />
          )}
        </Box>
      </Box>

      {error && (
        <Box marginBottom={1} paddingX={1} borderLeft borderColor="red">
          <Text color="red">❌ {error}</Text>
        </Box>
      )}

      <Box flexDirection="column" marginTop={1}>
        <Box>
          <Text dimColor>
            💡 Get your free API key at:
          </Text>
        </Box>
        <Box marginTop={1}>
          <Text dimColor color="blue">
            https://console.groq.com
          </Text>
        </Box>
      </Box>
    </Box>
  );
}
