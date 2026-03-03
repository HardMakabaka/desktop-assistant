# desktop-assistant

桌面助手（Electron）- 提供便签与日历桌面小工具，支持 Windows 与 Linux（Ubuntu/CentOS）。

## 开发

```bash
npm ci
npm run dev
```

## 构建与打包

```bash
# 通用构建
npm run build

# Windows 安装包（nsis）
npm run pack:win

# Linux 安装包（deb + rpm）
npm run pack:linux
```

生成产物默认在 `release/` 目录。

## Linux 安装

### Ubuntu / Debian（deb）

```bash
sudo apt install ./release/桌面助手-<version>-linux-amd64.deb
```

卸载：

```bash
sudo apt remove desktop-assistant
```

### CentOS / RHEL / Fedora（rpm）

```bash
# CentOS / RHEL
sudo yum install ./release/桌面助手-<version>-linux-x86_64.rpm

# Fedora
sudo dnf install ./release/桌面助手-<version>-linux-x86_64.rpm
```

卸载：

```bash
sudo yum remove desktop-assistant
# 或
sudo dnf remove desktop-assistant
```

## Linux 更新说明

Linux 版本不使用内置 `electron-updater` 自动更新。
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