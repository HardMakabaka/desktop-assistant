---
id: TASK-2
title: 'Linux: 启动项（autostart）支持'
status: Done
assignee: []
created_date: '2026-03-03 11:03'
updated_date: '2026-03-03 14:03'
labels:
  - linux
  - startup
dependencies: []
references:
  - src/main/main.ts
  - src/main/store.ts
  - src/renderer/pages/MainPanel.tsx
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
为 Linux 增加开机自启动开关，遵循 XDG Autostart 规范（~/.config/autostart/*.desktop）。
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 提供 IPC 接口读取/设置启动项状态
- [x] #2 在 Ubuntu GNOME 与 CentOS 常见桌面环境可识别 autostart desktop 文件
- [x] #3 UI 中可开关并持久化该选项
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
已实现 IPC 与主面板开机启动开关，采用 XDG autostart desktop 文件写入。
补全 desktop entry 关键字段（Exec/TryExec/Hidden/NoDisplay/Categories/X-GNOME-Autostart-enabled/X-KDE-autostart-after），并处理 Exec 路径含空格场景；README 已补充 Linux autostart 兼容性说明。
<!-- SECTION:NOTES:END -->

## Final Summary

- 完成 Linux 开机启动能力闭环：IPC + UI 开关 + XDG autostart 文件写入/删除。
- autostart 文件已按 Ubuntu GNOME / CentOS 常见桌面环境兼容要求补齐关键字段，并支持可执行路径含空格。
- 本轮已更新文档说明并通过项目 `npm run verify` 验证。
