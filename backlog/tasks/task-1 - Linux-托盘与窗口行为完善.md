---
id: TASK-1
title: 'Linux: 托盘与窗口行为完善'
status: Done
assignee: []
created_date: '2026-03-03 11:03'
updated_date: '2026-03-03 11:12'
labels:
  - linux
  - desktop
dependencies: []
references:
  - src/main/main.ts
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
优化 Linux (Ubuntu/CentOS) 下托盘交互、窗口显示与生命周期行为，确保与 Windows 行为差异可预期。
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Linux 下托盘单击可稳定打开主面板
- [x] #2 所有窗口关闭后应用保持托盘驻留，且可从托盘再次打开
- [x] #3 与 Windows 双击行为兼容，不引入回归
<!-- AC:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
已在主进程实现 Linux 托盘单击打开主面板，并保持 Windows 双击行为；窗口全关后仍可通过托盘恢复应用。
<!-- SECTION:FINAL_SUMMARY:END -->
