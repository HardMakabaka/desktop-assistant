import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const openclawDir = path.join(root, '.openclaw');
const workflowsDir = path.join(root, '.github', 'workflows');
const packageJsonPath = path.join(root, 'package.json');

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

const requiredCommands = ['npm run openclaw:check', 'npm run verify', 'npm run pack', 'npm run pack:linux'];
const expectedProjectPaths = [
  'src/main/main.ts',
  'src/main/preload.ts',
  'src/main/store.ts',
  'src/renderer/main.tsx',
  'src/renderer/note-entry.tsx',
  'src/renderer/calendar-entry.tsx',
  'src/renderer/ocr-entry.tsx',
  'src/renderer/pages/MainPanel.tsx',
  'src/renderer/pages/NoteWindow.tsx',
  'src/renderer/pages/CalendarWindow.tsx',
  'src/renderer/pages/OcrCaptureWindow.tsx',
  'src/main/',
  'src/renderer/',
  'src/shared/',
  'resources/',
  'scripts/',
  '.github/workflows/',
  '.openclaw/',
  'backlog/',
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
  return text;
}

function ensureMarkdownMentions(docName, text, values) {
  for (const value of values) {
    if (!text.includes(value)) {
      throw new Error(`${docName} must mention ${value}`);
    }
  }
}

function ensureExists(relativePath) {
  const fullPath = path.join(root, relativePath.replace(/\/$/, ''));
  if (!fs.existsSync(fullPath)) {
    throw new Error(`Indexed path does not exist: ${relativePath}`);
  }
}

function ensureAbsoluteLine(docName, text, label, fullPath) {
  if (!text.includes(`${label} \`${fullPath}\``)) {
    throw new Error(`${docName} must contain ${label} \`${fullPath}\``);
  }
}

for (const item of requiredFiles) {
  const text = ensureFile(item.path);
  ensureHeadings(path.relative(root, item.path), text, item.headings);
}

const ciPolicy = read(path.join(openclawDir, 'CI_CD_POLICY.md'));
const projectIndex = read(path.join(openclawDir, 'PROJECT_INDEX.md'));
const envIndex = read(path.join(openclawDir, 'ENV_INDEX.md'));
const packageJson = JSON.parse(read(packageJsonPath));

for (const requiredCommand of requiredCommands) {
  ensureMarkdownMentions('CI_CD_POLICY.md', ciPolicy, [requiredCommand]);
  ensureMarkdownMentions('PROJECT_INDEX.md', projectIndex, [requiredCommand]);
}

for (const scriptName of ['openclaw:check', 'verify', 'pack', 'pack:linux', 'typecheck', 'build']) {
  if (!packageJson.scripts?.[scriptName]) {
    throw new Error(`package.json is missing required script: ${scriptName}`);
  }
}

for (const projectPath of expectedProjectPaths) {
  ensureMarkdownMentions('PROJECT_INDEX.md', projectIndex, [`\`${projectPath}\``]);
  ensureExists(projectPath);
}

ensureMarkdownMentions('PROJECT_INDEX.md', projectIndex, ['Base branch: `main`', 'Release tags use the `v` prefix']);
ensureMarkdownMentions('CI_CD_POLICY.md', ciPolicy, ['Base branch: `main`', 'Release tags must match `v*`']);

ensureAbsoluteLine('ENV_INDEX.md', envIndex, '- Repo root:', root);
ensureAbsoluteLine('ENV_INDEX.md', envIndex, '- Source root:', path.join(root, 'src'));
ensureAbsoluteLine('ENV_INDEX.md', envIndex, '- Automation root:', path.join(root, '.openclaw'));
ensureAbsoluteLine('ENV_INDEX.md', envIndex, '- Main process entry source:', path.join(root, 'src', 'main', 'main.ts'));
ensureAbsoluteLine('ENV_INDEX.md', envIndex, '- Preload entry source:', path.join(root, 'src', 'main', 'preload.ts'));
ensureAbsoluteLine('ENV_INDEX.md', envIndex, '- Renderer root:', path.join(root, 'src', 'renderer'));
ensureAbsoluteLine('ENV_INDEX.md', envIndex, '- Build output:', path.join(root, 'dist'));
ensureAbsoluteLine('ENV_INDEX.md', envIndex, '- Release output:', path.join(root, 'release'));
ensureAbsoluteLine('ENV_INDEX.md', envIndex, '- Workflow directory:', path.join(root, '.github', 'workflows'));
ensureMarkdownMentions('ENV_INDEX.md', envIndex, ['- CI OS: `ubuntu-latest`, `windows-latest`', '- Node version in CI: `24`', '- Release trigger: git tag matching `v*`']);

const ciWorkflow = ensureWorkflowContains('ci.yml', [
  'node-version: 24',
  'npm run openclaw:check',
  'npm run verify',
  'npm run pack',
  'npm run pack:linux',
  "- main",
  "- 'ulw/**'",
]);

const releaseWorkflow = ensureWorkflowContains('release.yml', [
  'node-version: 24',
  'tags:',
  "- 'v*'",
  'npm run typecheck',
  'npm run build',
]);

if (!ciWorkflow.includes('pull_request:') || !ciWorkflow.includes('- main')) {
  throw new Error('ci.yml must run for pull requests targeting main');
}

if (!releaseWorkflow.includes('electron-builder --win --x64 --publish always')) {
  throw new Error('release.yml must publish Windows packages');
}

if (!releaseWorkflow.includes('electron-builder --linux deb --x64 --publish always')) {
  throw new Error('release.yml must publish Linux packages');
}

console.log('OpenClaw docs and policy guard checks passed.');
