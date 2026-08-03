# Fuzit

[![npm](https://img.shields.io/npm/v/%40uziraze%2Ffuzit?label=npm&color=red)](https://www.npmjs.com/package/@uziraze/fuzit)

AI-powered terminal helper for people who can't memorize command syntax. Describe what you want in plain English — Fuzit writes the commands, shows them to you before anything runs, and reports what changed.

It started as a git tool and still knows git better than anything else, but it now drives your whole shell.

## Demo

```
▍FUZIT  ·  D:/Projects/Fuzit  ·  ● main ↑1                     L3.3 70B  ·  ● review
────────────────────────────────────────────────────────────────────────────────────
› find the biggest files here and delete the old build output    ── REPO ────────────
  lists the largest files, then clears the build directory        branch     main
  ├ · Get-ChildItem -Recurse -File | Sort-Object Length -Desc…    tracking   origin/main
  └ ! Remove-Item -Recurse -Force .\dist                          ahead      1
      deletes files without asking                                behind     0

                                                                 ── INDEX ───────────
                                                                  staged     2
                                                                  modified   3
                                                                  untracked  3
                                                                  conflicts  0
                                                                  stashes    0

                                                                 ── HEAD ────────────
▍run anyway   edit   cancel   ←→ choose · enter · esc            ▍94a3141 v2.0.0
────────────────────────────────────────────────────────────────────────────────────
╭──────────────────────────────────────────────────────────────────────────────────╮
│ › reviewing the commands above                                                   │
╰──────────────────────────────────────────────────────────────────────────────────╯
▍1 console   2 model   3 history   4 settings   5 help          alt+1‥5 panels  ^C quit
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

On first run, Fuzit asks for an API key. It ships with **Groq**, which is free.

1. Get your key at [console.groq.com/keys](https://console.groq.com/keys)
2. Run `fuzit` and paste it in — it's stored locally and never asked again

Any other OpenAI-compatible provider can be added later from the model panel.

## The dashboard

```bash
fuzit
```

Everything lives on one screen. The header shows where you are; the sidebar is
live repo telemetry — branch, tracking, ahead/behind, the index, stashes and
recent commits — and it stays visible on every panel. The prompt at the bottom
is the only bordered element, so focus is never in doubt.

Type a request, watch the commands stream in, review them, run them. After a
run, the fields that actually changed flash amber and the turn prints a
`CHANGED` block:

```
CHANGED
 staged    3 → 0
 ahead     1 → 2
 HEAD      0993faa → 4f2a1c9
```

You don't need to be in a git repository. Outside one, the sidebar simply says
so and everything else works.

### Panels

| Panel | What it's for |
|---|---|
| `1` console | Ask for something and review the commands |
| `2` model | Choose the model and manage providers |
| `3` history | Replay something you have run before |
| `4` settings | What can run, safety guard, API key, history |
| `5` help | Keys and what Fuzit does |

### Keys

| Key | Action |
|---|---|
| `alt+1` … `alt+5` | Jump straight to a panel |
| `f1` … `f5` | The same jumps, if your terminal eats alt |
| `1` … `5` | Same again, when no text field has focus |
| `tab` / `shift+tab` | Cycle panels |
| `esc` | Back to the console, or out of a sub-view |
| `ctrl+z` | Propose an undo of the last turn |
| `ctrl+r` | Re-read the directory and repo |
| `ctrl+l` | Clear the console and its follow-up context |
| `ctrl+c` | Quit |

> **Why not `ctrl+1`?** Terminals cannot carry it. `ctrl+1` is not transmitted
> at all by xterm, iTerm2 or Windows Terminal, and `ctrl+3` *is* the Escape byte
> (`0x1b`) — binding it would break the Esc key. Alt and the function keys
> always arrive, so those carry the same muscle memory.

Panels can also be opened directly: `fuzit --model`, `fuzit --history`,
`fuzit --settings`.

## Your shell, not a generic one

Fuzit detects which shell will actually run the commands — PowerShell 7,
Windows PowerShell, cmd.exe, or your `$SHELL` — and tells the model to write
for that one. This is not cosmetic: `ls | grep foo` is fine in PowerShell and
bash and meaningless in cmd.exe.

The same shell then runs the command, so what you reviewed is what executes.

`cd` works and sticks. Fuzit handles it itself rather than passing it to a
shell, because each command is its own process and a shell `cd` would exit
before the next command saw it. The header tracks where you are.

## Follow-up requests

Requests are not one-shot. The last three exchanges — including what the
commands did and any error they hit — travel with the next one, so you can
correct course in plain English:

```
› find the big log files
› no, only the ones older than a week
› that failed, try it without the -mtime flag
```

`ctrl+l` clears the console and that context together.

## Undo

`ctrl+z` proposes the inverse of the last completed turn, derived from the repo
snapshots taken either side of it rather than from the commands themselves:

| What the turn did | What undo proposes |
|---|---|
| Made N commits | `git reset --soft HEAD~N` |
| Switched branch | `git checkout <the previous branch>` |
| Stashed changes | `git stash pop` |
| Staged files, from a clean index | `git reset` |

It reverses one effect at a time — the most recent one — and the result goes
through normal review. **Undo proposes; it never runs on its own.** If part of
the turn was already pushed, it says so, because nothing local can reach the
remote.

Undo is derived from git state, so it can only reverse things git tracks. A
deleted file that was never committed is gone.

## Safety

Fuzit runs whatever you approve, so the review screen is the boundary. Three
things back it up.

**Catastrophic commands are refused outright**, not merely flagged: `rm -rf /`,
`mkfs`, `dd` onto a disk device, `format c:`, fork bombs. Fuzit will not offer
to run them. Run them yourself if you truly mean to.

**The safety guard** marks anything that destroys work with `!` and the reason,
turns the action into **run anyway**, and requires an explicit `y`. It covers
`rm -rf`, `Remove-Item -Recurse`, `sudo`, `chmod -R`, piping the internet into
a shell, `kill -9`, `shutdown`, `docker system prune`, `DROP TABLE`, plus the
git set — `reset --hard`, `push --force`, `clean -fd`, `branch -D`, `rebase`,
`stash drop`.

**Every part of a command is checked, not just the first word.** Commands are
split on `&&`, `||`, `;` and pipes, and command substitutions are pulled out
and judged on their own, so `echo $(rm -rf /)` is caught on the half that does
the damage. Quoted text is treated as an argument rather than a command, so
`git commit -m "fix: a && b"` and `grep -r 'shutdown' ./src` are left alone.

If you'd rather keep the old behaviour, set **What can run** to `git and gh
only` in settings: the allowlist comes back and chaining is rejected outright.

## GitHub CLI

When `gh` is installed **and** authenticated, requests can reach GitHub itself —
opening pull requests, listing issues, cutting releases. Fuzit checks both,
because `gh` on PATH without `gh auth login` fails in a way that looks like a
Fuzit bug.

Without it, Fuzit does the closest thing it can with git alone and says so in
the explanation.

## Models and providers

Panel `2` (or `fuzit --model`) picks the model. From there: `p` manages
providers, `f` chooses which models appear, `r` refetches the list.

Fuzit talks to **any OpenAI-compatible API**. Groq ships as the built-in
provider because it is free and fast, but you can add as many others as you
like — OpenAI, Together, OpenRouter, a local Ollama or vLLM server — by giving
a name, a base URL ending in `/v1`, and a key. Saving calls `GET /models`,
which both proves the key works and fills the picker in one round trip.

Providers routinely return far more models than are useful here, so each has a
visibility filter: space toggles a model, `a` toggles all, and choosing none
means "show everything".

Models Fuzit recognises carry speed and reasoning ratings, so the trade-off is
visible where you make the choice:

| Model | Notes |
|---|---|
| `llama-3.3-70b-versatile` | Balanced speed and reasoning. A good default. |
| `openai/gpt-oss-120b` | Best at multi-step and unusual requests |
| `openai/gpt-oss-20b` | Middle ground when the larger models are busy |
| `llama-3.1-8b-instant` | Near-instant, for one-liners you already know |

Anything else shows by its id. Add ratings in `src/config/knownModels.ts`.

## Quick mode

```bash
fuzit -n <your request>
```

Plans and executes in one shot with no dashboard, printing a single block that
reads well in scrollback and CI logs. Exits `0` on success, `1` on failure.

```bash
fuzit -n stage all changes and commit with message "fix: button alignment"
```

Quick mode needs no TTY, so it works in scripts and pipes. A risky plan is
refused outright there rather than run unattended.

## Features

- Natural language to shell, git and GitHub commands
- Writes for the shell you actually have, and runs it there
- One-screen dashboard with live repo telemetry beside the prompt
- Commands stream in as the model writes them
- `cd` persists across a session; the header tracks where you are
- Reports what actually changed in the repo after every run
- `ctrl+z` proposes an undo derived from before/after repo state
- Follow-up requests carry the last few exchanges as context
- Catastrophic commands refused; destructive ones need an explicit `y`
- Any OpenAI-compatible provider, with model fetching and a visibility filter
- Command history — replay past requests without retyping
- Cross-platform (Windows, macOS, Linux)

## How It Works

1. You describe what you want in plain English
2. Fuzit sends your request, the current directory and git context, and your recent turns to the model
3. Commands stream back and every segment is risk-checked before they can run
4. You review, optionally edit, then confirm
5. Fuzit executes them in your shell, shows the output, and reports what changed

## Requirements

- Node.js 18+
- An API key — a free [Groq key](https://console.groq.com/keys), or any OpenAI-compatible provider
- Optional: [GitHub CLI](https://cli.github.com) for pull requests and issues

## License

MIT
