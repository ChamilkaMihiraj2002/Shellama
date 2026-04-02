import { readdir } from 'node:fs/promises';
import path from 'node:path';

const IGNORED_DIRS = new Set(['.git', 'dist', 'node_modules', '.idea', '.vscode']);
const IGNORED_FILES = new Set(['bun.lock']);
const RELEVANT_EXTENSIONS = new Set([
  '.ts',
  '.tsx',
  '.js',
  '.jsx',
  '.json',
  '.md',
  '.css',
  '.scss',
  '.html',
  '.yml',
  '.yaml',
]);
const MAX_FILES = 12;
const MAX_FILE_CHARS = 3500;
const MAX_TOTAL_CHARS = 18000;

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
  const entries = await readdir(currentDir, { withFileTypes: true });
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
  const content = await Bun.file(absolutePath).text();

  return content.slice(0, MAX_FILE_CHARS).trim();
};

export const buildWorkspaceContext = async () => {
  const rootDir = process.cwd();
  const files = (await collectFiles(rootDir)).slice(0, MAX_FILES);
  let usedChars = 0;
  const sections: string[] = [];

  for (const filePath of files) {
    const snippet = await readSnippet(rootDir, filePath);

    if (!snippet) {
      continue;
    }

    if (usedChars + snippet.length > MAX_TOTAL_CHARS) {
      break;
    }

    usedChars += snippet.length;
    sections.push(`File: ${filePath}\n\`\`\`${toCodeFence(filePath)}\n${snippet}\n\`\`\``);
  }

  return [
    `Workspace root: ${path.basename(rootDir)}`,
    'Project files:',
    ...files.map((filePath) => `- ${filePath}`),
    '',
    'Project excerpts:',
    ...sections,
  ].join('\n');
};
