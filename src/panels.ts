export type PanelId = 1 | 2 | 3 | 4 | 5;

export interface PanelDef {
  id: PanelId;
  name: string;
  /** Shown in the help panel. */
  blurb: string;
}

export const PANELS: PanelDef[] = [
  { id: 1, name: "console", blurb: "Ask for a change and review the commands" },
  { id: 2, name: "model", blurb: "Choose the model and manage providers" },
  { id: 3, name: "history", blurb: "Replay something you have run before" },
  { id: 4, name: "settings", blurb: "What can run, safety guard, API key, history" },
  { id: 5, name: "help", blurb: "Keys and what Fuzit does" },
];

export const PANEL_IDS: PanelId[] = [1, 2, 3, 4, 5];

export function panelName(id: PanelId): string {
  return PANELS.find((p) => p.id === id)?.name ?? "console";
}
