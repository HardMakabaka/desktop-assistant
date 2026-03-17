# desktop-assistant Linux GUI 测试方案

## 目标

为 `desktop-assistant` 建立一套可在 Linux 服务器上运行、可逐步扩展到 Windows 的桌面 GUI 测试方案。

这套方案分为三层：

1. **主回归层**：`Playwright Electron` 做稳定、可重复的自动化回归
2. **桌面冒烟层**：`Xvfb` + 辅助桌面控制工具做真实窗口级 smoke test
3. **人工验收层**：OCR、系统权限、Wayland/X11 差异等高波动能力保留人工或半自动验证

## 为什么不只靠 GUI skill

`desktop-assistant` 是 Electron 应用，不是传统原生 GTK/Qt 应用。

对于这类项目：

- 最稳的方案不是纯鼠标坐标点击
- 最稳的方案是直接启动 Electron 并拿到窗口句柄、DOM、IPC 可见状态
- 因此 **主测试框架应该是 `Playwright Electron`**
- `linux-desktop` / `guicountrol` 更适合做补充性的真实桌面 smoke test，而不是主回归框架

## 推荐技术栈

### A. 主自动化框架

- `@playwright/test`
- Playwright Electron API（`_electron.launch()`）
- Linux 无 GUI 环境下使用 `xvfb-run`

用途：

- 主面板启动
- 新建便签
- 多窗口打开
- 日历窗口打开
- 编辑与保存
- 垃圾桶恢复/删除
- 字号 / 颜色 / 透明度等设置持久化
- 基础快捷键回归
- 界面交互与滚动回归

### B. 桌面控制补充层

- `guicountrol`：优先，用可访问性树 + 窗口管理
- `linux-desktop`：兜底，用截图、鼠标键盘、窗口控制

用途：

- 验证真实桌面窗口是否出现
- 验证透明窗口、置顶、焦点切换
- 验证 Electron 在 X11 下的真实表现
- 补充 Playwright Electron 不方便覆盖的窗口级现象

### C. 不建议作为主方案的工具

- 纯 `xdotool` 坐标脚本：太脆
- 纯视觉点击：维护成本高
- 纯浏览器自动化：只能覆盖渲染层网页，不适合整个 Electron 多窗口应用

## Linux 服务器运行环境

建议统一准备一套测试运行时：

```bash
sudo apt-get update
sudo apt-get install -y xvfb openbox xdotool wmctrl scrot dbus-x11
```

推荐运行模型：

```bash
dbus-run-session -- xvfb-run -a --server-args="-screen 0 1920x1080x24" openbox-session
```

实际测试命令通常包装为：

```bash
dbus-run-session -- xvfb-run -a --server-args="-screen 0 1920x1080x24" npm run test:e2e:linux
```

## 测试分层

### 第 0 层：现有构建验证

保留当前流程：

- `npm run typecheck`
- `npm run build`
- `npm run pack:linux`
- Windows runner 上 `npm run pack`

这是最快的故障拦截层。

### 第 1 层：可提取逻辑的单元测试

建议优先把以下逻辑从 React 组件中抽到独立模块，然后写单元测试：

- 便签快捷键解析 / 冲突校验
- 字号持久化边界处理
- Markdown 轻量渲染辅助函数
- OCR 错误消息映射
- Store 层便签 / 垃圾桶 / 日历 mark 的数据变换

这样可以减少 GUI 测试对细碎逻辑的覆盖压力。

### 第 2 层：Playwright Electron GUI 回归

#### 目标覆盖范围

1. **应用启动**
   - 能启动主面板
   - preload bridge 存在
   - 主窗口标题正确

2. **便签主流程**
   - 新建便签
   - 输入文本
   - 关闭窗口
   - 重启应用后内容仍在

3. **垃圾桶主流程**
   - 从主面板移入垃圾桶
   - 在垃圾桶恢复
   - 永久删除

