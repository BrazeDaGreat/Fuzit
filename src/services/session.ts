import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { executeCommand, type CommandResult } from "../utils/execute.js";
import { detectShell } from "./shell.js";

/** `cd`, and the PowerShell and cmd spellings of it. */
const CHANGE_DIR = /^(?:cd|chdir|sl|Set-Location)(?:\s+(.+))?$/i;

function unquote(value: string): string {
  const trimmed = value.trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

/**
 * Runs one command in the session's directory.
 *
 * `cd` is handled here rather than passed to a shell, because each command is
 * its own child process — a shell `cd` would exit before the next command ever
 * saw it. Changing the Fuzit process's own directory instead means everything
 * downstream (the next command, the git context, the header) follows along
 * without threading a cwd through every call.
 */
export function runCommand(command: string): CommandResult {
  const trimmed = command.trim();
  const match = trimmed.match(CHANGE_DIR);

  if (match) {
    const argument = match[1] ? unquote(match[1]) : "~";
    if (argument === "-") {
      return {
        command,
        output: "",
        success: false,
        error: "cd - is not supported. Give the directory by name.",
      };
    }

    const expanded = argument.startsWith("~")
      ? path.join(os.homedir(), argument.slice(1))
      : argument;
    const target = path.resolve(process.cwd(), expanded);

    try {
      if (!fs.statSync(target).isDirectory()) {
        return {
          command,
          output: "",
          success: false,
          error: `Not a directory: ${target}`,
        };
      }
      process.chdir(target);
      return { command, output: target, success: true };
    } catch {
      return {
        command,
        output: "",
        success: false,
        error: `No such directory: ${target}`,
      };
    }
  }

  return executeCommand(trimmed, { shell: detectShell().path });
}
