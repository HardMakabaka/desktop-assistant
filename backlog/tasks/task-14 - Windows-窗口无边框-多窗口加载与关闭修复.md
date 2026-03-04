---
id: TASK-14
title: Windows 窗口无边框 + 多窗口加载与关闭修复
status: In Progress
assignee: []
created_date: '2026-03-04 06:40'
updated_date: '2026-03-04 06:40'
labels:
  - windows
  - tauri
  - ui
  - bug
dependencies: []
references:
  - src-tauri/tauri.conf.json
  - src-tauri/src/lib.rs
  - src/renderer/pages/MainPanel.tsx
  - src/renderer/pages/NoteWindow.tsx
  - src/renderer/pages/CalendarWindow.tsx
  - src/renderer/desktop-api.ts
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Windows 打包版存在多处窗口体验与功能问题：

1) 主窗口存在系统标题栏 + 应用内自绘标题栏两层标题，用户希望移除外层系统标题栏（frameless）。
2) 应用内关闭按钮点击无反应。
3) 便签窗口能打开但内容为空白（NoteWindow 在 note 未加载时直接 return null）。
4) 日历窗口无法打开（或打开失败无反馈）。

目标：在 Windows 上实现“只有一层自绘标题栏、可拖拽、可关闭、便签/日历可正常打开并加载内容”。
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Windows 主窗口/便签窗口/日历窗口均为无系统标题栏（frameless），只显示应用内标题栏
- [ ] #2 应用内关闭按钮可正常关闭当前窗口（至少主窗口；便签/日历同样可关闭）
- [ ] #3 新建便签后打开便签窗口：不再空白；能正确加载该便签内容（id 传递可靠）
- [ ] #4 点击“打开日历”：日历窗口可见并可交互；如失败需在 UI 上给出可读错误信息
- [ ] #5 CI（windows-latest）通过：typecheck + build + tauri build smoke + nsis 打包产物上传
<!-- AC:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
(TBD)
<!-- SECTION:FINAL_SUMMARY:END -->
