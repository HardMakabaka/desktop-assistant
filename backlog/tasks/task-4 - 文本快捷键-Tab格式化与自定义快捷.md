---
id: TASK-4
title: 文本快捷键（Tab 格式化 + 自定义快捷）
status: To Do
assignee: []
created_date: '2026-03-05 03:36'
updated_date: '2026-03-05 03:36'
labels:
  - shortcut
  - editor
  - feature
priority: high
dependencies:
  - TASK-1
references:
  - src/renderer/pages/NoteWindow.tsx
  - src/shared/types.ts
---

## Description

文本区域快捷键增强：
1) Tab 键格式化（例如缩进/列表层级/代码块缩进，需明确统一规则）
2) 支持用户自定义快捷键（冲突检测、持久化、恢复默认）

## Acceptance Criteria
- [ ] #1 Tab 在文本区触发格式化逻辑（不再默认焦点跳转）
- [ ] #2 自定义快捷键可设置、保存、重启后保留
- [ ] #3 快捷键冲突时给出提示并阻止保存
- [ ] #4 可恢复默认快捷键配置
- [ ] #5 不影响系统级常用快捷键（复制/粘贴/撤销等）
