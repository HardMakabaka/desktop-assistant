---
id: TASK-12
title: CI/CD 迁移：Tauri2 构建与产物发布
status: To Do
assignee: []
created_date: '2026-03-03 11:40'
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
- [ ] #1 PR/push CI 跑类型检查+前端构建+tauri build smoke
- [ ] #2 tag 发布产出 deb/rpm 与 Windows exe 安装包
- [ ] #3 失败日志可定位 Rust/toolchain/系统依赖问题
<!-- AC:END -->
