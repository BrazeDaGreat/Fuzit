import React, { useState } from "react";
import { Box, Text, useInput } from "ink";
import TextInput from "ink-text-input";
import SelectInput from "ink-select-input";

interface CommandReviewProps {
  commands: string[];
  explanation: string;
  onRun: (commands: string[]) => void;
  onCancel: () => void;
}

type ReviewMode = "menu" | "editing";

export default function CommandReview({
  commands: initialCommands,
  explanation,
  onRun,
  onCancel,
}: CommandReviewProps) {
  const [commands, setCommands] = useState(initialCommands);
  const [mode, setMode] = useState<ReviewMode>("menu");
  const [editIndex, setEditIndex] = useState(-1);
  const [editValue, setEditValue] = useState("");

  const menuItems = [
    { label: "Run commands", value: "run" },
    { label: "Edit a command", value: "edit" },
    { label: "Cancel", value: "cancel" },
  ];

  const handleMenuSelect = (item: { value: string }) => {
    switch (item.value) {
      case "run":
        onRun(commands);
        break;
      case "edit":
        if (commands.length === 1) {
          setEditIndex(0);
          setEditValue(commands[0]!);
          setMode("editing");
        } else {
          setEditIndex(0);
          setEditValue(commands[0]!);
          setMode("editing");
        }
        break;
      case "cancel":
        onCancel();
        break;
    }
  };

  const handleEditSubmit = (value: string) => {
    const trimmed = value.trim();
    if (trimmed) {
      const updated = [...commands];
      updated[editIndex] = trimmed;
      setCommands(updated);
    }
    setMode("menu");
  };

  useInput((input, key) => {
    if (key.escape) {
      setMode("menu");
    }
    if (commands.length > 1) {
      if (key.upArrow && editIndex > 0) {
        setEditIndex(editIndex - 1);
        setEditValue(commands[editIndex - 1]!);
      }
      if (key.downArrow && editIndex < commands.length - 1) {
        setEditIndex(editIndex + 1);
        setEditValue(commands[editIndex + 1]!);
      }
    }
  }, { isActive: mode === "editing" });

  return (
    <Box flexDirection="column" padding={1}>
      <Text bold color="cyan">
        Proposed commands:
      </Text>
      <Box flexDirection="column" marginTop={1} marginLeft={2}>
        {commands.map((cmd, i) => (
          <Box key={i}>
            <Text dimColor>{i + 1}. </Text>
            {mode === "editing" && editIndex === i ? (
              <TextInput
                value={editValue}
                onChange={setEditValue}
                onSubmit={handleEditSubmit}
              />
            ) : (
              <Text color="yellow">{cmd}</Text>
            )}
          </Box>
        ))}
      </Box>
      <Box marginTop={1}>
        <Text dimColor>{explanation}</Text>
      </Box>
      {mode === "editing" ? (
        <Box marginTop={1}>
          <Text dimColor>
            Edit command #{editIndex + 1} (Enter to save, Esc to cancel
            {commands.length > 1 ? ", ↑/↓ to switch" : ""})
          </Text>
        </Box>
      ) : (
        <Box marginTop={1} flexDirection="column">
          <SelectInput items={menuItems} onSelect={handleMenuSelect} />
        </Box>
      )}
    </Box>
  );
}
