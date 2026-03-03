import { app, BrowserWindow, ipcMain, Tray, Menu, nativeImage, dialog, NativeImage } from 'electron';
import * as path from 'path';
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'fs';
import { pathToFileURL } from 'url';
import { autoUpdater } from 'electron-updater';
import { StoreManager } from './store';
import { IPC_CHANNELS, StickyNote, CalendarMark, UpdateCheckResponse, CalendarAppearance, StartupLaunchStatus } from '../shared/types';

const devServerURL = process.env.DESKTOP_ASSISTANT_DEV_URL || process.env.VITE_DEV_SERVER_URL;
const isDev = Boolean(devServerURL);
const store = new StoreManager();

let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
const noteWindows = new Map<string, BrowserWindow>();
let calendarWindow: BrowserWindow | null = null;
let cachedPreloadPath: string | null = null;
let updateDownloaded = false;

function createTrayIcon(): NativeImage {
  const iconSVG = `
    <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64">
      <defs>
        <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#4f8cff" />
          <stop offset="100%" stop-color="#6f6cff" />
        </linearGradient>
      </defs>
      <rect x="4" y="4" width="56" height="56" rx="16" fill="url(#bg)" />
      <rect x="19" y="18" width="26" height="28" rx="5" fill="#ffffff" opacity="0.95" />
      <line x1="23" y1="28" x2="41" y2="28" stroke="#4f8cff" stroke-width="3" stroke-linecap="round" />
      <line x1="23" y1="34" x2="37" y2="34" stroke="#4f8cff" stroke-width="3" stroke-linecap="round" />
      <line x1="23" y1="40" x2="35" y2="40" stroke="#4f8cff" stroke-width="3" stroke-linecap="round" />
    </svg>
  `;

  const dataURL = `data:image/svg+xml;base64,${Buffer.from(iconSVG).toString('base64')}`;
  const icon = nativeImage.createFromDataURL(dataURL);

  const traySize = process.platform === 'linux' ? 22 : 16;
  return icon.resize({ width: traySize, height: traySize });
}

const AUTOSTART_FILE_NAME = 'desktop-assistant.desktop';

function isLinuxStartupSupported(): boolean {
  return process.platform === 'linux' && app.isPackaged;
}

function getLinuxAutostartFilePath(): string {
  const configHome = process.env.XDG_CONFIG_HOME || path.join(app.getPath('home'), '.config');
  return path.join(configHome, 'autostart', AUTOSTART_FILE_NAME);
}

function getLinuxAutostartEntryContent(): string {
  return [
    '[Desktop Entry]',
    'Type=Application',
    'Version=1.0',
    'Name=桌面助手',
    'Comment=Desktop sticky notes and calendar widget',
    `Exec=${process.execPath}`,
    'Icon=desktop-assistant',
    'Terminal=false',
    'StartupNotify=false',
    'X-GNOME-Autostart-enabled=true',
  ].join('\n');
}

function getStartupLaunchStatus(): StartupLaunchStatus {
  if (!isLinuxStartupSupported()) {
    return { supported: false, enabled: false };
  }

  return {
    supported: true,
    enabled: existsSync(getLinuxAutostartFilePath()),
  };
}

function setStartupLaunchEnabled(enabled: boolean): StartupLaunchStatus {
  if (!isLinuxStartupSupported()) {
    return { supported: false, enabled: false };
  }

  const filePath = getLinuxAutostartFilePath();

  if (enabled) {
    mkdirSync(path.dirname(filePath), { recursive: true });
    writeFileSync(filePath, `${getLinuxAutostartEntryContent()}\n`, 'utf8');
  } else if (existsSync(filePath)) {
    rmSync(filePath, { force: true });
  }

  return getStartupLaunchStatus();
}

function getRendererURL(page: string): string {
  if (devServerURL) {
    const normalizedBase = devServerURL.endsWith('/') ? devServerURL.slice(0, -1) : devServerURL;
    return `${normalizedBase}/${page}.html`;
  }
  return pathToFileURL(path.join(__dirname, '../../renderer', `${page}.html`)).href;
}

