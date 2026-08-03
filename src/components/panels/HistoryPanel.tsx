import React from "react";
import { Box, Text } from "ink";
import { color } from "../../theme/theme.js";
import Rule from "../ui/Rule.js";
import List, { type ListItem } from "../ui/List.js";
import type { HistoryEntry } from "../../services/config.js";

interface HistoryPanelProps {
  width: number;
  height: number;
  isActive: boolean;
  history: HistoryEntry[];
  onSelect: (entry: HistoryEntry) => void;
}

function relativeTime(ts: number): string {
  const seconds = Math.max(0, Math.round((Date.now() - ts) / 1000));
  if (seconds < 60) return "just now";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(ts).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

export default function HistoryPanel({
  width,
  height,
  isActive,
  history,
  onSelect,
}: HistoryPanelProps) {
  const items: ListItem[] = history.map((entry, i) => ({
    id: `${entry.timestamp}-${i}`,
    label: entry.request,
    hint: entry.commands.join("  ·  "),
    meta: relativeTime(entry.timestamp),
  }));

  return (
    <Box flexDirection="column" width={width} height={height} overflow="hidden">
      <Rule width={width} label="history" />
      <Box paddingLeft={1} marginBottom={1}>
        <Text color={color.muted}>
          Pick one to load its commands back into review.
        </Text>
      </Box>
      <List
        items={items}
        onSelect={(item) => {
          const index = items.indexOf(item);
          const entry = history[index];
          if (entry) onSelect(entry);
        }}
        isActive={isActive}
        height={height - 3}
        width={width}
        emptyText="Nothing run yet. Successful commands land here."
      />
    </Box>
  );
}
