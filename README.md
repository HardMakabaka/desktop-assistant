# desktop-assistant

一个基于 Electron + React + TypeScript 的桌面便签与日历小工具。

它的目标不是做一个“重型信息管理系统”，而是提供一套轻量、常驻、打开即用的桌面辅助能力：

- 便签管理：新建、编辑、多窗口悬浮、置顶
- Markdown 预览：纯文本与预览模式快速切换
- OCR 截图识别：框选屏幕区域，识别文字并插回当前便签
- 文本快捷键：支持缩进、快捷操作、自定义快捷键
- 垃圾桶机制：删除先进入回收站，可恢复，再选择彻底删除
- 日历标记：为日期添加标签与颜色标记
- 自动更新：基于 GitHub Release 分发安装包与更新元数据
- Linux 打包：支持生成 `.deb` 安装包

## 技术栈

- Electron 28
- React 18
- TypeScript 5
- Vite 5
- electron-store
- electron-updater
- tesseract.js
- electron-builder

## 项目定位

`desktop-assistant` 是一个典型的 Electron 多窗口桌面应用：

- 主面板负责入口和全局操作
- 每个便签是一个独立窗口
- 日历是一个独立窗口
- OCR 截图识别通过单独的全屏窗口完成
- 本地数据通过 `electron-store` 持久化
- 渲染层只能通过 `preload` 暴露的安全桥接访问主进程能力

这意味着它的架构重点不是“复杂后端”，而是：

- 多窗口协调
- 进程边界清晰
- 本地状态持久化
- 打包、发布、自动更新链路稳定

## 核心功能

### 1. 主面板

主面板是应用的入口，负责：

- 新建便签
- 打开已有便签
- 查看垃圾桶
- 打开日历
- 手动检查更新

对应文件：`src/renderer/pages/MainPanel.tsx`

### 2. 便签窗口

便签窗口是核心工作区，支持：

- 自由编辑文本
- 保存位置、尺寸、颜色、置顶状态
- Markdown 实时预览
- OCR 截图识别文字并插入
- Tab / Shift+Tab 缩进与反缩进
- 自定义快捷键
- 删除到垃圾桶

对应文件：`src/renderer/pages/NoteWindow.tsx`

### 3. OCR 截图识别

OCR 流程为：

1. 在便签窗口点击 OCR
2. 主进程打开全屏 OCR 窗口
3. 渲染层通过 `getDisplayMedia` 截图
4. 用户框选识别区域
5. `tesseract.js` 识别文字
6. 结果通过 IPC 回传到原便签窗口
7. 识别文字插入当前光标位置

对应文件：`src/renderer/pages/OcrCaptureWindow.tsx`

### 4. 日历标记

日历窗口支持对日期写入简单标签与颜色，适合记录提醒、打卡、计划节点。

对应文件：`src/renderer/pages/CalendarWindow.tsx`

### 5. 自动更新与发布

项目使用：

- `electron-updater` 处理应用内更新
- GitHub Releases 托管安装包
- `latest.yml` / `latest-linux.yml` 提供更新元数据
- Windows `.blockmap` 用于差分更新

发布工作流定义在：`/.github/workflows/release.yml`

## 架构总览

```text
+---------------------------+
| Electron Main Process     |
| src/main/main.ts          |
| - 创建主窗口/便签窗口     |
| - 创建日历窗口/OCR窗口    |
| - 注册 IPC                |
| - 调用 StoreManager       |
| - 处理自动更新            |
+-------------+-------------+
              |
              | contextBridge + ipcRenderer
              v
+---------------------------+
| Preload Bridge            |
| src/main/preload.ts       |
| - 暴露 window.desktopAPI  |
| - 限制渲染层能力边界      |
+-------------+-------------+
              |
              v
+---------------------------+
| Renderer (React)          |
| src/renderer/pages/*      |
| - MainPanel               |
| - NoteWindow              |
| - CalendarWindow          |
| - OcrCaptureWindow        |
+-------------+-------------+
              |
              v
+---------------------------+
| Local Persistence         |
| src/main/store.ts         |
| - notes                   |
| - marks                   |
| - trash state             |
+---------------------------+
```

## 分层说明

### Main Process

主进程是应用调度中心，负责：

- 管理所有 `BrowserWindow`
- 维护便签窗口映射 `noteWindows`
- 注册所有 IPC handler
- 将数据读写委托给 `StoreManager`
- 执行自动更新检查与安装
- 在 Linux 下启用 PipeWire 截图能力开关

关键文件：`src/main/main.ts`

### Preload

`preload` 是安全边界层。

它通过 `contextBridge.exposeInMainWorld()` 暴露一个有限的 `window.desktopAPI`，让渲染层可以调用：

- 便签 CRUD
- 回收站恢复/彻底删除
- 日历标记读写
- 窗口打开、关闭、置顶
- OCR 打开与结果监听
- 更新检查

