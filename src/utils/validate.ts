/**
 * Commands come back from a language model and are handed to a shell, so they
 * are checked before they can run. Two rules: the command must be one of the
 * tools we asked for, and it must be a single command — no chaining.
 */

const ALLOWED: readonly string[] = ["git", "gh"];

/** Scans for shell operators that sit outside quotes. */
function chainsCommands(command: string): boolean {
  let quote: '"' | "'" | null = null;

  for (let i = 0; i < command.length; i += 1) {
    const ch = command[i]!;
    const next = command[i + 1];

    if (ch === "\\") {
      i += 1;
      continue;
    }

    if (quote) {
      if (ch === quote) quote = null;
      continue;
    }

    if (ch === '"' || ch === "'") {
      quote = ch;
      continue;
    }

    if (ch === ";" || ch === "|" || ch === "&" || ch === "`" || ch === "\n") {
      return true;
    }
    if (ch === "$" && next === "(") return true;
    if (ch === ">" || ch === "<") return true;
  }

  return false;
}

/**
 * Returns a message describing the first unacceptable command, or null when
 * every command is safe to offer for review.
 */
export function validateCommands(
  commands: string[],
  allowGh: boolean,
): string | null {
  const permitted = allowGh ? ALLOWED : ALLOWED.filter((t) => t !== "gh");

  for (const command of commands) {
    const trimmed = command.trim();
    if (!trimmed) return "The model returned an empty command.";

    const tool = trimmed.split(/\s+/)[0] ?? "";

    if (!permitted.includes(tool)) {
      if (tool === "gh") {
        return "The model suggested a gh command, but the GitHub CLI is unavailable here.";
      }
      return `Refusing to run "${tool}" — Fuzit only runs ${permitted.join(" and ")}.`;
    }

    if (chainsCommands(trimmed)) {
      return `Refusing to run a chained command: ${trimmed}`;
    }
  }

  return null;
}
