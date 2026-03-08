# desktop-assistant ULW TODO (shared context)

## Gate
- enabled: true
- paused: false

## Policy
- do_not_modify_opencode_model_config: true
- auto_commit_git: true
- auto_open_pr: true
- auto_merge_when_ci_green: true
- auto_release_tag_after_merge: true
- release_tag_prefix: v
- release_bump: patch
- base_branch: main
- working_branch: ulw/desktop-assistant-auto

## Ordered Tasks
1. TASK-15 Playwright Electron 自动化测试拆解
2. TASK-13 Linux + Windows 跨平台全面测试
3. TASK-14 自动发版（tag + GitHub Release）
4. TASK-7  EPIC 第二轮体验优化与发版（OCR/WYSIWYG/主题/清理/架构图/测试/发布）

## Recent Runs
- 2026-03-06T00:36:05Z TASK-2 ok - add note markdown live preview toggle; verified via `npm run verify`
- 2026-03-06T02:49:00Z TASK-5 ok - split trash vs purge with restore flow; verified via `npm run verify`
- 2026-03-06T04:38:45Z TASK-4 ok - add Tab indent/outdent + customizable note shortcuts; verified via `npm run verify`
- 2026-03-06T09:24:27Z TASK-3 ok - add OCR screen capture + region select + insert into note; verified via `npm run verify`
- 2026-03-06T10:37:17Z TASK-6 ok - add Linux deb packaging + Ubuntu notes; verified via `npm run verify` and `npm run pack:linux`
- 2026-03-06T12:24:28Z TASK-1 ok - close epic + document feature changes for Ubuntu; verified via `npm run verify`
- 2026-03-06T20:24:46Z TASK-8 ok - improve OCR download prompt, progress, friendly errors, retry; verified via `npm run verify`
- 2026-03-06T22:39:36Z TASK-9 ok - WYSIWYG editor + source toggle + font size persistence; verified via `npm run verify`
- 2026-03-07T00:30:40Z TASK-13 error - add windows coverage to CI + start test report; verified via `npm run verify` and `npm run pack:linux`
- 2026-03-07T04:28:39Z TASK-13 ok - update Linux build verification + refresh test report; verified via `npm run verify` and `npm run pack:linux`
- 2026-03-07T22:30:09Z TASK-13 ok - record CI green + Windows pack validation in test report; verified via `npm run verify` and CI run 22806546617
- 2026-03-08T00:30:26Z TASK-13 ok - refresh test report + document manual QA blockers; verified via `npm run verify`
- 2026-03-08T02:27:30Z TASK-13 ok - mark CI/report acceptance items complete; manual QA still pending; verified via `npm run verify`
