import { invoke } from '@tauri-apps/api/core';
import type {
  CalendarAppearance,
  CalendarMark,
  StartupLaunchStatus,
  StickyNote,
  TextShortcut,
  UpdateCheckResponse,
} from '../shared/types';

export interface DesktopAPI {
  getNotes: () => Promise<StickyNote[]>;
  getTrashNotes: () => Promise<StickyNote[]>;
  createNote: () => Promise<StickyNote>;
  saveNote: (note: Partial<StickyNote> & { id: string }) => Promise<boolean>;
  deleteNote: (id: string) => Promise<boolean>;
  restoreNote: (id: string) => Promise<boolean>;
  permanentlyDeleteNote: (id: string) => Promise<boolean>;
  getMarks: () => Promise<CalendarMark[]>;
  saveMark: (mark: CalendarMark) => Promise<boolean>;
  deleteMark: (date: string) => Promise<boolean>;
  getCalendarAppearance: () => Promise<CalendarAppearance>;
  saveCalendarAppearance: (appearance: Partial<CalendarAppearance>) => Promise<CalendarAppearance>;
  pinWindow: (pinned: boolean) => Promise<boolean>;
  closeWindow: () => Promise<boolean>;
  openNote: (noteId?: string) => Promise<boolean>;
  openCalendar: () => Promise<boolean>;
  checkForUpdates: () => Promise<UpdateCheckResponse>;
  getStartupLaunchStatus: () => Promise<StartupLaunchStatus>;
  setStartupLaunchEnabled: (enabled: boolean) => Promise<StartupLaunchStatus>;
  getTextShortcuts: () => Promise<TextShortcut[]>;
  saveTextShortcut: (shortcut: TextShortcut) => Promise<TextShortcut[]>;
}

const desktopAPI: DesktopAPI = {
  getNotes: () => invoke('get_notes'),
  getTrashNotes: () => invoke('get_trash_notes'),
  createNote: () => invoke('create_note'),
  saveNote: note => invoke('save_note', { note }),
  deleteNote: id => invoke('delete_note', { id }),
  restoreNote: id => invoke('restore_note', { id }),
  permanentlyDeleteNote: id => invoke('permanently_delete_note', { id }),
  getMarks: () => invoke('get_marks'),
  saveMark: mark => invoke('save_mark', { mark }),
  deleteMark: date => invoke('delete_mark', { date }),
  getCalendarAppearance: () => invoke('get_calendar_appearance'),
  saveCalendarAppearance: appearance => invoke('save_calendar_appearance', { appearance }),
  pinWindow: pinned => invoke('pin_window', { pinned }),
  closeWindow: () => invoke('close_window'),
  openNote: noteId => invoke('open_note', { noteId }),
  openCalendar: () => invoke('open_calendar'),
  checkForUpdates: () => invoke('check_for_updates'),
  getStartupLaunchStatus: () => invoke('get_startup_launch_status'),
  setStartupLaunchEnabled: enabled => invoke('set_startup_launch_enabled', { enabled }),
  getTextShortcuts: () => invoke('get_text_shortcuts'),
  saveTextShortcut: shortcut => invoke('save_text_shortcut', { shortcut }),
};

window.desktopAPI = desktopAPI;
