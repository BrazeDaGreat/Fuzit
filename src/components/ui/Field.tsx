import React from "react";
import { Box, Text } from "ink";
import { color, glyph } from "../../theme/theme.js";

interface FieldProps {
  label: string;
  value: string;
  /** Colour of the value. Defaults to muted so zeroes stay quiet. */
  tone?: string;
  /** Marks the row as just-changed: amber value with a leading bar. */
  flash?: boolean;
  labelWidth?: number;
}

/** One `label   value` row in the telemetry sidebar. */
export default function Field({
  label,
  value,
  tone = color.muted,
  flash = false,
  labelWidth = 11,
}: FieldProps) {
  return (
    <Box>
      <Text color={flash ? color.focus : color.rule}>
        {flash ? glyph.mark : " "}
      </Text>
      <Box width={labelWidth}>
        <Text color={color.muted}>{label}</Text>
      </Box>
      <Text color={flash ? color.focus : tone} bold={flash}>
        {value}
      </Text>
    </Box>
  );
}
