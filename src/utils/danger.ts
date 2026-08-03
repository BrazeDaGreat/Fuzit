/**
 * Risk classification for generated commands.
 *
 * When Fuzit only ran git, the allowlist was the safety boundary. With the
 * whole terminal available, the boundary is the review screen — so the job
 * here is to make sure nothing dangerous reaches it looking ordinary.
 *
 * Two tiers:
 *   destructive   marked, and needs an explicit y before it runs
 *   catastrophic  refused outright; run it yourself if you truly mean it
 *
 * Every rule is applied per *segment*, so `git status && rm -rf /` is caught
 * on its second half rather than judged by its harmless first word.
 */

export type RiskLevel = "destructive" | "catastrophic";

export interface Risk {
  level: RiskLevel;
  why: string;
}

interface Rule {
  test: RegExp;
  why: string;
  /** Only applies when the segment invokes this tool. */
  tool?: string;
}

/**
 * Unrecoverable at the level of the machine, not the project. Deliberately
 * short: this list refuses, and refusing the wrong thing is its own harm.
 */
const CATASTROPHIC: Rule[] = [
  { test: /\brm\s+(?:-[a-zA-Z]*\s+)*-[a-zA-Z]*[rR][a-zA-Z]*f?[a-zA-Z]*\s+\/(?:\s|$|\*)/, why: "deletes the entire filesystem" },
  { test: /\brm\s+(?:-[a-zA-Z]+\s+)*\/(?:\s|$|\*)/, why: "deletes the filesystem root" },
  { test: /\bmkfs(\.\w+)?\b/, why: "formats a filesystem" },
  { test: /\bdd\b(?=.*\bof=\/dev\/(?:sd|nvme|hd|disk|vd))/, why: "writes raw data over a disk device" },
  { test: />\s*\/dev\/(?:sd|nvme|hd|disk|vd)/, why: "writes over a disk device" },
  { test: /:\(\)\s*\{.*\|.*&.*\}\s*;?\s*:/, why: "is a fork bomb" },
  { test: /\bformat\s+[a-zA-Z]:/i, why: "formats a drive" },
  { test: /\b(?:del|rd|rmdir)\b(?=.*\/s)(?=.*\b[a-zA-Z]:\\?(?:\s|$|\*))/i, why: "deletes an entire drive" },
  { test: /Remove-Item\b(?=.*-Recurse)(?=.*\b[a-zA-Z]:\\?["']?(?:\s|$))/i, why: "deletes an entire drive" },
  { test: /\bchmod\b\s+(?:-[a-zA-Z]+\s+)*[0-7]{3,4}\s+\/(?:\s|$)/, why: "changes permissions on the filesystem root" },
  { test: /\b(?:chown|chmod)\b\s+-[a-zA-Z]*R[a-zA-Z]*\s+\S+\s+\/(?:\s|$)/, why: "recurses over the filesystem root" },
];

const DESTRUCTIVE: Rule[] = [
  // git
  { tool: "git", test: /\bpush\b(?=.*(?:--force(?!-with-lease)\b|\s-f\b))/, why: "overwrites remote history" },
  { tool: "git", test: /\bpush\b(?=.*--delete\b)/, why: "deletes a remote branch" },
  { tool: "git", test: /\breset\b(?=.*--hard\b)/, why: "discards uncommitted work" },
  { tool: "git", test: /\bclean\b(?=.*\s-[a-zA-Z]*f)/, why: "deletes untracked files" },
  { tool: "git", test: /\bbranch\b(?=.*\s-D\b)/, why: "force-deletes a branch" },
  { tool: "git", test: /\bcheckout\b\s+--\s/, why: "discards local file changes" },
  { tool: "git", test: /\brestore\b(?!.*--staged)/, why: "discards local file changes" },
  { tool: "git", test: /\brebase\b/, why: "rewrites commit history" },
  { tool: "git", test: /\b(?:filter-branch|filter-repo)\b/, why: "rewrites the entire history" },
  { tool: "git", test: /\bstash\b\s+(?:drop|clear)\b/, why: "permanently drops stashed work" },
  { tool: "git", test: /\bgc\b(?=.*--prune)/, why: "drops unreachable objects for good" },
  { tool: "git", test: /\bupdate-ref\b(?=.*\s-d\b)/, why: "deletes a ref" },

  // Deleting files
  { test: /\brm\b(?=.*\s-[a-zA-Z]*[rR])/, why: "deletes a directory and everything in it" },
  { test: /\brm\b(?=.*\s-[a-zA-Z]*f)/, why: "force-deletes files" },
  { test: /\b(?:rmdir|rd)\b(?=.*(?:\/s|-Recurse))/i, why: "deletes a directory tree" },
  { test: /\bdel\b(?=.*\/[sq])/i, why: "deletes files without asking" },
  { test: /Remove-Item\b(?=.*(?:-Recurse|-Force))/i, why: "deletes files without asking" },
  { test: /\b(?:shred|srm)\b/, why: "irrecoverably wipes files" },
  { test: /\btruncate\b(?=.*\s-s\s*0)/, why: "empties a file" },

  // Permissions and ownership
  { test: /\b(?:chmod|chown)\b(?=.*\s-[a-zA-Z]*R)/, why: "changes permissions recursively" },
  { test: /\bchmod\b\s+(?:-[a-zA-Z]+\s+)*777\b/, why: "makes files world-writable" },

  // Elevation
  { test: /^sudo\b/, why: "runs as root" },
  { test: /\bdoas\b/, why: "runs as root" },
  { test: /-Verb\s+RunAs/i, why: "relaunches elevated" },

  // Processes and the machine
  { test: /\bkill\b(?=.*\s-9)/, why: "force-kills a process" },
  { test: /\b(?:killall|pkill)\b/, why: "kills processes by name" },
  { test: /\btaskkill\b(?=.*\/f)/i, why: "force-kills a process" },
  { test: /\b(?:shutdown|reboot|halt|poweroff)\b/, why: "shuts the machine down" },

  // Package and container state
  { test: /\bdocker\b(?=.*\b(?:system\s+prune|volume\s+prune))/, why: "removes docker data for good" },
  { test: /\bdocker\b(?=.*\brmi\b)(?=.*\s-f)/, why: "force-removes images" },
  { test: /\bnpm\b\s+publish\b/, why: "publishes to the registry" },
  { test: /\bnpm\b\s+unpublish\b/, why: "removes a published package" },
  { test: /\b(?:DROP|TRUNCATE)\s+(?:TABLE|DATABASE|SCHEMA)\b/i, why: "drops database data" },

  // Version control adjacent
  { test: /\bgit\b.*\bpush\b(?=.*--mirror)/, why: "mirrors over the remote" },
];

/**
 * Rules that only make sense against the whole command, because the thing that
 * makes them dangerous is the operator joining the halves. Splitting
 * `curl x | sh` into segments hides exactly what is wrong with it.
 */
const CATASTROPHIC_WHOLE: Rule[] = [
  { test: /:\s*\(\s*\)\s*\{.*\|.*&.*\}\s*;?\s*:/, why: "is a fork bomb" },
];

const DESTRUCTIVE_WHOLE: Rule[] = [
  {
    test: /\b(?:curl|wget)\b[^|]*\|\s*(?:sudo\s+)?(?:ba|z|k|da)?sh\b/,
    why: "pipes code off the internet into a shell",
  },
  {
    test: /\b(?:Invoke-WebRequest|Invoke-RestMethod|iwr|irm|curl)\b[^|]*\|\s*(?:iex|Invoke-Expression)/i,
    why: "runs code downloaded off the internet",
  },
];

/**
 * Blanks the inside of quoted spans so an argument cannot be mistaken for a
 * command: `echo "rm -rf /"` prints a string, it does not delete anything.
 * Substitutions have already been lifted out into their own segments, so what
 * remains inside quotes really is inert text.
 */
function maskQuoted(text: string): string {
  let out = "";
  let quote: '"' | "'" | null = null;

  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i]!;

    if (ch === "\\" && quote !== "'") {
      out += "  ";
      i += 1;
      continue;
    }
    if (quote) {
      out += ch === quote ? ch : " ";
      if (ch === quote) quote = null;
      continue;
    }
    if (ch === '"' || ch === "'") {
      quote = ch;
      out += ch;
      continue;
    }
    out += ch;
  }

  return out;
}

/** Finds the index just past the `)` that closes a `$(` opened at `start`. */
function closingParen(text: string, start: number): number {
  let depth = 0;
  for (let i = start; i < text.length; i += 1) {
    if (text[i] === "(") depth += 1;
    else if (text[i] === ")") {
      depth -= 1;
      if (depth === 0) return i;
    }
  }
  return -1;
}

/**
 * Splits a command into the pieces that each invoke something.
 *
 * Operators outside quotes end a segment, and command substitutions are pulled
 * out and scanned in their own right — `echo $(rm -rf /)` runs the dangerous
 * half regardless of how harmless the outer command looks. Single quotes are
 * literal, so nothing inside them is extracted; double quotes are not, so they
 * are treated as live.
 */
export function segments(command: string): string[] {
  const parts: string[] = [];
  collect(command, parts);
  return parts.map((p) => p.trim()).filter(Boolean);
}

function collect(command: string, parts: string[]): void {
  let current = "";
  let quote: '"' | "'" | null = null;

  for (let i = 0; i < command.length; i += 1) {
    const ch = command[i]!;
    const next = command[i + 1];

    if (ch === "\\" && quote !== "'") {
      current += ch + (next ?? "");
      i += 1;
      continue;
    }

    if (quote === "'") {
      if (ch === "'") quote = null;
      current += ch;
      continue;
    }

    // Substitution is live inside double quotes as well as outside them.
    if (ch === "$" && next === "(") {
      const close = closingParen(command, i + 1);
      if (close !== -1) {
        collect(command.slice(i + 2, close), parts);
        i = close;
        continue;
      }
    }

    if (ch === "`") {
      const close = command.indexOf("`", i + 1);
      if (close !== -1) {
        collect(command.slice(i + 1, close), parts);
        i = close;
        continue;
      }
      // No pair: a PowerShell escape character, not a substitution.
      current += ch;
      continue;
    }

    if (quote === '"') {
      if (ch === '"') quote = null;
      current += ch;
      continue;
    }

    if (ch === '"' || ch === "'") {
      quote = ch;
      current += ch;
      continue;
    }

    if (ch === ";" || ch === "|" || ch === "&" || ch === "\n") {
      // Consume the second character of && and ||.
      if ((ch === "&" || ch === "|") && next === ch) i += 1;
      parts.push(current);
      current = "";
      continue;
    }

    current += ch;
  }

  parts.push(current);
}

function toolOf(segment: string): string {
  const first = segment.trim().split(/\s+/)[0] ?? "";
  // Strip a path so /usr/bin/rm is still rm.
  const base = first.replace(/\\/g, "/").split("/").pop() ?? first;
  return base.replace(/\.exe$/i, "").toLowerCase();
}

function match(rules: Rule[], segment: string, tool: string): string | null {
  for (const rule of rules) {
    if (rule.tool && rule.tool !== tool) continue;
    if (rule.test.test(segment)) return rule.why;
  }
  return null;
}

/** The worst thing this command does, or null when it is routine. */
export function assess(command: string): Risk | null {
  const whole = maskQuoted(command);
  const parts = segments(command).map((segment) => ({
    text: maskQuoted(segment),
    tool: toolOf(segment),
  }));

  const wholeCatastrophic = match(CATASTROPHIC_WHOLE, whole, "");
  if (wholeCatastrophic) return { level: "catastrophic", why: wholeCatastrophic };

  for (const part of parts) {
    const why = match(CATASTROPHIC, part.text, part.tool);
    if (why) return { level: "catastrophic", why };
  }

  const wholeDestructive = match(DESTRUCTIVE_WHOLE, whole, "");
  if (wholeDestructive) return { level: "destructive", why: wholeDestructive };

  for (const part of parts) {
    const why = match(DESTRUCTIVE, part.text, part.tool);
    if (why) return { level: "destructive", why };
  }

  return null;
}

/** Why a command is risky, or null if it is routine. */
export function riskOf(command: string): string | null {
  return assess(command)?.why ?? null;
}

export function anyRisky(commands: string[]): boolean {
  return commands.some((c) => assess(c) !== null);
}

/** The first command that must not run at all, if there is one. */
export function catastrophicIn(
  commands: string[],
): { command: string; why: string } | null {
  for (const command of commands) {
    const risk = assess(command);
    if (risk?.level === "catastrophic") return { command, why: risk.why };
  }
  return null;
}
