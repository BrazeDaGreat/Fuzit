import React, { useState } from "react";
import { Box, Text } from "ink";
import TextInput from "ink-text-input";
import { getModelLabel } from "../config/models.js";

interface InputProps {
  onSubmit: (value: string) => void;
  currentModel: string;
}

export default function Input({ onSubmit, currentModel }: InputProps) {
  const [value, setValue] = useState("");

  const handleSubmit = (input: string) => {
    const trimmed = input.trim();
    if (!trimmed) return;
    setValue("");
    onSubmit(trimmed);
  };

  return (
    <Box flexDirection="column" padding={1}>
      <Box paddingBottom={1}>
        <Text bold color="magenta">
          ✨ Fuzit
        </Text>
        <Text dimColor> — AI-powered git command helper</Text>
      </Box>

      <Box marginTop={1} borderStyle="round" borderColor="cyan" paddingX={2} paddingY={1} flexDirection="column" width={80}>
        <Text bold color="cyan">
          What would you like to do with git?
        </Text>
        <Box marginTop={1}>
          <Text color="greenBright">➜ </Text>
          <TextInput
            value={value}
            onChange={setValue}
            onSubmit={handleSubmit}
            placeholder="e.g., show me the last 5 commits"
          />
        </Box>
      </Box>

      <Box marginTop={2} flexDirection="column">
        <Box>
          <Text dimColor>
            💡 Tip: Use{" "}
          </Text>
          <Text dimColor bold color="cyan">
            fuzit -n "your command"
          </Text>
          <Text dimColor> to skip the review step</Text>
        </Box>
        <Box marginTop={1}>
          <Text dimColor>
            🤖 Model:{" "}
          </Text>
          <Text color="yellow" dimColor>
            {getModelLabel(currentModel)}
          </Text>
          <Text dimColor>
            {"  •  "}
          </Text>
          <Text dimColor bold color="cyan">
            fuzit --model
          </Text>
          <Text dimColor> to change</Text>
          <Text dimColor>
            {"  •  "}
          </Text>
          <Text dimColor bold color="cyan">
            fuzit --history
          </Text>
          <Text dimColor> to browse past commands</Text>
        </Box>
        <Box marginTop={1}>
          <Text dimColor>Press </Text>
          <Text dimColor bold>
            Ctrl+C
          </Text>
          <Text dimColor> to exit</Text>
        </Box>
      </Box>
    </Box>
  );
}
