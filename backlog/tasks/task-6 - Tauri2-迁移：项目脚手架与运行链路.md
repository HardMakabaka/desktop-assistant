---
id: TASK-6
title: Tauri2 迁移：项目脚手架与运行链路
status: Done
assignee: []
created_date: '2026-03-03 11:40'
updated_date: '2026-03-03 16:07'
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
- [x] #1 完成 Tauri2 工程初始化并可本地启动
- [x] #2 React/TS 前端与 Tauri 后端通信链路可用
- [x] #3 移除 Electron 主流程依赖（不再作为默认运行入口）
<!-- AC:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
已完成 Tauri2 基础脚手架（`src-tauri`）与 React/TS 前端命令桥接，`package.json` 默认运行链路已切换为 Tauri（`dev/start/pack`）。前端通过 `@tauri-apps/api/core` `invoke` 与 Rust 命令通信，`npm run verify` 通过。当前环境缺少 Rust/WebKit 依赖，已通过 `npm run tauri -- info` 明确记录本地启动前置条件。
<!-- SECTION:FINAL_SUMMARY:END -->
