import React from "react";
import { Box, Text } from "ink";
import { color, glyph } from "../../theme/theme.js";
import { PANELS, type PanelId } from "../../panels.js";

interface KeyBarProps {
  width: number;
  active: PanelId;
  /** Contextual hints for the right-hand side, already ordered. */
  hints: string[];
}

export default function KeyBar({ width, active, hints }: KeyBarProps) {
  return (
    <Box width={width} justifyContent="space-between">
      <Box>
        {PANELS.map((panel) => {
          const selected = panel.id === active;
          return (
            <Box key={panel.id} marginRight={2}>
              <Text color={selected ? color.focus : color.rule}>
                {selected ? glyph.mark : " "}
              </Text>
              <Text color={color.brandDim}>{panel.id}</Text>
              <Text color={selected ? color.focus : color.muted} bold={selected}>
                {" "}
                {panel.name}
              </Text>
            </Box>
          );
        })}
      </Box>
      <Box>
        {hints.map((hint, i) => (
          <Text key={hint} color={color.rule}>
            {i > 0 ? `  ${glyph.sep}  ` : ""}
            <Text color={color.muted}>{hint}</Text>
          </Text>
        ))}
      </Box>
    </Box>
  );
}