function getPreloadPath(): string {
  if (cachedPreloadPath && existsSync(cachedPreloadPath)) {
    return cachedPreloadPath;
  }

  const candidates = [
    path.join(__dirname, 'preload.js'),
    path.join(__dirname, '../preload.js'),
    path.join(process.cwd(), 'dist/main/main/preload.js'),
    path.join(process.cwd(), 'dist/main/preload.js'),
  ];

  const resolved = candidates.find(candidate => existsSync(candidate));
  if (resolved) {
    cachedPreloadPath = resolved;
    return resolved;
  }

  console.error('[preload] preload script not found', {
    dirname: __dirname,
    cwd: process.cwd(),
    candidates,
  });

  return candidates[0];
}

function verifyBridge(win: BrowserWindow, windowName: string): void {
  win.webContents.once('did-finish-load', async () => {
    try {
      const hasBridge = await win.webContents.executeJavaScript(
        'typeof window !== "undefined" && typeof window.desktopAPI !== "undefined"',
        true,
      );

      if (!hasBridge) {
        console.error(`[${windowName}] desktopAPI bridge missing`, {
          url: win.webContents.getURL(),
          preload: getPreloadPath(),
        });
      }
    } catch (error) {
      console.error(`[${windowName}] bridge verification failed`, error);
    }
  });
}

function createMainWindow(): void {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.show();
    mainWindow.focus();
    return;
  }

  mainWindow = new BrowserWindow({
    width: 480,
    height: 600,
    resizable: false,
    frame: false,
    transparent: false,
    backgroundColor: '#f5f5f5',
    webPreferences: {
      preload: getPreloadPath(),
      contextIsolation: true,
      nodeIntegration: false,
    },
    title: '桌面助手',
  });

  mainWindow.loadURL(getRendererURL('index'));
  verifyBridge(mainWindow, 'main-window');

  mainWindow.webContents.on('did-fail-load', (_event, errorCode, errorDescription, validatedURL) => {
    console.error('[main-window] load failed', { errorCode, errorDescription, validatedURL });
  });

  if (isDev) mainWindow.webContents.openDevTools({ mode: 'detach' });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function createNoteWindow(note: StickyNote): void {
  if (noteWindows.has(note.id)) {
    const existing = noteWindows.get(note.id)!;
    if (!existing.isDestroyed()) {
      existing.show();
      existing.focus();
      return;
    }
  }

  const win = new BrowserWindow({
    width: note.width || 260,
    height: note.height || 280,
    x: note.x || undefined,
    y: note.y || undefined,
    frame: false,
    transparent: true,
    alwaysOnTop: note.pinned,
    skipTaskbar: true,
    resizable: true,
    show: false,
    minimizable: false,
    webPreferences: {
      preload: getPreloadPath(),
      contextIsolation: true,
      nodeIntegration: false,
    },
    title: '便签',
  });

  const noteURL = new URL(getRendererURL('note'));
  noteURL.searchParams.set('id', note.id);
  win.loadURL(noteURL.toString());
  verifyBridge(win, 'note-window');

  win.once('ready-to-show', () => {
    if (win.isDestroyed()) return;
    win.show();
    win.focus();
  });

  win.webContents.on('did-fail-load', (_event, errorCode, errorDescription, validatedURL) => {
    console.error('[note-window] load failed', { errorCode, errorDescription, validatedURL });
  });

  win.on('moved', () => {
    if (win.isDestroyed()) return;
    const [x, y] = win.getPosition();
    store.updateNote(note.id, { x, y });
  });

  win.on('resized', () => {
    if (win.isDestroyed()) return;
    const [width, height] = win.getSize();
    store.updateNote(note.id, { width, height });
  });

  win.on('closed', () => {
    noteWindows.delete(note.id);
  });

  noteWindows.set(note.id, win);
}

