import { catastrophicIn, segments } from "./danger.js";

/** How much of the machine a request is allowed to reach. */
export type Scope = "git" | "shell";

const VERSION_CONTROL = ["git", "gh"];

/**
 * Checks commands before they can reach the review screen.
 *
 * In `git` scope the old rules hold: git and gh only, one command each, no
 * chaining — the allowlist is the boundary.
 *
 * In `shell` scope anything may run, because that is the point, so chaining,
 * pipes and substitution are allowed and the boundary moves to the review
 * screen plus the catastrophic list. Substitution is not banned but is scanned
 * into: `echo $(rm -rf /)` is judged on the half that actually does the damage.
 */
export function validateCommands(
  commands: string[],
  scope: Scope,
  allowGh: boolean,
): string | null {
  const permitted = allowGh
    ? VERSION_CONTROL
    : VERSION_CONTROL.filter((t) => t !== "gh");

  for (const command of commands) {
    const trimmed = command.trim();
    if (!trimmed) return "The model returned an empty command.";

    if (scope === "git") {
      const tool = trimmed.split(/\s+/)[0] ?? "";
      if (!permitted.includes(tool)) {
        if (tool === "gh") {
          return "The model suggested a gh command, but the GitHub CLI is unavailable here.";
        }
        return `Refusing to run "${tool}" — Fuzit is set to ${permitted.join(" and ")} only. Allow terminal commands in settings.`;
      }
      if (segments(trimmed).length > 1) {
        return `Refusing to run a chained command: ${trimmed}`;
      }
    }
  }

  const fatal = catastrophicIn(commands);
  if (fatal) {
    return `Refusing to run this — it ${fatal.why}: ${fatal.command}`;
  }

  return null;
}

