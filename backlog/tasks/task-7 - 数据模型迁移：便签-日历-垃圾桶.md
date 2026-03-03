---
id: TASK-7
title: 数据模型迁移：便签/日历/垃圾桶
status: Done
assignee: []
created_date: '2026-03-03 11:40'
updated_date: '2026-03-03 20:08'
labels:
  - tauri
  - data
dependencies: []
references:
  - src/main/store.ts
  - src/shared/types.ts
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
迁移现有数据结构到 Tauri 侧持久化，并新增垃圾桶模型与恢复/彻底删除能力。
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 保留便签与日历原有数据字段兼容
- [x] #2 新增 trash 状态并支持恢复
- [x] #3 仅在垃圾桶执行删除才真正物理删除
<!-- AC:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
已完成便签数据模型迁移并引入垃圾桶状态：
1) 在 Tauri/Electron 双端数据模型中新增 `status` 与 `deletedAt`，兼容旧数据默认按 active 处理；
2) `deleteNote` 改为仅移入垃圾桶，并新增 `getTrashNotes` / `restoreNote` / `permanentlyDeleteNote` 能力；
3) 永久删除仅允许对垃圾桶中的便签执行，满足“仅垃圾桶物理删除”约束。
<!-- SECTION:FINAL_SUMMARY:END -->
