import React, { useEffect, useMemo, useState } from 'react';
import { Text, Box, useInput } from 'ink';
import Spinner from 'ink-spinner';
import { chatWithModel, listModelNames } from '../../services/ollamaService';
import {
  getWorkspaceContextSummary,
  getWorkspaceRootFromTerminal,
} from '../../services/workspaceContext';
import { DEFAULT_MODEL } from '../../utils/model';
import type { ChatMessage, ChatUsage, ModelOption, WorkspaceContextSummary } from '../../types/model';
import { formatOllamaError } from '../../utils/ollamaError';
import { ChatComposer } from './components/ChatComposer';
import { ChatHeader } from './components/ChatHeader';
import { ChatSidebar } from './components/ChatSidebar';
import { ConversationPanel } from './components/ConversationPanel';
import { ModelPicker } from './components/ModelPicker';
import { WorkspaceContextPanel } from './components/WorkspaceContextPanel';
import { createFileFromResponse, handleWorkspaceCommand } from './utils/chatCommands';
import { getAccentColor, getAvatarForModel, toModelSelectionOptions } from './utils/chatDisplay';

export const ChatApp = () => {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingModels, setLoadingModels] = useState(true);
  const [models, setModels] = useState<string[]>([]);
  const [selectedModel, setSelectedModel] = useState(DEFAULT_MODEL);
  const [isSelectingModel, setIsSelectingModel] = useState(true);
  const [modelError, setModelError] = useState('');
  const [statusMessage, setStatusMessage] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [workspaceRoot, setWorkspaceRoot] = useState('');
  const [workspaceSummary, setWorkspaceSummary] = useState<WorkspaceContextSummary | null>(null);
  const [usage, setUsage] = useState<ChatUsage | null>(null);

  useEffect(() => {
    setWorkspaceRoot(getWorkspaceRootFromTerminal());
  }, []);

  useEffect(() => {
    if (!workspaceRoot) {
      return;
    }

    let isMounted = true;

    const loadWorkspaceSummary = async () => {
      try {
        const summary = await getWorkspaceContextSummary(workspaceRoot);

        if (isMounted) {
          setWorkspaceSummary(summary);
        }
      } catch {
        if (isMounted) {
          setWorkspaceSummary(null);
        }
      }
    };

    loadWorkspaceSummary();

    return () => {
      isMounted = false;
    };
  }, [workspaceRoot]);

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

  const selectedAvatar = useMemo(() => getAvatarForModel(selectedModel), [selectedModel]);
  const accentColor = useMemo(() => getAccentColor(selectedModel), [selectedModel]);
  const modelOptions = useMemo(() => toModelSelectionOptions(models), [models]);

  const handleModelSelection = (item: ModelOption) => {
    setSelectedModel(item.value);
    setIsSelectingModel(false);
    setStatusMessage(`Selected model: ${item.value}`);
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

    if ((key.ctrl || key.meta) && input.toLowerCase() === 'l') {
      setMessages([]);
      setUsage(null);
      setStatusMessage('Conversation cleared.');
      setQuery('');
    }
  });

  const handleSubmit = async () => {
    if (loadingModels) {
      setStatusMessage('Model list is still loading. Please wait a moment and try again.');
      return;
    }

    const trimmedQuery = query.trim();

    if (!trimmedQuery) {
      setStatusMessage('Enter a prompt before sending a request.');
      return;
    }

    const nextMessages: ChatMessage[] = [...messages, { role: 'user', content: trimmedQuery }];

    setQuery('');
    setStatusMessage('');
    setMessages(nextMessages);

    const workspaceCommandResult = await handleWorkspaceCommand(
      trimmedQuery,
      workspaceRoot,
      setWorkspaceRoot,
    );

    if (workspaceCommandResult.handled) {
      setStatusMessage(workspaceCommandResult.statusMessage ?? '');

      if (workspaceCommandResult.assistantMessage) {
        setMessages((prev) => [...prev, { role: 'assistant', content: workspaceCommandResult.assistantMessage }]);
      }

      return;
    }

    setLoading(true);

    try {
      const result = await chatWithModel(selectedModel, nextMessages, workspaceRoot);
      const finalContent = result.content.includes('CREATE_FILE:')
        ? await createFileFromResponse(result.content, workspaceRoot)
        : result.content;

      setUsage(result.usage);
      setWorkspaceSummary(result.workspaceContext);
      setMessages((prev) => [...prev, { role: 'assistant', content: finalContent }]);
    } catch (err) {
      setStatusMessage(formatOllamaError(err, selectedModel));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box flexDirection="column" padding={1}>
      <ChatHeader />

      <ChatSidebar
        accentColor={accentColor}
        messages={messages}
        selectedAvatar={selectedAvatar}
        selectedModel={selectedModel}
        usage={usage}
        workspaceRoot={workspaceRoot}
        workspaceSummary={workspaceSummary}
      />

      <ModelPicker
        isSelectingModel={isSelectingModel}
        loadingModels={loadingModels}
        modelOptions={modelOptions}
        onSelect={handleModelSelection}
      />

      {(modelError || statusMessage) && (
        <Box marginTop={1}>
          <Text color={modelError ? 'red' : 'yellow'}>{modelError || statusMessage}</Text>
        </Box>
      )}

      {!isSelectingModel && (
        <ChatComposer accentColor={accentColor} query={query} setQuery={setQuery} onSubmit={handleSubmit} />
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

      <Box marginTop={1}>
        {workspaceSummary && (
          <WorkspaceContextPanel accentColor={accentColor} workspaceSummary={workspaceSummary} />
        )}

        {messages.length > 0 && <ConversationPanel accentColor={accentColor} messages={messages} />}
      </Box>
    </Box>
  );
};
