import React from "react";
import { Box, Text } from "ink";
import SelectInput from "ink-select-input";
import { GROQ_MODELS, getModelLabel } from "../config/models.js";

interface ModelPickerProps {
  currentModel: string;
  onSelect: (modelId: string) => void;
  onBack: () => void;
}

export default function ModelPicker({ currentModel, onSelect, onBack }: ModelPickerProps) {
  const items = [
    ...GROQ_MODELS.map((m) => ({
      label: `${m.label}${m.id === currentModel ? " [active]" : ""} — ${m.description}`,
      value: m.id,
    })),
    { label: "← Cancel", value: "cancel" },
  ];

  const handleSelect = (item: { label: string; value: string }) => {
    if (item.value === "cancel") {
      onBack();
    } else {
      onSelect(item.value);
    }
  };

  return (
    <Box flexDirection="column" padding={1}>
      <Box marginBottom={1} flexDirection="column">
        <Text bold color="cyan">
          🤖 Select AI Model
        </Text>
        <Box>
          <Text dimColor>Current: </Text>
          <Text color="yellow">{getModelLabel(currentModel)}</Text>
        </Box>
      </Box>
      <SelectInput items={items} onSelect={handleSelect} />
    </Box>
  );
}
