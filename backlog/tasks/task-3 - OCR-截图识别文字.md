---
id: TASK-3
title: OCR 截图识别文字
status: Done
assignee: []
created_date: '2026-03-05 03:36'
updated_date: '2026-03-06 09:19'
labels:
  - ocr
  - note
  - feature
priority: high
dependencies:
  - TASK-1
references:
  - src/renderer/pages/NoteWindow.tsx
---

## Description

在便签页提供 OCR 截图识别能力：
- 用户框选截图区域
- OCR 识别文本
- 将结果插入当前便签（插入点或末尾）

需覆盖失败反馈：权限不足、截图失败、识别为空、超时。

## Acceptance Criteria
- [ ] #1 可从便签页触发截图并选择识别区域
- [ ] #2 OCR 识别成功后文本能写入当前便签
- [ ] #3 识别失败时有清晰错误提示，不崩溃
- [ ] #4 连续多次识别不会导致卡死或内存异常
