import { contextBridge, ipcRenderer } from 'electron';
import type { StickyNote, CalendarMark, UpdateCheckResponse, OcrResultPayload } from '../shared/types';

const IPC_CHANNELS = {
  NOTE_GET_ALL: 'note:get-all',
  NOTE_GET_TRASHED: 'note:get-trashed',
  NOTE_SAVE: 'note:save',
  NOTE_DELETE: 'note:delete',
  NOTE_RESTORE: 'note:restore',
  NOTE_PURGE: 'note:purge',
  NOTE_CREATE: 'note:create',
  CALENDAR_GET_MARKS: 'calendar:get-marks',
  CALENDAR_SAVE_MARK: 'calendar:save-mark',
  CALENDAR_DELETE_MARK: 'calendar:delete-mark',
  WINDOW_PIN: 'window:pin',
  WINDOW_CLOSE: 'window:close',
  WINDOW_OPEN_NOTE: 'window:open-note',
  WINDOW_OPEN_CALENDAR: 'window:open-calendar',
  UPDATE_CHECK: 'update:check',

  OCR_OPEN_CAPTURE: 'ocr:open-capture',
  OCR_SEND_RESULT: 'ocr:send-result',
  OCR_RESULT: 'ocr:result',
} as const;

const api = {
  // 便签
  getNotes: (): Promise<StickyNote[]> => ipcRenderer.invoke(IPC_CHANNELS.NOTE_GET_ALL),
  getTrashedNotes: (): Promise<StickyNote[]> => ipcRenderer.invoke(IPC_CHANNELS.NOTE_GET_TRASHED),
  createNote: (): Promise<StickyNote> => ipcRenderer.invoke(IPC_CHANNELS.NOTE_CREATE),
  saveNote: (note: Partial<StickyNote> & { id: string }): Promise<boolean> =>
    ipcRenderer.invoke(IPC_CHANNELS.NOTE_SAVE, note),
  deleteNote: (id: string): Promise<boolean> => ipcRenderer.invoke(IPC_CHANNELS.NOTE_DELETE, id),
  restoreNote: (id: string): Promise<boolean> => ipcRenderer.invoke(IPC_CHANNELS.NOTE_RESTORE, id),
  purgeNote: (id: string): Promise<boolean> => ipcRenderer.invoke(IPC_CHANNELS.NOTE_PURGE, id),

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

  openOcrCapture: (noteId: string): Promise<boolean> => ipcRenderer.invoke(IPC_CHANNELS.OCR_OPEN_CAPTURE, noteId),
  sendOcrResult: (payload: OcrResultPayload): Promise<boolean> =>
    ipcRenderer.invoke(IPC_CHANNELS.OCR_SEND_RESULT, payload),
  onOcrResult: (handler: (payload: OcrResultPayload) => void): (() => void) => {
    const listener = (_event: unknown, payload: OcrResultPayload) => handler(payload);
    ipcRenderer.on(IPC_CHANNELS.OCR_RESULT, listener);
    return () => ipcRenderer.removeListener(IPC_CHANNELS.OCR_RESULT, listener);
  },
};

try {
  contextBridge.exposeInMainWorld('desktopAPI', api);
} catch (error) {
  console.error('[preload] failed to expose desktopAPI', error);
}

export type DesktopAPI = typeof api;
