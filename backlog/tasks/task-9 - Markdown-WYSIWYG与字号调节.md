---
id: TASK-9
title: Markdown 所见即所得（WYSIWYG）+ 整体字号调节
status: To Do
assignee: []
created_date: '2026-03-06 18:56'
updated_date: '2026-03-06 18:56'
labels:
  - markdown
  - editor
  - ux
priority: high
dependencies:
  - TASK-7
references:
  - src/renderer/pages/NoteWindow.tsx
---

## Description

当前 Markdown 实现为"源码 + 预览"双模式切换（或左右分屏），用户反馈：
- **不需要左右分屏**
- **要求所见即所得（WYSIWYG）**：编辑区直接显示渲染效果，输入即看到格式化结果
- **要求可调节整体字号**

### 需要做的改动

#### A. WYSIWYG 编辑器
- 替换当前的 textarea + 预览 HTML 方案
- 改为单一编辑面，**输入时直接渲染 Markdown 格式**
- 推荐方案（按优先级）：
  1. 基于 contentEditable + 自定义渲染（轻量，但实现复杂度高）
  2. 引入轻量 WYSIWYG 库（如 Milkdown、Tiptap、ByteMD 等 —— 需评估包大小和 Electron 兼容性）
- 保留"源码模式"切换能力：用户可以切换到纯文本编辑 Markdown 源码
- 切换时内容无损

#### B. 整体字号调节
- 提供字号调节控件（滑块或 +/- 按钮）
- 最小 12px，最大 24px，默认 14px（可按当前设计调整）
- 字号设置**持久化**：重启后保持
- 字号调节影响整个编辑区（标题、正文、列表、代码块等统一缩放）

#### C. 去除分屏
- 移除任何左右分屏或上下分屏的 UI
- 只保留单一编辑面板

## Technical Notes
- 当前 `renderMarkdownToSafeHtml()` 函数（NoteWindow.tsx L21-L85）为手写简易 Markdown 渲染器
- 如果引入 WYSIWYG 库，需评估是否保留该函数（源码预览模式可能仍需要）
- 字号可以存储在 `electron-store` 或 `localStorage`

## Acceptance Criteria
- [ ] #1 Markdown 编辑区为所见即所得，输入即显示渲染效果
- [ ] #2 无左右/上下分屏布局
- [ ] #3 保留"源码模式"切换，切换无损
- [ ] #4 可调节整体字号，范围合理
- [ ] #5 字号设置持久化
- [ ] #6 不影响现有便签内容保存/读取逻辑
