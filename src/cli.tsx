#!/usr/bin/env node
import React from "react";
import { render } from "ink";
import App from "./app.js";
import type { StartMode } from "./app.js";

// Parse command line arguments
const args = process.argv.slice(2);
let quickPrompt: string | null = null;
let startMode: StartMode = "input";

// Check for mode flags
if (args.includes("--history")) {
  startMode = "history";
} else if (args.includes("--model")) {
  startMode = "model";
}

// Check for -n or --new flag (only in input mode)
if (startMode === "input") {
  const nIndex = args.indexOf("-n");
  if (nIndex !== -1 && args[nIndex + 1]) {
    quickPrompt = args.slice(nIndex + 1).join(" ");
  }
}

render(React.createElement(App, { quickPrompt, startMode }));
