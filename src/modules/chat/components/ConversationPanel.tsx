import { Box, Text } from 'ink';

import type { ChatMessage } from '../../../types/model';

type ConversationPanelProps = {
  accentColor: string;
  messages: ChatMessage[];
};

export const ConversationPanel = ({ accentColor, messages }: ConversationPanelProps) => (
  <Box borderStyle="round" borderColor="gray" paddingX={1} flexDirection="column" flexGrow={1}>
    <Text bold>Conversation</Text>
    {messages.slice(-6).map((message, index) => (
      <Box key={`${message.role}-${index}`} marginTop={index === 0 ? 0 : 1} flexDirection="column">
        <Text color={message.role === 'user' ? accentColor : 'green'} bold>
          {message.role === 'user' ? 'You' : 'Assistant'}
        </Text>
        <Text>{message.content}</Text>
      </Box>
    ))}
  </Box>
);
