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
    const isE2E = process.env.DESKTOP_ASSISTANT_E2E === '1';

    this.store = new Store<StoreSchema>({
      name: isE2E ? 'desktop-assistant-e2e' : undefined,
      cwd: isE2E ? process.env.DESKTOP_ASSISTANT_E2E_DATA_DIR : undefined,
      defaults: {
        notes: [],
        marks: [],
      },
    });
  }

  // ---- 便签 ----
  private getAllNotesRaw(): StickyNote[] {
    return this.store.get('notes', []);
  }

  getAllNotes(): StickyNote[] {
    return this.getAllNotesRaw().filter(note => !note.trashedAt);
  }

  getTrashedNotes(): StickyNote[] {
    return this.getAllNotesRaw().filter(note => Boolean(note.trashedAt));
  }

  createNote(): StickyNote {
    const notes = this.getAllNotesRaw();
    const note: StickyNote = {
      id: `note_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      content: '',
      color: NOTE_COLORS[notes.length % NOTE_COLORS.length],
      opacity: 100,
      x: 100 + (notes.length % 5) * 30,
      y: 100 + (notes.length % 5) * 30,
      width: 260,
      height: 280,
      pinned: false,
      trashedAt: null,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    notes.push(note);
    this.store.set('notes', notes);
    return note;
  }

  updateNote(id: string, updates: Partial<StickyNote>): void {
    const notes = this.getAllNotesRaw();
    const idx = notes.findIndex(n => n.id === id);
    if (idx !== -1) {
      notes[idx] = { ...notes[idx], ...updates, updatedAt: Date.now() };
      this.store.set('notes', notes);
    }
  }

  trashNote(id: string): boolean {
    const notes = this.getAllNotesRaw();
    const idx = notes.findIndex(n => n.id === id);
    if (idx === -1) return false;
    notes[idx] = { ...notes[idx], trashedAt: Date.now(), updatedAt: Date.now() };
    this.store.set('notes', notes);
    return true;
  }

  restoreNote(id: string): boolean {
    const notes = this.getAllNotesRaw();
    const idx = notes.findIndex(n => n.id === id);
    if (idx === -1) return false;
    notes[idx] = { ...notes[idx], trashedAt: null, updatedAt: Date.now() };
    this.store.set('notes', notes);
    return true;
  }

  purgeNote(id: string): boolean {
    const notes = this.getAllNotesRaw();
    const next = notes.filter(n => n.id !== id);
    if (next.length === notes.length) return false;
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
}
