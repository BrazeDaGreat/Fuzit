# Fuzit

AI-powered Git command helper for people who can't memorize git syntax. Describe what you want to do in plain English — Fuzit figures out the commands.

## Demo

```
$ fuzit

> push my changes to a new branch called feature/login

🔍 Proposed commands:
  1. git checkout -b feature/login
  2. git push -u origin feature/login

💬 Creates and switches to a new branch, then pushes it to origin.

  ❯ Run commands
    Edit a command
    Cancel
```

## Install

**Stable** (when available):
```bash
npm install -g @uziraze/fuzit
```

**Beta** (current release):
```bash
npm install -g @uziraze/fuzit@beta
```

Requires Node.js 18+.

## Setup

On first run, Fuzit will ask for a **Groq API key**. Groq is free to use.

1. Get your key at [console.groq.com](https://console.groq.com)
2. Run `fuzit` and paste it in when prompted — it's saved locally and never asked again

## Usage

### Interactive mode

```bash
fuzit
```

Type your request in plain English, review the proposed commands, then choose to run, edit, or cancel.

### Quick mode

```bash
fuzit -n <your request>
```

Skips the review step and executes immediately. Useful for scripting or when you're confident.

```bash
fuzit -n stage all changes and commit with message "fix: button alignment"
```

## Features

- Natural language to git commands via Llama 3.3 70B (Groq)
- Shows proposed commands with an explanation before running anything
- Edit any command before execution
- Reads your current git context (branch, status, recent commits, remotes) for accurate suggestions
- Cross-platform (Windows, macOS, Linux)

## How It Works

1. You describe what you want in plain English
2. Fuzit sends your request + current git context to the AI
3. The AI returns the exact commands to run
4. You review, optionally edit, then confirm
5. Fuzit executes them and shows the output

## Requirements

- Node.js 18+
- A git repository (must be run inside one)
- A free [Groq API key](https://console.groq.com)

## License

MIT
