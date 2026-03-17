# ENV_INDEX

## Runtime

- Host OS: Windows workstation for local development
- CI OS: `ubuntu-latest`, `windows-latest`
- Primary runtime: Node.js + Electron
- Package manager: `npm`

## Workspace Roots

- Repo root: `D:\AIWORK\project\desktop-assistant`
- Source root: `D:\AIWORK\project\desktop-assistant\src`
- Automation root: `D:\AIWORK\project\desktop-assistant\.openclaw`

## Toolchain

- Node version in CI: `24`
- TypeScript project files: `tsconfig.json`, `tsconfig.main.json`
- Bundler: Vite
- Desktop runtime: Electron
- Packager: `electron-builder`
- GitHub automation: `gh` CLI locally, GitHub Actions remotely

## Paths

- Main process entry source: `D:\AIWORK\project\desktop-assistant\src\main\main.ts`
- Preload entry source: `D:\AIWORK\project\desktop-assistant\src\main\preload.ts`
- Renderer root: `D:\AIWORK\project\desktop-assistant\src\renderer`
- Build output: `D:\AIWORK\project\desktop-assistant\dist`
- Release output: `D:\AIWORK\project\desktop-assistant\release`
- Workflow directory: `D:\AIWORK\project\desktop-assistant\.github\workflows`

## Secrets And Tokens

- GitHub Actions uses `secrets.GITHUB_TOKEN` for release publishing
- Local `gh` usage assumes authenticated CLI state
- No secret value should be written into this file

## Package Surfaces

- Verification command: `npm run verify`
- Windows package validation: `npm run pack`
- Linux package validation: `npm run pack:linux`
- Release trigger: git tag matching `v*`

## Update Rules

Update this file when any of the following changes:
- repo root or important absolute paths
- CI runner matrix
- primary runtime or build toolchain
- release output directory
- secret delivery mechanism
