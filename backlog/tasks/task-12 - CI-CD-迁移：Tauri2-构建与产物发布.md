---
id: TASK-12
title: CI/CD 迁移：Tauri2 构建与产物发布
status: Done
assignee: []
created_date: '2026-03-03 11:40'
updated_date: '2026-03-03 17:54'
labels:
  - ci
  - release
  - tauri
dependencies: []
references:
  - .github/workflows/ci.yml
  - .github/workflows/release.yml
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
将 GitHub Actions 调整为 Tauri2 构建链路，覆盖 Linux（deb/rpm）与 Windows 发布。
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 PR/push CI 跑类型检查+前端构建+tauri build smoke
- [x] #2 tag 发布产出 deb/rpm 与 Windows exe 安装包
- [x] #3 失败日志可定位 Rust/toolchain/系统依赖问题
<!-- AC:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
已将 CI/release 工作流切换到 Tauri2 构建链路：
1) CI 在 Ubuntu/Windows 执行 typecheck、前端构建、`tauri build --bundles none` smoke；
2) Linux 打包任务与 tag release 均产出 deb/rpm，Windows release 产出 nsis exe；
3) 两个工作流均补充 Rust/toolchain/Tauri info 失败诊断步骤，便于快速定位依赖与环境问题。
<!-- SECTION:FINAL_SUMMARY:END -->
