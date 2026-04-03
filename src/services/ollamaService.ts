import ollama from 'ollama';
import type { ChatMessage } from '../types/model';
import { buildWorkspaceContext } from './workspaceContext';

const SHELLAMA_SYSTEM_PROMPT = `You are Shellama, a workspace-aware assistant for the user's current folder.
Behave like a concise terminal copilot:
- Use the supplied workspace files as your primary context when they are relevant.
- Help with coding, debugging, documentation, scripts, configuration, planning, and general questions about the current workspace.
- You may also answer broader questions that are not strictly about code; do not force every reply into a coding task.
- When the workspace context is incomplete, say what is missing instead of inventing details.
- Prefer actionable, grounded answers over generic filler.
- When generating files, use the exact format CREATE_FILE: path/to/file.ext CONTENT: <file contents>.
- For CREATE_FILE responses, output only the file content after CONTENT:. Do not add Markdown fences, explanations, or trailing comments.`;

export const listModelNames = async (): Promise<string[]> => {
  const result = await ollama.list();

  return (result.models ?? [])
    .map((model) => model.name?.trim())
    .filter((name): name is string => Boolean(name));
};

export const chatWithModel = async (
  model: string,
  messages: ChatMessage[],
  workspaceRoot?: string,
): Promise<string> => {
  const workspaceContext = await buildWorkspaceContext(workspaceRoot);
  const res = await ollama.chat({
    model,
    messages: [
      {
        role: 'system',
        content: `${SHELLAMA_SYSTEM_PROMPT}\n\n${workspaceContext}`,
      },
      ...messages,
    ],
  });

  return res.message.content.trim();
};
