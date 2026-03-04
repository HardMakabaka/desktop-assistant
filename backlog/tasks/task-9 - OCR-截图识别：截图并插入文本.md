---
id: TASK-9
title: OCR 截图识别：截图并插入文本
status: Done
assignee: []
created_date: '2026-03-03 11:40'
updated_date: '2026-03-04 01:57'
labels:
  - ocr
  - feature
dependencies: []
references:
  - src/renderer/pages/NoteWindow.tsx
  - package.json
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
新增 OCR 截图识别能力，支持用户截屏后提取文字并插入当前便签。
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 可触发截图选择区域
- [x] #2 OCR 结果可写入当前编辑区域
- [x] #3 识别失败有明确错误提示
- [x] #4 支持 Linux/Windows 的可用实现策略
<!-- AC:END -->

## Final Summary

- 在便签窗口新增「截图 OCR」入口：调用 `getDisplayMedia` 截取当前屏幕，并在遮罩层内支持拖拽框选识别区域。
- 接入 `tesseract.js`（`chi_sim+eng`）进行本地 OCR，识别结果自动追加到当前便签编辑内容。
- 为截图失败、选区过小、无识别结果等路径补充了明确错误提示，并在底部状态栏展示 OCR 当前状态。
- 该方案仅依赖浏览器屏幕捕获与前端 OCR worker，Linux/Windows 均可用（前提是系统允许屏幕捕获权限）。
- 已运行 `npm run verify`（typecheck + vite build）通过。
