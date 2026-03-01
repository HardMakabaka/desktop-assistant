import { app, BrowserWindow, ipcMain, Tray, Menu, nativeImage } from 'electron';
import * as path from 'path';
import { existsSync } from 'fs';
import { pathToFileURL } from 'url';
import { StoreManager } from './store';
import { IPC_CHANNELS, StickyNote, CalendarMark } from '../shared/types';

const devServerURL = process.env.DESKTOP_ASSISTANT_DEV_URL || process.env.VITE_DEV_SERVER_URL;
const isDev = Boolean(devServerURL);
const store = new StoreManager();

let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
const noteWindows = new Map<string, BrowserWindow>();
let calendarWindow: BrowserWindow | null = null;
let cachedPreloadPath: string | null = null;

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

function createTray(): void {
  const icon = nativeImage.createEmpty();
  tray = new Tray(icon);
  tray.setToolTip('桌面助手');

  const contextMenu = Menu.buildFromTemplate([
    { label: '打开主面板', click: () => createMainWindow() },
    { label: '新建便签', click: () => handleCreateNote() },
    { label: '打开日历', click: () => createCalendarWindow() },
    { type: 'separator' },
    { label: '退出', click: () => app.quit() },
  ]);

  tray.setContextMenu(contextMenu);
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
