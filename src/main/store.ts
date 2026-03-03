import Store from 'electron-store';
import { StickyNote, StickyNoteStatus, CalendarMark, CalendarAppearance } from '../shared/types';

interface StoreSchema {
  notes: StickyNote[];
  marks: CalendarMark[];
  calendarAppearance: CalendarAppearance;
}

const NOTE_COLORS = ['#fff9c4', '#c8e6c9', '#bbdefb', '#f8bbd0', '#e1bee7', '#ffe0b2'];
const DEFAULT_NOTE_OPACITY = 0.92;
const DEFAULT_CALENDAR_APPEARANCE: CalendarAppearance = {
  color: '#ffffff',
  opacity: 0.94,
};

const ACTIVE_STATUS: StickyNoteStatus = 'active';
const TRASH_STATUS: StickyNoteStatus = 'trash';

function clampOpacity(value: number): number {
  if (Number.isNaN(value)) return DEFAULT_NOTE_OPACITY;
  return Math.min(1, Math.max(0.2, value));
}

function normalizeStatus(status?: StickyNoteStatus): StickyNoteStatus {
  return status === TRASH_STATUS ? TRASH_STATUS : ACTIVE_STATUS;
}

function normalizeNote(note: StickyNote): StickyNote {
  const status = normalizeStatus(note.status);
  return {
    ...note,
    status,
    opacity: clampOpacity(note.opacity ?? DEFAULT_NOTE_OPACITY),
    deletedAt: status === TRASH_STATUS ? note.deletedAt : undefined,
  };
}

export class StoreManager {
  private store: Store<StoreSchema>;

  constructor() {
    this.store = new Store<StoreSchema>({
      defaults: {
        notes: [],
        marks: [],
        calendarAppearance: DEFAULT_CALENDAR_APPEARANCE,
      },
    });
  }

  // ---- 便签 ----
  private getStoredNotes(): StickyNote[] {
    const notes = this.store.get('notes', []);
    return notes.map(normalizeNote);
  }

  getAllNotes(): StickyNote[] {
    return this.getStoredNotes().filter(note => note.status !== TRASH_STATUS);
  }

  getTrashNotes(): StickyNote[] {
    return this.getStoredNotes().filter(note => note.status === TRASH_STATUS);
  }

  createNote(): StickyNote {
    const notes = this.getAllNotes();
    const note: StickyNote = {
      id: `note_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      content: '',
      color: NOTE_COLORS[notes.length % NOTE_COLORS.length],
      opacity: DEFAULT_NOTE_OPACITY,
      x: 100 + (notes.length % 5) * 30,
      y: 100 + (notes.length % 5) * 30,
      width: 260,
      height: 280,
      pinned: false,
      status: ACTIVE_STATUS,
      deletedAt: undefined,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    const allNotes = this.getStoredNotes();
    allNotes.push(note);
    this.store.set('notes', allNotes);
    return note;
  }

  updateNote(id: string, updates: Partial<StickyNote>): void {
    const notes = this.getStoredNotes();
    const idx = notes.findIndex(n => n.id === id);
    if (idx !== -1) {
      const next = normalizeNote({
        ...notes[idx],
        ...updates,
        opacity: clampOpacity(updates.opacity ?? notes[idx].opacity),
        updatedAt: Date.now(),
      });
      notes[idx] = next;
      this.store.set('notes', notes);
    }
  }

  deleteNote(id: string): void {
    this.moveNoteToTrash(id);
  }

  moveNoteToTrash(id: string): boolean {
    const notes = this.getStoredNotes();
    const idx = notes.findIndex(n => n.id === id);
    if (idx === -1) return false;
    if (notes[idx].status === TRASH_STATUS) return true;

    notes[idx] = {
      ...notes[idx],
      status: TRASH_STATUS,
      deletedAt: Date.now(),
      updatedAt: Date.now(),
    };
    this.store.set('notes', notes);
    return true;
  }

  restoreNote(id: string): boolean {
    const notes = this.getStoredNotes();
    const idx = notes.findIndex(n => n.id === id && n.status === TRASH_STATUS);
    if (idx === -1) return false;

    notes[idx] = {
      ...notes[idx],
      status: ACTIVE_STATUS,
      deletedAt: undefined,
      updatedAt: Date.now(),
    };
    this.store.set('notes', notes);
    return true;
  }

  permanentlyDeleteNote(id: string): boolean {
    const notes = this.getStoredNotes();
    const target = notes.find(n => n.id === id);
    if (!target || target.status !== TRASH_STATUS) return false;

    const next = notes.filter(n => n.id !== id);
    this.store.set('notes', next);
    return true;
  }

  // ---- 日历标记 ----
  getAllMarks(): CalendarMark[] {
    return this.store.get('marks', []);
  }

  saveMark(mark: CalendarMark): void {
    const marks = this.getAllMarks();
    const idx = marks.findIndex(m => m.date === mark.date);
    if (idx !== -1) {
      marks[idx] = mark;
    } else {
      marks.push(mark);
    }
    this.store.set('marks', marks);
  }

  deleteMark(date: string): void {
    const marks = this.getAllMarks().filter(m => m.date !== date);
    this.store.set('marks', marks);
  }

  getCalendarAppearance(): CalendarAppearance {
    const appearance = this.store.get('calendarAppearance', DEFAULT_CALENDAR_APPEARANCE);
    return {
      color: appearance.color || DEFAULT_CALENDAR_APPEARANCE.color,
      opacity: clampOpacity(appearance.opacity ?? DEFAULT_CALENDAR_APPEARANCE.opacity),
    };
  }

  saveCalendarAppearance(updates: Partial<CalendarAppearance>): CalendarAppearance {
    const current = this.getCalendarAppearance();
    const next: CalendarAppearance = {
      color: updates.color || current.color,
      opacity: clampOpacity(updates.opacity ?? current.opacity),
    };
    this.store.set('calendarAppearance', next);
    return next;
  }
}
