import { Box, Text } from 'ink';

export const ChatHeader = () => (
  <Box borderStyle="round" borderColor="gray" flexDirection="column">
    <Box paddingX={1}>
      <Text color="red">●</Text>
      <Text color="yellow"> ●</Text>
      <Text color="green"> ●</Text>
      <Text color="gray">  shellama-ui</Text>
      <Box flexGrow={1} />
      <Text color="gray">Ctrl/Cmd+P models</Text>
    </Box>
    <Box borderStyle="single" borderTop={false} borderLeft={false} borderRight={false} borderBottomColor="gray" />
    <Box paddingX={1}>
      <Text backgroundColor="gray" color="black">
        {' '}
        workspace chat{' '}
      </Text>
      <Text color="gray"> model switcher terminal</Text>
    </Box>
  </Box>
);
