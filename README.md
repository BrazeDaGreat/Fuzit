# Fuzit

[![npm](https://img.shields.io/npm/v/%40uziraze%2Ffuzit?label=npm&color=red)](https://www.npmjs.com/package/@uziraze/fuzit)

AI-powered Git command helper for people who can't memorize git syntax. Describe what you want to do in plain English — Fuzit figures out the commands, shows you what changed afterwards.

## Demo

```
▍FUZIT  ·  Fuzit  ·  ● main ↑2                                 L3.3 70B  ·  ● review
────────────────────────────────────────────────────────────────────────────────────
› stage everything and commit as a fix for the header alignment  ── REPO ────────────
  ├ ✓ git add -A                                                  branch     main
  └ ✓ git commit -m "fix: header alignment"                       tracking   origin/main
                                                                 ▍ahead      2
  CHANGED                                                         behind     0
   staged    3 → 0
   ahead     1 → 2                                               ── INDEX ───────────
   HEAD      0993faa → 4f2a1c9                                   ▍staged     3
                                                                  modified   1
› push this to a new branch called feature/dashboard              untracked  2
  creates the branch from where you are and pushes it with        conflicts  0
  ├ · git checkout -b feature/dashboard                           stashes    1
  └ · git push -u origin feature/dashboard
                                                                 ── HEAD ────────────
▍run   edit   cancel        ←→ choose · enter confirm · esc      ▍0993faa 1.0.0
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

Everything lives on one screen. The sidebar is live repo telemetry — branch,
tracking, ahead/behind, the index, stashes and recent commits — and it stays
visible on every panel. The prompt at the bottom is the only bordered element,
so focus is never in doubt.

Type a request, watch the commands stream in, review them, run them. After a
run, the fields that actually changed flash amber and the turn prints a
`CHANGED` block:

```
CHANGED
 staged    3 → 0
 ahead     1 → 2
 HEAD      0993faa → 4f2a1c9
```

### Panels

| Panel | What it's for |
|---|---|
| `1` console | Ask for a change and review the commands |
| `2` model | Choose the model and manage providers |
| `3` history | Replay something you have run before |
| `4` settings | API key, safety guard, GitHub CLI, stored history |
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
| `ctrl+r` | Re-read the repo |
| `ctrl+l` | Clear the console and its follow-up context |
| `ctrl+c` | Quit |

> **Why not `ctrl+1`?** Terminals cannot carry it. `ctrl+1` is not transmitted
> at all by xterm, iTerm2 or Windows Terminal, and `ctrl+3` *is* the Escape byte
> (`0x1b`) — binding it would break the Esc key. Alt and the function keys
> always arrive, so those carry the same muscle memory.

Panels can also be opened directly: `fuzit --model`, `fuzit --history`,
`fuzit --settings`.

## Follow-up requests

Requests are not one-shot. The last three exchanges — including what the
commands did and any error they hit — travel with the next one, so you can
correct course in plain English:

```
› push this branch
› no, I meant the upstream one
› that failed, try it without the tracking flag
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

## Models and providers

Panel `2` (or `fuzit --model`) picks the model. From there: `p` manages
providers, `f` chooses which models appear, `r` refetches the list.

Fuzit talks to **any OpenAI-compatible API**. Groq ships as the built-in
provider because it is free and fast, but you can add as many others as you
like — OpenAI, Together, OpenRouter, a local Ollama or vLLM server — by giving
a name, a base URL ending in `/v1`, and a key. Saving calls `GET /models`,
which both proves the key works and fills the picker in one round trip.

Providers routinely return far more models than are useful for writing a git
command, so each has a visibility filter: space toggles a model, `a` toggles
all, and choosing none means "show everything".

Models Fuzit recognises carry speed and reasoning ratings, so the trade-off is
visible where you make the choice:

| Model | Notes |
|---|---|
| `llama-3.3-70b-versatile` | Balanced speed and reasoning. A good default. |
| `openai/gpt-oss-120b` | Best at multi-step and unusual requests |
| `openai/gpt-oss-20b` | Middle ground when the larger models are busy |
| `llama-3.1-8b-instant` | Near-instant, for one-liners you already know |

Anything else shows by its id. Add ratings in `src/config/knownModels.ts`.

## GitHub CLI

When `gh` is installed **and** authenticated, requests can reach GitHub itself —
opening pull requests, listing issues, cutting releases. Fuzit checks both,
because `gh` on PATH without `gh auth login` fails in a way that looks like a
Fuzit bug.

Without it, Fuzit falls back to git alone, does the closest thing it can, and
says so in the explanation. Toggle it off in settings to stay on git regardless.

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

## Safety

Two layers, both on by default.

**What can run at all.** Only `git` and `gh` are executed, and only one command
at a time — anything else, and any attempt to chain with `;`, `&&`, `|`, `$()`
or a redirect, is refused before it reaches a shell. Operators *inside* a
quoted argument are fine, so `git commit -m "fix: a && b"` still works.

**The safety guard.** Commands that discard work or rewrite history —
`reset --hard`, `push --force`, `clean -fd`, `branch -D`, `rebase`,
`stash drop` and friends — are marked `!` with the reason, the action reads
**run anyway**, and confirming needs an explicit `y`. Turn it off in settings
(panel `4`) if you'd rather it stayed out of the way.

## Features

- Natural language to git and GitHub commands
- One-screen dashboard with live repo telemetry beside the prompt
- Commands stream in as the model writes them
- Reports what actually changed in the repo after every run
- `ctrl+z` proposes an undo derived from before/after repo state
- Follow-up requests carry the last few exchanges as context
- Any OpenAI-compatible provider, with model fetching and a visibility filter
- Only `git` and `gh` can run, never chained
- Safety guard on destructive commands
- Command history — replay past requests without retyping
- Cross-platform (Windows, macOS, Linux)

## How It Works

1. You describe what you want in plain English
2. Fuzit sends your request, the current git context, and your recent turns to the model
3. Commands stream back and are checked before they can run
4. You review, optionally edit, then confirm
5. Fuzit executes them, shows the output, and reports what changed

## Requirements

- Node.js 18+
- A git repository (must be run inside one)
- An API key — a free [Groq key](https://console.groq.com/keys), or any OpenAI-compatible provider
- Optional: [GitHub CLI](https://cli.github.com) for pull requests and issues

## License

MIT
