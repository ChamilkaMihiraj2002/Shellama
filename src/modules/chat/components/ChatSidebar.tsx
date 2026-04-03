import { Box, Text } from 'ink';

import { getModelSource } from '../../../utils/model';
import type { ChatMessage, ChatUsage, WorkspaceContextSummary } from '../../../types/model';
import { getContextLine, getRecentActivity, getTokenLine, truncateText } from '../utils/chatDisplay';

type ChatSidebarProps = {
  accentColor: string;
  messages: ChatMessage[];
  selectedAvatar: readonly string[];
  selectedModel: string;
  usage: ChatUsage | null;
  workspaceRoot: string;
  workspaceSummary: WorkspaceContextSummary | null;
};

export const ChatSidebar = ({
  accentColor,
  messages,
  selectedAvatar,
  selectedModel,
  usage,
  workspaceRoot,
  workspaceSummary,
}: ChatSidebarProps) => {
  const selectedModelSource = getModelSource(selectedModel);
  const recentActivity = getRecentActivity(messages);
  const tokenLine = getTokenLine(usage);
  const contextLine = getContextLine(workspaceSummary);

  return (
    <Box marginTop={1} borderStyle="round" borderColor="gray">
      <Box width={52} paddingX={1} flexDirection="column">
        <Text color="gray">Free Code v0.1.0</Text>
        <Text bold>Welcome back</Text>
        <Box marginTop={1} flexDirection="column" alignItems="center">
          {selectedAvatar.map((line, index) => (
            <Text key={`${selectedModel}-avatar-${index}`} color={accentColor} bold>
              {line}
            </Text>
          ))}
        </Box>
        <Box marginTop={1} flexDirection="column">
          <Text color={accentColor} bold>
            {selectedModel}
          </Text>
          <Text color={selectedModelSource === 'Cloud' ? 'yellow' : 'green'}>
            {selectedModelSource} model ready
          </Text>
          <Text color="gray">{tokenLine}</Text>
          <Text color="gray">{contextLine}</Text>
          <Text color="gray">
            {workspaceRoot ? truncateText(workspaceRoot, 48) : 'Detecting workspace...'}
          </Text>
        </Box>
      </Box>

      <Box borderStyle="single" borderLeft={true} borderTop={false} borderBottom={false} borderRight={false} borderColor="gray" />

      <Box paddingX={1} flexDirection="column" flexGrow={1}>
        <Text bold>Recent activity</Text>
        {recentActivity.map((line, index) => (
          <Text key={`activity-${index}`} color="gray">
            {line}
          </Text>
        ))}
        <Text> </Text>
        <Text bold>What's new</Text>
        <Text color="gray">Workspace-aware answers from your current folder.</Text>
        <Text color="gray">Use `pwd` or `cd ./path` right inside the prompt.</Text>
        <Text color="gray">Press Ctrl/Cmd+L to clear the conversation.</Text>
      </Box>
    </Box>
  );
};
