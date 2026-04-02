import ollama from 'ollama';
import type { ChatMessage } from '../types/model';
import { buildWorkspaceContext } from './workspaceContext';

const COPILOT_SYSTEM_PROMPT = `You are Shellama, a local coding assistant for the current repository.
Behave like a concise VS Code Copilot Chat session:
- Use the supplied workspace files as your primary context.
- Help with coding tasks, debugging, refactors, and explaining code in this repo.
- When the workspace context is incomplete, say what is missing instead of inventing details.
- Prefer actionable code-focused answers over generic advice.
- When generating files, use the exact format CREATE_FILE: path/to/file.ext CONTENT: <file contents>.
- For CREATE_FILE responses, output only the file content after CONTENT:. Do not add Markdown fences, explanations, or trailing comments.`;

export const listModelNames = async (): Promise<string[]> => {
  const result = await ollama.list();

  return (result.models ?? [])
    .map((model) => model.name?.trim())
    .filter((name): name is string => Boolean(name));
};

export const chatWithModel = async (model: string, messages: ChatMessage[]): Promise<string> => {
  const workspaceContext = await buildWorkspaceContext();
  const res = await ollama.chat({
    model,
    messages: [
      {
        role: 'system',
        content: `${COPILOT_SYSTEM_PROMPT}\n\n${workspaceContext}`,
      },
      ...messages,
    ],
  });

  return res.message.content.trim();
};
