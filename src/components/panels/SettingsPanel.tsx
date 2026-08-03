import React, { useState } from "react";
import { Box, Text, useInput } from "ink";
import { color, glyph } from "../../theme/theme.js";
import Rule from "../ui/Rule.js";
import { configPath, getHistory, maskedKey } from "../../services/config.js";
import { modelLabel } from "../../config/knownModels.js";
import { detectTools } from "../../services/tools.js";
import { detectShell } from "../../services/shell.js";
import type { Scope } from "../../utils/validate.js";
import type { Provider } from "../../services/providers.js";

interface SettingsPanelProps {
  width: number;
  height: number;
  isActive: boolean;
  provider: Provider | undefined;
  model: string;
  guardDestructive: boolean;
  allowGh: boolean;
  scope: Scope;
  onToggleScope: () => void;
  onToggleGuard: () => void;
  onToggleGh: () => void;
  onClearHistory: () => void;
  onChangeApiKey: () => void;
  onOpenModelPanel: () => void;
  notice: string;
}

interface Row {
  id: string;
  label: string;
  value: string;
  hint: string;
  tone?: string;
}

export default function SettingsPanel({
  width,
  height,
  isActive,
  provider,
  model,
  guardDestructive,
  allowGh,
  scope,
  onToggleScope,
  onToggleGuard,
  onToggleGh,
  onClearHistory,
  onChangeApiKey,
  onOpenModelPanel,
  notice,
}: SettingsPanelProps) {
  const [cursor, setCursor] = useState(0);
  const tools = detectTools();
  const shell = detectShell();

  const ghValue = !allowGh
    ? "off"
    : tools.gh && tools.ghAuthed
      ? "on"
      : `unavailable`;

  const rows: Row[] = [
    {
      id: "scope",
      label: "What can run",
      value: scope === "shell" ? `any ${shell.name} command` : "git and gh only",
      hint:
        scope === "shell"
          ? "Requests can reach the whole terminal, not just version control"
          : "Restricts every request to git and gh, with no chaining",
      tone: scope === "shell" ? color.focus : color.ok,
    },
    {
      id: "guard",
      label: "Safety guard",
      value: guardDestructive ? "on" : "off",
      hint: "Ask before commands that discard work or rewrite history",
      tone: guardDestructive ? color.ok : color.bad,
    },
    {
      id: "gh",
      label: "GitHub CLI",
      value: ghValue,
      hint: `Let requests use gh for pull requests and issues — ${tools.ghNote}`,
      tone: ghValue === "on" ? color.ok : ghValue === "off" ? color.muted : color.focus,
    },
    {
      id: "model",
      label: "Model",
      value: modelLabel(model),
      hint: `From ${provider?.label ?? "no provider"} — opens the model panel`,
    },
    {
      id: "key",
      label: "API key",
      value: maskedKey(provider?.apiKey ?? ""),
      hint: `Replace the key stored for ${provider?.label ?? "the provider"}`,
    },
    {
      id: "history",
      label: "Stored history",
      value: `${getHistory().length} entries`,
      hint: "Delete every saved request and its commands",
    },
  ];

  useInput(
    (input, key) => {
      if (key.upArrow || input === "k") {
        setCursor((c) => (c - 1 + rows.length) % rows.length);
      } else if (key.downArrow || input === "j") {
        setCursor((c) => (c + 1) % rows.length);
      } else if (key.return || input === " ") {
        const row = rows[cursor];
        if (!row) return;
        if (row.id === "scope") onToggleScope();
        else if (row.id === "guard") onToggleGuard();
        else if (row.id === "gh") onToggleGh();
        else if (row.id === "model") onOpenModelPanel();
        else if (row.id === "key") onChangeApiKey();
        else if (row.id === "history") onClearHistory();
      }
    },
    { isActive },
  );

  const labelWidth = Math.max(14, Math.min(18, width - 26));
  const gap = height >= 3 + rows.length * 2 + 2 ? 1 : 0;

  return (
    <Box flexDirection="column" width={width} height={height} overflow="hidden">
      <Rule width={width} label="settings" />
      <Box paddingLeft={1} marginBottom={gap}>
        <Text color={color.muted}>enter changes the selected setting</Text>
      </Box>

      {rows.map((row, i) => {
        const selected = i === cursor;
        return (
          <Box key={row.id} flexDirection="column" marginBottom={gap}>
            <Box>
              <Text color={selected ? color.focus : color.rule}>
                {selected ? `${glyph.mark} ` : "  "}
              </Text>
              <Box width={labelWidth}>
                <Text color={selected ? color.focus : color.text} bold={selected}>
                  {row.label}
                </Text>
              </Box>
              <Text color={row.tone ?? color.muted} wrap="truncate-end">
                {row.value}
              </Text>
            </Box>
            {selected && (
              <Box paddingLeft={2}>
                <Text color={color.muted} wrap="truncate-end">
                  {row.hint}
                </Text>
              </Box>
            )}
          </Box>
        );
      })}

      <Box flexDirection="column" marginTop={gap}>
        {notice ? (
          <Text color={color.ok}>{notice}</Text>
        ) : (
          <Text color={color.rule} wrap="truncate-end">
            config {configPath()}
          </Text>
        )}
      </Box>
    </Box>
  );
}
