---
id: TASK-6
title: Linux Ubuntu 适配与打包验证
status: Done
assignee: []
created_date: '2026-03-05 03:37'
updated_date: '2026-03-06 10:37'
labels:
  - linux
  - ubuntu
  - packaging
priority: high
dependencies:
  - TASK-2
  - TASK-3
  - TASK-4
  - TASK-5
references:
  - package.json
  - .github/workflows/release.yml
  - scripts/dev.mjs
---

## Description

对 Ubuntu 做功能与发布适配：
- 安装依赖检查（图形/截图/OCR相关）
- 运行验证（主面板、便签、OCR、快捷键、垃圾桶）
- 打包验证（至少一种 Linux 可分发格式）
- 补充 Ubuntu 使用文档/已知限制

## Acceptance Criteria
- [ ] #1 Ubuntu 上核心流程可运行且无阻断问题
- [ ] #2 Linux 打包产物可生成并可安装
- [ ] #3 OCR 与快捷键在 Ubuntu 上行为可用或有明确降级说明
- [ ] #4 输出 Ubuntu 适配说明文档（安装、运行、限制）
