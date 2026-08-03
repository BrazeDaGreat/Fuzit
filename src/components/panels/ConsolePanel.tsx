import React, { useEffect, useState } from "react";
import { Box, Text, useInput } from "ink";
import { color, glyph } from "../../theme/theme.js";
import TextField from "../ui/TextField.js";
import TurnView, { type Turn } from "../Turn.js";
import { anyRisky, riskOf } from "../../utils/danger.js";
import type { Scope } from "../../utils/validate.js";

type ReviewMode = "actions" | "picking" | "editing" | "confirming";
type Action = "run" | "edit" | "cancel";

const ACTIONS: Action[] = ["run", "edit", "cancel"];

interface ConsolePanelProps {
  turns: Turn[];
  width: number;
  height: number;
  isActive: boolean;
  guardDestructive: boolean;
  scope: Scope;
  onRun: (commands: string[]) => void;
  onCancel: () => void;
}

const EXAMPLES: Record<Scope, string[]> = {
  shell: [
    "undo my last commit but keep the changes",
    "find every file over 10 MB in here",
    "kill whatever is holding port 3000",
  ],
  git: [
    "undo my last commit but keep the changes",
    "stash everything and switch to main",
    "squash the last three commits into one",
  ],
};

function estimateRows(turn: Turn, width: number): number {
  let rows = 2; // request + trailing margin
  if (turn.explanation) rows += Math.ceil(turn.explanation.length / Math.max(20, width - 4));
  if (turn.error) rows += 2;
  rows += turn.commands.length;
  for (const result of turn.results) {
    if (result.output) rows += Math.min(4, result.output.split("\n").length);
    if (result.error) rows += Math.min(4, result.error.split("\n").length);
  }
  if (turn.delta.length) rows += turn.delta.length + 1;
  return rows;
}

/** Newest turns win the available rows; older ones fall off the top. */
function visibleTurns(turns: Turn[], width: number, budget: number): Turn[] {
  const out: Turn[] = [];
  let used = 0;
  for (let i = turns.length - 1; i >= 0; i -= 1) {
    const turn = turns[i]!;
    const cost = estimateRows(turn, width);
    if (used + cost > budget && out.length > 0) break;
    out.unshift(turn);
    used += cost;
  }
  return out;
}

function EmptyConsole({ width, scope }: { width: number; scope: Scope }) {
  return (
    <Box flexDirection="column" paddingLeft={1}>
      <Text color={color.text}>
        {scope === "shell"
          ? "Say what you want to happen here, in plain English."
          : "Ask for a change to this repo, in plain English."}
      </Text>
      <Box flexDirection="column" marginTop={1}>
        {EXAMPLES[scope].map((example) => (
          <Box key={example}>
            <Text color={color.brandDim}>{glyph.caret} </Text>
            <Text color={color.muted} wrap="truncate-end">
              {example}
            </Text>
          </Box>
        ))}
      </Box>
      <Box marginTop={1} width={Math.min(width - 2, 62)}>
        <Text color={color.rule} wrap="wrap">
          Commands are shown for review before anything runs, and anything that
          discards work has to be confirmed.
        </Text>
      </Box>
    </Box>
  );
}