function createCalendarWindow(): void {
  if (calendarWindow && !calendarWindow.isDestroyed()) {
    calendarWindow.show();
    calendarWindow.focus();
    return;
  }

  calendarWindow = new BrowserWindow({
    width: 360,
    height: 420,
    frame: false,
    transparent: true,
    alwaysOnTop: false,
    skipTaskbar: true,
    resizable: false,
    show: false,
    webPreferences: {
      preload: getPreloadPath(),
      contextIsolation: true,
      nodeIntegration: false,
    },
    title: '日历',
  });

  calendarWindow.loadURL(getRendererURL('calendar'));
  verifyBridge(calendarWindow, 'calendar-window');

  calendarWindow.once('ready-to-show', () => {
    if (!calendarWindow || calendarWindow.isDestroyed()) return;
    calendarWindow.show();
    calendarWindow.focus();
  });

  calendarWindow.webContents.on('did-fail-load', (_event, errorCode, errorDescription, validatedURL) => {
    console.error('[calendar-window] load failed', { errorCode, errorDescription, validatedURL });
  });

  calendarWindow.on('closed', () => {
    calendarWindow = null;
  });
}

function normalizeUpdaterError(error: unknown): string {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  return '未知错误';
}

async function checkForUpdatesManually(): Promise<UpdateCheckResponse> {
  if (!app.isPackaged || isDev) {
    return { ok: false, message: '当前为开发模式，无法检查更新' };
  }

  if (process.platform === 'linux') {
    return { ok: true, message: 'Linux 版本请通过系统包管理器更新（apt/dnf/yum）' };
  }

  if (updateDownloaded) {
    return { ok: true, message: '更新已下载，应用将自动重启安装' };
  }

  try {
    const result = await autoUpdater.checkForUpdates();
    const nextVersion = result?.updateInfo?.version;

    if (nextVersion && nextVersion !== app.getVersion()) {
      return { ok: true, message: `发现新版本 ${nextVersion}，正在后台下载` };
    }

    return { ok: true, message: '当前已是最新版本' };
  } catch (error) {
    return { ok: false, message: `检查更新失败：${normalizeUpdaterError(error)}` };
  }
}

function createTray(): void {
  tray = new Tray(createTrayIcon());
  tray.setToolTip('桌面助手');

  const contextMenu = Menu.buildFromTemplate([
    { label: '打开主面板', click: () => createMainWindow() },
    { label: '新建便签', click: () => handleCreateNote() },
    { label: '打开日历', click: () => createCalendarWindow() },
    {
      label: '检查更新',
      click: () => {
        void checkForUpdatesManually().then(result => {
          if (result.ok) {
            console.log('[updater]', result.message);
            return;
          }

          console.error('[updater]', result.message);
        });
      },
    },
    { type: 'separator' },
    { label: '退出', click: () => app.quit() },
  ]);

  tray.setContextMenu(contextMenu);

  if (process.platform === 'linux') {
    tray.on('click', () => createMainWindow());
    return;
  }

  tray.on('double-click', () => createMainWindow());
}

function handleCreateNote(): StickyNote {
  const note = store.createNote();
  createNoteWindow(note);
  return note;
}

