import Groq from "groq-sdk";
import { getApiKey } from "./config.js";
import { getGitContext, type GitContext } from "./git.js";

export interface AiResponse {
  commands: string[];
  explanation: string;
}

const SYSTEM_PROMPT = `You are a git command translator. The user will describe what they want to do with git in natural language, and you will return the exact git commands to execute.

Rules:
- Only return git commands (commands that start with "git")
- Return commands in the order they should be executed
- Be precise and safe - prefer explicit flags over defaults
- If the request is ambiguous, pick the most common interpretation
- Never return destructive commands without the user explicitly asking (e.g., force push, hard reset)
- You will receive the current git context (branch, status, recent log, remotes) to help you
- IMPORTANT: Always use double quotes (") instead of single quotes (') for command arguments to ensure cross-platform compatibility (especially Windows PowerShell)

You MUST respond with valid JSON in this exact format:
{
  "commands": ["git command 1", "git command 2"],
  "explanation": "Brief explanation of what these commands do"
}

Do not include any text outside the JSON object.`;

function buildUserPrompt(request: string, context: GitContext): string {
  return `Current git context:
- Branch: ${context.branch}
- Status:
${context.status || "(clean)"}
- Recent commits:
${context.recentLog}
- Remotes:
${context.remotes}

User request: ${request}`;
}

export async function getGitCommands(request: string): Promise<AiResponse> {
  const client = new Groq({ apiKey: getApiKey() });
  const context = getGitContext();

  const completion = await client.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: buildUserPrompt(request, context) },
    ],
    temperature: 0.1,
    max_tokens: 1024,
    response_format: { type: "json_object" },
  });

  const content = completion.choices[0]?.message?.content;
  if (!content) {
    throw new Error("No response from AI");
  }

  const parsed = JSON.parse(content) as AiResponse;

  if (!Array.isArray(parsed.commands) || parsed.commands.length === 0) {
    throw new Error("AI returned no commands");
  }

  return parsed;
}

export async function validateApiKey(apiKey: string): Promise<boolean> {
  try {
    const client = new Groq({ apiKey });
    await client.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [{ role: "user", content: "test" }],
      max_tokens: 1,
    });
    return true;
  } catch {
    return false;
  }
}
