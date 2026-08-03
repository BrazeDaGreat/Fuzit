import React from "react";
import { Box, Text } from "ink";
import { color, glyph } from "../../theme/theme.js";
import Rule from "../ui/Rule.js";
import { PANELS } from "../../panels.js";

interface HelpPanelProps {
  width: number;
  height: number;
}

const KEYS: Array<[string, string]> = [
  ["alt+1 … alt+5", "jump straight to a panel"],
  ["f1 … f5", "the same jumps, if your terminal eats alt"],
  ["1 … 5", "same again, when the prompt is not focused"],
  ["tab / shift+tab", "cycle panels"],
  ["esc", "back to the console"],
  ["ctrl+z", "propose an undo of the last turn"],
  ["ctrl+r", "re-read the repo"],
  ["ctrl+l", "clear the console and its follow-up context"],
  ["ctrl+c", "quit"],
];

function Pair({
  left,
  right,
  keyWidth,
}: {
  left: string;
  right: string;
  keyWidth: number;
}) {
  return (
    <Box>
      <Box width={keyWidth}>
        <Text color={color.brandDim}>{left}</Text>
      </Box>
      <Text color={color.muted} wrap="truncate-end">
        {right}
      </Text>
    </Box>
  );
}

/**
 * Sections are added while they fit. Ink clips overflow by overwriting rows,
 * so a panel that does not fit does not just get cut off — it garbles.
 */
export default function HelpPanel({ width, height }: HelpPanelProps) {
  const keyWidth = Math.max(16, Math.min(20, Math.floor(width * 0.34)));

  let budget = height;
  const keysRows = 1 + KEYS.length;
  const panelRows = 2 + PANELS.length;
  const noteRows = 3;

  budget -= keysRows;
  const showPanels = budget >= panelRows;
  if (showPanels) budget -= panelRows;
  const showNote = budget >= noteRows;

  return (
    <Box flexDirection="column" width={width} height={height} overflow="hidden">
      <Rule width={width} label="keys" />
      {KEYS.map(([left, right]) => (
        <Pair key={left} left={left} right={right} keyWidth={keyWidth} />
      ))}

      {showPanels && (
        <Box marginTop={1} flexDirection="column">
          <Rule width={width} label="panels" />
          {PANELS.map((panel) => (
            <Box key={panel.id}>
              <Box width={keyWidth}>
                <Text color={color.brandDim}>
                  {glyph.mark}
                  {panel.id} {panel.name}
                </Text>
              </Box>
              <Text color={color.muted} wrap="truncate-end">
                {panel.blurb}
              </Text>
            </Box>
          ))}
        </Box>
      )}

      {showNote && (
        <Box marginTop={1} flexDirection="column">
          <Text color={color.rule} wrap="truncate-end">
            Run fuzit --help for the command-line flags.
          </Text>
          <Text color={color.rule} wrap="truncate-end">
            No ctrl+digit: terminals cannot send ctrl+1, and ctrl+3 is Escape.
          </Text>
        </Box>
      )}
    </Box>
  );
}
