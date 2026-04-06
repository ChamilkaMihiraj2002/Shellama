import { stat } from 'node:fs/promises';
import path from 'node:path';

const RULES_CACHE_TTL_MS = 5_000;
const RULE_FILE_CANDIDATES = [
  'rules.conf',
  'rules.md',
  'rules.json',
  '.shellama/rules.conf',
  '.shellama/rules.md',
  '.shellama/rules.json',
];

const DEFAULT_RULES = `Architecture:
- Prefer small, composable modules with clear boundaries.
- Keep data access and orchestration separated when the feature warrants it.

DRY Principle:
- Search the provided workspace context before introducing new helpers or duplicate logic.
- Extract repeated logic into a shared utility, service, or component when reuse is clear.

Type Safety:
- Use explicit TypeScript types or interfaces for data structures.
- Avoid any unless the user explicitly accepts the tradeoff.

Review Step:
- For code or file changes, explain the plan first and briefly name the pattern or structural choice you applied.`;

export type ProjectRulesPayload = {
  content: string;
  prompt: string;
  sourcePath: string | null;
};

type RulesCacheEntry = {
  expiresAt: number;
  payload: ProjectRulesPayload;
};

const rulesCache = new Map<string, RulesCacheEntry>();
const inFlightRuleLoads = new Map<string, Promise<ProjectRulesPayload>>();

const formatRulesContent = (filePath: string, rawContent: string) => {
  const trimmed = rawContent.trim();

  if (!trimmed) {
    return DEFAULT_RULES;
  }

  if (path.extname(filePath).toLowerCase() !== '.json') {
    return trimmed;
  }

  try {
    return JSON.stringify(JSON.parse(trimmed), null, 2);
  } catch {
    return trimmed;
  }
};

const fileExists = async (filePath: string) => {
  try {
    const details = await stat(filePath);
    return details.isFile();
  } catch {
    return false;
  }
};

const loadRulesFromWorkspace = async (workspaceRoot: string): Promise<ProjectRulesPayload> => {
  for (const candidate of RULE_FILE_CANDIDATES) {
    const absolutePath = path.join(workspaceRoot, candidate);

    if (!(await fileExists(absolutePath))) {
      continue;
    }

    const rawContent = await Bun.file(absolutePath).text();
    const content = formatRulesContent(absolutePath, rawContent);

    return {
      content,
      prompt: [`Project rules file: ${candidate}`, content].join('\n\n'),
      sourcePath: absolutePath,
    };
  }

  return {
    content: DEFAULT_RULES,
    prompt: ['Project rules file: default built-in rules', DEFAULT_RULES].join('\n\n'),
    sourcePath: null,
  };
};

export const invalidateProjectRules = (workspaceRoot?: string) => {
  if (workspaceRoot) {
    rulesCache.delete(workspaceRoot);
    inFlightRuleLoads.delete(workspaceRoot);
    return;
  }

  rulesCache.clear();
  inFlightRuleLoads.clear();
};

export const buildProjectRulesPayload = async (workspaceRoot: string): Promise<ProjectRulesPayload> => {
  const now = Date.now();
  const cachedEntry = rulesCache.get(workspaceRoot);

  if (cachedEntry && cachedEntry.expiresAt > now) {
    return cachedEntry.payload;
  }

  const existingRequest = inFlightRuleLoads.get(workspaceRoot);

  if (existingRequest) {
    return existingRequest;
  }

  const request = loadRulesFromWorkspace(workspaceRoot)
    .then((payload) => {
      rulesCache.set(workspaceRoot, {
        expiresAt: Date.now() + RULES_CACHE_TTL_MS,
        payload,
      });

      return payload;
    })
    .finally(() => {
      inFlightRuleLoads.delete(workspaceRoot);
    });

  inFlightRuleLoads.set(workspaceRoot, request);
  return request;
};