4. **日历主流程**
   - 打开日历窗口
   - 对日期打标
   - 重启后标记仍在

5. **多窗口**
   - 同时打开多个便签窗口
   - 主面板 + 便签 + 日历可以并存

6. **快捷键与设置**
   - Tab / Shift+Tab 缩进
   - 自定义快捷键保存与恢复默认
   - 字号、背景色、透明度持久化

#### 界面测试规范（新增）

界面测试不只检查“功能能不能走通”，还要检查“界面交互有没有被窗口行为吞掉”。

1. **可见性与布局**
   - 主面板、便签窗口、日历窗口的关键控件可见
   - 文本、按钮、列表、弹层没有明显裁切或重叠
   - 小尺寸窗口下仍能完成主流程

2. **交互命中区**
   - `no-drag` 区域内的按钮、输入区、弹层可正常点击
   - 无边框窗口的拖拽区不会吞掉正文编辑、滚动、按钮点击
   - 弹层打开后，关闭、保存、取消等操作命中正常

3. **滚动与溢出**
   - 长便签内容在富文本模式下可通过滚轮滚动
   - 长便签内容在源码模式下可通过滚轮滚动
   - 主面板便签列表 / 垃圾桶在内容过多时可滚动
   - 断言应直接检查滚动容器的 `scrollTop` 变化，而不只看滚动条是否出现

4. **状态反馈与层级**
   - 设置菜单、颜色面板、快捷键弹层打开后位于正确层级
   - 弹层不会被窗口裁切，也不会挡住必须操作的控件
   - 成功 / 失败提示在交互后可见且文案正确

5. **持久化后的界面一致性**
   - 重开应用后，字号、颜色、透明度、快捷键等设置不仅数据存在，界面呈现也正确
   - 便签内容重载后，编辑器仍保持可编辑、可滚动

建议补一个单独的 `ui-interactions.spec.ts`，专门放滚动、弹层、命中区、布局裁切这类 UI 回归。

#### 不放在主回归里的内容

- 真实 OCR 截图权限链路
- 第一次下载语言包
- Wayland 下 `getDisplayMedia`
- 自动更新真实联网下载

这些波动较大，建议 mock 或人工验收。

## 为自动化增加的应用改造建议

为了让测试稳定，建议后续给应用加几项 **E2E 友好改造**。

### 1. 增加稳定选择器

在关键交互元素上增加 `data-testid`：

- main panel
  - `new-note-btn`
  - `open-calendar-btn`
  - `trash-toggle-btn`
  - `note-list`
- note window
  - `note-editor`
  - `note-close-btn`
  - `note-settings-btn`
  - `pin-toggle-btn`
  - `preview-toggle-btn`
  - `font-size-plus-btn`
  - `font-size-minus-btn`
  - `ocr-open-btn`
- calendar window
  - `calendar-root`
  - `calendar-day-YYYY-MM-DD`
  - `calendar-save-btn`

### 2. 增加测试环境变量

建议支持以下环境变量：

- `DESKTOP_ASSISTANT_E2E=1`
- `DESKTOP_ASSISTANT_E2E_DATA_DIR=<path>`
- `DESKTOP_ASSISTANT_E2E_DISABLE_TRAY=1`
- `DESKTOP_ASSISTANT_E2E_DISABLE_UPDATER=1`
- `DESKTOP_ASSISTANT_E2E_MOCK_OCR=1`
- `DESKTOP_ASSISTANT_E2E_FORCE_X11_SAFE_MODE=1`

用途：

- 隔离测试数据目录，避免污染真实数据
- 关闭托盘、自动更新、外部网络副作用
- 让 OCR 走 mock 结果，稳定回归

### 3. 允许固定窗口行为

测试环境下建议：

- 关闭随机位置恢复
- 允许固定窗口坐标和尺寸
- 输出窗口创建日志

这样多窗口测试会稳定很多。

## OCR 测试策略

OCR 不建议只做一种测试。

### CI / 服务器自动化

