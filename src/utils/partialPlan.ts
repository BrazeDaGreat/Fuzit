/**
 * Reads a plan out of JSON that is still arriving.
 *
 * The model streams `{"commands": ["git add -A", "git com…` and we want to show
 * the first command the moment it is complete rather than waiting for the
 * closing brace. JSON.parse cannot do that, so this walks the text and takes
 * only the values that have actually finished.
 */

export interface PartialPlan {
  commands: string[];
  explanation: string;
}

/**
 * Reads a JSON string literal starting at the opening quote.
 * Returns the decoded value and whether the closing quote was reached.
 */
function readString(
  text: string,
  start: number,
): { value: string; end: number; closed: boolean } {
  let out = "";
  let i = start + 1;

  while (i < text.length) {
    const ch = text[i]!;

    if (ch === "\\") {
      const next = text[i + 1];
      if (next === undefined) return { value: out, end: i, closed: false };
      switch (next) {
        case "n": out += "\n"; break;
        case "t": out += "\t"; break;
        case "r": out += "\r"; break;
        case "b": out += "\b"; break;
        case "f": out += "\f"; break;
        case "u": {
          const hex = text.slice(i + 2, i + 6);
          if (hex.length < 4) return { value: out, end: i, closed: false };
          out += String.fromCharCode(Number.parseInt(hex, 16));
          i += 6;
          continue;
        }
        default: out += next;
      }
      i += 2;
      continue;
    }

    if (ch === '"') return { value: out, end: i + 1, closed: true };

    out += ch;
    i += 1;
  }

  return { value: out, end: i, closed: false };
}

function findKey(text: string, key: string): number {
  const index = text.indexOf(`"${key}"`);
  if (index === -1) return -1;
  const colon = text.indexOf(":", index + key.length + 2);
  return colon === -1 ? -1 : colon + 1;
}

export function extractPlan(text: string): PartialPlan {
  const plan: PartialPlan = { commands: [], explanation: "" };

  const commandsAt = findKey(text, "commands");
  if (commandsAt !== -1) {
    let i = text.indexOf("[", commandsAt);
    if (i !== -1) {
      i += 1;
      while (i < text.length) {
        const ch = text[i]!;
        if (ch === "]") break;
        if (ch === '"') {
          const { value, end, closed } = readString(text, i);
          // Only surface commands that finished — a half-typed command is
          // worse than no command.
          if (closed && value.trim()) plan.commands.push(value.trim());
          i = end;
          continue;
        }
        i += 1;
      }
    }
  }

  const explanationAt = findKey(text, "explanation");
  if (explanationAt !== -1) {
    const quote = text.indexOf('"', explanationAt);
    if (quote !== -1) {
      // The explanation is prose, so showing it half-written reads fine.
      plan.explanation = readString(text, quote).value;
    }
  }

  return plan;
}
