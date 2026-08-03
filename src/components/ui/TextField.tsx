import React, { useEffect, useState } from "react";
import { Text, useInput } from "ink";
import { color } from "../../theme/theme.js";
import { acquireTextEntry } from "../../hooks/textEntry.js";

interface TextFieldProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit?: (value: string) => void;
  placeholder?: string;
  focus?: boolean;
  mask?: string;
}

/**
 * Replaces ink-text-input, which inserts the character for *any* keypress it
 * does not recognise. Ink strips the ESC prefix before dispatching, so alt+2
 * reaches every handler as a bare "2" with `key.meta` set — ink-text-input
 * never checks that flag, so switching panels typed the panel number into the
 * prompt. Anything carrying meta or ctrl belongs to the app, not to the field.
 */
export default function TextField({
  value,
  onChange,
  onSubmit,
  placeholder = "",
  focus = true,
  mask,
}: TextFieldProps) {
  const [cursor, setCursor] = useState(value.length);

  useEffect(() => {
    setCursor((c) => Math.min(c, value.length));
  }, [value]);

  // Tell the shortcut layer to stop claiming bare digits while we have focus.
  useEffect(() => {
    if (!focus) return;
    return acquireTextEntry();
  }, [focus]);

  useInput(
    (input, key) => {
      // Modifier combinations are application shortcuts, never text.
      if (key.meta || key.ctrl || key.escape) return;
      if (key.tab || key.upArrow || key.downArrow) return;

      if (key.return) {
        onSubmit?.(value);
        return;
      }

      if (key.leftArrow) {
        setCursor((c) => Math.max(0, c - 1));
        return;
      }
      if (key.rightArrow) {
        setCursor((c) => Math.min(value.length, c + 1));
        return;
      }

      // Ink reports Backspace as `delete` on most terminals (0x7f).
      if (key.backspace || key.delete) {
        if (cursor === 0) return;
        onChange(value.slice(0, cursor - 1) + value.slice(cursor));
        setCursor(cursor - 1);
        return;
      }

      // Function keys and other named keys arrive with an empty input string.
      if (!input) return;

      onChange(value.slice(0, cursor) + input + value.slice(cursor));
      setCursor(cursor + input.length);
    },
    { isActive: focus },
  );

  const shown = mask ? mask.repeat(value.length) : value;

  if (!focus) {
    return shown ? (
      <Text color={color.text}>{shown}</Text>
    ) : (
      <Text color={color.rule}>{placeholder}</Text>
    );
  }

  if (shown.length === 0) {
    return placeholder ? (
      <Text>
        <Text inverse>{placeholder[0]}</Text>
        <Text color={color.rule}>{placeholder.slice(1)}</Text>
      </Text>
    ) : (
      <Text inverse> </Text>
    );
  }

  const safeCursor = Math.min(cursor, shown.length);
  return (
    <Text color={color.text}>
      {shown.slice(0, safeCursor)}
      <Text inverse>{shown[safeCursor] ?? " "}</Text>
      {shown.slice(safeCursor + 1)}
    </Text>
  );
}
