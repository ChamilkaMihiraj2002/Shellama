import { getModelSource } from '../../../utils/model';
import type { ChatMessage, ChatUsage, ModelOption, WorkspaceContextSummary } from '../../../types/model';

const MODEL_AVATARS = [
  [' /^^\\\\ ', '| oo |', ' \\__// '],
  [' .--. ', '/_.._\\\\', '\\_--_/'],
  [' .-. ', '(o o)', '| O \\\\', " '~~~'"],
  [' .-"""-. ', '/ .===. \\\\', '\\ \\___/ /', " '-----' "],
  [' [***] ', '[o o ]', '[___ ]'],
  [' .---. ', '|^ ^|', '|_-_|'],
] as const;

const hashText = (value: string) =>
  [...value].reduce((total, char) => total + char.charCodeAt(0), 0);

export const getAvatarForModel = (model: string) =>
  MODEL_AVATARS[hashText(model) % MODEL_AVATARS.length] ?? MODEL_AVATARS[0];

export const getAccentColor = (model: string) => {
  const colors = ['cyan', 'green', 'yellow', 'blue', 'magenta'] as const;
  return colors[hashText(model) % colors.length] ?? 'cyan';
};

export const formatNumber = (value: number) => new Intl.NumberFormat('en-US').format(value);

export const truncateText = (value: string, maxLength: number) => {
  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, Math.max(0, maxLength - 3)).trimEnd()}...`;
};

export const getRecentActivity = (messages: ChatMessage[]) => {
  const lastUserMessage = [...messages].reverse().find((message) => message.role === 'user');
  const lastAssistantMessage = [...messages].reverse().find((message) => message.role === 'assistant');

  if (!lastUserMessage && !lastAssistantMessage) {
    return ['No recent activity'];
  }

  const lines: string[] = [];

  if (lastUserMessage) {
    lines.push(`Prompt  ${truncateText(lastUserMessage.content.replace(/\s+/g, ' '), 44)}`);
  }

  if (lastAssistantMessage) {
    lines.push(`Reply   ${truncateText(lastAssistantMessage.content.replace(/\s+/g, ' '), 44)}`);
  }

  return lines;
};

export const toModelSelectionOptions = (models: string[]): ModelOption[] =>
  models.map((model) => ({
    label: `${model} · ${getModelSource(model)}`,
    value: model,
  }));

export const getContextLine = (workspaceSummary: WorkspaceContextSummary | null) =>
  workspaceSummary
    ? `${workspaceSummary.excerptedFiles.length}/${workspaceSummary.files.length} files in context`
    : 'Workspace context loads after startup';

export const getTokenLine = (usage: ChatUsage | null) =>
  usage ? `${formatNumber(usage.totalTokens)} total tokens` : 'No token usage yet';
