---
id: TASK-15
title: Playwright Electron 自动化测试拆解
status: To Do
assignee: []
created_date: '2026-03-08 04:59'
updated_date: '2026-03-08 04:59'
labels:
  - testing
  - e2e
  - playwright
  - electron
priority: high
dependencies:
  - TASK-8
  - TASK-9
  - TASK-10
  - TASK-11
  - TASK-12
references:
  - backlog/docs/linux-gui-test-plan.md
  - package.json
  - src/main/main.ts
  - src/renderer/pages/MainPanel.tsx
  - src/renderer/pages/NoteWindow.tsx
  - src/renderer/pages/CalendarWindow.tsx
---

## Description

基于已有的 Linux GUI 测试方案，进一步把 `desktop-assistant` 的 Playwright Electron 自动化测试需求拆成可执行的开发任务，供后续 ULW 定时任务逐个实现。

本任务目标不是一次性把全部 E2E 测试写完，而是先产出一版**可落地的任务拆解和实施边界**，把原本大量依赖人工的验证项尽可能转成稳定、可重复的自动化回归。

### 需要完成的内容

#### A. 明确自动化边界
- 梳理 `TASK-13` 中哪些检查项适合 Playwright Electron 自动化
- 明确哪些能力仍保留人工或半自动验收：
  - OCR 首次下载与真实权限链路
  - Wayland/X11 差异
  - 安装包真实安装体验
  - 自动更新真实联网下载

#### B. 产出可执行任务列表
- 将 Playwright 相关工作拆成若干个叶子任务（每个任务控制在 1 次 ULW run 可完成范围内）
- 每个叶子任务需包含：
  - 目标范围
  - 涉及文件
  - 验收标准
  - 与 `TASK-13` 的关系

建议至少覆盖以下方向：
- E2E 测试基线（Playwright + Electron 启动方式 + 脚本入口）
- 稳定选择器（`data-testid`）补齐
- 测试环境变量与测试数据目录隔离
- Note 主流程回归
- Calendar 主流程回归
- Trash 主流程回归
- 多窗口与设置持久化回归
- OCR mock 回归

#### C. 回写 backlog / 文档
- 将拆解结果写入 backlog（新增任务文件）
- 如有必要，更新 `backlog/docs/linux-gui-test-plan.md`，让文档与 backlog 一致
- 更新 `TASK-13`，明确其后续会消费哪些自动化产物

### 结果要求
- 让 ULW 定时任务后续可以直接从 backlog 领取这些 Playwright 相关叶子任务
- 降低 `TASK-13` 对纯人工桌面回归的依赖范围
- 不直接推进发版；优先把测试策略拆清楚

## Acceptance Criteria
- [ ] #1 明确 `TASK-13` 中自动化 vs 手动验收边界
- [ ] #2 新增一组可执行的 Playwright 叶子任务，粒度适合 ULW 定时任务领取
- [ ] #3 backlog / 文档中的任务顺序与依赖关系已更新
- [ ] #4 后续定时任务可直接从 backlog 接续处理 Playwright 自动化工作
