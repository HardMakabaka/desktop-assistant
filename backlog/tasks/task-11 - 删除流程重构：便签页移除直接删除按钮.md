---
id: TASK-11
title: 删除流程重构：便签页移除直接删除按钮
status: Done
assignee: []
created_date: '2026-03-03 11:40'
updated_date: '2026-03-03 22:05'
labels:
  - trash
  - ux
dependencies: []
references:
  - src/renderer/pages/NoteWindow.tsx
  - src/renderer/pages/MainPanel.tsx
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
移除便签页面直接永久删除行为，改为移入垃圾桶并在垃圾桶中二次确认永久删除。
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 便签页面不再出现直接删除
- [x] #2 删除动作改为移入垃圾桶
- [x] #3 垃圾桶页面支持恢复/永久删除
- [x] #4 永久删除必须二次确认
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
便签窗口删除按钮已改为“移入垃圾桶”，执行删除后立即关闭窗口；主面板新增垃圾桶分区，支持恢复与永久删除。
永久删除加入两次 `window.confirm` 二次确认，避免误删。
<!-- SECTION:NOTES:END -->

## Final Summary

- 便签页面已移除“直接删除”语义，交互统一为“移入垃圾桶”。
- 主面板新增垃圾桶列表，可对已删除便签执行恢复与永久删除。
- 永久删除具备二次确认弹窗，符合误删防护要求。
- 本轮已通过 `npm run verify`（typecheck + vite build）。
