import { readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import type { WorkspaceContextSummary } from '../types/model';

const IGNORED_DIRS = new Set(['.git', 'dist', 'node_modules', '.idea', '.vscode']);
const IGNORED_FILES = new Set(['bun.lock']);
const RELEVANT_EXTENSIONS = new Set([
  '.ts',
  '.tsx',
  '.js',
  '.jsx',
  '.mjs',
  '.cjs',
  '.py',
  '.rb',
  '.go',
  '.rs',
  '.java',
  '.sh',
  '.zsh',
  '.json',
  '.md',
  '.txt',
  '.css',
  '.scss',
  '.html',
  '.yml',
  '.yaml',
  '.toml',
  '.ini',
  '.env',
  '.sql',
]);
const MAX_FILES = 12;
const MAX_FILE_CHARS = 3500;
const MAX_TOTAL_CHARS = 18000;
const WORKSPACE_CACHE_TTL_MS = 5_000;

type WorkspaceContextPayload = {
  summary: WorkspaceContextSummary;
  prompt: string;
};

type WorkspaceCacheEntry = {
  expiresAt: number;
  payload: WorkspaceContextPayload;
};

const isSkippableFsError = (error: unknown) => {
  if (!(error instanceof Error) || !('code' in error)) {
    return false;
  }

  const code = String(error.code);
  return code === 'EPERM' || code === 'EACCES' || code === 'ENOENT';
};

const workspacePayloadCache = new Map<string, WorkspaceCacheEntry>();
const inFlightWorkspacePayloads = new Map<string, Promise<WorkspaceContextPayload>>();

export const getWorkspaceRootFromTerminal = () => process.cwd();

export const resolveWorkspaceRoot = async (
  inputPath?: string,
  currentRoot = getWorkspaceRootFromTerminal(),
) => {
  const candidatePath = inputPath?.trim() ? inputPath.trim() : currentRoot;
  const absolutePath = path.resolve(currentRoot, candidatePath);
  const details = await stat(absolutePath);

  if (!details.isDirectory()) {
    throw new Error(`Not a directory: ${absolutePath}`);
  }

  return absolutePath;
};

const sortByPriority = (files: string[]) =>
  [...files].sort((left, right) => {
    const leftScore = getFilePriority(left);
    const rightScore = getFilePriority(right);

    if (leftScore !== rightScore) {
      return leftScore - rightScore;
    }

    return left.localeCompare(right);
  });

const getFilePriority = (filePath: string) => {
  const normalizedPath = filePath.toLowerCase();

  if (normalizedPath === 'package.json' || normalizedPath === 'readme.md') {
    return 0;
  }

  if (normalizedPath.endsWith('chatapp.tsx') || normalizedPath.endsWith('ollamaservice.ts')) {
    return 1;
  }

  if (normalizedPath.startsWith('src/')) {
    return 2;
  }

  return 3;
};

const shouldIncludeFile = (filePath: string) => {
  const extension = path.extname(filePath).toLowerCase();
  const fileName = path.basename(filePath);

  return RELEVANT_EXTENSIONS.has(extension) && !IGNORED_FILES.has(fileName);
};

const collectFiles = async (rootDir: string, currentDir = rootDir): Promise<string[]> => {
  let entries;

  try {
    entries = await readdir(currentDir, { withFileTypes: true });
  } catch (error) {
    if (isSkippableFsError(error)) {
      return [];
    }

    throw error;
  }

  const files: string[] = [];

  for (const entry of entries) {
    if (entry.name.startsWith('.') && entry.name !== '.env.example') {
      continue;
    }

    const fullPath = path.join(currentDir, entry.name);
    const relativePath = path.relative(rootDir, fullPath);

    if (entry.isDirectory()) {
      if (IGNORED_DIRS.has(entry.name)) {
        continue;
      }

      files.push(...(await collectFiles(rootDir, fullPath)));
      continue;
    }

    if (shouldIncludeFile(relativePath)) {
      files.push(relativePath);
    }
  }

  return sortByPriority(files);
};

const toCodeFence = (filePath: string) => {
  const extension = path.extname(filePath).slice(1);
  return extension || 'text';
};

const readSnippet = async (rootDir: string, filePath: string) => {
  const absolutePath = path.join(rootDir, filePath);
  let content = '';

  try {
    content = await Bun.file(absolutePath).text();
  } catch (error) {
    if (isSkippableFsError(error)) {
      return '';
    }

    throw error;
  }

  return content.slice(0, MAX_FILE_CHARS).trim();
};

const collectWorkspaceContext = async (rootDir: string) => {
  const files = (await collectFiles(rootDir)).slice(0, MAX_FILES);
  const readResults = await Promise.all(
    files.map(async (filePath) => ({ filePath, snippet: await readSnippet(rootDir, filePath) })),
  );

  let usedChars = 0;
  const excerptedFiles: string[] = [];
  const snippets: string[] = [];

  for (const { filePath, snippet } of readResults) {
    if (!snippet) {
      continue;
    }

    if (usedChars + snippet.length > MAX_TOTAL_CHARS) {
      break;
    }

    usedChars += snippet.length;
    excerptedFiles.push(filePath);
    snippets.push(snippet);
  }

  return {
    summary: {
      rootName: path.basename(rootDir),
      rootPath: rootDir,
      files,
      excerptedFiles,
      usedChars,
      maxChars: MAX_TOTAL_CHARS,
    } satisfies WorkspaceContextSummary,
    snippets,
  };
};

const createWorkspaceContextPayload = async (
  rootDir = getWorkspaceRootFromTerminal(),
): Promise<WorkspaceContextPayload> => {
  const { summary, snippets } = await collectWorkspaceContext(rootDir);

  return {
    summary,
    prompt: [
      `Workspace root: ${summary.rootName}`,
      'Workspace files:',
      ...summary.files.map((filePath) => `- ${filePath}`),
      '',
      'Workspace excerpts:',
      ...summary.excerptedFiles.map((filePath, index) => {
        const snippet = snippets[index];

        return `File: ${filePath}\n\`\`\`${toCodeFence(filePath)}\n${snippet}\n\`\`\``;
      }),
    ].join('\n'),
  };
};

export const invalidateWorkspaceContext = (rootDir?: string) => {
  if (rootDir) {
    workspacePayloadCache.delete(rootDir);
    inFlightWorkspacePayloads.delete(rootDir);
    return;
  }

  workspacePayloadCache.clear();
  inFlightWorkspacePayloads.clear();
};

export const buildWorkspaceContextPayload = async (rootDir = getWorkspaceRootFromTerminal()) => {
  const now = Date.now();
  const cachedEntry = workspacePayloadCache.get(rootDir);

  if (cachedEntry && cachedEntry.expiresAt > now) {
    return cachedEntry.payload;
  }

  const existingRequest = inFlightWorkspacePayloads.get(rootDir);

  if (existingRequest) {
    return existingRequest;
  }

  const request = createWorkspaceContextPayload(rootDir)
    .then((payload) => {
      workspacePayloadCache.set(rootDir, {
        expiresAt: Date.now() + WORKSPACE_CACHE_TTL_MS,
        payload,
      });

      return payload;
    })
    .finally(() => {
      inFlightWorkspacePayloads.delete(rootDir);
    });

  inFlightWorkspacePayloads.set(rootDir, request);
  return request;
};

export const buildWorkspaceContext = async (rootDir = getWorkspaceRootFromTerminal()) =>
  (await buildWorkspaceContextPayload(rootDir)).prompt;

export const getWorkspaceContextSummary = async (
  rootDir = getWorkspaceRootFromTerminal(),
): Promise<WorkspaceContextSummary> => (await collectWorkspaceContext(rootDir)).summary;
