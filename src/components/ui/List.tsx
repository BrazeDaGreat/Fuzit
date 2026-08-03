import React, { useEffect, useState } from "react";
import { Box, Text, useInput } from "ink";
import { color, glyph } from "../../theme/theme.js";

export interface ListItem {
  id: string;
  label: string;
  hint?: string;
  /** Right-aligned trailing text, e.g. a badge or timestamp. */
  meta?: string;
  tone?: string;
}

interface ListProps {
  items: ListItem[];
  onSelect: (item: ListItem) => void;
  isActive: boolean;
  /** Rows available for the list, including the "more below" indicator. */
  height: number;
  width: number;
  emptyText?: string;
}

/**
 * Keyboard list with a scrolling window. Replaces ink-select-input so the
 * selection marker and colours follow the Fuzit palette rather than Ink's
 * default cyan pointer.
 */
export default function List({
  items,
  onSelect,
  isActive,
  height,
  width,
  emptyText = "Nothing here yet.",
}: ListProps) {
  const [cursor, setCursor] = useState(0);
  const window = Math.max(1, height - 1);

  useEffect(() => {
    if (cursor > items.length - 1) setCursor(Math.max(0, items.length - 1));
  }, [items.length, cursor]);

  useInput(
    (input, key) => {
      if (items.length === 0) return;
      if (key.upArrow || input === "k") {
        setCursor((c) => (c - 1 + items.length) % items.length);
      } else if (key.downArrow || input === "j") {
        setCursor((c) => (c + 1) % items.length);
      } else if (key.return) {
        const item = items[cursor];
        if (item) onSelect(item);
      }
    },
    { isActive },
  );

  if (items.length === 0) {
    return (
      <Box paddingLeft={1}>
        <Text color={color.muted}>{emptyText}</Text>
      </Box>
    );
  }

  const start = Math.max(
    0,
    Math.min(cursor - Math.floor(window / 2), items.length - window),
  );
  const visible = items.slice(start, start + window);
  const hiddenBelow = items.length - (start + visible.length);

  return (
    <Box flexDirection="column">
      {visible.map((item, i) => {
        const index = start + i;
        const selected = index === cursor && isActive;
        const labelWidth = Math.max(
          10,
          width - 3 - (item.meta ? item.meta.length + 2 : 0),
        );
        const label =
          item.label.length > labelWidth
            ? `${item.label.slice(0, labelWidth - 1)}…`
            : item.label;

        return (
          <Box key={item.id} flexDirection="column">
            <Box>
              <Text color={selected ? color.focus : color.rule}>
                {selected ? `${glyph.mark} ` : "  "}
              </Text>
              <Box width={labelWidth}>
                <Text
                  color={selected ? color.focus : (item.tone ?? color.text)}
                  bold={selected}
                >
                  {label}
                </Text>
              </Box>
              {item.meta && (
                <Text color={color.muted}> {item.meta}</Text>
              )}
            </Box>
            {selected && item.hint && (
              <Box paddingLeft={2}>
                <Text color={color.muted}>{item.hint}</Text>
              </Box>
            )}
          </Box>
        );
      })}
      {hiddenBelow > 0 && (
        <Text color={color.rule}>{`  ${hiddenBelow} more below`}</Text>
      )}
    </Box>
  );
}