使用 mock：

- 点击 OCR 按钮
- 打开 OCR 窗口
- 通过测试环境变量返回固定识别结果
- 验证识别结果被插回便签

### 真机 / 桌面环境验收

人工或半自动验证：

- 首次语言包下载确认
- 下载进度展示
- 屏幕权限
- 截图框选
- 真正的识别效果

原因：`getDisplayMedia`、PipeWire、Wayland、权限弹窗在 CI/Xvfb 环境里天然不稳定。

## 推荐目录结构

建议新增：

```text
tests/
  e2e/
    app-launch.spec.ts
    notes.spec.ts
    trash.spec.ts
    calendar.spec.ts
    multi-window.spec.ts
    shortcuts.spec.ts
    ui-interactions.spec.ts
  fixtures/
    notes.ts
  helpers/
    electron.ts
    selectors.ts
    test-env.ts
playwright.config.ts
```

## 推荐脚本

建议在 `package.json` 中增加：

```json
{
  "scripts": {
    "test:e2e": "playwright test",
    "test:e2e:linux": "xvfb-run -a --server-args='-screen 0 1920x1080x24' playwright test",
    "test:e2e:headed": "playwright test --headed",
    "test:gui-smoke": "bash scripts/gui-smoke-linux.sh"
  }
}
```

## 第一阶段要落地的最小用例

### Case 1: App Launch

- 启动应用
- 主窗口标题为 `桌面助手`
- 主面板加载完成

### Case 2: Create Note

- 点击新建便签
- 打开新便签窗口
- 输入 `hello desktop assistant`
- 关闭并重新打开
- 内容仍存在

### Case 3: Trash Flow

- 主面板中将便签移入垃圾桶
- 垃圾桶中恢复
- 列表中重新出现

### Case 4: Calendar Flow

- 打开日历窗口
- 选中某天写入标签
- 关闭并重开后仍存在

### Case 5: Multi-window Smoke

- 同时打开 2 个便签 + 1 个日历
- 三个窗口都可见
- 关闭其中一个不影响其余窗口

### Case 6: UI Interaction / Scroll

- 新建一张长内容便签
- 在富文本模式中触发滚轮滚动并断言 `scrollTop` 增加
- 切到源码模式后再次滚动并断言 `scrollTop` 增加
- 打开快捷键弹层或颜色面板，验证可点击、可关闭、不遮挡关键控件
- 验证按钮所在 `no-drag` 区域不会被窗口拖拽行为吞掉

## OpenClaw / Skills 在这套方案中的位置

### 主回归

不建议依赖 skill，优先直接跑项目测试框架。

### 补充 smoke / 问题定位

可以用：

- `guicountrol`
  - 查窗口
  - 查可访问性树
  - 做真实桌面级点击验证
- `linux-desktop`
  - 截图
  - 键鼠输入
  - 窗口焦点与移动验证

### Windows 侧

Linux 服务器本机不建议承担 Windows GUI 自动化。
Windows 版本建议放到：

- `windows-latest` GitHub Actions runner（适合基础回归）
- 或独立 Windows VM / 测试机（适合真实 GUI / 安装器 / OCR / 权限链路）

## 推荐推进顺序

1. 先给关键元素补 `data-testid`
2. 加 E2E 环境变量，隔离 store / updater / OCR
3. 上 Playwright Electron 最小 5 个用例
4. 在 CI 新增 Ubuntu Xvfb 电子应用 E2E 任务
5. 最后再接 `guicountrol` / `linux-desktop` 做真实桌面 smoke

## 结论

对于 `desktop-assistant`：

- **最核心的 Linux GUI 测试方案是 `Playwright Electron + Xvfb`**
- **`guicountrol` / `linux-desktop` 适合补充真实桌面层验证**
- **OCR、权限、Wayland 差异建议 mock + 人工验收双轨**

这是兼顾稳定性、维护成本和服务器环境可执行性的方案。
