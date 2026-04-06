import { isCloudModel } from './model';

export const formatOllamaError = (error: unknown, model: string) => {
  if (error instanceof Error) {
    const message = error.message.trim();
    const hostMatch = message.match(/Unable to reach Ollama at:\s*(.+?)\.\s/i);
    const hostDetails = hostMatch?.[1]?.trim();
    const cloudModel = isCloudModel(model);

    if (/fetch failed|ECONNREFUSED|connect/i.test(message)) {
      return [
        cloudModel ? 'Unable to reach the Ollama service for this cloud model.' : 'Unable to reach the Ollama server.',
        cloudModel
          ? 'Shellama still needs Ollama running locally to send requests, even when the selected model is marked as cloud.'
          : 'Start Ollama first, then try again.',
        hostDetails ? `Tried: ${hostDetails}` : null,
        `Current model: ${model}`,
        cloudModel
          ? 'Tip: open Ollama.app and make sure it is signed in and running, or run `ollama serve` if you are using the CLI service.'
          : 'Tip: open Ollama.app or run `ollama serve` in another terminal if the service is not already running.',
      ]
        .filter(Boolean)
        .join('\n');
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
