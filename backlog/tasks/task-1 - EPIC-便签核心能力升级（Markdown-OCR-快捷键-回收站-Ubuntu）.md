---
id: TASK-1
title: EPIC 便签核心能力升级（Markdown/OCR/快捷键/回收站/Ubuntu）
status: To Do
assignee: []
created_date: '2026-03-05 03:35'
updated_date: '2026-03-05 03:35'
labels:
  - epic
  - note
  - ux
priority: high
dependencies: []
references:
  - src/renderer/pages/MainPanel.tsx
  - src/renderer/pages/NoteWindow.tsx
  - src/main/store.ts
---

## Description

统一拆分并落地以下 5 项需求：
1) Markdown 模式开关（开启=实时预览所写即所得，关闭=源码模式）
2) OCR 截图识别文字
3) 文本区域快捷键（Tab 格式化 + 自定义快捷键）
4) 去除便签页“直接删除”，改为进入垃圾桶缓冲，仅垃圾桶中可彻底删除
5) 适配 Linux Ubuntu

## 子任务
- TASK-2 Markdown 模式开关与实时预览
- TASK-3 OCR 截图识别文字
- TASK-4 文本区域快捷键增强
- TASK-5 删除流程重构（垃圾桶缓冲）
- TASK-6 Linux Ubuntu 适配

## Acceptance Criteria
- [ ] #1 TASK-2~TASK-6 全部完成并通过回归验证
- [ ] #2 关键流程（新建便签、编辑、切换模式、OCR、删除/恢复）可稳定运行
- [ ] #3 发布说明覆盖 Ubuntu 安装与功能变更
