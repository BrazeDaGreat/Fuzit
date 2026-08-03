import { useEffect, useState } from "react";
import { useStdout } from "ink";
import { layout } from "../theme/theme.js";

export interface TerminalSize {
  columns: number;
  rows: number;
  /** Usable width of the dashboard frame. */
  width: number;
  /** Usable height of the panel body, between the rules. */
  bodyHeight: number;
  showSidebar: boolean;
}

function measure(columns: number, rows: number): TerminalSize {
  const width = Math.max(
    layout.minWidth,
    Math.min(columns - 2, layout.maxWidth),
  );
  return {
    columns,
    rows,
    width,
    bodyHeight: Math.max(8, rows - layout.chromeRows),
    showSidebar: columns >= layout.sidebarBreakpoint,
  };
}

export function useTerminalSize(): TerminalSize {
  const { stdout } = useStdout();
  const [size, setSize] = useState(() =>
    measure(stdout?.columns ?? 80, stdout?.rows ?? 24),
  );

  useEffect(() => {
    if (!stdout) return;
    const onResize = () => setSize(measure(stdout.columns, stdout.rows));
    stdout.on("resize", onResize);
    return () => {
      stdout.off("resize", onResize);
    };
  }, [stdout]);

  return size;
}
