---
id: TASK-7
title: 数据模型迁移：便签/日历/垃圾桶
status: To Do
assignee: []
created_date: '2026-03-03 11:40'
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
- [ ] #1 保留便签与日历原有数据字段兼容
- [ ] #2 新增 trash 状态并支持恢复
- [ ] #3 仅在垃圾桶执行删除才真正物理删除
<!-- AC:END -->
