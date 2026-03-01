import Store from 'electron-store';
import { StickyNote, CalendarMark } from '../shared/types';

interface StoreSchema {
  notes: StickyNote[];
  marks: CalendarMark[];
}

const NOTE_COLORS = ['#fff9c4', '#c8e6c9', '#bbdefb', '#f8bbd0', '#e1bee7', '#ffe0b2'];

export class StoreManager {
  private store: Store<StoreSchema>;

  constructor() {
    this.store = new Store<StoreSchema>({
      defaults: {
        notes: [],
        marks: [],
      },
    });
  }

  // ---- 便签 ----
  getAllNotes(): StickyNote[] {
    return this.store.get('notes', []);
  }

  createNote(): StickyNote {
    const notes = this.getAllNotes();
    const note: StickyNote = {
      id: `note_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      content: '',
      color: NOTE_COLORS[notes.length % NOTE_COLORS.length],
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
      notes[idx] = { ...notes[idx], ...updates, updatedAt: Date.now() };
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
}
