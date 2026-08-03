#!/usr/bin/env node
import React from "react";
import { render } from "ink";
import { createRequire } from "node:module";
import App, { type StartMode } from "./app.js";
import QuickRun from "./components/QuickRun.js";
import {
  getActiveModelId,
  getActiveProvider,
  getAllowGh,
  getCommandScope,
  getGuardDestructive,
  isConfigured,
} from "./services/config.js";
import { layout } from "./theme/theme.js";

const require = createRequire(import.meta.url);
const { version } = require("../package.json") as { version: string };

const args = process.argv.slice(2);

if (args.includes("--version") || args.includes("-v")) {
  console.log(version);
  process.exit(0);
}

if (args.includes("--help") || args.includes("-h")) {
  console.log(`fuzit ${version} — plain English in, git commands out

  fuzit                    open the dashboard
  fuzit -n <request>       plan and run in one shot
  fuzit --model            open on the model panel
  fuzit --history          open on the history panel
  fuzit --settings         open on the settings panel
  fuzit --help             this
  fuzit --version          print the version

In the dashboard, alt+1 to alt+5 jump between panels (f1-f5 and tab also work),
esc returns to the console, ctrl+r re-reads the repo, ctrl+c quits.`);
  process.exit(0);
}

const width = Math.max(
  layout.minWidth,
  Math.min((process.stdout.columns ?? 80) - 2, layout.maxWidth),
);

const flagIndex = args.findIndex((a) => a === "-n" || a === "--new");
const quickPrompt =
  flagIndex !== -1 && args[flagIndex + 1] ? args.slice(flagIndex + 1).join(" ") : null;

if (quickPrompt) {
  // Quick mode reads no keys, so it must not mount the dashboard — the panel
  // hotkeys would ask for raw mode and fail wherever stdin is not a TTY.
  if (!isConfigured()) {
    console.error("No API key yet. Run `fuzit` once to add one.");
    process.exit(1);
  }

  const provider = getActiveProvider();
  if (!provider) {
    console.error("No provider configured. Run `fuzit` and add one.");
    process.exit(1);
  }
  render(
    React.createElement(QuickRun, {
      request: quickPrompt,
      width,
      provider,
      model: getActiveModelId(),
      guardDestructive: getGuardDestructive(),
      allowGh: getAllowGh(),
      scope: getCommandScope(),
    }),
  );
} else {
  if (!process.stdin.isTTY) {
    console.error(
      "The fuzit dashboard needs an interactive terminal.\n" +
        "Use `fuzit -n <request>` when stdin is redirected or in a script.",
    );
    process.exit(1);
  }

  let startMode: StartMode = "console";
  if (args.includes("--history")) startMode = "history";
  else if (args.includes("--model")) startMode = "model";
  else if (args.includes("--settings")) startMode = "settings";

  render(React.createElement(App, { startMode }));
}
