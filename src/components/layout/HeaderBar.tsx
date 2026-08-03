import React from "react";
import { Box, Text } from "ink";
import { color, glyph } from "../../theme/theme.js";
import type { RepoState } from "../../services/repo.js";

export type Phase = "ready" | "thinking" | "review" | "running" | "blocked";

const PHASE_TONE: Record<Phase, string> = {
  ready: color.muted,
  thinking: color.focus,
  review: color.focus,
  running: color.info,
  blocked: color.bad,
};

const PHASE_LABEL: Record<Phase, string> = {
  ready: "ready",
  thinking: "thinking",
  review: "review",
  running: "running",
  blocked: "blocked",
};

interface HeaderBarProps {
  width: number;
  repo: RepoState;
  model: string;
  phase: Phase;
  /** Current working directory, already shortened for display. */
  cwd: string;
}

export default function HeaderBar({
  width,
  repo,
  model,
  phase,
  cwd,
}: HeaderBarProps) {
  const dirty = repo.modified + repo.untracked + repo.conflicts > 0;

  const right = (
    <Box>
      <Text color={color.muted}>{model}</Text>
      <Text color={color.rule}>{`  ${glyph.sep}  `}</Text>
      <Text color={PHASE_TONE[phase]}>
        {phase === "ready" ? glyph.ring : glyph.dot} {PHASE_LABEL[phase]}
      </Text>
    </Box>
  );

  return (
    <Box width={width} justifyContent="space-between">
      <Box>
        <Text color={color.brand} bold>
          {glyph.mark}FUZIT
        </Text>
        <Text color={color.rule}>{`  ${glyph.sep}  `}</Text>
        <Text color={color.text}>{cwd}</Text>
        {repo.isRepo && (
          <>
            <Text color={color.rule}>{`  ${glyph.sep}  `}</Text>
            <Text color={dirty ? color.focus : color.ok}>
              {dirty ? glyph.dot : glyph.ring}
            </Text>
            <Text color={color.text}> {repo.branch}</Text>
            {repo.ahead > 0 && <Text color={color.info}> ↑{repo.ahead}</Text>}
            {repo.behind > 0 && <Text color={color.info}> ↓{repo.behind}</Text>}
          </>
        )}
      </Box>
      {right}
    </Box>
  );
}
