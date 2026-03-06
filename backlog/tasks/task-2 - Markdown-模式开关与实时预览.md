---
id: TASK-2
title: Markdown 模式开关与实时预览
status: Done
assignee: []
created_date: '2026-03-05 03:35'
updated_date: '2026-03-06 00:36'
labels:
  - markdown
  - note
  - frontend
priority: high
dependencies:
  - TASK-1
references:
  - src/renderer/pages/NoteWindow.tsx
---

## Description

在便签编辑区增加可切换开关：
- 开启：实时预览（所写即所得）
- 关闭：源码模式（纯 Markdown）

建议形态：
- 使用单一开关（实时预览 ON/OFF）或双态按钮（预览/源码）
- 切换状态需持久化到本地（按用户偏好保存）

## Acceptance Criteria
- [ ] #1 可在“实时预览”和“源码模式”间稳定切换
- [ ] #2 开启实时预览时，输入后预览即时更新
- [ ] #3 关闭实时预览时，仅显示源码编辑区
- [ ] #4 模式偏好可持久化（重启应用后保持）
- [ ] #5 不破坏现有便签内容与保存逻辑
