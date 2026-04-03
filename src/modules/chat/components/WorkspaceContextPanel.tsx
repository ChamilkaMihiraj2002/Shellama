import { Box, Text } from 'ink';

import type { WorkspaceContextSummary } from '../../../types/model';
import { truncateText } from '../utils/chatDisplay';

type WorkspaceContextPanelProps = {
  accentColor: string;
  workspaceSummary: WorkspaceContextSummary;
};

export const WorkspaceContextPanel = ({
  accentColor,
  workspaceSummary,
}: WorkspaceContextPanelProps) => (
  <Box borderStyle="round" borderColor="gray" paddingX={1} flexDirection="column" width={40} marginRight={1}>
    <Text color={accentColor} bold>
      Active Context
    </Text>
    <Text color="gray">{truncateText(workspaceSummary.rootPath, 36)}</Text>
    <Text color="gray">
      Files: {workspaceSummary.excerptedFiles.join(', ') || 'No files included.'}
    </Text>
  </Box>
);