关键文件：`src/main/preload.ts`

### Renderer

渲染层使用 React，按窗口拆分 entry：

- `src/renderer/main.tsx` -> 主面板
- `src/renderer/note-entry.tsx` -> 便签窗口
- `src/renderer/calendar-entry.tsx` -> 日历窗口
- `src/renderer/ocr-entry.tsx` -> OCR 窗口

对应 HTML 入口：

- `src/renderer/index.html`
- `src/renderer/note.html`
- `src/renderer/calendar.html`
- `src/renderer/ocr.html`

Vite 在 `vite.config.ts` 中把这些页面配置为多入口构建。

### Shared Types

主进程与渲染进程共享的数据结构、IPC 常量集中放在：

- `src/shared/types.ts`

这样可以减少 IPC 字符串散落和类型不一致的问题。

### Store Layer

项目没有引入数据库，而是使用 `electron-store` 做本地持久化。

当前主要保存两类数据：

- `notes`: 便签数据
- `marks`: 日历标记

其中便签采用软删除设计：

- 正常便签：`trashedAt = null`
- 垃圾桶便签：`trashedAt = timestamp`

关键文件：`src/main/store.ts`

## 关键数据流

### 新建便签

```text
MainPanel -> window.desktopAPI.createNote()
          -> IPC
          -> main.ts
          -> StoreManager.createNote()
          -> createNoteWindow(note)
```

### 保存便签

```text
NoteWindow -> debounce save
           -> window.desktopAPI.saveNote()
           -> IPC
           -> StoreManager.updateNote()
```

### OCR 识别

```text
NoteWindow click OCR
  -> openOcrCapture(noteId)
  -> main.ts createOcrWindow(noteId)
  -> OcrCaptureWindow screenshot + select region
  -> tesseract.js recognize
  -> sendOcrResult(payload)
  -> main.ts forward to target note window
  -> NoteWindow insert recognized text
```

### 自动更新

```text
Renderer request check
  -> window.desktopAPI.checkForUpdates()
  -> main.ts
  -> electron-updater
  -> GitHub Releases metadata/assets
```

## 目录结构

```text
desktop-assistant/
├── .github/workflows/
│   ├── ci.yml
│   └── release.yml
├── resources/
│   └── icon.ico
├── scripts/
│   ├── auto-commit.mjs
│   └── dev.mjs
├── src/
│   ├── main/
│   │   ├── main.ts
│   │   ├── preload.ts
│   │   └── store.ts
│   ├── renderer/
│   │   ├── pages/
│   │   │   ├── MainPanel.tsx
│   │   │   ├── NoteWindow.tsx
│   │   │   ├── CalendarWindow.tsx
│   │   │   └── OcrCaptureWindow.tsx
│   │   ├── index.html
│   │   ├── note.html
│   │   ├── calendar.html
│   │   ├── ocr.html
│   │   └── *.entry.tsx
│   └── shared/
│       └── types.ts
├── backlog/
├── package.json
├── tsconfig.json
├── tsconfig.main.json
└── vite.config.ts
```

## 本地开发

### 1. 安装依赖

```bash
npm install
```

### 2. 启动开发环境

```bash
npm run dev
```

这个命令会同时完成：

- 主进程 TypeScript watch 编译
- Vite renderer dev server 启动
- 等待依赖准备完成后启动 Electron

相关脚本：`scripts/dev.mjs`

### 3. 类型检查与构建

```bash
npm run verify
```

当前 `verify` 等价于：

```bash
npm run test
npm run typecheck
npm run build
```

### 4. 生产打包

Windows:

```bash
npm run pack
```

Linux (deb):

```bash
npm run pack:linux
```

## CI / Release

### CI

`/.github/workflows/ci.yml` 负责：

- `npm ci`
- `npm run verify`
- `npm run pack:linux`

用于保证 PR 与分支改动至少通过基础构建和 Linux 打包验证。

### Release

`/.github/workflows/release.yml` 在推送 `v*` tag 时触发：

- Windows 安装包构建并发布
- Linux `.deb` 构建并发布
- 上传安装包、更新元数据、blockmap

## 为什么这样设计

这个项目选择的是“Electron 原生多窗口 + 本地存储”的架构，而不是引入远程后端，原因很直接：

- 功能以桌面交互为主，不需要服务端协同
- 便签、日历、OCR 都更适合本地即时响应
- 本地持久化足够满足当前需求，工程复杂度更低
- 多窗口拆分让不同场景边界更清晰，便于后续继续扩展

## 后续可扩展方向

- Markdown 渲染器替换为更完整的解析方案
- OCR 模型与语言包本地化，减少对 CDN 的依赖
- 便签分组、搜索、标签系统
- 日历提醒与系统通知联动
- 自动更新通道区分 stable / beta
- 更完善的跨平台窗口行为适配

## 许可证

当前仓库未单独声明 LICENSE 文件；如需开源发布，建议补充许可证说明。
