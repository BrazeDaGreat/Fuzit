import { execSync } from "node:child_process";
import os from "node:os";

export type ShellFamily = "powershell" | "cmd" | "posix";

export interface ShellInfo {
  /** Executable handed to child_process. */
  path: string;
  /** Human name for the settings row and the model prompt. */
  name: string;
  family: ShellFamily;
  platform: string;
}

let cached: ShellInfo | null = null;

function onPath(command: string): boolean {
  try {
    execSync(command, { stdio: "ignore", timeout: 5000 });
    return true;
  } catch {
    return false;
  }
}

/**
 * Which shell the generated commands must actually be valid for.
 *
 * This is not cosmetic: `ls | grep foo` is fine in PowerShell and bash and
 * meaningless in cmd.exe, so the model has to be told which one it is writing
 * for, and the same shell has to be the one that runs it.
 */
export function detectShell(force = false): ShellInfo {
  if (cached && !force) return cached;

  if (process.platform === "win32") {
    if (onPath("pwsh -NoProfile -Command $PSVersionTable.PSVersion")) {
      cached = {
        path: "pwsh.exe",
        name: "PowerShell 7",
        family: "powershell",
        platform: "Windows",
      };
    } else if (onPath("powershell -NoProfile -Command $PSVersionTable.PSVersion")) {
      cached = {
        path: "powershell.exe",
        name: "Windows PowerShell 5",
        family: "powershell",
        platform: "Windows",
      };
    } else {
      cached = {
        path: process.env.COMSPEC ?? "cmd.exe",
        name: "cmd.exe",
        family: "cmd",
        platform: "Windows",
      };
    }
    return cached;
  }

  const shellPath = process.env.SHELL ?? "/bin/sh";
  const name = shellPath.slice(shellPath.lastIndexOf("/") + 1);
  cached = {
    path: shellPath,
    name,
    family: "posix",
    platform: process.platform === "darwin" ? "macOS" : "Linux",
  };
  return cached;
}

/**
 * Shortens a path for the header bar. Keeps whatever identifies the root — the
 * drive letter or `~` — because `…/Projects/Fuzit` loses the one part that says
 * which disk you are on.
 */
export function shortenPath(dir: string, keep = 3): string {
  const home = os.homedir().replace(/\\/g, "/");
  const normalised = dir.replace(/\\/g, "/");
  const underHome = normalised.toLowerCase().startsWith(home.toLowerCase());
  const shown = underHome ? `~${normalised.slice(home.length)}` : normalised;

  const parts = shown.split("/").filter(Boolean);
  if (parts.length <= keep) return shown;

  const root = underHome ? "~" : /^[a-zA-Z]:$/.test(parts[0] ?? "") ? parts[0]! : "";
  const tail = parts.slice(-(keep - 1)).join("/");

  if (root) return `${root}/…/${tail}`;
  return shown.startsWith("/") ? `/…/${tail}` : `…/${tail}`;
}
