import React from "react";
import { Box, Text } from "ink";
import { color, glyph } from "../../theme/theme.js";

interface RuleProps {
  width: number;
  label?: string;
}

/**
 * A horizontal divider. With a label it reads `── LABEL ────────`, which is how
 * every section in the dashboard is titled — there are no boxed headings.
 */
export default function Rule({ width, label }: RuleProps) {
  if (!label) {
    return <Text color={color.rule}>{glyph.rule.repeat(Math.max(0, width))}</Text>;
  }

  const head = glyph.rule.repeat(2);
  const text = ` ${label.toUpperCase()} `;
  const tail = Math.max(0, width - head.length - text.length);

  return (
    <Box>
      <Text color={color.rule}>{head}</Text>
      <Text color={color.brandDim} bold>
        {text}
      </Text>
      <Text color={color.rule}>{glyph.rule.repeat(tail)}</Text>
    </Box>
  );
}
