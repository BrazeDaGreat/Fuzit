import { executeCommand } from "../utils/execute.js";

export interface Toolbelt {
  gh: boolean;
  ghAuthed: boolean;
  /** Why gh is unavailable, for the settings row. */
  ghNote: string;
}

let cached: Toolbelt | null = null;

/**
 * Detects the GitHub CLI once per process. Both facts matter: `gh` on PATH
 * means the commands will parse, but only an authenticated `gh` can reach the
 * API, and an unauthenticated one fails in a way that looks like a Fuzit bug.
 */
export function detectTools(force = false): Toolbelt {
  if (cached && !force) return cached;

  const version = executeCommand("gh --version");
  if (!version.success) {
    cached = {
      gh: false,
      ghAuthed: false,
      ghNote: "not installed — requests stay on git",
    };
    return cached;
  }

  const auth = executeCommand("gh auth status");
  cached = auth.success
    ? { gh: true, ghAuthed: true, ghNote: "installed and signed in" }
    : {
        gh: true,
        ghAuthed: false,
        ghNote: "installed but signed out — run gh auth login",
      };

  return cached;
}

/** gh is only offered to the model when it will actually work. */
export function ghUsable(allowGh: boolean): boolean {
  if (!allowGh) return false;
  const tools = detectTools();
  return tools.gh && tools.ghAuthed;
}
