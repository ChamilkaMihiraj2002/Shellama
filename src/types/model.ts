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
