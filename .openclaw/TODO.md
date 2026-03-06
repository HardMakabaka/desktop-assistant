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
1. TASK-2  Markdown 模式开关与实时预览
2. TASK-5  删除流程重构（垃圾桶缓冲与彻底删除分离）
3. TASK-4  文本快捷键（Tab格式化与自定义快捷）
4. TASK-3  OCR 截图识别文字
5. TASK-6  Linux Ubuntu 适配与打包验证

## Recent Runs
- 2026-03-06T00:36:05Z TASK-2 ok - add note markdown live preview toggle; verified via `npm run verify`
- 2026-03-06T02:49:00Z TASK-5 ok - split trash vs purge with restore flow; verified via `npm run verify`
- 2026-03-06T04:38:45Z TASK-4 ok - add Tab indent/outdent + customizable note shortcuts; verified via `npm run verify`
- 2026-03-06T09:24:27Z TASK-3 ok - add OCR screen capture + region select + insert into note; verified via `npm run verify`
- 2026-03-06T10:37:17Z TASK-6 ok - add Linux deb packaging + Ubuntu notes; verified via `npm run verify` and `npm run pack:linux`
