/** 便签数据 */
export interface StickyNote {
  id: string;
  content: string;
  color: string;
  x: number;
  y: number;
  width: number;
  height: number;
  pinned: boolean;
  trashedAt?: number | null;
  createdAt: number;
  updatedAt: number;
}

/** 日历标记 */
export interface CalendarMark {
  date: string; // YYYY-MM-DD
  label: string;
  color: string;
}

export interface UpdateCheckResponse {
  ok: boolean;
  message: string;
}

/** IPC 频道 */
export const IPC_CHANNELS = {
  // 便签
  NOTE_GET_ALL: 'note:get-all',
  NOTE_GET_TRASHED: 'note:get-trashed',
  NOTE_SAVE: 'note:save',
  NOTE_DELETE: 'note:delete',
  NOTE_RESTORE: 'note:restore',
  NOTE_PURGE: 'note:purge',
  NOTE_CREATE: 'note:create',
  // 日历
  CALENDAR_GET_MARKS: 'calendar:get-marks',
  CALENDAR_SAVE_MARK: 'calendar:save-mark',
  CALENDAR_DELETE_MARK: 'calendar:delete-mark',
  // 窗口
  WINDOW_PIN: 'window:pin',
  WINDOW_CLOSE: 'window:close',
  WINDOW_OPEN_NOTE: 'window:open-note',
  WINDOW_OPEN_CALENDAR: 'window:open-calendar',
  UPDATE_CHECK: 'update:check',
} as const;
