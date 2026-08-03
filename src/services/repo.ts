import path from "node:path";
import { executeCommand } from "../utils/execute.js";

export interface Commit {
  hash: string;
  subject: string;
}

export interface RepoState {
  isRepo: boolean;
  name: string;
  root: string;
  branch: string;
  detached: boolean;
  upstream: string | null;
  ahead: number;
  behind: number;
  staged: number;
  modified: number;
  untracked: number;
  conflicts: number;
  stashes: number;
  commits: Commit[];
}

export const NO_REPO: RepoState = {
  isRepo: false,
  name: "",
  root: "",
  branch: "",
  detached: false,
  upstream: null,
  ahead: 0,
  behind: 0,
  staged: 0,
  modified: 0,
  untracked: 0,
  conflicts: 0,
  stashes: 0,
  commits: [],
};

/**
 * Reads everything the dashboard shows in one pass.
 *
 * `--porcelain=v2 --branch` gives branch, upstream, ahead/behind and per-file
 * staged/worktree status in a single call, so the sidebar costs a fixed number
 * of subprocesses regardless of repo size.
 */
export function readRepoState(): RepoState {
  const top = executeCommand("git rev-parse --show-toplevel");
  if (!top.success || !top.output) return NO_REPO;

  const root = top.output;
  const state: RepoState = {
    ...NO_REPO,
    isRepo: true,
    root,
    name: path.basename(root),
    branch: "HEAD",
  };

  const status = executeCommand("git status --porcelain=v2 --branch");
  if (status.success) {
    for (const line of status.output.split("\n")) {
      if (!line) continue;

      if (line.startsWith("# branch.head ")) {
        const head = line.slice("# branch.head ".length).trim();
        state.detached = head === "(detached)";
        state.branch = state.detached ? "detached" : head;
        continue;
      }
      if (line.startsWith("# branch.upstream ")) {
        state.upstream = line.slice("# branch.upstream ".length).trim();
        continue;
      }
      if (line.startsWith("# branch.ab ")) {
        const [a, b] = line.slice("# branch.ab ".length).trim().split(" ");
        state.ahead = Math.abs(Number.parseInt(a ?? "0", 10) || 0);
        state.behind = Math.abs(Number.parseInt(b ?? "0", 10) || 0);
        continue;
      }
      if (line.startsWith("#")) continue;

      const kind = line[0];
      if (kind === "?") {
        state.untracked += 1;
      } else if (kind === "u") {
        state.conflicts += 1;
      } else if (kind === "1" || kind === "2") {
        // Field 1 is the two-char XY code: X = index, Y = worktree.
        const xy = line.split(" ")[1] ?? "..";
        if (xy[0] !== ".") state.staged += 1;
        if (xy[1] !== ".") state.modified += 1;
      }
    }
  }

  const log = executeCommand('git log -5 --format="%h %s"');
  if (log.success && log.output) {
    state.commits = log.output
      .split("\n")
      .filter(Boolean)
      .map((line) => {
        const gap = line.indexOf(" ");
        return gap === -1
          ? { hash: line, subject: "" }
          : { hash: line.slice(0, gap), subject: line.slice(gap + 1) };
      });
  }

  const stash = executeCommand("git stash list");
  if (stash.success && stash.output) {
    state.stashes = stash.output.split("\n").filter(Boolean).length;
  }

  return state;
}

export function isGitRepo(): boolean {
  const result = executeCommand("git rev-parse --is-inside-work-tree");
  return result.success && result.output === "true";
}

export interface DeltaRow {
  key: string;
  label: string;
  from: string;
  to: string;
}

/**
 * What actually changed in the repo because of the commands we just ran.
 * This is the one thing Fuzit can report that a bare terminal cannot.
 */
export function diffRepoState(before: RepoState, after: RepoState): DeltaRow[] {
  const rows: DeltaRow[] = [];

  const push = (key: string, label: string, from: unknown, to: unknown) => {
    if (String(from) !== String(to)) {
      rows.push({ key, label, from: String(from), to: String(to) });
    }
  };

  push("branch", "branch", before.branch, after.branch);
  push("upstream", "tracking", before.upstream ?? "none", after.upstream ?? "none");
  push("ahead", "ahead", before.ahead, after.ahead);
  push("behind", "behind", before.behind, after.behind);
  push("staged", "staged", before.staged, after.staged);
  push("modified", "modified", before.modified, after.modified);
  push("untracked", "untracked", before.untracked, after.untracked);
  push("conflicts", "conflicts", before.conflicts, after.conflicts);
  push("stashes", "stashes", before.stashes, after.stashes);

  const head = after.commits[0]?.hash ?? "";
  if (head && head !== (before.commits[0]?.hash ?? "")) {
    push("head", "HEAD", before.commits[0]?.hash ?? "none", head);
  }

  return rows;
}

/** Context blob handed to the model alongside the user's request. */
export function describeForModel(state: RepoState): string {
  const status = executeCommand("git status --short");
  const remotes = executeCommand("git remote -v");
  const tracking = state.upstream
    ? `${state.upstream} (ahead ${state.ahead}, behind ${state.behind})`
    : "none";

  return [
    `- Branch: ${state.branch}${state.detached ? " (detached HEAD)" : ""}`,
    `- Tracking: ${tracking}`,
    `- Status:\n${status.success && status.output ? status.output : "(clean)"}`,
    `- Recent commits:\n${
      state.commits.map((c) => `${c.hash} ${c.subject}`).join("\n") || "(none)"
    }`,
    `- Stashes: ${state.stashes}`,
    `- Remotes:\n${remotes.success && remotes.output ? remotes.output : "(none)"}`,
  ].join("\n");
}
