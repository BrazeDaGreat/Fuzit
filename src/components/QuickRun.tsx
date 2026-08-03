import React, { useEffect, useState } from "react";
import { Box, Text, useApp } from "ink";
import { color, glyph } from "../theme/theme.js";
import TurnView, { type Turn } from "./Turn.js";
import { planCommands } from "../services/ai.js";
import { addHistory } from "../services/config.js";
import { diffRepoState, readRepoState } from "../services/repo.js";
import { ghUsable } from "../services/tools.js";
import { executeCommand, type CommandResult } from "../utils/execute.js";
import { anyRisky, riskOf } from "../utils/danger.js";
import type { Provider } from "../services/providers.js";

interface QuickRunProps {
  request: string;
  width: number;
  provider: Provider;
  model: string;
  guardDestructive: boolean;
  allowGh: boolean;
}

/**
 * `fuzit -n <request>`. No dashboard: a one-shot deserves one block of output
 * that reads well in a scrollback buffer and in CI logs.
 */
export default function QuickRun({
  request,
  width,
  provider,
  model,
  guardDestructive,
  allowGh,
}: QuickRunProps) {
  const { exit } = useApp();
  const [turn, setTurn] = useState<Turn>({
    id: 1,
    request,
    commands: [],
    explanation: "",
    status: "planning",
    results: [],
    delta: [],
  });
  const [blocked, setBlocked] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const stop = (code: number) => {
      process.exitCode = code;
      setTimeout(() => exit(), 50);
    };

    (async () => {
      const before = readRepoState();
      if (!before.isRepo) {
        setTurn((t) => ({ ...t, status: "failed", error: "Not a git repository." }));
        stop(1);
        return;
      }

      let plan;
      try {
        plan = await planCommands({
          provider,
          model,
          request,
          repo: before,
          allowGh: ghUsable(allowGh),
          onUpdate: (partial) => {
            if (cancelled) return;
            setTurn((t) => ({
              ...t,
              commands: partial.commands,
              explanation: partial.explanation,
            }));
          },
        });
      } catch (err) {
        if (cancelled) return;
        setTurn((t) => ({
          ...t,
          commands: [],
          status: "failed",
          error: err instanceof Error ? err.message : "Unknown error",
        }));
        stop(1);
        return;
      }
      if (cancelled) return;

      if (guardDestructive && anyRisky(plan.commands)) {
        setTurn((t) => ({
          ...t,
          commands: plan.commands,
          explanation: plan.explanation,
          status: "cancelled",
        }));
        setBlocked(plan.commands.map(riskOf).find(Boolean) ?? "this cannot be undone");
        stop(1);
        return;
      }

      setTurn((t) => ({
        ...t,
        commands: plan.commands,
        explanation: plan.explanation,
        status: "running",
      }));

      const results: CommandResult[] = [];
      for (const command of plan.commands) {
        const result = executeCommand(command);
        results.push(result);
        if (cancelled) return;
        setTurn((t) => ({ ...t, results: [...results] }));
        if (!result.success) break;
      }

      const ok =
        results.length === plan.commands.length && results.every((r) => r.success);
      const after = readRepoState();

      setTurn((t) => ({
        ...t,
        results,
        status: ok ? "done" : "failed",
        delta: diffRepoState(before, after),
      }));

      if (ok) {
        addHistory({
          request,
          commands: plan.commands,
          explanation: plan.explanation,
          timestamp: Date.now(),
        });
      }

      stop(ok ? 0 : 1);
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <Box flexDirection="column" width={width} paddingY={1}>
      <TurnView turn={turn} width={width} />
      {blocked && (
        <Box flexDirection="column">
          <Box>
            <Text color={color.bad} bold>
              {glyph.warn}{" "}
            </Text>
            <Text color={color.focus}>{blocked}</Text>
          </Box>
          <Text color={color.muted}>
            Nothing ran. Open the dashboard with {"`fuzit`"} to review it, or turn
            the safety guard off in settings.
          </Text>
        </Box>
      )}
    </Box>
  );
}
