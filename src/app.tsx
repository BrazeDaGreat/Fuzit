import React, { useState, useCallback } from "react";
import { Box, Text, useInput } from "ink";
import { hasApiKey } from "./services/config.js";
import { getGitCommands, type AiResponse } from "./services/ai.js";
import { isGitRepo } from "./services/git.js";
import type { CommandResult } from "./utils/execute.js";
import Setup from "./components/Setup.js";
import Input from "./components/Input.js";
import Thinking from "./components/Thinking.js";
import CommandReview from "./components/CommandReview.js";
import Execution from "./components/Execution.js";

type AppState =
  | "setup"
  | "input"
  | "thinking"
  | "review"
  | "executing"
  | "done";

interface ReviewData {
  commands: string[];
  explanation: string;
}

interface AppProps {
  quickPrompt?: string | null;
}

export default function App({ quickPrompt }: AppProps) {
  const [state, setState] = useState<AppState>(hasApiKey() ? "input" : "setup");
  const [request, setRequest] = useState("");
  const [reviewData, setReviewData] = useState<ReviewData | null>(null);
  const [results, setResults] = useState<CommandResult[]>([]);
  const [error, setError] = useState("");

  React.useEffect(() => {
    if (quickPrompt && state === "input") {
      handleInput(quickPrompt);
    }
  }, [quickPrompt, state]);

  const handleSetupComplete = useCallback(() => {
    setState("input");
  }, []);

  const handleInput = useCallback(async (value: string) => {
    if (!isGitRepo()) {
      setError(
        "Not inside a git repository. Please navigate to a git repo and try again.",
      );
      return;
    }
    setRequest(value);
    setError("");
    setState("thinking");

    try {
      const response: AiResponse = await getGitCommands(value);
      setReviewData({
        commands: response.commands,
        explanation: response.explanation,
      });
      setState("review");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unknown error";
      setError(`AI error: ${message}`);
      setState("input");
    }
  }, []);

  const handleRun = useCallback((commands: string[]) => {
    setReviewData((prev) => (prev ? { ...prev, commands } : null));
    setState("executing");
  }, []);

  const handleCancel = useCallback(() => {
    setReviewData(null);
    setState("input");
  }, []);

  const handleExecutionComplete = useCallback(
    (executionResults: CommandResult[]) => {
      setResults(executionResults);
      setState("done");
    },
    [],
  );

  const handleContinue = useCallback(() => {
    setReviewData(null);
    setResults([]);
    setError("");
    setState("input");
  }, []);

  return (
    <Box flexDirection="column">
      {state === "setup" && <Setup onComplete={handleSetupComplete} />}

      {state === "input" && (
        <>
          {error && (
            <Box padding={1}>
              <Text color="red">{error}</Text>
            </Box>
          )}
          <Input key="input" onSubmit={handleInput} />
        </>
      )}

      {state === "thinking" && <Thinking request={request} />}

      {state === "review" && reviewData && (
        <CommandReview
          commands={reviewData.commands}
          explanation={reviewData.explanation}
          onRun={handleRun}
          onCancel={handleCancel}
        />
      )}

      {state === "executing" && reviewData && (
        <Execution
          commands={reviewData.commands}
          onComplete={handleExecutionComplete}
        />
      )}

      {state === "done" && (
        <Done results={results} onContinue={handleContinue} />
      )}
    </Box>
  );
}

function Done({
  results,
  onContinue,
}: {
  results: CommandResult[];
  onContinue: () => void;
}) {
  const allSuccess = results.every((r) => r.success);
  const [isActive, setIsActive] = useState(true);

  const handleInput = useCallback(() => {
    setIsActive(false);
    setTimeout(() => {
      onContinue();
    }, 0);
  }, [onContinue]);

  useInput(handleInput, { isActive });

  return (
    <Box flexDirection="column" padding={1}>
      <Box
        borderStyle="round"
        borderColor={allSuccess ? "green" : "red"}
        paddingX={2}
        paddingY={1}
        marginBottom={2}
        flexDirection="column"
      >
        <Text bold color={allSuccess ? "greenBright" : "redBright"}>
          {allSuccess
            ? "✨  All commands completed successfully!"
            : "⚠️  Some commands failed."}
        </Text>
      </Box>

      <Box flexDirection="column" borderLeft borderColor="cyan" paddingLeft={2}>
        {results.map((result, i) => (
          <Box key={i} flexDirection="column" marginTop={i > 0 ? 1 : 0}>
            <Box>
              <Text color={result.success ? "greenBright" : "redBright"} bold>
                {result.success ? "✓" : "✗"}
              </Text>
              <Box marginLeft={1}>
                <Text color="yellow" bold>
                  {result.command}
                </Text>
              </Box>
            </Box>
            {result.output && (
              <Box marginLeft={2} marginTop={1}>
                <Text dimColor>{result.output}</Text>
              </Box>
            )}
            {result.error && (
              <Box marginLeft={2} marginTop={1}>
                <Text color="red">{result.error}</Text>
              </Box>
            )}
          </Box>
        ))}
      </Box>

      <Box marginTop={2} borderTop borderColor="gray" paddingTop={1}>
        <Text dimColor>Press any key to continue...</Text>
      </Box>
    </Box>
  );
}
