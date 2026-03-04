# desktop-assistant

桌面助手（Tauri2）- 提供便签与日历桌面小工具，支持 Windows 与 Linux（Ubuntu/CentOS）。

## 开发环境

### 1) 前置依赖

- Node.js 20+
- Rust stable（`rustup default stable`）
- Tauri2 运行依赖（Linux 需安装 WebKitGTK 等系统库，建议按 Tauri 官方文档初始化）

### 2) 本地开发

```bash
npm ci
npm run dev
```

`npm run dev` 会启动 `tauri dev`（Vite renderer + Tauri shell）。

## 构建与打包

```bash
# 构建 renderer（用于 CI 校验）
npm run build

# Windows 安装包（nsis）
npm run pack:win

# Linux 安装包（deb + rpm）
npm run pack:linux
```

生成产物默认在 `src-tauri/target/release/bundle/` 目录。

## OCR 与截图依赖说明

- OCR 由前端 `tesseract.js` 提供（语言包：`chi_sim+eng`）。
- 首次 OCR 可能需要联网下载语言数据，后续会复用本地缓存。
- 截图依赖浏览器屏幕捕获 API（`getDisplayMedia`）：
  - Windows/Linux 均可用；
  - 需要系统授予屏幕捕获权限；
  - Wayland 桌面建议确保 `xdg-desktop-portal` 与 PipeWire 可用。

## Markdown 双模式与删除流程

### Markdown 双模式

- **预览模式（默认）**：上半部分编辑 Markdown 源文，下半部分实时渲染预览。
- **源码模式**：单栏纯文本编辑，适合快速批量修改。
- 头部切换按钮可在「预览/源码」之间即时切换。

### 删除流程（垃圾桶）

- 便签窗口仅提供「移入垃圾桶」，不直接永久删除。
- 主面板垃圾桶支持「恢复」与「永久删除」。
- 永久删除包含二次确认，避免误删。

## Linux 安装

### Ubuntu / Debian（deb）

```bash
sudo apt install ./src-tauri/target/release/bundle/deb/桌面助手_<version>_amd64.deb
```

卸载：

```bash
sudo apt remove desktop-assistant
```

### CentOS / RHEL / Fedora（rpm）

```bash
# CentOS / RHEL
sudo yum install ./src-tauri/target/release/bundle/rpm/桌面助手-<version>-1.x86_64.rpm

# Fedora
sudo dnf install ./src-tauri/target/release/bundle/rpm/桌面助手-<version>-1.x86_64.rpm
```

卸载：

```bash
sudo yum remove desktop-assistant
# 或
sudo dnf remove desktop-assistant
```

## Linux 更新说明

Linux 版本不使用内置自动更新。
请使用系统包管理器更新：

```bash
# Debian/Ubuntu
sudo apt update && sudo apt install desktop-assistant

# RHEL/CentOS/Fedora
sudo yum update desktop-assistant
# 或
sudo dnf upgrade desktop-assistant
```

## 开机启动（Linux）

应用设置菜单支持“开机启动”开关：

- 开启后会写入 `~/.config/autostart/desktop-assistant.desktop`
- 关闭后会删除该文件
- 生成的 desktop entry 包含 `Exec/TryExec/X-GNOME-Autostart-enabled/X-KDE-autostart-after`，兼容 Ubuntu GNOME 与 CentOS 常见桌面环境的 Autostart 识别

> 该开关在 Linux 打包版中可用（开发模式下不启用）

## 常见问题

### 1) Linux 托盘图标不显示

- 请确认当前桌面环境启用了系统托盘扩展（如 GNOME 可能需要 AppIndicator 扩展）
- 可尝试重启会话后再打开应用

### 2) rpm 打包失败：`rpmbuild is required`

请先安装 rpm 构建工具：

```bash
sudo apt-get update
sudo apt-get install -y rpm
```

### 3) 更新按钮在 Linux 下不执行在线升级

这是预期行为。Linux 版本统一使用发行版包管理器更新。