function setupIPC(): void {
  // 便签 IPC
  ipcMain.handle(IPC_CHANNELS.NOTE_GET_ALL, () => {
    return store.getAllNotes();
  });

  ipcMain.handle(IPC_CHANNELS.NOTE_CREATE, () => {
    return handleCreateNote();
  });

  ipcMain.handle(IPC_CHANNELS.NOTE_SAVE, (_event, note: Partial<StickyNote> & { id: string }) => {
    store.updateNote(note.id, note);
    return true;
  });

  ipcMain.handle(IPC_CHANNELS.NOTE_DELETE, (_event, id: string) => {
    store.deleteNote(id);
    const win = noteWindows.get(id);
    if (win && !win.isDestroyed()) win.close();
    noteWindows.delete(id);
    return true;
  });

  // 日历 IPC
  ipcMain.handle(IPC_CHANNELS.CALENDAR_GET_MARKS, () => {
    return store.getAllMarks();
  });

  ipcMain.handle(IPC_CHANNELS.CALENDAR_SAVE_MARK, (_event, mark: CalendarMark) => {
    store.saveMark(mark);
    return true;
  });

  ipcMain.handle(IPC_CHANNELS.CALENDAR_DELETE_MARK, (_event, date: string) => {
    store.deleteMark(date);
    return true;
  });

  ipcMain.handle(IPC_CHANNELS.CALENDAR_GET_APPEARANCE, () => {
    return store.getCalendarAppearance();
  });

  ipcMain.handle(IPC_CHANNELS.CALENDAR_SAVE_APPEARANCE, (_event, appearance: Partial<CalendarAppearance>) => {
    return store.saveCalendarAppearance(appearance);
  });

  // 窗口 IPC
  ipcMain.handle(IPC_CHANNELS.WINDOW_PIN, (event, pinned: boolean) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (win) win.setAlwaysOnTop(pinned);
    return true;
  });

  ipcMain.handle(IPC_CHANNELS.WINDOW_CLOSE, (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (win) win.close();
    return true;
  });

  ipcMain.handle(IPC_CHANNELS.WINDOW_OPEN_NOTE, (_event, noteId?: string) => {
    if (noteId) {
      const note = store.getAllNotes().find(n => n.id === noteId);
      if (note) createNoteWindow(note);
    } else {
      handleCreateNote();
    }
    return true;
  });

  ipcMain.handle(IPC_CHANNELS.WINDOW_OPEN_CALENDAR, () => {
    createCalendarWindow();
    return true;
  });

  ipcMain.handle(IPC_CHANNELS.UPDATE_CHECK, async () => {
    return checkForUpdatesManually();
  });

  ipcMain.handle(IPC_CHANNELS.STARTUP_GET_STATUS, () => {
    return getStartupLaunchStatus();
  });

  ipcMain.handle(IPC_CHANNELS.STARTUP_SET_ENABLED, (_event, enabled: boolean) => {
    return setStartupLaunchEnabled(Boolean(enabled));
  });
}

function setupAutoUpdater(): void {
  if (!app.isPackaged || isDev) {
    console.log('[updater] disabled in development mode');
    return;
  }

  if (process.platform === 'linux') {
    console.log('[updater] disabled on linux package builds');
    return;
  }

  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;

  autoUpdater.on('checking-for-update', () => {
    console.log('[updater] checking for updates');
  });

  autoUpdater.on('update-available', info => {
    console.log('[updater] update available', info.version);
  });

  autoUpdater.on('update-not-available', info => {
    console.log('[updater] no updates', info.version);
  });

  autoUpdater.on('error', error => {
    console.error('[updater] error', error);
  });

  autoUpdater.on('download-progress', progress => {
    console.log('[updater] download progress', `${Math.round(progress.percent)}%`);
  });

  autoUpdater.on('update-downloaded', async info => {
    updateDownloaded = true;
    console.log('[updater] update downloaded', info.version);

    await dialog.showMessageBox({
      type: 'info',
      title: '发现新版本',
      message: `新版本 ${info.version} 已下载完成`,
      detail: '应用将在 3 秒后自动重启并完成更新安装。',
      buttons: ['确定'],
      defaultId: 0,
    });

    setTimeout(() => {
      autoUpdater.quitAndInstall();
    }, 3000);
  });
}

// App lifecycle
const gotSingleInstanceLock = app.requestSingleInstanceLock();

if (!gotSingleInstanceLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.show();
      mainWindow.focus();
      return;
    }

    createMainWindow();
  });

  app.whenReady().then(() => {
    setupIPC();
    setupAutoUpdater();
    createTray();
    createMainWindow();

    const notes = store.getAllNotes();
    notes.filter(n => n.pinned).forEach(n => createNoteWindow(n));
  });

  app.on('window-all-closed', () => {
    // 不退出，保持托盘运行
  });

  app.on('activate', () => {
    createMainWindow();
  });

  app.on('before-quit', () => {
    tray?.destroy();
  });
}
