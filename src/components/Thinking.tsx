import React from "react";
import { Box, Text } from "ink";
import Spinner from "ink-spinner";

interface ThinkingProps {
  request: string;
}

export default function Thinking({ request }: ThinkingProps) {
  return (
    <Box flexDirection="column" padding={1}>
      <Box>
        <Text color="cyan">
          <Spinner type="dots" />
        </Text>
        <Text> Thinking...</Text>
      </Box>
      <Box marginTop={1}>
        <Text dimColor>Request: {request}</Text>
      </Box>
    </Box>
  );
}
