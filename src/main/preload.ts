import { contextBridge, ipcRenderer } from 'electron';
import type { StickyNote, CalendarMark, UpdateCheckResponse } from '../shared/types';

const IPC_CHANNELS = {
  NOTE_GET_ALL: 'note:get-all',
  NOTE_SAVE: 'note:save',
  NOTE_DELETE: 'note:delete',
  NOTE_CREATE: 'note:create',
  CALENDAR_GET_MARKS: 'calendar:get-marks',
  CALENDAR_SAVE_MARK: 'calendar:save-mark',
  CALENDAR_DELETE_MARK: 'calendar:delete-mark',
  WINDOW_PIN: 'window:pin',
  WINDOW_CLOSE: 'window:close',
  WINDOW_OPEN_NOTE: 'window:open-note',
  WINDOW_OPEN_CALENDAR: 'window:open-calendar',
  UPDATE_CHECK: 'update:check',
} as const;

const api = {
  // 便签
  getNotes: (): Promise<StickyNote[]> => ipcRenderer.invoke(IPC_CHANNELS.NOTE_GET_ALL),
  createNote: (): Promise<StickyNote> => ipcRenderer.invoke(IPC_CHANNELS.NOTE_CREATE),
  saveNote: (note: Partial<StickyNote> & { id: string }): Promise<boolean> =>
    ipcRenderer.invoke(IPC_CHANNELS.NOTE_SAVE, note),
  deleteNote: (id: string): Promise<boolean> => ipcRenderer.invoke(IPC_CHANNELS.NOTE_DELETE, id),

  // 日历
  getMarks: (): Promise<CalendarMark[]> => ipcRenderer.invoke(IPC_CHANNELS.CALENDAR_GET_MARKS),
  saveMark: (mark: CalendarMark): Promise<boolean> =>
    ipcRenderer.invoke(IPC_CHANNELS.CALENDAR_SAVE_MARK, mark),
  deleteMark: (date: string): Promise<boolean> =>
    ipcRenderer.invoke(IPC_CHANNELS.CALENDAR_DELETE_MARK, date),

  // 窗口
  pinWindow: (pinned: boolean): Promise<boolean> =>
    ipcRenderer.invoke(IPC_CHANNELS.WINDOW_PIN, pinned),
  closeWindow: (): Promise<boolean> => ipcRenderer.invoke(IPC_CHANNELS.WINDOW_CLOSE),
  openNote: (noteId?: string): Promise<boolean> =>
    ipcRenderer.invoke(IPC_CHANNELS.WINDOW_OPEN_NOTE, noteId),
  openCalendar: (): Promise<boolean> => ipcRenderer.invoke(IPC_CHANNELS.WINDOW_OPEN_CALENDAR),
  checkForUpdates: (): Promise<UpdateCheckResponse> => ipcRenderer.invoke(IPC_CHANNELS.UPDATE_CHECK),
};

try {
  contextBridge.exposeInMainWorld('desktopAPI', api);
} catch (error) {
  console.error('[preload] failed to expose desktopAPI', error);
}

export type DesktopAPI = typeof api;
