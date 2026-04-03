import { Box, Text } from 'ink';
import TextInput from 'ink-text-input';

type ChatComposerProps = {
  accentColor: string;
  query: string;
  setQuery: (value: string) => void;
  onSubmit: () => void | Promise<void>;
};

export const ChatComposer = ({ accentColor, query, setQuery, onSubmit }: ChatComposerProps) => (
  <Box marginTop={1} borderStyle="round" borderColor="gray" paddingX={1} flexDirection="column">
    <Text color="gray">Enter to send · Ctrl/Cmd+P to switch models · Esc to close menus</Text>
    <Box marginTop={1}>
      <Text color={accentColor} bold>
        &gt;
      </Text>
      <Text> </Text>
      <TextInput value={query} onChange={setQuery} onSubmit={onSubmit} />
    </Box>
  </Box>
);
