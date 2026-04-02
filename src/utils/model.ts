import type { ModelOption, ModelSource } from '../types/model';

export const DEFAULT_MODEL = process.env.OLLAMA_MODEL?.trim() || 'llama3.2:3b';

export const isCloudModel = (model: string) => /-cloud$/i.test(model.trim());

export const getModelSource = (model: string): ModelSource =>
  isCloudModel(model) ? 'Cloud' : 'Local';

export const toModelOptions = (models: string[]): ModelOption[] =>
  models.map((model) => ({
    label: model,
    value: model,
  }));
