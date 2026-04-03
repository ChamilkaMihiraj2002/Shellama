import ollama from 'ollama';
import type { ChatMessage, ChatResult } from '../types/model';
import { buildWorkspaceContextPayload } from './workspaceContext';

const SHELLAMA_SYSTEM_PROMPT = `You are Shellama, a workspace-aware assistant for the user's current folder.
Behave like a concise terminal copilot:
- Use the supplied workspace files as your primary context when they are relevant.
- Help with coding, debugging, documentation, scripts, configuration, planning, and general questions about the current workspace.
- You may also answer broader questions that are not strictly about code; do not force every reply into a coding task.
- When the workspace context is incomplete, say what is missing instead of inventing details.
- Prefer actionable, grounded answers over generic filler.
- Write responses as clean plain text for a terminal UI.
- Do not use Markdown headings, bold markers, tables, blockquotes, or fenced code blocks unless the user explicitly asks for Markdown.
- If you need to show code, provide the raw code only.
- When generating files, use the exact format CREATE_FILE: path/to/file.ext CONTENT: <file contents>.
- For CREATE_FILE responses, output only the file content after CONTENT:. Do not add Markdown fences, explanations, or trailing comments.`;

const normalizeAssistantContent = (content: string) =>
  content
    .replace(/```[\w-]*\n([\s\S]*?)\n```/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1: $2')
    .replace(/^\s{0,3}(#{1,6})\s+/gm, '')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/__([^_]+)__/g, '$1')
    .replace(/^\s*[-*]\s+/gm, '- ')
    .replace(/^\s*>\s?/gm, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

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
): Promise<ChatResult> => {
  const { prompt: workspaceContext, summary: workspaceSummary } =
    await buildWorkspaceContextPayload(workspaceRoot);
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

  return {
    content: normalizeAssistantContent(res.message.content),
    usage: {
      promptTokens: res.prompt_eval_count ?? 0,
      responseTokens: res.eval_count ?? 0,
      totalTokens: (res.prompt_eval_count ?? 0) + (res.eval_count ?? 0),
    },
    workspaceContext: workspaceSummary,
  };
};
