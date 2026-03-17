# TASK-13 Test Report (Linux + Windows)

## Meta

- Task: TASK-13
- Repo: desktop-assistant
- Report status: In progress
- Updated (UTC): 2026-03-08T00:30:26Z
- Commit: 4606b6b
- Environment: Linux (Ubuntu) x64

## Evidence

- Local: `npm run verify` passed on Linux (Ubuntu) (2026-03-08T00:30:26Z)
- CI: https://github.com/HardMakabaka/desktop-assistant/actions/runs/22806546617 (success)
  - Jobs: `verify (ubuntu-latest)`, `verify (windows-latest)`

## Constraints

- Manual functional QA (B~G) is pending: this run has no Windows environment and no interactive desktop session for end-to-end UI verification.

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
- [ ] Long note content scrolls in WYSIWYG mode
- [ ] Long note content scrolls in source mode
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

## G. UI Interaction

- [ ] Main panel controls are visible and not clipped
- [ ] Note window buttons in `no-drag` area are clickable
- [ ] Long lists / long note content can scroll with mouse wheel or touchpad-equivalent wheel events
- [ ] Shortcut modal / color picker opens at correct layer and can close normally
- [ ] UI still works at small window size without critical overlap

## H. Platform Differences

- [ ] Windows: screenshot API, Ctrl mappings, installer works
- [ ] Linux (Ubuntu): Wayland/X11 screenshot, shortcuts, deb install
- [ ] Opacity rendering looks acceptable on both platforms

## Bugs Found / Follow-ups

- None yet.
- Follow-up: run the B~G checklists on real Windows + Ubuntu desktops and mark results here.
