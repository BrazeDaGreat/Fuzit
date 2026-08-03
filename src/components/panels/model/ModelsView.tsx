import React, { useState } from "react";
import { Box, Text, useInput } from "ink";
import Spinner from "ink-spinner";
import { color, glyph, meter } from "../../../theme/theme.js";
import { modelMeta } from "../../../config/knownModels.js";
import { fetchModels, type Provider } from "../../../services/providers.js";
import { upsertProvider } from "../../../services/config.js";

interface ModelsViewProps {
  width: number;
  height: number;
  isActive: boolean;
  provider: Provider;
  activeProviderId: string;
  activeModelId: string;
  onPick: (providerId: string, modelId: string) => void;
  onProviders: () => void;
  onFilter: () => void;
  onSay: (message: string) => void;
  onChanged: () => void;
}

/** Visible list = the user's chosen subset, or everything we know of. */
export function visibleModels(provider: Provider): string[] {
  if (provider.visible.length > 0) return provider.visible;
  if (provider.cached.length > 0) return provider.cached;
  return [];
}

export default function ModelsView({
  width,
  height,
  isActive,
  provider,
  activeProviderId,
  activeModelId,
  onPick,
  onProviders,
  onFilter,
  onSay,
  onChanged,
}: ModelsViewProps) {
  const [cursor, setCursor] = useState(0);
  const [loading, setLoading] = useState(false);

  const models = visibleModels(provider);

  const refresh = async () => {
    if (loading) return;
    setLoading(true);
    try {
      const ids = await fetchModels(provider);
      upsertProvider({ ...provider, cached: ids, cachedAt: Date.now() });
      onChanged();
      onSay(`${provider.label}: found ${ids.length} models.`);
    } catch (err) {
      onSay(err instanceof Error ? err.message : "Could not fetch models.");
    } finally {
      setLoading(false);
    }
  };

  useInput(
    (input, key) => {
      if (models.length > 0 && (key.upArrow || input === "k")) {
        setCursor((c) => (c - 1 + models.length) % models.length);
      } else if (models.length > 0 && (key.downArrow || input === "j")) {
        setCursor((c) => (c + 1) % models.length);
      } else if (key.return) {
        const id = models[cursor];
        if (id) onPick(provider.id, id);
      } else if (input === "p") {
        onProviders();
      } else if (input === "f") {
        onFilter();
      } else if (input === "r") {
        void refresh();
      }
    },
    { isActive },
  );

  // Three rows per model when there is room for descriptions, otherwise two.
  const roomy = height >= 4 + models.length * 3;
  const listHeight = Math.max(1, height - 3);
  const perRow = roomy ? 3 : 2;
  const window = Math.max(1, Math.floor(listHeight / perRow));
  const start = Math.max(
    0,
    Math.min(cursor - Math.floor(window / 2), models.length - window),
  );
  const shown = models.slice(start, start + window);

  return (
    <Box flexDirection="column">
      <Box>
        <Text color={color.muted}>{provider.label}</Text>
        <Text color={color.rule}>{`  ${glyph.sep}  `}</Text>
        {loading ? (
          <Text color={color.info}>
            <Spinner type="dots" />
          </Text>
        ) : (
          <Text color={color.rule}>
            p providers · f choose models · r refresh
          </Text>
        )}
      </Box>

      {models.length === 0 ? (
        <Box paddingLeft={1} marginTop={1} flexDirection="column">
          <Text color={color.muted}>
            No models yet. Press r to fetch them from {provider.label}.
          </Text>
          {!provider.apiKey && (
            <Text color={color.bad}>
              This provider has no API key — press p to edit it.
            </Text>
          )}
        </Box>
      ) : (
        <Box flexDirection="column" marginTop={1}>
          {shown.map((id, i) => {
            const index = start + i;
            const selected = index === cursor;
            const active =
              provider.id === activeProviderId && id === activeModelId;
            const meta = modelMeta(id);

            return (
              <Box key={id} flexDirection="column" marginBottom={roomy ? 1 : 0}>
                <Box>
                  <Text color={selected ? color.focus : color.rule}>
                    {selected ? `${glyph.mark} ` : "  "}
                  </Text>
                  <Box width={Math.max(16, Math.min(34, width - 14))}>
                    <Text
                      color={
                        selected ? color.focus : active ? color.text : color.muted
                      }
                      bold={selected || active}
                      wrap="truncate-end"
                    >
                      {meta?.label ?? id}
                    </Text>
                  </Box>
                  {active && <Text color={color.ok}>{glyph.dot} in use</Text>}
                </Box>
                {roomy && meta && (
                  <Box paddingLeft={2}>
                    <Text color={color.rule}>speed </Text>
                    <Text color={selected ? color.focus : color.brandDim}>
                      {meter(meta.speed)}
                    </Text>
                    <Text color={color.rule}>   reasoning </Text>
                    <Text color={selected ? color.focus : color.brandDim}>
                      {meter(meta.power)}
                    </Text>
                  </Box>
                )}
                {roomy && !meta && (
                  <Box paddingLeft={2}>
                    <Text color={color.rule} wrap="truncate-end">
                      {id}
                    </Text>
                  </Box>
                )}
              </Box>
            );
          })}
          {models.length > window && (
            <Text color={color.rule}>
              {`  ${cursor + 1} of ${models.length}`}
            </Text>
          )}
        </Box>
      )}
    </Box>
  );
}
