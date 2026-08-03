import React, { useCallback, useEffect, useRef, useState } from "react";
import { Box, Text, useInput } from "ink";
import { color, layout } from "./theme/theme.js";
import { PANELS, type PanelId } from "./panels.js";
import { useTerminalSize } from "./hooks/useTerminalSize.js";
import { usePanelHotkeys } from "./hooks/usePanelHotkeys.js";

import HeaderBar, { type Phase } from "./components/layout/HeaderBar.js";
import Sidebar from "./components/layout/Sidebar.js";
import KeyBar from "./components/layout/KeyBar.js";
import Prompt from "./components/layout/Prompt.js";
import Rule from "./components/ui/Rule.js";

import ConsolePanel from "./components/panels/ConsolePanel.js";
import ModelPanel from "./components/panels/ModelPanel.js";
import HistoryPanel from "./components/panels/HistoryPanel.js";
import SettingsPanel from "./components/panels/SettingsPanel.js";
import HelpPanel from "./components/panels/HelpPanel.js";
import Setup from "./components/Setup.js";
import type { Turn } from "./components/Turn.js";

import {
  addHistory,
  clearHistory,
  getActiveModelId,
  getActiveProvider,
  getAllowGh,
  getGuardDestructive,
  getHistory,
  getProviders,
  isConfigured,
  setActive,
  setAllowGh,
  setGuardDestructive,
  type HistoryEntry,
} from "./services/config.js";
import { modelShort } from "./config/knownModels.js";
import { planCommands, type PriorTurn } from "./services/ai.js";
import { ghUsable } from "./services/tools.js";
import { planUndo } from "./services/undo.js";
import type { Provider } from "./services/providers.js";
import {
  diffRepoState,
  readRepoState,
  NO_REPO,
  type RepoState,
} from "./services/repo.js";
import { executeCommand } from "./utils/execute.js";

export type StartMode = "console" | "model" | "history" | "settings";

const START_PANEL: Record<StartMode, PanelId> = {
  console: 1,
  model: 2,
  history: 3,
  settings: 4,
};

interface AppProps {
  startMode?: StartMode;
}

const FLASH_MS = 2600;
/** How many previous exchanges a follow-up carries. */
const CONTEXT_TURNS = 3;