export default function ConsolePanel({
  turns,
  width,
  height,
  isActive,
  guardDestructive,
  scope,
  onRun,
  onCancel,
}: ConsolePanelProps) {
  const current = turns[turns.length - 1];
  const inReview = current?.status === "review";

  const [mode, setMode] = useState<ReviewMode>("actions");
  const [action, setAction] = useState<Action>("run");
  const [index, setIndex] = useState(0);
  const [draft, setDraft] = useState("");

  /**
   * Edits are keyed to the turn they belong to rather than copied into state on
   * a effect, so a freshly planned turn renders its commands on the very first
   * pass instead of one paint later.
   */
  const [edits, setEdits] = useState<{ turnId: number; commands: string[] } | null>(
    null,
  );
  const commands =
    edits && edits.turnId === current?.id ? edits.commands : (current?.commands ?? []);
  const setCommands = (next: string[]) => {
    if (current) setEdits({ turnId: current.id, commands: next });
  };

  // A new plan starts review from a clean slate.
  useEffect(() => {
    setMode("actions");
    setAction("run");
    setIndex(0);
  }, [current?.id]);

  const risky = guardDestructive && anyRisky(commands);

  const start = () => {
    if (risky && mode !== "confirming") {
      setMode("confirming");
      return;
    }
    onRun(commands);
  };

  useInput(
    (input, key) => {
      if (mode === "editing") return; // TextInput owns the keys

      if (mode === "confirming") {
        if (input === "y" || input === "Y") onRun(commands);
        else setMode("actions");
        return;
      }

      if (mode === "picking") {
        if (key.upArrow) setIndex((i) => Math.max(0, i - 1));
        else if (key.downArrow) setIndex((i) => Math.min(commands.length - 1, i + 1));
        else if (key.return) {
          setDraft(commands[index] ?? "");
          setMode("editing");
        } else if (key.escape) setMode("actions");
        return;
      }

      if (key.leftArrow) {
        setAction((a) => ACTIONS[Math.max(0, ACTIONS.indexOf(a) - 1)]!);
      } else if (key.rightArrow) {
        setAction((a) => ACTIONS[Math.min(ACTIONS.length - 1, ACTIONS.indexOf(a) + 1)]!);
      } else if (key.return) {
        if (action === "run") start();
        else if (action === "edit") setMode("picking");
        else onCancel();
      } else if (key.escape) {
        onCancel();
      }
    },
    { isActive: isActive && inReview },
  );

  const handleEditSubmit = (value: string) => {
    const trimmed = value.trim();
    if (trimmed) {
      const next = [...commands];
      next[index] = trimmed;
      setCommands(next);
    }
    setMode("picking");
  };

  // The review footer is rendered below the transcript, so reserve its rows.
  const footerRows = inReview ? (mode === "confirming" ? 3 : 2) : 0;
  const shown = visibleTurns(turns, width, Math.max(4, height - footerRows));

  return (
    <Box flexDirection="column" width={width} height={height} overflow="hidden">
      <Box flexDirection="column" flexGrow={1}>
        {turns.length === 0 ? (
          <EmptyConsole width={width} scope={scope} />
        ) : (
          shown.map((turn) => {
            const live = turn.id === current?.id;
            const showEdit = live && inReview && (mode === "picking" || mode === "editing");
            return (
              <TurnView
                key={turn.id}
                turn={live && inReview ? { ...turn, commands } : turn}
                width={width}
                compact={!live}
                editIndex={showEdit ? index : -1}
                editSlot={
                  mode === "editing" ? (
                    <TextField
                      value={draft}
                      onChange={setDraft}
                      onSubmit={handleEditSubmit}
                    />
                  ) : undefined
                }
              />
            );
          })
        )}
      </Box>

      {inReview && (
        <Box flexDirection="column">
          {mode === "confirming" ? (
            <>
              <Box>
                <Text color={color.bad} bold>
                  {glyph.warn}{" "}
                </Text>
                <Text color={color.focus} wrap="truncate-end">
                  {commands.map(riskOf).find(Boolean) ?? "this cannot be undone"}
                </Text>
              </Box>
              <Box>
                <Text color={color.muted}>
                  Press <Text color={color.focus} bold>y</Text> to run it anyway,
                  any other key to back out.
                </Text>
              </Box>
            </>
          ) : mode === "picking" || mode === "editing" ? (
            <Box>
              <Text color={color.muted}>
                {mode === "editing"
                  ? "enter saves the command"
                  : `${glyph.arrow} enter edits · ↑↓ picks · esc goes back`}
              </Text>
            </Box>
          ) : (
            <Box justifyContent="space-between" width={width}>
              <Box>
                {ACTIONS.map((item) => {
                  const on = item === action;
                  const label =
                    item === "run" && risky ? "run anyway" : item;
                  return (
                    <Box key={item} marginRight={2}>
                      <Text color={on ? color.focus : color.rule}>
                        {on ? glyph.mark : " "}
                      </Text>
                      <Text
                        color={
                          on
                            ? item === "run" && risky
                              ? color.bad
                              : color.focus
                            : color.muted
                        }
                        bold={on}
                      >
                        {label}
                      </Text>
                    </Box>
                  );
                })}
              </Box>
              <Text color={color.rule}>←→ choose · enter confirm · esc cancel</Text>
            </Box>
          )}
        </Box>
      )}
    </Box>
  );
}
