import React from "react";
import { Box, Text } from "ink";
import { color } from "../../theme/theme.js";
import Rule from "../ui/Rule.js";
import Field from "../ui/Field.js";
import type { RepoState } from "../../services/repo.js";

interface SidebarProps {
  width: number;
  /** Rows available. Sections are dropped from the bottom rather than clipped. */
  height: number;
  repo: RepoState;
  /** Keys of fields the last run changed — these flash amber. */
  changed: ReadonlySet<string>;
}

const REPO_ROWS = 5;
const INDEX_ROWS = 7;

function countTone(n: number, tone: string): string {
  return n > 0 ? tone : color.rule;
}

/**
 * Live repo telemetry. Always visible, on every panel — it is the one thing on
 * screen that is unconditionally true about where you are.
 */
export default function Sidebar({ width, height, repo, changed }: SidebarProps) {
  if (!repo.isRepo) {
    return (
      <Box width={width} flexDirection="column">
        <Rule width={width} label="repo" />
        <Box paddingLeft={1} paddingTop={1}>
          <Text color={color.muted} wrap="wrap">
            Not a git repository. Change into one and press ctrl+r.
          </Text>
        </Box>
      </Box>
    );
  }

  const showIndex = height >= REPO_ROWS + INDEX_ROWS;
  const commitRows = height - REPO_ROWS - (showIndex ? INDEX_ROWS : 0) - 2;
  const commitCount = Math.max(0, Math.min(4, commitRows));

  return (
    <Box width={width} flexDirection="column" height={height} overflow="hidden">
      <Rule width={width} label="repo" />
      <Field
        label="branch"
        value={repo.branch}
        tone={repo.detached ? color.bad : color.text}
        flash={changed.has("branch")}
      />
      <Field
        label="tracking"
        value={repo.upstream ?? "none"}
        tone={repo.upstream ? color.text : color.rule}
        flash={changed.has("upstream")}
      />
      <Field
        label="ahead"
        value={String(repo.ahead)}
        tone={countTone(repo.ahead, color.info)}
        flash={changed.has("ahead")}
      />
      <Field
        label="behind"
        value={String(repo.behind)}
        tone={countTone(repo.behind, color.info)}
        flash={changed.has("behind")}
      />

      <Box marginTop={1} flexDirection="column" display={showIndex ? "flex" : "none"}>
        <Rule width={width} label="index" />
        <Field
          label="staged"
          value={String(repo.staged)}
          tone={countTone(repo.staged, color.ok)}
          flash={changed.has("staged")}
        />
        <Field
          label="modified"
          value={String(repo.modified)}
          tone={countTone(repo.modified, color.focus)}
          flash={changed.has("modified")}
        />
        <Field
          label="untracked"
          value={String(repo.untracked)}
          tone={countTone(repo.untracked, color.muted)}
          flash={changed.has("untracked")}
        />
        <Field
          label="conflicts"
          value={String(repo.conflicts)}
          tone={countTone(repo.conflicts, color.bad)}
          flash={changed.has("conflicts")}
        />
        <Field
          label="stashes"
          value={String(repo.stashes)}
          tone={countTone(repo.stashes, color.muted)}
          flash={changed.has("stashes")}
        />
      </Box>

      <Box
        marginTop={1}
        flexDirection="column"
        display={commitCount > 0 ? "flex" : "none"}
      >
        <Rule width={width} label="head" />
        {repo.commits.length === 0 ? (
          <Box paddingLeft={1}>
            <Text color={color.rule}>no commits yet</Text>
          </Box>
        ) : (
          repo.commits.slice(0, commitCount).map((commit, i) => {
            const room = width - 10;
            const subject =
              commit.subject.length > room
                ? `${commit.subject.slice(0, room - 1)}…`
                : commit.subject;
            return (
              <Box key={commit.hash}>
                <Text color={i === 0 && changed.has("head") ? color.focus : color.rule}>
                  {i === 0 && changed.has("head") ? "▍" : " "}
                </Text>
                <Text color={color.brandDim}>{commit.hash.padEnd(8)}</Text>
                <Text color={color.muted}>{subject}</Text>
              </Box>
            );
          })
        )}
      </Box>
    </Box>
  );
}
