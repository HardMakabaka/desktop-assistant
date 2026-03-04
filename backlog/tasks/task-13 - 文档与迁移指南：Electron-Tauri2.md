---
id: TASK-13
title: 文档与迁移指南：Electron -> Tauri2
status: Done
assignee: []
created_date: '2026-03-03 11:40'
updated_date: '2026-03-04 03:43'
labels:
  - docs
  - migration
dependencies: []
references:
  - README.md
priority: medium
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
补充迁移文档、开发依赖说明、平台构建说明与功能开关说明。
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 README 包含 Tauri2 开发与打包命令
- [x] #2 列出 OCR 与截图依赖说明
- [x] #3 说明 Markdown 双模式与垃圾桶删除流程
<!-- AC:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
已完成 README 的 Electron -> Tauri2 文档迁移：补充了 Tauri2 开发环境前置依赖、本地开发命令、构建与 Linux/Windows 打包命令，并同步修正 Linux 安装产物路径。

新增 OCR 与截图依赖说明（`tesseract.js`、`getDisplayMedia`、系统屏幕捕获权限、Wayland portal/PipeWire 要求），并补充 Markdown 双模式和垃圾桶删除流程说明（移入垃圾桶、恢复、永久删除二次确认）。

已运行 `npm run verify`（typecheck + vite build）通过。
<!-- SECTION:FINAL_SUMMARY:END -->
