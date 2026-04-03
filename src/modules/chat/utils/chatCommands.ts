import path from 'node:path';

import { resolveWorkspaceRoot } from '../../../services/workspaceContext';

export const extractFileContent = (rawContent: string) => {
  const trimmed = rawContent.trim();
  const fencedMatch = trimmed.match(/^```[\w-]*\n([\s\S]*?)\n```/);

  if (fencedMatch?.[1]) {
    return fencedMatch[1].trim();
  }

  const trailingNoteIndex = trimmed.search(/\n(?:Let me know|I can|Would you like|Here'?s|This file)/i);

  if (trailingNoteIndex >= 0) {
    return trimmed.slice(0, trailingNoteIndex).trim();
  }

  return trimmed;
};

export const createFileFromResponse = async (text: string, workspaceRoot: string) => {
  const match = text.match(/CREATE_FILE:\s+([^\s]+)\s+CONTENT:\s+([\s\S]+)/);

  if (!match) {
    return `${text}\n\nUnable to create file: invalid file creation format.`;
  }

  const [, fileName = '', rawFileContent = ''] = match;
  const fileContent = extractFileContent(rawFileContent);

  if (!fileName || !fileContent) {
    return `${text}\n\nUnable to create file: missing file content.`;
  }

  const outputPath = path.isAbsolute(fileName) ? fileName : path.join(workspaceRoot, fileName);

  await Bun.write(outputPath, fileContent.trim());
  return `${text}\n\nFile "${fileName}" created successfully in "${workspaceRoot}".`;
};

export const handleWorkspaceCommand = async (
  rawQuery: string,
  workspaceRoot: string,
  onWorkspaceRootChange: (nextRoot: string) => void,
) => {
  const trimmed = rawQuery.trim();

  if (/^pwd$/i.test(trimmed)) {
    return {
      handled: true,
      statusMessage: `Workspace: ${workspaceRoot}`,
      assistantMessage: workspaceRoot,
    };
  }

  const switchMatch = trimmed.match(/^(?:pwd|cd)\s+(.+)$/i);

  if (!switchMatch) {
    return { handled: false };
  }

  const requestedPath = switchMatch[1]?.trim() ?? '';

  if (!requestedPath) {
    return {
      handled: true,
      statusMessage: 'Enter a directory path after pwd or cd.',
    };
  }

  try {
    const nextWorkspaceRoot = await resolveWorkspaceRoot(requestedPath);
    onWorkspaceRootChange(nextWorkspaceRoot);

    return {
      handled: true,
      statusMessage: `Workspace changed to ${nextWorkspaceRoot}`,
      assistantMessage: nextWorkspaceRoot,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unable to change workspace.';

    return {
      handled: true,
      statusMessage: message,
      assistantMessage: message,
    };
  }
};
