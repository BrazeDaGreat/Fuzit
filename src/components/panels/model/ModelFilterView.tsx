import React, { useState } from "react";
import { Box, Text, useInput } from "ink";
import Spinner from "ink-spinner";
import { color, glyph } from "../../../theme/theme.js";
import { fetchModels, type Provider } from "../../../services/providers.js";

interface ModelFilterViewProps {
  width: number;
  height: number;
  isActive: boolean;
  provider: Provider;
  onSave: (visible: string[]) => void;
  onCancel: () => void;
}

/**
 * Providers commonly return sixty models, most of them irrelevant to writing a
 * git command. This chooses which ones reach the picker. Selecting none means
 * "show everything", so the list is never accidentally emptied.
 */
export default function ModelFilterView({
  width,
  height,
  isActive,
  provider,
  onSave,
  onCancel,
}: ModelFilterViewProps) {
  const [all, setAll] = useState<string[]>(provider.cached);
  const [chosen, setChosen] = useState<Set<string>>(
    () => new Set(provider.visible),
  );
  const [cursor, setCursor] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const refresh = async () => {
    if (loading) return;
    setLoading(true);
    setError("");
    try {
      setAll(await fetchModels(provider));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not fetch models.");
    } finally {
      setLoading(false);
    }
  };

  useInput(
    (input, key) => {
      if (key.escape) {
        onCancel();
        return;
      }
      if (input === "r") {
        void refresh();
        return;
      }
      if (all.length === 0) return;

      if (key.upArrow || input === "k") {
        setCursor((c) => (c - 1 + all.length) % all.length);
      } else if (key.downArrow || input === "j") {
        setCursor((c) => (c + 1) % all.length);
      } else if (input === " ") {
        const id = all[cursor];
        if (!id) return;
        setChosen((prev) => {
          const next = new Set(prev);
          if (next.has(id)) next.delete(id);
          else next.add(id);
          return next;
        });
      } else if (input === "a") {
        setChosen((prev) => (prev.size === all.length ? new Set() : new Set(all)));
      } else if (key.return) {
        onSave([...chosen]);
      }
    },
    { isActive },
  );

  const listHeight = Math.max(1, height - 3);
  const start = Math.max(
    0,
    Math.min(cursor - Math.floor(listHeight / 2), all.length - listHeight),
  );
  const shown = all.slice(start, start + listHeight);

  return (
    <Box flexDirection="column">
      <Box>
        {loading ? (
          <Text color={color.info}>
            <Spinner type="dots" />
          </Text>
        ) : (
          <Text color={color.rule}>
            space toggles · a all/none · r refresh · enter saves · esc cancels
          </Text>
        )}
      </Box>

      {error && (
        <Box>
          <Text color={color.bad} wrap="truncate-end">
            {error}
          </Text>
        </Box>
      )}

      {all.length === 0 && !loading ? (
        <Box paddingLeft={1} marginTop={1}>
          <Text color={color.muted}>
            No model list cached. Press r to fetch it.
          </Text>
        </Box>
      ) : (
        <Box flexDirection="column" marginTop={1}>
          {shown.map((id, i) => {
            const index = start + i;
            const selected = index === cursor;
            const on = chosen.has(id);
            return (
              <Box key={id}>
                <Text color={selected ? color.focus : color.rule}>
                  {selected ? `${glyph.mark} ` : "  "}
                </Text>
                <Text color={on ? color.ok : color.rule}>
                  {on ? glyph.ok : glyph.pending}
                </Text>
                <Text
                  color={selected ? color.focus : on ? color.text : color.muted}
                  wrap="truncate-end"
                >
                  {" "}
                  {id}
                </Text>
              </Box>
            );
          })}
          <Text color={color.rule}>
            {`  ${chosen.size === 0 ? "none chosen — every model will show" : `${chosen.size} of ${all.length} chosen`}`}
          </Text>
        </Box>
      )}
    </Box>
  );
}
