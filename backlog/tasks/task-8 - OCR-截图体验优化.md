---
id: TASK-8
title: OCR 截图体验优化（依赖下载提示 + 错误友好化）
status: Done
assignee: []
created_date: '2026-03-06 18:56'
updated_date: '2026-03-06 20:24'
labels:
  - ocr
  - ux
  - feature
priority: high
dependencies:
  - TASK-7
references:
  - src/renderer/pages/OcrCaptureWindow.tsx
  - src/renderer/pages/NoteWindow.tsx
---


## Description

当前 OCR 存在以下体验问题：

1. **截图失败显示 "Not Supported"**：错误提示不够友好，用户不知道原因也不知道如何处理
2. **首次使用需下载 Tesseract 语言包**（~15MB chi_sim），但没有提前告知用户

### 需要做的改动

#### A. 依赖下载友好提示
- 点击 OCR 按钮时，**先检测**是否需要下载语言包（是否已缓存）
- 如需下载：弹出友好提示，说明需要下载语言包（约 XX MB），**等待用户确认**后才开始下载
- 下载过程中显示**进度条**（利用 tesseract.js 的 logger 回调）
- 下载完成后才进入截图流程

#### B. 错误信息友好化
- `getDisplayMedia` 不可用时：显示"当前系统不支持屏幕截图，请使用 X11 桌面环境"而非 "Not Supported"
- 权限被拒绝时：显示"屏幕截图权限被拒绝，请在系统设置中允许"
- 下载失败时：显示"语言包下载失败，请检查网络连接"并提供重试按钮
- 所有错误提示使用统一的 Toast / Banner 样式，3~5 秒自动消失或可手动关闭

#### C. 重试机制
- 截图失败或识别失败后，提供"重试"按钮，不需要关闭窗口重来

## Acceptance Criteria
- [ ] #1 首次 OCR 弹出下载确认对话框，用户确认后才开始下载
- [ ] #2 下载过程中有进度指示
- [ ] #3 下载完成后自动进入截图流程
- [ ] #4 所有错误场景（不支持、权限拒绝、网络失败、识别失败）都有友好中文提示
- [ ] #5 失败后可直接重试，无需关闭窗口
- [ ] #6 已缓存语言包时跳过下载提示，直接进入截图
