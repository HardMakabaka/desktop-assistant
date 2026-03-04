---
id: TASK-8
title: Markdown 编辑器：所见即所得与源码模式切换
status: Done
assignee: []
created_date: '2026-03-03 11:40'
updated_date: '2026-03-04 00:01'
labels:
  - markdown
  - editor
dependencies: []
references:
  - src/renderer/pages/NoteWindow.tsx
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
实现类似 Typora 的 Markdown 编辑体验，支持实时预览（WYSIWYG）与源码模式切换。
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 提供模式开关：实时预览/源码模式
- [x] #2 实时预览模式下输入即时渲染
- [x] #3 源码模式下显示原始 Markdown 并保持内容一致
- [x] #4 至少支持标题、列表、代码块、引用、链接、图片
<!-- AC:END -->

## Final Summary

- 在便签窗口新增「预览 / 源码」双模式切换，默认进入实时预览模式。
- 实时预览模式下保留输入区，同时下方即时渲染 Markdown 结果；源码模式保持原始 Markdown 全屏编辑。
- 实现内置 Markdown 渲染器，覆盖标题、列表（有序/无序）、代码块、引用、链接、图片与行内代码。
- 增加 URL 协议白名单与 HTML 转义，避免 `dangerouslySetInnerHTML` 注入风险。
- 已运行 `npm run verify`（typecheck + vite build）通过。
