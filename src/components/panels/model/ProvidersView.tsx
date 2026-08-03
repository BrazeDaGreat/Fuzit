import React, { useState } from "react";
import { Box, Text, useInput } from "ink";
import { color, glyph } from "../../../theme/theme.js";
import { maskedKey } from "../../../services/config.js";
import type { Provider } from "../../../services/providers.js";

interface ProvidersViewProps {
  width: number;
  height: number;
  isActive: boolean;
  providers: Provider[];
  activeProviderId: string;
  onUse: (provider: Provider) => void;
  onAdd: () => void;
  onEdit: (provider: Provider) => void;
  onDelete: (provider: Provider) => void;
  onBack: () => void;
}

export default function ProvidersView({
  width,
  height,
  isActive,
  providers,
  activeProviderId,
  onUse,
  onAdd,
  onEdit,
  onDelete,
  onBack,
}: ProvidersViewProps) {
  const [cursor, setCursor] = useState(0);

  // The add row sits at the end of the list rather than behind a separate key.
  const rows = providers.length + 1;

  useInput(
    (input, key) => {
      if (key.upArrow || input === "k") {
        setCursor((c) => (c - 1 + rows) % rows);
      } else if (key.downArrow || input === "j") {
        setCursor((c) => (c + 1) % rows);
      } else if (key.return) {
        if (cursor === providers.length) onAdd();
        else {
          const provider = providers[cursor];
          if (provider) onUse(provider);
        }
      } else if (input === "e") {
        const provider = providers[cursor];
        if (provider) onEdit(provider);
      } else if (input === "d") {
        const provider = providers[cursor];
        if (provider) onDelete(provider);
      } else if (key.escape || input === "p") {
        onBack();
      }
    },
    { isActive },
  );

  const labelWidth = Math.max(12, Math.min(20, Math.floor(width * 0.28)));

  return (
    <Box flexDirection="column">
      <Box>
        <Text color={color.rule}>
          enter uses it · e edit · d remove · esc back
        </Text>
      </Box>

      <Box flexDirection="column" marginTop={1}>
        {providers.map((provider, i) => {
          const selected = i === cursor;
          const active = provider.id === activeProviderId;
          return (
            <Box key={provider.id} flexDirection="column">
              <Box>
                <Text color={selected ? color.focus : color.rule}>
                  {selected ? `${glyph.mark} ` : "  "}
                </Text>
                <Box width={labelWidth}>
                  <Text
                    color={selected ? color.focus : active ? color.text : color.muted}
                    bold={selected || active}
                    wrap="truncate-end"
                  >
                    {provider.label}
                  </Text>
                </Box>
                <Text color={provider.apiKey ? color.muted : color.bad}>
                  {maskedKey(provider.apiKey)}
                </Text>
                {active && <Text color={color.ok}>{`  ${glyph.dot} active`}</Text>}
              </Box>
              {selected && (
                <Box paddingLeft={2}>
                  <Text color={color.rule} wrap="truncate-end">
                    {provider.baseUrl}
                  </Text>
                </Box>
              )}
            </Box>
          );
        })}

        <Box marginTop={1}>
          <Text color={cursor === providers.length ? color.focus : color.rule}>
            {cursor === providers.length ? `${glyph.mark} ` : "  "}
          </Text>
          <Text
            color={cursor === providers.length ? color.focus : color.muted}
            bold={cursor === providers.length}
          >
            Add an OpenAI-compatible provider
          </Text>
        </Box>
      </Box>
    </Box>
  );
}
