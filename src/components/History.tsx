import React from "react";
import { Box, Text, useInput } from "ink";
import SelectInput from "ink-select-input";
import type { HistoryEntry } from "../services/config.js";

interface HistoryProps {
  history: HistoryEntry[];
  onSelect: (entry: HistoryEntry) => void;
  onBack: () => void;
}

function formatTime(ts: number): string {
  const d = new Date(ts);
  const date = d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  const time = d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
  return `${date} ${time}`;
}

function EmptyHistory({ onBack }: { onBack: () => void }) {
  useInput(() => onBack());
  return (
    <Box flexDirection="column" padding={1}>
      <Text bold color="cyan">
        📜 Command History
      </Text>
      <Box marginTop={1} borderLeft borderColor="gray" paddingLeft={2}>
        <Text dimColor>No history yet. Run some commands first!</Text>
      </Box>
      <Box marginTop={2}>
        <Text dimColor>Press any key to go back...</Text>
      </Box>
    </Box>
  );
}

export default function History({ history, onSelect, onBack }: HistoryProps) {
  if (history.length === 0) {
    return <EmptyHistory onBack={onBack} />;
  }

  const items = [
    ...history.map((entry, i) => ({
      label: `[${formatTime(entry.timestamp)}]  ${entry.request}`,
      value: String(i),
    })),
    { label: "← Back", value: "back" },
  ];

  const handleSelect = (item: { label: string; value: string }) => {
    if (item.value === "back") {
      onBack();
      return;
    }
    const entry = history[Number(item.value)];
    if (entry) onSelect(entry);
  };

  return (
    <Box flexDirection="column" padding={1}>
      <Box marginBottom={1} flexDirection="column">
        <Text bold color="cyan">
          📜 Command History
        </Text>
        <Text dimColor>Select an entry to review and re-run its commands</Text>
      </Box>
      <SelectInput items={items} onSelect={handleSelect} />
    </Box>
  );
}
