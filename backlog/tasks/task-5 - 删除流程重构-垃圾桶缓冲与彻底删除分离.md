---
id: TASK-5
title: 删除流程重构（垃圾桶缓冲与彻底删除分离）
status: Done
assignee: []
created_date: '2026-03-05 03:37'
updated_date: '2026-03-06 02:48'
labels:
  - delete
  - trash
  - data-safety
priority: high
dependencies:
  - TASK-1
references:
  - src/renderer/pages/NoteWindow.tsx
  - src/renderer/pages/MainPanel.tsx
  - src/main/store.ts
---

## Description

按需求调整删除策略：
- 去除便签页面“直接彻底删除”入口
- 便签页删除动作仅允许“移入垃圾桶”
- 只有在垃圾桶页面/流程中才允许“彻底删除”
- 支持从垃圾桶恢复

## Acceptance Criteria
- [ ] #1 便签页不再出现“直接删除”能力
- [ ] #2 便签页删除后仅进入垃圾桶，数据可恢复
- [ ] #3 垃圾桶中可执行彻底删除
- [ ] #4 彻底删除后数据不可恢复（持久层同步）
- [ ] #5 删除与恢复流程有明确状态提示
