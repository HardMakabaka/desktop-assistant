---
id: TASK-6
title: Tauri2 迁移：项目脚手架与运行链路
status: To Do
assignee: []
created_date: '2026-03-03 11:40'
labels:
  - tauri
  - migration
dependencies: []
references:
  - package.json
  - src/main/main.ts
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
将 Electron 项目迁移为 Tauri 2 + React + TypeScript 基础架构，保留现有 UI 页面能力并确保可运行。
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 完成 Tauri2 工程初始化并可本地启动
- [ ] #2 React/TS 前端与 Tauri 后端通信链路可用
- [ ] #3 移除 Electron 主流程依赖（不再作为默认运行入口）
<!-- AC:END -->
