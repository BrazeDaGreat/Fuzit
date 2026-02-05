import { executeCommand } from "../utils/execute.js";

export interface GitContext {
  branch: string;
  status: string;
  recentLog: string;
  remotes: string;
}

export function getGitContext(): GitContext {
  const branch = executeCommand("git branch --show-current");
  const status = executeCommand("git status --short");
  const recentLog = executeCommand("git log --oneline -10");
  const remotes = executeCommand("git remote -v");

  return {
    branch: branch.success ? branch.output : "unknown",
    status: status.success ? status.output : "not a git repo or no commits",
    recentLog: recentLog.success ? recentLog.output : "no commits yet",
    remotes: remotes.success ? remotes.output : "no remotes",
  };
}

export function isGitRepo(): boolean {
  const result = executeCommand("git rev-parse --is-inside-work-tree");
  return result.success && result.output === "true";
}
