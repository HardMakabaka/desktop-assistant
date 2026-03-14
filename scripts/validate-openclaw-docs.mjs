import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const openclawDir = path.join(root, '.openclaw');
const workflowsDir = path.join(root, '.github', 'workflows');

const requiredFiles = [
  {
    path: path.join(openclawDir, 'PROCESS.md'),
    headings: ['## Purpose', '## Layers', '## Stages', '## State Machine', '## Feedback Loops'],
  },
  {
    path: path.join(openclawDir, 'ENV_INDEX.md'),
    headings: ['## Runtime', '## Workspace Roots', '## Toolchain', '## Paths', '## Secrets And Tokens'],
  },
  {
    path: path.join(openclawDir, 'PROJECT_INDEX.md'),
    headings: ['## Project Summary', '## Entrypoints', '## Directory Map', '## Verification Commands', '## Release Surface'],
  },
  {
    path: path.join(openclawDir, 'CI_CD_POLICY.md'),
    headings: ['## Branch Rules', '## Required Checks', '## Release Rules', '## Draft Versus Ready', '## Policy Guard Expectations'],
  },
  {
    path: path.join(openclawDir, 'COMMAND_TEMPLATE.md'),
    headings: ['## Metadata', '## Preconditions', '## Execution', '## Validation', '## Rollback'],
  },
];

function read(filePath) {
  return fs.readFileSync(filePath, 'utf8');
}

function ensureFile(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Missing required file: ${path.relative(root, filePath)}`);
  }
  return read(filePath);
}

function ensureHeadings(relativePath, text, headings) {
  for (const heading of headings) {
    if (!text.includes(heading)) {
      throw new Error(`Missing heading ${JSON.stringify(heading)} in ${relativePath}`);
    }
  }
}

function ensureWorkflowContains(fileName, snippets) {
  const filePath = path.join(workflowsDir, fileName);
  const text = ensureFile(filePath);
  for (const snippet of snippets) {
    if (!text.includes(snippet)) {
      throw new Error(`Workflow ${fileName} is missing required snippet: ${snippet}`);
    }
  }
}

for (const item of requiredFiles) {
  const text = ensureFile(item.path);
  ensureHeadings(path.relative(root, item.path), text, item.headings);
}

const ciPolicy = read(path.join(openclawDir, 'CI_CD_POLICY.md'));
const projectIndex = read(path.join(openclawDir, 'PROJECT_INDEX.md'));
const envIndex = read(path.join(openclawDir, 'ENV_INDEX.md'));

for (const requiredCommand of ['npm run openclaw:check', 'npm run verify', 'npm run pack', 'npm run pack:linux']) {
  if (!ciPolicy.includes(requiredCommand)) {
    throw new Error(`CI_CD_POLICY.md must mention ${requiredCommand}`);
  }
  if (!projectIndex.includes(requiredCommand)) {
    throw new Error(`PROJECT_INDEX.md must mention ${requiredCommand}`);
  }
}

if (!envIndex.includes('Repo root:')) {
  throw new Error('ENV_INDEX.md must include an explicit repo root');
}

ensureWorkflowContains('ci.yml', ['npm run openclaw:check', 'npm run verify', 'npm run pack', 'npm run pack:linux']);
ensureWorkflowContains('release.yml', ["tags:", "- 'v*'", 'npm run typecheck', 'npm run build']);

console.log('OpenClaw docs and policy guard checks passed.');
