---
id: TASK-11
title: 便签界面去除"移入垃圾桶"按钮
status: Done
assignee: []
created_date: '2026-03-06 18:56'
updated_date: '2026-03-06 18:56'
labels:
  - note
  - ux
  - cleanup
priority: medium
dependencies:
  - TASK-7
references:
  - src/renderer/pages/NoteWindow.tsx
---

## Description

用户反馈便签编辑界面上的"移入垃圾桶"按钮不需要，要求移除。

### 需要做的改动

#### A. 移除按钮
- 移除 NoteWindow.tsx 中的"移入垃圾桶"按钮（当前位于便签头部工具栏，约 L754-756）
- 移除对应的 `title="移入垃圾桶"` 按钮 UI

#### B. 保留快捷键（可选）
- 快捷键 `Mod+Shift+Backspace` → moveToTrash 是否保留？建议保留，方便键盘操作用户
- 如保留快捷键，快捷键设置面板中仍显示该项
- 如用户也要求移除快捷键，则一并清理

#### C. 保留主面板入口
- 主面板（MainPanel.tsx）中的删除/移入垃圾桶能力不受影响
- 便签仅通过主面板或快捷键才能移入垃圾桶

#### D. 清理
- 移除按钮相关的 aria-label、title、onClick handler（如不再被其他地方引用）
- 确保移除后工具栏布局不错乱

## Acceptance Criteria
- [ ] #1 便签编辑界面不再显示"移入垃圾桶"按钮
- [ ] #2 主面板的垃圾桶功能不受影响
- [ ] #3 快捷键能力保留（除非用户另行要求移除）
- [ ] #4 工具栏布局正常，无空白或错位
