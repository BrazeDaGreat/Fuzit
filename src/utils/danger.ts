/**
 * Flags commands that can destroy work, so review can mark them before you run.
 * Detection only — nothing here blocks a command on its own.
 */

interface Rule {
  test: RegExp;
  why: string;
}

const RULES: Rule[] = [
  { test: /\bpush\b(?=.*(?:--force(?!-with-lease)\b|\s-f\b))/, why: "overwrites remote history" },
  { test: /\bpush\b(?=.*--delete\b)/, why: "deletes a remote branch" },
  { test: /\breset\b(?=.*--hard\b)/, why: "discards uncommitted work" },
  { test: /\bclean\b(?=.*\s-[a-zA-Z]*f)/, why: "deletes untracked files" },
  { test: /\bbranch\b(?=.*\s-D\b)/, why: "force-deletes a branch" },
  { test: /\bcheckout\b\s+--\s/, why: "discards local file changes" },
  { test: /\brestore\b(?!.*--staged)/, why: "discards local file changes" },
  { test: /\brebase\b/, why: "rewrites commit history" },
  { test: /\b(filter-branch|filter-repo)\b/, why: "rewrites the entire history" },
  { test: /\bstash\b\s+(drop|clear)\b/, why: "permanently drops stashed work" },
  { test: /\bgc\b(?=.*--prune)/, why: "drops unreachable objects for good" },
  { test: /\bupdate-ref\b(?=.*\s-d\b)/, why: "deletes a ref" },
];

/** Returns why a command is risky, or null if it is routine. */
export function riskOf(command: string): string | null {
  const cmd = command.trim();
  for (const rule of RULES) {
    if (rule.test.test(cmd)) return rule.why;
  }
  return null;
}

export function anyRisky(commands: string[]): boolean {
  return commands.some((c) => riskOf(c) !== null);
}
