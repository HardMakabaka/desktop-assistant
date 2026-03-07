---
id: TASK-14
title: 自动发版（tag + GitHub Release）
status: To Do
assignee: []
created_date: '2026-03-06 18:56'
updated_date: '2026-03-06 18:56'
labels:
  - release
  - ci
  - deployment
priority: high
dependencies:
  - TASK-13
references:
  - package.json
  - .github/workflows/release.yml
---

## Description

所有功能开发和测试完成后，执行自动发版流程。

### 发版流程

#### A. 版本号
- 当前版本：`1.0.4`（package.json）
- 本次发版建议版本：`1.1.0`（新功能较多，minor bump）
- 更新 `package.json` version 字段

#### B. CHANGELOG / Release Notes
- 生成本次版本的变更日志，覆盖：
  - ✨ OCR 截图体验优化（下载提示、错误友好化）
  - ✨ Markdown 所见即所得编辑器 + 字号调节
  - ✨ 日历/便签背景颜色与透明度调节
  - 🔧 便签界面去除"移入垃圾桶"按钮
  - 📝 补充 Mermaid 架构图
  - 🧪 Linux + Windows 全面测试通过
- 格式：Keep a Changelog 或 GitHub Release 标准格式

#### C. 打 tag 触发 Release
- 提交所有变更到 main 分支
- 打 tag：`git tag v1.1.0`
- 推送 tag：`git push origin v1.1.0`
- GitHub Actions `release.yml` 自动触发，构建并发布：
  - Windows: `.exe` 安装包
  - Linux: `.deb` 安装包

#### D. 验证发布
- 检查 GitHub Release 页面是否正确创建
- 确认安装包已上传
- 确认 Release Notes 正确

### 注意事项
- 发版前确保 main 分支 CI 全绿
- 发版前确保 TASK-13（测试）已全部通过
- 如 CI 构建失败，需修复后重新打 tag

## Acceptance Criteria
- [ ] #1 package.json version 已更新
- [ ] #2 CHANGELOG / Release Notes 已生成
- [ ] #3 Git tag 已推送
- [ ] #4 GitHub Actions Release workflow 成功完成
- [ ] #5 GitHub Release 页面包含 Windows + Linux 安装包
- [ ] #6 Release Notes 内容完整准确
