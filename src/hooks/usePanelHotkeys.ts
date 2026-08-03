import { useCallback, useEffect } from "react";
import { useInput, useStdin, type Key } from "ink";
import { PANEL_IDS, type PanelId } from "../panels.js";
import { isTextEntryActive } from "./textEntry.js";

/**
 * Panel switching keys.
 *
 * A note on ctrl+digit, which is the obvious binding and the one people ask
 * for: terminals cannot carry it. Ctrl+1 is not transmitted at all by xterm,
 * iTerm2 or Windows Terminal, and Ctrl+3 *is* the Escape byte (0x1b), so
 * binding it would break the Esc key. Only kitty-protocol terminals can send
 * the full set, and Fuzit cannot assume one.
 *
 * So the same muscle memory is served by keys that do survive the wire:
 *   alt+1..5   Ink strips the ESC prefix and reports the digit with key.meta
 *   f1..f5     read off the raw stream, because Ink blanks these out
 *   1..5       bare, whenever the prompt does not have focus
 *   tab        cycle forward, shift+tab back
 */

const ESC = String.fromCharCode(27);

/**
 * Function keys never reach useInput: their names are in Ink's
 * `nonAlphanumericKeys`, so `input` is emptied and the `key` object has no
 * field for them. The raw sequences are the only way to see them.
 */
const FUNCTION_SEQUENCES: Array<[string, PanelId]> = [
  [`${ESC}OP`, 1],
  [`${ESC}[11~`, 1],
  [`${ESC}OQ`, 2],
  [`${ESC}[12~`, 2],
  [`${ESC}OR`, 3],
  [`${ESC}[13~`, 3],
  [`${ESC}OS`, 4],
  [`${ESC}[14~`, 4],
  [`${ESC}[15~`, 5],
];

function toPanel(value: string): PanelId | null {
  const n = Number.parseInt(value, 10);
  return PANEL_IDS.includes(n as PanelId) ? (n as PanelId) : null;
}

interface Options {
  active: PanelId;
  onSwitch: (panel: PanelId) => void;
  /** Bare digits only work when the text prompt is not swallowing them. */
  allowBareDigits: boolean;
  isActive?: boolean;
}

export function usePanelHotkeys({
  active,
  onSwitch,
  allowBareDigits,
  isActive = true,
}: Options): void {
  const { stdin, isRawModeSupported } = useStdin();

  const handleRaw = useCallback(
    (data: Buffer | string) => {
      const sequence = String(data);
      for (const [seq, panel] of FUNCTION_SEQUENCES) {
        if (sequence === seq) {
          onSwitch(panel);
          return;
        }
      }
    },
    [onSwitch],
  );

  useEffect(() => {
    if (!isActive || !stdin || !isRawModeSupported) return;
    stdin.on("data", handleRaw);
    return () => {
      stdin.off("data", handleRaw);
    };
  }, [stdin, isRawModeSupported, isActive, handleRaw]);

  useInput(
    (input: string, key: Key) => {
      // Plain Escape is "back to console", handled by the caller — never a jump.
      if (key.escape) return;

      if (key.tab) {
        const index = PANEL_IDS.indexOf(active);
        const next = key.shift
          ? PANEL_IDS[(index - 1 + PANEL_IDS.length) % PANEL_IDS.length]
          : PANEL_IDS[(index + 1) % PANEL_IDS.length];
        if (next) onSwitch(next);
        return;
      }

      if (key.ctrl) return;

      if (key.meta) {
        const panel = toPanel(input);
        if (panel) onSwitch(panel);
        return;
      }

      // A focused field anywhere in the tree outranks the digit shortcut.
      if (allowBareDigits && !isTextEntryActive()) {
        const panel = toPanel(input);
        if (panel) onSwitch(panel);
      }
    },
    { isActive },
  );
}
