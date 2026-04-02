import ollama from 'ollama';

export const listModelNames = async (): Promise<string[]> => {
  const result = await ollama.list();

  return (result.models ?? [])
    .map((model) => model.name?.trim())
    .filter((name): name is string => Boolean(name));
};

export const chatWithModel = async (model: string, prompt: string): Promise<string> => {
  const res = await ollama.chat({
    model,
    messages: [{ role: 'user', content: prompt }],
  });

  return res.message.content;
};
