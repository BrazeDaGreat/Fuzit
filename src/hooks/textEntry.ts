/**
 * Tracks whether a text field currently owns the keyboard.
 *
 * Bare digits switch panels, which is fine until you are typing
 * `http://localhost:11434/v1` into a provider form — every digit would jump
 * somewhere. Ink dispatches each keypress to every handler, so the shortcut
 * hook has to ask whether a field is focused before claiming the key.
 *
 * A module-level counter rather than context: the answer is only ever needed
 * inside a keypress handler, so it must be current at call time, not at the
 * last render.
 */

let focused = 0;

/** Called by a text field while it holds focus. Returns the release function. */
export function acquireTextEntry(): () => void {
  focused += 1;
  let released = false;
  return () => {
    if (released) return;
    released = true;
    focused = Math.max(0, focused - 1);
  };
}

export function isTextEntryActive(): boolean {
  return focused > 0;
}
