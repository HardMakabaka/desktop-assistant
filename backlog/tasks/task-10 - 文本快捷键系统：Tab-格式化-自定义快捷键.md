---
id: TASK-10
title: 文本快捷键系统：Tab 格式化 + 自定义快捷键
status: Done
assignee: []
created_date: '2026-03-03 11:40'
updated_date: '2026-03-04 02:45'
labels:
  - keyboard
  - editor
dependencies: []
references:
  - src/renderer/pages/NoteWindow.tsx
  - src/renderer/desktop-api.ts
  - src/shared/types.ts
  - src-tauri/src/lib.rs
priority: medium
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
为编辑区域提供快捷键系统，包括 Tab 格式化与用户自定义快捷键。
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Tab 键在编辑区执行可预期格式化（如缩进/列表）
- [x] #2 用户可配置至少 3 个自定义快捷键动作
- [x] #3 快捷键配置可持久化并可在 UI 中修改
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
编辑区新增统一按键处理：Tab 对当前行/选区按行追加两个空格缩进；支持 3 个动作（插入标题、列表项、引用）的自定义快捷键执行。
便签窗口新增快捷键配置面板，用户可直接在 UI 中按下新的组合键完成重绑；配置通过 Tauri 命令写入本地存储并在重启后保留。
后端 `PersistedStore` 新增 `textShortcuts` 字段与默认值，缺省旧数据会自动补齐 3 个动作配置。
<!-- SECTION:NOTES:END -->

## Final Summary

- 已实现编辑区 Tab 预测性格式化（按行缩进），覆盖源码模式与预览输入区。
- 已提供 3 个可配置动作的文本快捷键系统：插入标题、插入列表项、插入引用。
- 已实现快捷键配置持久化（Rust store.json）并在便签窗口 UI 中可直接修改。
- 已通过 `npm run verify`（typecheck + vite build）。
