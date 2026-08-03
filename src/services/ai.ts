import {
  streamChat,
  type ChatMessage,
  type Provider,
} from "./providers.js";
import { describeForModel, type RepoState } from "./repo.js";
import { extractPlan, type PartialPlan } from "../utils/partialPlan.js";
import { validateCommands } from "../utils/validate.js";

export interface AiResponse {
  commands: string[];
  explanation: string;
}

/** A previous exchange, replayed so follow-ups can refer back to it. */
export interface PriorTurn {
  request: string;
  commands: string[];
  explanation: string;
  /** What happened when it ran, if it ran. */
  outcome?: string;
}

const BASE_RULES = `Rules:
- Return commands in the order they should be executed
- Be precise and safe - prefer explicit flags over defaults
- If the request is ambiguous, pick the most common interpretation
- Never return destructive commands without the user explicitly asking (e.g., force push, hard reset)
- One command per array entry. Never chain with &&, ||, ; or pipes - they are rejected
- You will receive the current git context (branch, tracking, status, recent log, stashes, remotes) to help you
- IMPORTANT: Always use double quotes (") instead of single quotes (') for command arguments to ensure cross-platform compatibility (especially Windows PowerShell)`;

const GIT_ONLY = `You are a git command translator. The user will describe what they want to do with git in natural language, and you will return the exact commands to execute.

Only return git commands (commands that start with "git"). The GitHub CLI is
not available, so if the request needs it - opening a pull request, listing
issues - do the closest thing possible with git alone and say so in the
explanation.`;

const GIT_AND_GH = `You are a git and GitHub command translator. The user will describe what they want in natural language, and you will return the exact commands to execute.

Every command must start with "git" or "gh". The authenticated GitHub CLI is
available, so use "gh" for anything that touches GitHub itself - pull requests,
issues, releases, repository settings - and "git" for everything local.`;

const FORMAT = `The explanation is shown directly under the commands in a narrow terminal panel.
Write it as one sentence, lower case, no trailing period, describing what the
commands do to this repo. Do not restate the commands.

You MUST respond with valid JSON in this exact format:
{
  "commands": ["command 1", "command 2"],
  "explanation": "what these commands do"
}

Do not include any text outside the JSON object.`;

function systemPrompt(allowGh: boolean): string {
  return `${allowGh ? GIT_AND_GH : GIT_ONLY}\n\n${BASE_RULES}\n\n${FORMAT}`;
}

/**
 * Prior turns are replayed as real assistant messages so a follow-up like
 * "no, the remote branch" has something to correct.
 */
function buildMessages(
  request: string,
  repo: RepoState,
  prior: PriorTurn[],
  allowGh: boolean,
): ChatMessage[] {
  const messages: ChatMessage[] = [
    { role: "system", content: systemPrompt(allowGh) },
  ];

  for (const turn of prior) {
    messages.push({ role: "user", content: turn.request });
    messages.push({
      role: "assistant",
      content: JSON.stringify({
        commands: turn.commands,
        explanation: turn.explanation,
      }),
    });
    if (turn.outcome) {
      messages.push({ role: "user", content: `Result: ${turn.outcome}` });
    }
  }

  messages.push({
    role: "user",
    content: `Current git context:\n${describeForModel(repo)}\n\nUser request: ${request}`,
  });

  return messages;
}

export interface PlanOptions {
  provider: Provider;
  model: string;
  request: string;
  repo: RepoState;
  prior?: PriorTurn[];
  allowGh: boolean;
  /** Called as commands and explanation arrive. */
  onUpdate?: (partial: PartialPlan) => void;
  signal?: AbortSignal;
}

export async function planCommands({
  provider,
  model,
  request,
  repo,
  prior = [],
  allowGh,
  onUpdate,
  signal,
}: PlanOptions): Promise<AiResponse> {
  if (!provider.apiKey) {
    throw new Error(`${provider.label} has no API key. Add one in settings.`);
  }

  const messages = buildMessages(request, repo, prior, allowGh);

  let text = "";
  let lastCommandCount = -1;
  let lastExplanation = "";

  for await (const delta of streamChat({ provider, model, messages, signal })) {
    text += delta;
    if (!onUpdate) continue;

    const partial = extractPlan(text);
    // Only repaint when something the user can see actually changed.
    if (
      partial.commands.length !== lastCommandCount ||
      partial.explanation !== lastExplanation
    ) {
      lastCommandCount = partial.commands.length;
      lastExplanation = partial.explanation;
      onUpdate(partial);
    }
  }

  if (!text.trim()) {
    throw new Error("The model returned nothing. Try again.");
  }

  let parsed: AiResponse;
  try {
    parsed = JSON.parse(text) as AiResponse;
  } catch {
    // Some providers wrap JSON in prose or a code fence.
    const salvaged = extractPlan(text);
    if (salvaged.commands.length === 0) {
      throw new Error("Could not read a plan out of the model's reply.");
    }
    parsed = salvaged;
  }

  const commands = (parsed.commands ?? [])
    .map((c) => String(c).trim())
    .filter(Boolean);

  if (commands.length === 0) {
    throw new Error("The model found no commands for that request.");
  }

  const problem = validateCommands(commands, allowGh);
  if (problem) throw new Error(problem);

  return { commands, explanation: parsed.explanation ?? "" };
}
