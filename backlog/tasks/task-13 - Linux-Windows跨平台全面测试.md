---
id: TASK-13
title: Linux + Windows 跨平台全面测试
status: In Progress
assignee: []
created_date: '2026-03-06 18:56'
updated_date: '2026-03-07 22:30'
labels:
  - testing
  - linux
  - windows
  - qa
priority: high
dependencies:
  - TASK-8
  - TASK-9
  - TASK-10
  - TASK-11
  - TASK-12
references:
  - package.json
  - .github/workflows/ci.yml
  - .github/workflows/release.yml
---

## Description

所有功能改动完成后，在 Linux 和 Windows 上进行最大可能的测试验证。

### 测试范围

#### A. 构建验证
- [ ] `npm run typecheck` 通过（零错误）
- [ ] `npm run build` 成功
- [ ] `npm run pack` (Windows) 产出 `.exe` 安装包
- [ ] `npm run pack:linux` (Linux) 产出 `.deb` 安装包
- [ ] CI（GitHub Actions）在 ubuntu-latest 和 windows-latest 上通过

#### B. 功能测试 — 便签核心
- [ ] 新建便签、编辑、保存
- [ ] Markdown WYSIWYG 模式：输入即见渲染效果
- [ ] 源码模式切换：切换无内容损失
- [ ] 字号调节：调大调小、持久化
- [ ] 背景颜色选择、透明度调节
- [ ] 快捷键（Tab 缩进、自定义快捷键、恢复默认）

#### C. 功能测试 — OCR
- [ ] 首次使用弹出下载确认
- [ ] 下载进度显示
- [ ] 截图框选 + 识别成功
- [ ] 已缓存时跳过下载
- [ ] 错误场景（不支持、权限拒绝、网络断开）提示友好

#### D. 功能测试 — 日历
- [ ] 日历窗口打开/关闭
- [ ] 背景颜色 + 透明度调节
- [ ] 事件管理基本流程

#### E. 功能测试 — 垃圾桶
- [ ] 便签界面无"移入垃圾桶"按钮
- [ ] 主面板可移入垃圾桶
- [ ] 垃圾桶恢复 / 彻底删除

#### F. 功能测试 — 多窗口
- [ ] 同时打开多个便签窗口
- [ ] 便签 + 日历 + OCR 同时运行
- [ ] 窗口关闭后资源释放正常

#### G. 平台差异验证
- [ ] Windows：截图 API、快捷键 Ctrl 映射、打包安装
- [ ] Linux (Ubuntu)：Wayland/X11 截图、快捷键、deb 安装
- [ ] 透明度在两个平台上的渲染效果

### 测试方法
- 自动化：`npm run verify`（typecheck + build）
- 手动：启动应用逐项验证上述功能点
- CI：确保 GitHub Actions 全绿

### 输出
- 测试报告（markdown），记录每项测试的通过/失败状态
- 发现的问题记录为 bug 并修复后重测

## Progress

- 测试报告已创建：`backlog/docs/TASK-13-test-report.md`
- CI 已补齐 Windows 覆盖：`.github/workflows/ci.yml`（`ubuntu-latest` + `windows-latest`）
- CI 已验证通过（ubuntu-latest + windows-latest）：https://github.com/HardMakabaka/desktop-assistant/actions/runs/22806546617

## Acceptance Criteria
- [ ] #1 Windows 上所有功能点通过测试
- [ ] #2 Linux 上所有功能点通过测试（或有明确降级说明）
- [ ] #3 CI 全绿
- [ ] #4 输出测试报告
- [ ] #5 所有发现的 bug 已修复并回归通过
