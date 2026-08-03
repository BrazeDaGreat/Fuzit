import React, { useEffect, useState } from "react";
import { Box } from "ink";
import Rule from "../ui/Rule.js";
import ModelsView from "./model/ModelsView.js";
import ProvidersView from "./model/ProvidersView.js";
import ProviderForm from "./model/ProviderForm.js";
import ModelFilterView from "./model/ModelFilterView.js";
import type { Provider } from "../../services/providers.js";
import { removeProvider, upsertProvider } from "../../services/config.js";

export type ModelView = "models" | "providers" | "form" | "filter";

interface ModelPanelProps {
  width: number;
  height: number;
  isActive: boolean;
  providers: Provider[];
  activeProviderId: string;
  activeModelId: string;
  /** Storage changed; the app should re-read it. */
  onChanged: () => void;
  onPick: (providerId: string, modelId: string) => void;
  onSay: (message: string) => void;
  /** True while a sub-view is open, so Escape backs out instead of leaving the panel. */
  onDepthChange: (inSubView: boolean) => void;
}

/**
 * Router for everything to do with where completions come from: which model,
 * which provider, and which of a provider's models are worth showing.
 */
export default function ModelPanel({
  width,
  height,
  isActive,
  providers,
  activeProviderId,
  activeModelId,
  onChanged,
  onPick,
  onSay,
  onDepthChange,
}: ModelPanelProps) {
  const [view, setView] = useState<ModelView>("models");
  /** Provider being edited, or null when adding a new one. */
  const [editing, setEditing] = useState<Provider | null>(null);
  /** Provider whose model list is being browsed or filtered. */
  const [subjectId, setSubjectId] = useState(activeProviderId);

  const subject =
    providers.find((p) => p.id === subjectId) ??
    providers.find((p) => p.id === activeProviderId) ??
    providers[0];

  useEffect(() => {
    onDepthChange(view !== "models");
  }, [view, onDepthChange]);

  // Leaving the panel entirely must not strand it in a sub-view.
  useEffect(() => () => onDepthChange(false), [onDepthChange]);

  const body = height - 1;

  return (
    <Box flexDirection="column" width={width} height={height} overflow="hidden">
      <Rule
        width={width}
        label={
          view === "providers"
            ? "providers"
            : view === "form"
              ? editing
                ? "edit provider"
                : "add provider"
              : view === "filter"
                ? "show which models"
                : "model"
        }
      />

      {view === "models" && subject && (
        <ModelsView
          width={width}
          height={body}
          isActive={isActive}
          provider={subject}
          activeProviderId={activeProviderId}
          activeModelId={activeModelId}
          onPick={onPick}
          onProviders={() => setView("providers")}
          onFilter={() => {
            setSubjectId(subject.id);
            setView("filter");
          }}
          onSay={onSay}
          onChanged={onChanged}
        />
      )}

      {view === "providers" && (
        <ProvidersView
          width={width}
          height={body}
          isActive={isActive}
          providers={providers}
          activeProviderId={activeProviderId}
          onUse={(provider) => {
            setSubjectId(provider.id);
            setView("models");
          }}
          onAdd={() => {
            setEditing(null);
            setView("form");
          }}
          onEdit={(provider) => {
            setEditing(provider);
            setView("form");
          }}
          onDelete={(provider) => {
            if (provider.builtin) {
              onSay("The built-in provider cannot be removed.");
              return;
            }
            removeProvider(provider.id);
            onChanged();
            onSay(`Removed ${provider.label}.`);
          }}
          onBack={() => setView("models")}
        />
      )}

      {view === "form" && (
        <ProviderForm
          width={width}
          height={body}
          isActive={isActive}
          provider={editing}
          existingIds={providers.map((p) => p.id)}
          onSave={(provider) => {
            upsertProvider(provider);
            onChanged();
            setSubjectId(provider.id);
            setView("models");
            onSay(`Saved ${provider.label}.`);
          }}
          onCancel={() => setView("providers")}
        />
      )}

      {view === "filter" && subject && (
        <ModelFilterView
          width={width}
          height={body}
          isActive={isActive}
          provider={subject}
          onSave={(visible) => {
            upsertProvider({ ...subject, visible });
            onChanged();
            setView("models");
            onSay(
              visible.length === 0
                ? "Showing every model this provider offers."
                : `Showing ${visible.length} model${visible.length === 1 ? "" : "s"}.`,
            );
          }}
          onCancel={() => setView("models")}
        />
      )}
    </Box>
  );
}