export default function App({ startMode = "console" }: AppProps) {
  const size = useTerminalSize();
  const [needsKey, setNeedsKey] = useState(!isConfigured());
  const [rekeying, setRekeying] = useState(false);

  const [panel, setPanel] = useState<PanelId>(START_PANEL[startMode]);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [draft, setDraft] = useState("");
  const [providers, setProviders] = useState<Provider[]>(() => getProviders());
  const [activeProviderId, setActiveProviderId] = useState(
    () => getActiveProvider()?.id ?? "",
  );
  const [model, setModelState] = useState(getActiveModelId());
  const [guard, setGuard] = useState(getGuardDestructive());
  const [allowGh, setAllowGhState] = useState(getAllowGh());
  const [history, setHistory] = useState<HistoryEntry[]>(() => getHistory());
  const [repo, setRepo] = useState<RepoState>(NO_REPO);
  const [changed, setChanged] = useState<ReadonlySet<string>>(new Set());
  const [notice, setNotice] = useState("");
  /** True while the model panel has a sub-view open, so Escape backs out there. */
  const [modelDepth, setModelDepth] = useState(false);
  const nextId = useRef(1);
  const flashTimer = useRef<NodeJS.Timeout>();
  const noticeTimer = useRef<NodeJS.Timeout>();

  const provider = providers.find((p) => p.id === activeProviderId) ?? providers[0];
  const current = turns[turns.length - 1];
  const phase: Phase = !repo.isRepo
    ? "blocked"
    : current?.status === "planning"
      ? "thinking"
      : current?.status === "review"
        ? "review"
        : current?.status === "running"
          ? "running"
          : "ready";

  const refreshRepo = useCallback(() => {
    setRepo(readRepoState());
  }, []);

  useEffect(() => {
    refreshRepo();
  }, [refreshRepo]);

  useEffect(() => {
    return () => {
      if (flashTimer.current) clearTimeout(flashTimer.current);
      if (noticeTimer.current) clearTimeout(noticeTimer.current);
    };
  }, []);

  const flash = useCallback((keys: string[]) => {
    if (keys.length === 0) return;
    setChanged(new Set(keys));
    if (flashTimer.current) clearTimeout(flashTimer.current);
    flashTimer.current = setTimeout(() => setChanged(new Set()), FLASH_MS);
  }, []);

  const say = useCallback((message: string) => {
    setNotice(message);
    if (noticeTimer.current) clearTimeout(noticeTimer.current);
    noticeTimer.current = setTimeout(() => setNotice(""), 3000);
  }, []);

  const patchTurn = useCallback((id: number, patch: Partial<Turn>) => {
    setTurns((list) =>
      list.map((turn) => (turn.id === id ? { ...turn, ...patch } : turn)),
    );
  }, []);

  const reloadProviders = useCallback(() => {
    setProviders(getProviders());
    setActiveProviderId(getActiveProvider()?.id ?? "");
    setModelState(getActiveModelId());
  }, []);

  /** The last few exchanges, so a follow-up can refer back to them. */
  const priorContext = useCallback((): PriorTurn[] => {
    return turns
      .filter((t) => t.commands.length > 0 && !t.isUndo)
      .slice(-CONTEXT_TURNS)
      .map((t) => {
        const failed = t.results.find((r) => !r.success);
        const outcome =
          t.status === "done"
            ? "ran successfully"
            : t.status === "failed" && failed
              ? `failed: ${failed.error ?? "unknown error"}`
              : t.status === "cancelled"
                ? "the user cancelled it"
                : undefined;
        return {
          request: t.request,
          commands: t.commands,
          explanation: t.explanation,
          outcome,
        };
      });
  }, [turns]);

  const submitRequest = useCallback(
    async (value: string) => {
      const request = value.trim();
      if (!request) return;
      if (!provider) return;

      const before = readRepoState();
      setRepo(before);

      const id = nextId.current;
      nextId.current += 1;

      const prior = priorContext();

      setTurns((list) => [
        ...list,
        {
          id,
          request,
          commands: [],
          explanation: "",
          status: "planning",
          results: [],
          delta: [],
          before,
        },
      ]);
      setDraft("");

      if (!before.isRepo) {
        patchTurn(id, {
          status: "failed",
          error: "Not a git repository. Change into one and press ctrl+r.",
        });
        return;
      }

      try {
        const plan = await planCommands({
          provider,
          model,
          request,
          repo: before,
          prior,
          allowGh: ghUsable(allowGh),
          onUpdate: (partial) => {
            patchTurn(id, {
              commands: partial.commands,
              explanation: partial.explanation,
            });
          },
        });
        patchTurn(id, {
          commands: plan.commands,
          explanation: plan.explanation,
          status: "review",
        });
      } catch (err) {
        patchTurn(id, {
          commands: [],
          status: "failed",
          error: err instanceof Error ? err.message : "Unknown error",
        });
      }
    },
    [patchTurn, provider, model, allowGh, priorContext],
  );

  const runCommands = useCallback(
    (commands: string[]) => {
      if (!current) return;
      const id = current.id;
      const before = current.before ?? readRepoState();

      patchTurn(id, { commands, status: "running", results: [] });

      // Execution is synchronous per command; yield between each so the
      // spinner and the finished rows actually paint.
      const results: ReturnType<typeof executeCommand>[] = [];

      const finish = (ok: boolean) => {
        const after = readRepoState();
        const delta = diffRepoState(before, after);
        setRepo(after);
        flash(delta.map((row) => row.key));
        patchTurn(id, {
          results: [...results],
          status: ok ? "done" : "failed",
          delta,
          after,
        });
        if (ok) {
          addHistory({
            request: current.request,
            commands,
            explanation: current.explanation,
            timestamp: Date.now(),
          });
          setHistory(getHistory());
        }
      };

      const step = (i: number) => {
        if (i >= commands.length) return finish(true);
        const result = executeCommand(commands[i]!);
        results.push(result);
        patchTurn(id, { results: [...results] });
        if (!result.success) return finish(false);
        setTimeout(() => step(i + 1), 0);
      };

      setTimeout(() => step(0), 0);
    },
    [current, patchTurn, flash],
  );

  const cancelReview = useCallback(() => {
    if (current) patchTurn(current.id, { status: "cancelled" });
  }, [current, patchTurn]);

  /** Finds the newest completed turn that changed something reversible. */
  const undoLastTurn = useCallback(() => {
    for (let i = turns.length - 1; i >= 0; i -= 1) {
      const turn = turns[i]!;
      if (turn.isUndo) continue;
      if (turn.status !== "done" || !turn.before || !turn.after) continue;

      const plan = planUndo(turn.before, turn.after);
      if (!plan) {
        say("That turn did not change anything Fuzit can put back.");
        return;
      }

      const id = nextId.current;
      nextId.current += 1;
      setTurns((list) => [
        ...list,
        {
          id,
          request: `undo: ${turn.request}`,
          commands: plan.commands,
          explanation: plan.explanation,
          status: "review",
          results: [],
          delta: [],
          before: readRepoState(),
          isUndo: true,
          note: plan.warning,
        },
      ]);
      setPanel(1);
      return;
    }
    say("Nothing to undo yet.");
  }, [turns, say]);

  const replayHistory = useCallback((entry: HistoryEntry) => {
    const id = nextId.current;
    nextId.current += 1;
    setTurns((list) => [
      ...list,
      {
        id,
        request: entry.request,
        commands: entry.commands,
        explanation: entry.explanation,
        status: "review",
        results: [],
        delta: [],
        before: readRepoState(),
      },
    ]);
    setPanel(1);
  }, []);

  const promptFocused =
    panel === 1 &&
    !needsKey &&
    !rekeying &&
    phase !== "review" &&
    phase !== "running" &&
    phase !== "thinking";

  usePanelHotkeys({
    active: panel,
    onSwitch: setPanel,
    allowBareDigits: !promptFocused,
    isActive: !needsKey && !rekeying,
  });

  useInput(
    (input, key) => {
      if (key.ctrl && input === "r") {
        refreshRepo();
        say("Repo re-read.");
      } else if (key.ctrl && input === "l") {
        setTurns([]);
      } else if (key.ctrl && input === "z") {
        undoLastTurn();
      } else if (key.escape && panel !== 1 && !(panel === 2 && modelDepth)) {
        setPanel(1);
      }
    },
    { isActive: !needsKey && !rekeying },
  );

  if (needsKey || rekeying) {
    return (
      <Setup
        width={size.width}
        provider={provider}
        onComplete={() => {
          reloadProviders();
          setNeedsKey(false);
          setRekeying(false);
          refreshRepo();
        }}
        onCancel={rekeying ? () => setRekeying(false) : undefined}
      />
    );
  }

  const bodyWidth = size.showSidebar
    ? size.width - layout.sidebarWidth - 2
    : size.width;
  const bodyHeight = size.bodyHeight;

  const canUndo = turns.some(
    (t) => !t.isUndo && t.status === "done" && t.before && t.after,
  );

  const hints =
    panel === 1
      ? phase === "review"
        ? ["enter runs", "^C quit"]
        : canUndo
          ? ["^Z undo", "alt+1‥5 panels", "^C quit"]
          : ["alt+1‥5 panels", "^C quit"]
      : ["esc console", "alt+1‥5 panels", "^C quit"];

  return (
    <Box flexDirection="column" width={size.width}>
      <HeaderBar
        width={size.width}
        repo={repo}
        model={modelShort(model)}
        phase={phase}
      />
      <Rule width={size.width} />

      <Box height={bodyHeight} overflow="hidden">
        <Box flexDirection="column" width={bodyWidth} overflow="hidden">
          {panel === 1 && (
            <ConsolePanel
              turns={turns}
              width={bodyWidth}
              height={bodyHeight}
              isActive
              guardDestructive={guard}
              onRun={runCommands}
              onCancel={cancelReview}
            />
          )}
          {panel === 2 && (
            <ModelPanel
              width={bodyWidth}
              height={bodyHeight}
              isActive
              providers={providers}
              activeProviderId={activeProviderId}
              activeModelId={model}
              onChanged={reloadProviders}
              onPick={(providerId, modelId) => {
                setActive(providerId, modelId);
                reloadProviders();
                setPanel(1);
                say(`Now using ${modelId}.`);
              }}
              onSay={say}
              onDepthChange={setModelDepth}
            />
          )}
          {panel === 3 && (
            <HistoryPanel
              width={bodyWidth}
              height={bodyHeight}
              isActive
              history={history}
              onSelect={replayHistory}
            />
          )}
          {panel === 4 && (
            <SettingsPanel
              width={bodyWidth}
              height={bodyHeight}
              isActive
              provider={provider}
              model={model}
              guardDestructive={guard}
              allowGh={allowGh}
              notice={notice}
              onToggleGuard={() => {
                const next = !guard;
                setGuardDestructive(next);
                setGuard(next);
                say(next ? "Safety guard on." : "Safety guard off.");
              }}
              onToggleGh={() => {
                const next = !allowGh;
                setAllowGh(next);
                setAllowGhState(next);
                say(next ? "GitHub CLI enabled." : "GitHub CLI disabled.");
              }}
              onClearHistory={() => {
                clearHistory();
                setHistory([]);
                say("History cleared.");
              }}
              onChangeApiKey={() => setRekeying(true)}
              onOpenModelPanel={() => setPanel(2)}
            />
          )}
          {panel === 5 && <HelpPanel width={bodyWidth} height={bodyHeight} />}
        </Box>

        {size.showSidebar && (
          <>
            <Box width={2} />
            <Sidebar
              width={layout.sidebarWidth}
              height={bodyHeight}
              repo={repo}
              changed={changed}
            />
          </>
        )}
      </Box>

      <Rule width={size.width} />
      <Prompt
        width={size.width}
        value={draft}
        onChange={setDraft}
        onSubmit={submitRequest}
        focused={promptFocused}
        placeholder={
          turns.length > 0
            ? "describe another change, or correct the last one"
            : "describe a change to this repo"
        }
        idleText={
          phase === "review"
            ? "reviewing the commands above"
            : phase === "thinking"
              ? "writing the plan"
              : phase === "running"
                ? "running"
                : `${PANELS.find((p) => p.id === panel)?.name} — esc returns to the console`
        }
      />
      <KeyBar width={size.width} active={panel} hints={hints} />
      {notice && panel !== 4 && (
        <Box width={size.width}>
          <Text color={color.ok}>{notice}</Text>
        </Box>
      )}
    </Box>
  );
}
