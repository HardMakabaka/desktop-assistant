---
id: TASK-7
title: EPIC 第二轮体验优化与发版（OCR/WYSIWYG/主题/清理/架构图/测试/发布）
status: To Do
assignee: []
created_date: '2026-03-06 18:56'
updated_date: '2026-03-06 18:56'
labels:
  - epic
  - ux
  - release
priority: high
dependencies:
  - TASK-1
references:
  - src/renderer/pages/NoteWindow.tsx
  - src/renderer/pages/CalendarWindow.tsx
  - src/renderer/pages/OcrCaptureWindow.tsx
  - .github/workflows/release.yml
---

## Description

基于第一轮（TASK-1）完成后的用户反馈，进行第二轮体验优化并最终发版：

1) OCR 截图体验优化：依赖下载友好提示 + 错误信息优化
2) Markdown 所见即所得（WYSIWYG）：去掉左右分屏，单编辑面 + 整体字号调节
3) 日历 & 便签背景颜色 + 透明度调节
4) 便签界面去除"移入垃圾桶"按钮
5) 补充 Mermaid 架构图
6) Linux + Windows 跨平台全面测试
7) 完成后自动打 tag 发版

## 子任务
- TASK-8  OCR 截图体验优化
- TASK-9  Markdown WYSIWYG + 字号调节
- TASK-10 日历/便签背景颜色与透明度调节
- TASK-11 便签去除"移入垃圾桶"按钮
- TASK-12 补充 Mermaid 架构图
- TASK-13 Linux + Windows 跨平台全面测试
- TASK-14 自动发版

## Acceptance Criteria
- [ ] #1 TASK-8 ~ TASK-14 全部完成并通过验证
- [ ] #2 GitHub Release 成功发布 Windows + Linux 安装包
- [ ] #3 CHANGELOG / Release Notes 覆盖全部变更
