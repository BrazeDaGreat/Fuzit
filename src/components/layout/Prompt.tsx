import React from "react";
import { Box, Text } from "ink";
import { color, glyph } from "../../theme/theme.js";
import TextField from "../ui/TextField.js";

interface PromptProps {
  width: number;
  value: string;
  onChange: (value: string) => void;
  onSubmit: (value: string) => void;
  focused: boolean;
  /** Shown instead of the input when the prompt is not taking requests. */
  idleText: string;
  placeholder: string;
}

/**
 * The only bordered element on screen. The border is not decoration — it marks
 * the single place keystrokes go, so focus never has to be guessed.
 */
export default function Prompt({
  width,
  value,
  onChange,
  onSubmit,
  focused,
  idleText,
  placeholder,
}: PromptProps) {
  return (
    <Box
      width={width}
      borderStyle="round"
      borderColor={focused ? color.brand : color.rule}
      paddingX={1}
    >
      <Text color={focused ? color.focus : color.rule} bold>
        {glyph.caret}{" "}
      </Text>
      <Box flexGrow={1}>
        {focused ? (
          <TextField
            value={value}
            onChange={onChange}
            onSubmit={onSubmit}
            placeholder={placeholder}
          />
        ) : (
          <Text color={color.rule} wrap="truncate-end">
            {idleText}
          </Text>
        )}
      </Box>
    </Box>
  );
}
