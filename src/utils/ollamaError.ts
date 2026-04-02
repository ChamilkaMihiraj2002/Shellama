export const formatOllamaError = (error: unknown, model: string) => {
  if (error instanceof Error) {
    const message = error.message.trim();

    if (/fetch failed|ECONNREFUSED|connect/i.test(message)) {
      return [
        'Unable to reach the Ollama server.',
        'Start Ollama first, then try again.',
        `Current model: ${model}`,
        'Tip: run `ollama serve` in another terminal if the app is not already running.',
      ].join('\n');
    }

    if (/model .* not found|pull model/i.test(message)) {
      return [
        `Model "${model}" is not available locally.`,
        `Pull it with \`ollama pull ${model}\` and try again.`,
      ].join('\n');
    }

    return `Ollama request failed: ${message}`;
  }

  return `Ollama request failed for model "${model}".`;
};
