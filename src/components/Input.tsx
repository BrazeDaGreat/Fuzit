import React, { useState } from "react";
import { Box, Text } from "ink";
import TextInput from "ink-text-input";

interface InputProps {
  onSubmit: (value: string) => void;
}

export default function Input({ onSubmit }: InputProps) {
  const [value, setValue] = useState("");

  const handleSubmit = (input: string) => {
    const trimmed = input.trim();
    if (!trimmed) return;
    setValue("");
    onSubmit(trimmed);
  };

  return (
    <Box flexDirection="column" padding={1}>
      <Text bold color="cyan">
        What would you like to do with git?
      </Text>
      <Box marginTop={1}>
        <Text color="green">❯ </Text>
        <TextInput
          value={value}
          onChange={setValue}
          onSubmit={handleSubmit}
          placeholder="e.g., show me the last 5 commits"
        />
      </Box>
      <Box marginTop={1}>
        <Text dimColor>Press Ctrl+C to exit</Text>
      </Box>
    </Box>
  );
}
