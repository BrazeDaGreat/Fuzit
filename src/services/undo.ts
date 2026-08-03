import type { RepoState } from "./repo.js";

export interface UndoPlan {
  commands: string[];
  explanation: string;
  /** Something the undo cannot reach, shown alongside the plan. */
  warning?: string;
}

/** How many commits `after` has that `before` did not. */
function commitsAdded(before: RepoState, after: RepoState): number {
  const previousHead = before.commits[0]?.hash;
  if (!previousHead) return after.commits.length;

  const index = after.commits.findIndex((c) => c.hash === previousHead);
  return index === -1 ? 0 : index;
}

/**
 * Proposes the inverse of what a turn did, derived from the repo snapshots
 * taken either side of it rather than from the commands themselves.
 *
 * It deliberately reverses one effect at a time — the most recent one. Undoing
 * a commit and a branch switch in a single generated script is where this kind
 * of feature starts destroying work, and the user can simply undo again.
 *
 * The result goes through normal review. Undo proposes; it never runs.
 */
export function planUndo(
  before: RepoState,
  after: RepoState,
): UndoPlan | null {
  const pushed = after.ahead < before.ahead && before.ahead > 0;
  const warning = pushed
    ? "some of this was already pushed — undoing here does not change the remote"
    : undefined;

  const added = commitsAdded(before, after);
  if (added > 0) {
    return {
      commands: [`git reset --soft HEAD~${added}`],
      explanation:
        added === 1
          ? "takes the commit back off HEAD and leaves its changes staged"
          : `takes the last ${added} commits back off HEAD and leaves their changes staged`,
      warning,
    };
  }

  if (after.branch !== before.branch && before.branch) {
    return {
      commands: [`git checkout ${before.branch}`],
      explanation: `switches back to ${before.branch}`,
      warning,
    };
  }

  if (after.stashes === before.stashes + 1) {
    return {
      commands: ["git stash pop"],
      explanation: "puts the stashed changes back into your working tree",
      warning,
    };
  }

  // Only safe when nothing was staged beforehand, since git cannot unstage
  // just the files this turn added to the index.
  if (after.staged > before.staged && before.staged === 0) {
    return {
      commands: ["git reset"],
      explanation: "unstages everything this turn staged",
      warning,
    };
  }

  return null;
}

