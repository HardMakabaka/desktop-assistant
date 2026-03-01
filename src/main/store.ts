import Store from 'electron-store';
import { StickyNote, CalendarMark, CalendarAppearance } from '../shared/types';

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

function clampOpacity(value: number): number {
  if (Number.isNaN(value)) return DEFAULT_NOTE_OPACITY;
  return Math.min(1, Math.max(0.2, value));
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
  getAllNotes(): StickyNote[] {
    const notes = this.store.get('notes', []);
    return notes.map(note => ({
      ...note,
      opacity: clampOpacity(note.opacity ?? DEFAULT_NOTE_OPACITY),
    }));
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
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    notes.push(note);
    this.store.set('notes', notes);
    return note;
  }

  updateNote(id: string, updates: Partial<StickyNote>): void {
    const notes = this.getAllNotes();
    const idx = notes.findIndex(n => n.id === id);
    if (idx !== -1) {
      notes[idx] = {
        ...notes[idx],
        ...updates,
        opacity: clampOpacity(updates.opacity ?? notes[idx].opacity),
        updatedAt: Date.now(),
      };
      this.store.set('notes', notes);
    }
  }

  deleteNote(id: string): void {
    const notes = this.getAllNotes().filter(n => n.id !== id);
    this.store.set('notes', notes);
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
