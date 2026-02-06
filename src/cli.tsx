#!/usr/bin/env node
import React from "react";
import { render } from "ink";
import App from "./app.js";

// Parse command line arguments
const args = process.argv.slice(2);
let quickPrompt: string | null = null;

// Check for -n or --new flag
const nIndex = args.indexOf("-n");
if (nIndex !== -1 && args[nIndex + 1]) {
  // Combine all arguments after -n as the prompt
  quickPrompt = args.slice(nIndex + 1).join(" ");
}

render(React.createElement(App, { quickPrompt }));
