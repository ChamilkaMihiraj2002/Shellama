export type ModelSource = 'Cloud' | 'Local';

export type ModelOption = {
  label: string;
  value: string;
};

export type ChatRole = 'user' | 'assistant' | 'system';

export type ChatMessage = {
  role: ChatRole;
  content: string;
};

export type WorkspaceContextSummary = {
  rootName: string;
  rootPath: string;
  files: string[];
  excerptedFiles: string[];
  usedChars: number;
  maxChars: number;
};

export type ChatUsage = {
  promptTokens: number;
  responseTokens: number;
  totalTokens: number;
};

export type ChatResult = {
  content: string;
  usage: ChatUsage;
  workspaceContext: WorkspaceContextSummary;
};
