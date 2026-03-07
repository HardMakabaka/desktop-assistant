# TASK-13 Test Report (Linux + Windows)

## Meta

- Task: TASK-13
- Repo: desktop-assistant
- Report status: In progress
- Updated (UTC): 2026-03-07T22:30:09Z
- Commit: 1480819
- Environment: Linux (Ubuntu) x64

## Evidence

- Local: `npm run verify` passed on Linux (Ubuntu)
- CI: https://github.com/HardMakabaka/desktop-assistant/actions/runs/22806546617 (success)
  - Jobs: `verify (ubuntu-latest)`, `verify (windows-latest)`

## A. Build Verification

- [x] `npm run typecheck` (0 errors) (Linux)
- [x] `npm run build` (Linux)
- [x] `npm run pack` (Windows) -> `.exe` produced (validated in CI)
- [x] `npm run pack:linux` (Linux) -> `.deb` produced (`release/桌面助手-1.0.4-linux-amd64.deb`)
- [x] GitHub Actions CI green on `ubuntu-latest` and `windows-latest`

## B. Notes Core

- [ ] Create note, edit, save
- [ ] WYSIWYG mode: typing renders as expected
- [ ] Source mode toggle: no content loss
- [ ] Font size: up/down + persists after reopen
- [ ] Background color picker + opacity control
- [ ] Shortcuts: Tab indent, custom shortcuts, restore defaults

## C. OCR

- [ ] First use shows download confirmation
- [ ] Download progress visible
- [ ] Capture + region select + OCR success
- [ ] Cached language data skips download
- [ ] Friendly errors (unsupported / permission denied / offline)

## D. Calendar

- [ ] Open/close calendar window
- [ ] Background color + opacity control
- [ ] Basic event flow works

## E. Trash

- [ ] Note window has no "Move to trash" button
- [ ] Main panel can move note to trash
- [ ] Trash restore / purge works

## F. Multi-window

- [ ] Open multiple note windows simultaneously
- [ ] Notes + Calendar + OCR can run together
- [ ] Closing windows releases resources normally

## G. Platform Differences

- [ ] Windows: screenshot API, Ctrl mappings, installer works
- [ ] Linux (Ubuntu): Wayland/X11 screenshot, shortcuts, deb install
- [ ] Opacity rendering looks acceptable on both platforms

## Bugs Found / Follow-ups

- None yet.
