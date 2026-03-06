---
id: TASK-12
title: 补充 Mermaid 架构图
status: To Do
assignee: []
created_date: '2026-03-06 18:56'
updated_date: '2026-03-06 18:56'
labels:
  - docs
  - architecture
priority: medium
dependencies:
  - TASK-7
references:
  - README.md
  - docs/
  - src/main/main.ts
  - src/renderer/pages/MainPanel.tsx
  - src/renderer/pages/NoteWindow.tsx
  - src/renderer/pages/CalendarWindow.tsx
  - src/renderer/pages/OcrCaptureWindow.tsx
  - src/main/store.ts
---

## Description

补充一张更直观的 Mermaid 架构图，帮助理解项目整体结构。

### 架构图应覆盖

#### A. 进程模型
- Electron Main Process（main.ts）
- Renderer Processes（各窗口页面）
- IPC 通信关系

#### B. 窗口结构
- MainPanel（主面板）：便签列表、日历入口、垃圾桶
- NoteWindow（便签窗口）：编辑器、OCR、快捷键、工具栏
- CalendarWindow（日历窗口）：日期选择、事件管理
- OcrCaptureWindow（OCR 截图窗口）：截图、框选、识别

#### C. 数据流
- electron-store（持久化）
- localStorage（前端偏好）
- IPC 消息流向

#### D. 外部依赖
- tesseract.js（OCR 引擎）
- electron-updater（自动更新）
- electron-builder（打包）

### 放置位置
- 主架构图放在 `README.md` 中
- 如有详细子图，放在 `docs/architecture.md`

### 格式要求
- 使用 Mermaid 语法（GitHub 原生渲染）
- 图表清晰直观，层次分明
- 中文标注

## Acceptance Criteria
- [ ] #1 README.md 中包含 Mermaid 架构图
- [ ] #2 架构图覆盖进程模型、窗口结构、数据流
- [ ] #3 在 GitHub 上可正常渲染
- [ ] #4 图表清晰，新开发者能快速理解项目结构
