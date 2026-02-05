import { execSync } from "node:child_process";

export interface CommandResult {
  command: string;
  output: string;
  success: boolean;
  error?: string;
}

export function executeCommand(command: string): CommandResult {
  try {
    const output = execSync(command, {
      encoding: "utf-8",
      timeout: 30000,
      stdio: ["pipe", "pipe", "pipe"],
    });
    return { command, output: output.trim(), success: true };
  } catch (err: unknown) {
    const error = err as { stderr?: string; message?: string };
    return {
      command,
      output: "",
      success: false,
      error: error.stderr?.trim() || error.message || "Unknown error",
    };
  }
}

export function executeCommands(commands: string[]): CommandResult[] {
  const results: CommandResult[] = [];
  for (const cmd of commands) {
    const result = executeCommand(cmd);
    results.push(result);
    if (!result.success) break;
  }
  return results;
}
