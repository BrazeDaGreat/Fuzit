import { execSync } from "node:child_process";

export interface CommandResult {
  command: string;
  output: string;
  success: boolean;
  error?: string;
}

export interface ExecOptions {
  /** Shell executable. Defaults to the platform shell child_process picks. */
  shell?: string;
  cwd?: string;
  /** Milliseconds. Installs and builds routinely outrun the old 30s. */
  timeout?: number;
}

const DEFAULT_TIMEOUT = 120_000;
/** Recursive listings and build logs blow straight past the 1 MB default. */
const MAX_BUFFER = 10 * 1024 * 1024;

// eslint-disable-next-line no-control-regex
const ANSI = /\[[0-9;?]*[A-Za-z]|\][^]*(?:|\\)/g;

/**
 * Tools colour their own output. Left in, those codes override the panel's
 * styling and, worse, cursor-movement sequences would scribble over a
 * fixed-height dashboard. The transcript keeps the text and drops the styling.
 */
function clean(text: string): string {
  return text.replace(ANSI, "").trim();
}

export function executeCommand(
  command: string,
  options: ExecOptions = {},
): CommandResult {
  try {
    const output = execSync(command, {
      encoding: "utf-8",
      timeout: options.timeout ?? DEFAULT_TIMEOUT,
      maxBuffer: MAX_BUFFER,
      stdio: ["pipe", "pipe", "pipe"],
      ...(options.shell ? { shell: options.shell } : {}),
      ...(options.cwd ? { cwd: options.cwd } : {}),
    });
    return { command, output: clean(output), success: true };
  } catch (err: unknown) {
    const error = err as {
      stderr?: string;
      stdout?: string;
      message?: string;
      signal?: string;
    };

    if (error.signal === "SIGTERM") {
      return {
        command,
        output: clean(error.stdout ?? ""),
        success: false,
        error: "Timed out.",
      };
    }

    return {
      command,
      // A failing command often prints useful output before it fails.
      output: clean(error.stdout ?? ""),
      success: false,
      error: clean(error.stderr ?? "") || error.message || "Unknown error",
    };
  }
}
