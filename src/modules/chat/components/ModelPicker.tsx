import { Box, Text } from 'ink';
import SelectInput from 'ink-select-input';
import Spinner from 'ink-spinner';

import type { ModelOption } from '../../../types/model';

type ModelPickerProps = {
  isSelectingModel: boolean;
  loadingModels: boolean;
  modelOptions: ModelOption[];
  onSelect: (item: ModelOption) => void;
};

export const ModelPicker = ({
  isSelectingModel,
  loadingModels,
  modelOptions,
  onSelect,
}: ModelPickerProps) => (
  <Box marginTop={1} borderStyle="round" borderColor="gray" paddingX={1} flexDirection="column">
    <Text color="cyan" bold>
      Launch Shellama?
    </Text>
    <Text color="gray">Ask about this workspace, create files, or switch the active model without leaving the terminal.</Text>
    <Text color="gray">Shortcuts: Ctrl/Cmd+P opens models. Esc closes the selector. Ctrl/Cmd+L clears chat.</Text>

    {loadingModels ? (
      <Box marginTop={1}>
        <Text color="yellow">
          <Spinner type="dots" /> Loading models from Ollama...
        </Text>
      </Box>
    ) : (
      <Box marginTop={1} flexDirection="column">
        <Text bold>Available models</Text>
        {isSelectingModel ? (
          <SelectInput items={modelOptions} onSelect={onSelect} />
        ) : (
          <Text color="gray">Current selection locked. Press Ctrl/Cmd+P if you want to change it.</Text>
        )}
      </Box>
    )}
  </Box>
);
