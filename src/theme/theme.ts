/**
 * Fuzit visual language.
 *
 * Three colour roles, never mixed:
 *   chrome    structure — borders, rules, labels. Violet.
 *   focus     where your hands are — the caret, the active panel. Amber. Used once per screen.
 *   semantic  what git itself means — staged/ok green, broken/conflict red.
 *
 * No emoji anywhere: they render double-width and break column alignment in a
 * fixed-grid layout. Box-drawing and geometric glyphs are single-width everywhere.
 */

export const color = {
  brand: "#7C5CFF",
  brandDim: "#4B4680",
  rule: "#3A3557",
  focus: "#FFB454",
  text: "#E9E7F2",
  muted: "#6E7191",
  ok: "#5BD98A",
  bad: "#FF6B6B",
  info: "#7AA2F7",
} as const;

export const glyph = {
  mark: "▍",
  caret: "›",
  arrow: "→",
  ok: "✓",
  bad: "✗",
  pending: "·",
  warn: "!",
  dot: "●",
  ring: "○",
  sep: "·",
  branchMid: "├",
  branchEnd: "└",
  rule: "─",
  meterOn: "▰",
  meterOff: "▱",
} as const;

/** Layout constants, in terminal cells. */
export const layout = {
  maxWidth: 132,
  minWidth: 58,
  sidebarWidth: 30,
  /** Below this many columns the sidebar is dropped rather than squeezed. */
  sidebarBreakpoint: 88,
  /** Rows consumed by header, rules, prompt box and key bar. */
  chromeRows: 8,
} as const;

/** Render a rating as a five-cell meter, e.g. ▰▰▰▱▱ */
export function meter(value: number, max = 5): string {
  const filled = Math.max(0, Math.min(max, Math.round(value)));
  return glyph.meterOn.repeat(filled) + glyph.meterOff.repeat(max - filled);
}
