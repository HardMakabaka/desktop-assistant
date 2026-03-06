---
id: TASK-10
title: 日历/便签背景颜色与透明度调节
status: Done
assignee: []
created_date: '2026-03-06 18:56'
updated_date: '2026-03-06 18:56'
labels:
  - theme
  - calendar
  - note
  - ux
priority: high
dependencies:
  - TASK-7
references:
  - src/renderer/pages/NoteWindow.tsx
  - src/renderer/pages/CalendarWindow.tsx
  - src/main/store.ts
  - src/shared/types.ts
---

## Description

用户要求日历窗口和便签窗口都能自定义背景颜色和透明度。

### 需要做的改动

#### A. 背景颜色选择
- 提供颜色选取器（Color Picker）或预设颜色板
- 预设颜色建议：白色、浅黄、浅蓝、浅绿、浅粉、浅紫、深灰、自定义
- 自定义颜色支持 HEX 输入
- 日历和便签各自独立设置

#### B. 透明度调节
- 提供滑块控件调节窗口透明度
- 范围：20% ~ 100%（完全不透明），步长 5%
- 实现方式：Electron `BrowserWindow.setOpacity()` 或 CSS `background: rgba()`
- 需注意：窗口级透明（setOpacity）会影响整个窗口包括文字；CSS 背景透明只影响背景
- 推荐：使用 **CSS 背景透明**，保持文字清晰可读

#### C. 便签独立设置
- 每张便签可以有自己的背景颜色
- 透明度可以全局统一，也可以按便签独立（需评估 UX 复杂度，建议先做全局）

#### D. 持久化
- 颜色和透明度设置存储到 `electron-store`
- 便签颜色存到 `StickyNote` 数据结构
- 日历颜色存到全局设置
- 重启后保持

#### E. 设置入口
- 便签：可在便签头部工具栏增加"🎨"调色按钮
- 日历：可在日历窗口增加设置按钮或右键菜单

## Acceptance Criteria
- [ ] #1 便签可选择背景颜色（预设 + 自定义）
- [ ] #2 日历可选择背景颜色（预设 + 自定义）
- [ ] #3 可调节背景透明度，文字保持清晰可读
- [ ] #4 设置持久化，重启后保持
- [ ] #5 不同便签可设置不同颜色
- [ ] #6 UI 控件不遮挡主要内容区域
