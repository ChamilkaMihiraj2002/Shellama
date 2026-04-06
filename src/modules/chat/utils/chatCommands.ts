import { mkdir } from 'node:fs/promises';
import path from 'node:path';

import { invalidateProjectRules } from '../../../services/rulesEngine';
import { invalidateWorkspaceContext, resolveWorkspaceRoot } from '../../../services/workspaceContext';

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

const parseCreateFileBlocks = (text: string) => {
  const matches = [
    ...text.matchAll(
      /CREATE_FILE:\s+([^\s]+)(?:\s+CONTENT:\s*|\n)([\s\S]*?)(?=\nCREATE_FILE:\s+|\s*$)/g,
    ),
  ];

  return matches
    .map((match) => {
      const fileName = match[1]?.trim() ?? '';
      const rawFileContent = match[2] ?? '';

      return {
        fileName,
        fileContent: extractFileContent(rawFileContent),
      };
    })
    .filter((entry) => entry.fileName && entry.fileContent);
};

export const createFileFromResponse = async (text: string, workspaceRoot: string) => {
  if (!/PLAN:\s*/i.test(text) || !/REVIEW:\s*/i.test(text)) {
    return `${text}\n\nUnable to create file: missing required PLAN or REVIEW section before file creation.`;
  }

  const filesToCreate = parseCreateFileBlocks(text);

  if (filesToCreate.length === 0) {
    return `${text}\n\nUnable to create file: invalid file creation format.`;
  }

  for (const { fileName, fileContent } of filesToCreate) {
    const outputPath = path.isAbsolute(fileName) ? fileName : path.join(workspaceRoot, fileName);
    const outputDir = path.dirname(outputPath);

    await mkdir(outputDir, { recursive: true });
    await Bun.write(outputPath, fileContent.trim());
  }

  invalidateWorkspaceContext(workspaceRoot);
  invalidateProjectRules(workspaceRoot);
  const createdFilesLabel = filesToCreate.map(({ fileName }) => `"${fileName}"`).join(', ');

  return `${text}\n\nCreated ${filesToCreate.length} file(s) in "${workspaceRoot}": ${createdFilesLabel}.`;
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

  if (/^pwd\s+/i.test(trimmed)) {
    return {
      handled: true,
      statusMessage: 'Use `pwd` to print the current workspace, or `cd <path>` to change it.',
    };
  }

  const switchMatch = trimmed.match(/^cd\s+(.+)$/i);

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
    const nextWorkspaceRoot = await resolveWorkspaceRoot(requestedPath, workspaceRoot);
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
