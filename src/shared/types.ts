/** 便签数据 */
export type StickyNoteStatus = 'active' | 'trash';

export interface StickyNote {
  id: string;
  content: string;
  color: string;
  opacity: number;
  x: number;
  y: number;
  width: number;
  height: number;
  pinned: boolean;
  status?: StickyNoteStatus;
  deletedAt?: number;
  createdAt: number;
  updatedAt: number;
}

/** 日历标记 */
export interface CalendarMark {
  date: string; // YYYY-MM-DD
  label: string;
  color: string;
}

export interface CalendarAppearance {
  color: string;
  opacity: number;
}

export interface UpdateCheckResponse {
  ok: boolean;
  message: string;
}

export interface StartupLaunchStatus {
  supported: boolean;
  enabled: boolean;
}

/** IPC 频道 */
export const IPC_CHANNELS = {
  // 便签
  NOTE_GET_ALL: 'note:get-all',
  NOTE_GET_TRASH: 'note:get-trash',
  NOTE_SAVE: 'note:save',
  NOTE_DELETE: 'note:delete',
  NOTE_RESTORE: 'note:restore',
  NOTE_DELETE_PERMANENT: 'note:delete-permanent',
  NOTE_CREATE: 'note:create',
  // 日历
  CALENDAR_GET_MARKS: 'calendar:get-marks',
  CALENDAR_SAVE_MARK: 'calendar:save-mark',
  CALENDAR_DELETE_MARK: 'calendar:delete-mark',
  CALENDAR_GET_APPEARANCE: 'calendar:get-appearance',
  CALENDAR_SAVE_APPEARANCE: 'calendar:save-appearance',
  // 窗口
  WINDOW_PIN: 'window:pin',
  WINDOW_CLOSE: 'window:close',
  WINDOW_OPEN_NOTE: 'window:open-note',
  WINDOW_OPEN_CALENDAR: 'window:open-calendar',
  UPDATE_CHECK: 'update:check',
  STARTUP_GET_STATUS: 'startup:get-status',
  STARTUP_SET_ENABLED: 'startup:set-enabled',
} as const;
