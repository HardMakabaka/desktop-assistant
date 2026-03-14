# PROJECT_INDEX

## Project Summary

- App: `desktop-assistant`
- Domain: desktop notes, calendar, OCR capture, lightweight personal desktop utility
- Stack: Electron + React + TypeScript + Vite

## Entrypoints

### Main process
- `src/main/main.ts`
- `src/main/preload.ts`
- `src/main/store.ts`

### Renderer entries
- `src/renderer/main.tsx`
- `src/renderer/note-entry.tsx`
- `src/renderer/calendar-entry.tsx`
- `src/renderer/ocr-entry.tsx`

### Renderer pages
- `src/renderer/pages/MainPanel.tsx`
- `src/renderer/pages/NoteWindow.tsx`
- `src/renderer/pages/CalendarWindow.tsx`
- `src/renderer/pages/OcrCaptureWindow.tsx`

## Directory Map

- `src/main/` - Electron main process, IPC, window lifecycle, persistence hooks
- `src/renderer/` - renderer entries, pages, and shared styles
- `src/shared/` - shared TypeScript types
- `resources/` - icons and packaging assets
- `scripts/` - local automation helpers
- `.github/workflows/` - CI and release automation
- `.openclaw/` - process docs, automation policy, ULW context
- `backlog/` - task tracking and release planning notes

## Verification Commands

- `npm run typecheck`
- `npm run build`
- `npm run verify`
- `npm run pack`
- `npm run pack:linux`
- `npm run openclaw:check`

## Release Surface

- Windows installer: `release/*.exe`
- Windows updater metadata: `release/*.yml`, `release/*.blockmap`
- Linux package: `release/*.deb`
- Linux updater metadata: `release/*.yml`

## Branch And Promotion Model

- Base branch: `main`
- Working branches may use `ulw/**`, feature, or release-specific names
- Release tags use the `v` prefix
- CI decides whether a change is still `Draft` or can move to `Ready`

## Drift Triggers

Update this file when any of the following changes:
- source entrypoints
- top-level directories with repo meaning
- verification commands
- release artifact paths
- branch or release conventions
