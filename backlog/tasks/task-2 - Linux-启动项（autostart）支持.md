---
id: TASK-2
title: 'Linux: 启动项（autostart）支持'
status: In Progress
assignee: []
created_date: '2026-03-03 11:03'
updated_date: '2026-03-03 11:12'
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
- [ ] #2 在 Ubuntu GNOME 与 CentOS 常见桌面环境可识别 autostart desktop 文件
- [x] #3 UI 中可开关并持久化该选项
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
已实现 IPC 与主面板开机启动开关，采用 XDG autostart desktop 文件写入。待补 README 说明与跨桌面环境实机验证记录。
<!-- SECTION:NOTES:END -->
