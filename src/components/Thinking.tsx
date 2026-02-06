import React from "react";
import { Box, Text } from "ink";
import Spinner from "ink-spinner";

interface ThinkingProps {
  request: string;
}

export default function Thinking({ request }: ThinkingProps) {
  return (
    <Box flexDirection="column" padding={1}>
      <Box
        borderStyle="round"
        borderColor="cyan"
        paddingX={2}
        paddingY={1}
        flexDirection="column"
        width={80}
      >
        <Box marginBottom={1}>
          <Text color="cyan">
            <Spinner type="dots" />
          </Text>
          <Text bold color="cyan"> Analyzing your request...</Text>
        </Box>
        <Box>
          <Text dimColor>📝 {request}</Text>
        </Box>
      </Box>
    </Box>
  );
}
