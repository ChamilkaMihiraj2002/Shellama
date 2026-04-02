import React, { useEffect, useMemo, useState } from 'react';
import { Text, Box, useInput } from 'ink';
import TextInput from 'ink-text-input';
import Spinner from 'ink-spinner';
import SelectInput from 'ink-select-input';
import { chatWithModel, listModelNames } from '../../services/ollamaService';
import { DEFAULT_MODEL, getModelSource, toModelOptions } from '../../utils/model';
import type { ModelOption } from '../../types/model';
import { formatOllamaError } from '../../utils/ollamaError';

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

const getAvatarForModel = (model: string) =>
  MODEL_AVATARS[hashText(model) % MODEL_AVATARS.length] ?? MODEL_AVATARS[0];

const getAccentColor = (model: string) => {
  const colors = ['cyan', 'green', 'yellow', 'blue', 'magenta'] as const;
  return colors[hashText(model) % colors.length] ?? 'cyan';
};

export const ChatApp = () => {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingModels, setLoadingModels] = useState(true);
  const [models, setModels] = useState<string[]>([]);
  const [selectedModel, setSelectedModel] = useState(DEFAULT_MODEL);
  const [isSelectingModel, setIsSelectingModel] = useState(true);
  const [modelError, setModelError] = useState('');
  const [response, setResponse] = useState('');

  useEffect(() => {
    let isMounted = true;

    const loadModels = async () => {
      setLoadingModels(true);
      setModelError('');

      try {
        const names = await listModelNames();

        if (!isMounted) {
          return;
        }

        if (names.length === 0) {
          setModels([DEFAULT_MODEL]);
          setSelectedModel(DEFAULT_MODEL);
          return;
        }

        setModels(names);

        const defaultIndex = names.indexOf(DEFAULT_MODEL);
        const activeIndex = defaultIndex >= 0 ? defaultIndex : 0;
        const activeModel = names[activeIndex] ?? DEFAULT_MODEL;

        setSelectedModel(activeModel);
      } catch (err) {
        if (!isMounted) {
          return;
        }

        setModels([DEFAULT_MODEL]);
        setSelectedModel(DEFAULT_MODEL);
        setModelError(formatOllamaError(err, DEFAULT_MODEL));
      } finally {
        if (isMounted) {
          setLoadingModels(false);
        }
      }
    };

    loadModels();

    return () => {
      isMounted = false;
    };
  }, []);

  const selectedModelSource = getModelSource(selectedModel);
  const selectedAvatar = useMemo(() => getAvatarForModel(selectedModel), [selectedModel]);
  const accentColor = useMemo(() => getAccentColor(selectedModel), [selectedModel]);
  const modelOptions = useMemo(
    () =>
      toModelOptions(models).map((option) => ({
        ...option,
        label: `${option.value} · ${getModelSource(option.value)}`,
      })),
    [models],
  );

  const handleModelSelection = (item: ModelOption) => {
    setSelectedModel(item.value);
    setIsSelectingModel(false);
    setResponse(`Selected model: ${item.value}`);
  };

  useInput((input, key) => {
    if (loadingModels) {
      return;
    }

    if ((key.ctrl || key.meta) && input.toLowerCase() === 'p') {
      setIsSelectingModel(true);
      return;
    }

    if (key.escape) {
      setIsSelectingModel(false);
    }
  });

  const handleOpenAI = async () => {
    if (loadingModels) {
      setResponse('Model list is still loading. Please wait a moment and try again.');
      return;
    }

    const trimmedQuery = query.trim();

    if (!trimmedQuery) {
      setResponse('Enter a prompt before sending a request.');
      return;
    }

    setLoading(true);
    setResponse('');

    try {
      const content = await chatWithModel(selectedModel, trimmedQuery);
      setResponse(content);

      if (content.includes('CREATE_FILE:')) {
        handleFileCreation(content);
      }
    } catch (err) {
      setResponse(formatOllamaError(err, selectedModel));
    } finally {
      setLoading(false);
    }
  };

  const handleFileCreation = (text: string) => {
    const match = text.match(/CREATE_FILE: ([\w.]+) CONTENT: ([\s\S]+)/);
    if (match) {
      const fileName = match[1];
      const fileContent = match[2];

      if (!fileName || !fileContent) {
        setResponse((prev) => prev + '\n\nUnable to create file: missing file content.');
        return;
      }

      Bun.write(fileName, fileContent.trim());
      setResponse((prev) => prev + `\n\n✅ File "${fileName}" created successfully!`);
    }
  };

  return (
    <Box flexDirection="column" padding={1}>
      <Box borderStyle="round" borderColor="gray" paddingX={1} paddingY={0} flexDirection="column">
        <Box justifyContent="space-between">
          <Text color="gray">Ollama CLI Assistant</Text>
          <Text color="gray">Ctrl/Cmd+P models</Text>
        </Box>

        <Box marginTop={1}>
          <Box flexDirection="column" marginRight={2}>
            {selectedAvatar.map((line, index) => (
              <Text key={`${selectedModel}-avatar-${index}`} color={accentColor} bold>
                {line}
              </Text>
            ))}
          </Box>

          <Box flexDirection="column">
            <Text color={accentColor} bold>
              {selectedModel}
            </Text>
            <Text color={selectedModelSource === 'Cloud' ? 'yellow' : 'green'}>
              {selectedModelSource} model ready
            </Text>
            <Text color="gray">Pick a model, type a prompt, and press Enter.</Text>
          </Box>
        </Box>

        {loadingModels ? (
          <Box marginTop={1}>
            <Text color="yellow">
              <Spinner type="dots" /> Loading models from Ollama...
            </Text>
          </Box>
        ) : (
          <Box marginTop={1} flexDirection="column">
            <Text color="green" bold>
              Available models
            </Text>
            <Text color="gray">Local and cloud models with generated icons.</Text>
            {isSelectingModel ? (
              <Box marginBottom={1}>
                <SelectInput items={modelOptions} onSelect={handleModelSelection} />
              </Box>
            ) : (
              <Box marginBottom={1}>
                <Text color="gray">Press Ctrl/Cmd+P to change model. Use arrows + Enter, Esc to close.</Text>
              </Box>
            )}
          </Box>
        )}
      </Box>

      {modelError && (
        <Box marginTop={1} marginBottom={1}>
          <Text color="red">{modelError}</Text>
        </Box>
      )}

      {!isSelectingModel && (
        <Box marginTop={1} borderStyle="round" borderColor="gray" paddingX={1}>
          <Text color={accentColor} bold>
            &gt;
          </Text>
          <Text> </Text>
          <TextInput value={query} onChange={setQuery} onSubmit={handleOpenAI} />
        </Box>
      )}

      {isSelectingModel && !loadingModels && (
        <Box marginTop={1}>
          <Text color="gray">Select a model with arrow keys and press Enter.</Text>
        </Box>
      )}

      {loading && (
        <Box marginTop={1}>
          <Text color="yellow">
            <Spinner type="dots" /> Thinking...
          </Text>
        </Box>
      )}

      {response && (
        <Box marginTop={1} borderStyle="round" borderColor="gray" paddingX={1}>
          <Text>{response}</Text>
        </Box>
      )}
    </Box>
  );
};
