import React, { useEffect, useState } from "react";
import { Box, Text } from "ink";
import Spinner from "ink-spinner";
import { executeCommand, type CommandResult } from "../utils/execute.js";

interface ExecutionProps {
  commands: string[];
  onComplete: (results: CommandResult[]) => void;
}

export default function Execution({ commands, onComplete }: ExecutionProps) {
  const [results, setResults] = useState<CommandResult[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [running, setRunning] = useState(true);

  useEffect(() => {
    if (currentIndex >= commands.length) {
      setRunning(false);
      onComplete(results);
      return;
    }

    const cmd = commands[currentIndex]!;
    const result = executeCommand(cmd);
    const updated = [...results, result];
    setResults(updated);

    if (!result.success) {
      setRunning(false);
      onComplete(updated);
      return;
    }

    setCurrentIndex(currentIndex + 1);
  }, [currentIndex]);

  return (
    <Box flexDirection="column" padding={1}>
      <Text bold color="cyan">
        ⚙️  Executing commands:
      </Text>
      <Box flexDirection="column" marginTop={1} borderLeft borderColor="cyan" paddingLeft={2}>
        {results.map((result, i) => (
          <Box key={i} flexDirection="column" marginTop={i > 0 ? 1 : 0}>
            <Box>
              <Text
                color={result.success ? "greenBright" : "redBright"}
                bold
              >
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
        {running && currentIndex < commands.length && (
          <Box marginTop={2}>
            <Text color="cyan">
              <Spinner type="dots" />
            </Text>
            <Box marginLeft={1}>
              <Text bold>{commands[currentIndex]}</Text>
            </Box>
          </Box>
        )}
      </Box>
    </Box>
  );
}
