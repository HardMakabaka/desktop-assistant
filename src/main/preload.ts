import { contextBridge, ipcRenderer } from 'electron';
import { IPC_CHANNELS, StickyNote, CalendarMark } from '../shared/types';

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
};

contextBridge.exposeInMainWorld('desktopAPI', api);

export type DesktopAPI = typeof api;
