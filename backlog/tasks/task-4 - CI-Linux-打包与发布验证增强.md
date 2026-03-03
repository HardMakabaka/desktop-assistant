---
id: TASK-4
title: 'CI: Linux 打包与发布验证增强'
status: Done
assignee: []
created_date: '2026-03-03 11:03'
updated_date: '2026-03-03 11:12'
labels:
  - ci
  - linux
  - release
dependencies: []
references:
  - .github/workflows/ci.yml
  - .github/workflows/release.yml
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
增强 GitHub Actions，确保 Ubuntu 上 deb/rpm 打包稳定，发布流程可追踪。
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 CI 在 push/PR 时执行 Linux deb/rpm 打包检查
- [x] #2 release tag 流程发布 Windows 与 Linux 产物
- [x] #3 失败时日志可定位依赖缺失或构建错误
<!-- AC:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
已新增 CI 工作流做 Ubuntu/Windows verify 与 Linux 打包检查，release workflow 同时发布 Windows/Linux 产物。
<!-- SECTION:FINAL_SUMMARY:END -->
