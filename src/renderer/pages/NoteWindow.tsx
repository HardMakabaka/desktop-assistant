import React, { useEffect, useState, useRef, useCallback } from 'react';
import type { StickyNote } from '../../shared/types';
import { ColorOpacityPicker, hexToRgba } from './ColorOpacityPicker';

function escapeHtml(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function renderInlineMarkdown(input: string): string {
  let out = escapeHtml(input);
  out = out.replace(/`([^`]+)`/g, '<code>$1</code>');
  out = out.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  out = out.replace(/\*([^*]+)\*/g, '<em>$1</em>');
  return out;
}

function renderMarkdownToSafeHtml(markdown: string): string {
  const normalized = markdown.replace(/\r\n/g, '\n');
  const chunks = normalized.split('```');

  let html = '';

  for (let idx = 0; idx < chunks.length; idx += 1) {
    const chunk = chunks[idx];
    const isCode = idx % 2 === 1;

    if (isCode) {
      const firstNewline = chunk.indexOf('\n');
      const code = firstNewline === -1 ? chunk : chunk.slice(firstNewline + 1);
      html += `<pre style="margin:0 0 10px; padding:10px; background: rgba(0,0,0,0.06); border-radius:8px; overflow:auto;"><code>${escapeHtml(
        code,
      )}</code></pre>`;
      continue;
    }

    const lines = chunk.split('\n');
    let inList = false;

    for (const line of lines) {
      const headingMatch = line.match(/^(#{1,6})\s+(.*)$/);
      const listMatch = line.match(/^[-*]\s+(.*)$/);

      if (headingMatch) {
        if (inList) {
          html += '</ul>';
          inList = false;
        }

        const level = headingMatch[1].length;
        const content = renderInlineMarkdown(headingMatch[2]);
        html += `<h${level} style="margin:0 0 8px;">${content}</h${level}>`;
        continue;
      }

      if (listMatch) {
        if (!inList) {
          html += '<ul style="margin:0 0 10px 18px; padding:0;">';
          inList = true;
        }
        html += `<li style="margin:0 0 6px;">${renderInlineMarkdown(listMatch[1])}</li>`;
        continue;
      }

      if (inList) {
        html += '</ul>';
        inList = false;
      }

      if (!line.trim()) {
        html += '<div style="height:8px;"></div>';
        continue;
      }

      html += `<p style="margin:0 0 10px;">${renderInlineMarkdown(line)}</p>`;
    }

    if (inList) {
      html += '</ul>';
    }
  }

  return html;
}

type NoteShortcutAction = 'toggleLivePreview' | 'togglePin' | 'moveToTrash';
type NoteShortcutConfig = Record<NoteShortcutAction, string>;

const NOTE_SHORTCUTS_STORAGE_KEY = 'desktop-assistant:note:shortcuts-v1';
const NOTE_INDENT = '  ';

const NOTE_FONT_SIZE_STORAGE_KEY = 'desktop-assistant:note:font-size-v1';
const NOTE_FONT_SIZE_MIN = 12;
const NOTE_FONT_SIZE_MAX = 24;
const NOTE_FONT_SIZE_DEFAULT = 14;

function clampFontSize(value: number): number {
  if (!Number.isFinite(value)) return NOTE_FONT_SIZE_DEFAULT;
  return Math.max(NOTE_FONT_SIZE_MIN, Math.min(NOTE_FONT_SIZE_MAX, Math.round(value)));
}

function loadFontSizeFromStorage(): number {
  try {
    const raw = window.localStorage.getItem(NOTE_FONT_SIZE_STORAGE_KEY);
    if (!raw) return NOTE_FONT_SIZE_DEFAULT;
    const parsed = Number(raw);
    return clampFontSize(parsed);
  } catch (error) {
    console.warn('[note-window] failed to read font size preference', error);
    return NOTE_FONT_SIZE_DEFAULT;
  }
}

function persistFontSizeToStorage(value: number): void {
  window.localStorage.setItem(NOTE_FONT_SIZE_STORAGE_KEY, String(clampFontSize(value)));
}

function getDefaultNoteShortcuts(): NoteShortcutConfig {
  return {
    toggleLivePreview: 'Mod+Shift+P',
    togglePin: 'Mod+Shift+K',
    moveToTrash: 'Mod+Shift+Backspace',
  };
}

function normalizeShortcutKey(key: string): string {
  if (key === ' ') return 'Space';
  if (key.length === 1) return key.toUpperCase();
  return key;
}

function shortcutFromKeyboardEvent(e: KeyboardEvent): string | null {
  const isMod = e.ctrlKey || e.metaKey;
  if (!isMod) return null;

  const key = normalizeShortcutKey(e.key);
  if (key === 'Control' || key === 'Meta' || key === 'Alt' || key === 'Shift') return null;
  if (key === 'Tab') return null;

  const parts: string[] = ['Mod'];
  if (e.altKey) parts.push('Alt');
  if (e.shiftKey) parts.push('Shift');
  parts.push(key);
  return parts.join('+');
}

function isReservedSystemShortcut(e: KeyboardEvent): boolean {
  const isMod = e.ctrlKey || e.metaKey;
  if (!isMod) return false;

  const key = normalizeShortcutKey(e.key);
  return key === 'C' || key === 'V' || key === 'X' || key === 'A' || key === 'Z' || key === 'Y';
}

function validateShortcutConfig(config: NoteShortcutConfig): string | null {
  const seen = new Map<string, NoteShortcutAction>();
  for (const action of Object.keys(config) as NoteShortcutAction[]) {
    const shortcut = (config[action] || '').trim();
    if (!shortcut) return '快捷键不能为空';
    if (!shortcut.startsWith('Mod+')) return '快捷键必须包含 Mod（Ctrl/Cmd）';

    const existing = seen.get(shortcut);
    if (existing && existing !== action) {
      return `快捷键冲突：${existing} 与 ${action}`;
    }
    seen.set(shortcut, action);

    const parts = shortcut.split('+').map(p => p.trim()).filter(Boolean);
    const key = parts[parts.length - 1];
    if (key === 'Tab') return 'Tab 被用于缩进格式化，不能设置为快捷键';
    if (key === 'C' || key === 'V' || key === 'X' || key === 'A' || key === 'Z' || key === 'Y') {
      return '不能覆盖系统常用快捷键（复制/粘贴/撤销等）';
    }
  }
  return null;
}

function loadShortcutConfigFromStorage(): NoteShortcutConfig {
  const defaults = getDefaultNoteShortcuts();
  try {
    const raw = window.localStorage.getItem(NOTE_SHORTCUTS_STORAGE_KEY);
    if (!raw) return defaults;
    const parsed = JSON.parse(raw) as Partial<NoteShortcutConfig>;
    const next: NoteShortcutConfig = {
      toggleLivePreview: (parsed.toggleLivePreview ?? defaults.toggleLivePreview).toString(),
      togglePin: (parsed.togglePin ?? defaults.togglePin).toString(),
      moveToTrash: (parsed.moveToTrash ?? defaults.moveToTrash).toString(),
    };
    const err = validateShortcutConfig(next);
    return err ? defaults : next;
  } catch (error) {
    console.warn('[note-window] failed to load shortcut config', error);
    return defaults;
  }
}

function persistShortcutConfigToStorage(config: NoteShortcutConfig): void {
  window.localStorage.setItem(NOTE_SHORTCUTS_STORAGE_KEY, JSON.stringify(config));
}

function applyIndentFormatting(
  value: string,
  selectionStart: number,
  selectionEnd: number,
  indent: string,
): { value: string; selectionStart: number; selectionEnd: number } {
  const hasMultiline = value.slice(selectionStart, selectionEnd).includes('\n');
  if (!hasMultiline) {
    const nextValue = value.slice(0, selectionStart) + indent + value.slice(selectionEnd);
    const delta = indent.length;
    return {
      value: nextValue,
      selectionStart: selectionStart + delta,
      selectionEnd: selectionStart + delta,
    };
  }

  const blockStart = value.lastIndexOf('\n', Math.max(0, selectionStart - 1)) + 1;
  const blockEndCandidate = value.indexOf('\n', selectionEnd);
  const blockEnd = blockEndCandidate === -1 ? value.length : blockEndCandidate;
  const block = value.slice(blockStart, blockEnd);
  const lines = block.split('\n');
  const nextBlock = lines.map(line => indent + line).join('\n');
  const nextValue = value.slice(0, blockStart) + nextBlock + value.slice(blockEnd);

  const deltaPerLine = indent.length;
  const totalDelta = deltaPerLine * lines.length;
  return {
    value: nextValue,
    selectionStart: selectionStart + deltaPerLine,
    selectionEnd: selectionEnd + totalDelta,
  };
}

function applyOutdentFormatting(
  value: string,
  selectionStart: number,
  selectionEnd: number,
  indent: string,
): { value: string; selectionStart: number; selectionEnd: number } {
  const hasMultiline = value.slice(selectionStart, selectionEnd).includes('\n');

  const blockStart = value.lastIndexOf('\n', Math.max(0, selectionStart - 1)) + 1;
  const blockEndCandidate = value.indexOf('\n', selectionEnd);
  const blockEnd = blockEndCandidate === -1 ? value.length : blockEndCandidate;
  const block = value.slice(blockStart, blockEnd);
  const lines = block.split('\n');

  let removedBeforeSelectionStart = 0;
  let removedTotal = 0;

  const nextLines = lines.map((line, idx) => {
    let removed = 0;
    if (line.startsWith(indent)) {
      removed = indent.length;
      line = line.slice(indent.length);
    } else if (line.startsWith('\t')) {
      removed = 1;
      line = line.slice(1);
    } else if (line.startsWith(' ')) {
      removed = 1;
      line = line.slice(1);
    }

    removedTotal += removed;
    if (idx === 0 && selectionStart > blockStart) {
      removedBeforeSelectionStart += removed;
    }

    return line;
  });

  const nextBlock = nextLines.join('\n');
  const nextValue = value.slice(0, blockStart) + nextBlock + value.slice(blockEnd);

  if (!hasMultiline) {
    const removed = Math.min(indent.length, removedTotal);
    const nextPos = Math.max(blockStart, selectionStart - removed);
    return { value: nextValue, selectionStart: nextPos, selectionEnd: nextPos };
  }

  return {
    value: nextValue,
    selectionStart: Math.max(blockStart, selectionStart - removedBeforeSelectionStart),
    selectionEnd: Math.max(blockStart, selectionEnd - removedTotal),
  };
}

const SERIF_STACK = '"Iowan Old Style", "Palatino Linotype", "Book Antiqua", Georgia, "STSong", "SimSun", serif';
const SANS_STACK = '"Avenir Next", "Trebuchet MS", "Microsoft YaHei", sans-serif';

const styles = {
  container: {
    height: '100vh',
    position: 'relative' as const,
    display: 'flex',
    flexDirection: 'column' as const,
    borderRadius: '16px',
    overflow: 'hidden',
    fontFamily: SANS_STACK,
    boxShadow: '0 18px 54px rgba(29, 23, 17, 0.18)',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '8px',
    padding: '6px 10px',
    WebkitAppRegion: 'drag' as unknown as string,
    minHeight: '40px',
    borderBottom: '1px solid rgba(73, 55, 37, 0.08)',
    backdropFilter: 'blur(14px)',
  },
  headerActions: {
    display: 'flex',
    gap: '5px',
    flexWrap: 'wrap' as const,
    WebkitAppRegion: 'no-drag' as unknown as string,
  },
  iconBtn: {
    minWidth: 24,
    height: 24,
    padding: '0 8px',
    borderRadius: '9px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '12px',
    color: 'rgba(47, 37, 28, 0.72)',
    background: 'rgba(255,255,255,0.22)',
    transition: 'background 0.15s, color 0.15s, transform 0.15s',
  },
  textarea: {
    flex: 1,
    border: 'none',
    outline: 'none',
    resize: 'none' as const,
    padding: '8px 14px 14px',
    fontSize: '14px',
    lineHeight: '1.75',
    fontFamily: SERIF_STACK,
    background: 'transparent',
    color: 'rgba(39,30,22,0.82)',
  },
  body: {
    flex: 1,
    display: 'flex',
    minHeight: 0,
    WebkitAppRegion: 'no-drag' as unknown as string,
    background: 'linear-gradient(180deg, rgba(255,255,255,0.1), rgba(255,250,239,0.24))',
  },
  preview: {
    flex: 1,
    minWidth: 0,
    padding: '10px 14px 14px',
    overflow: 'auto',
    color: 'rgba(0,0,0,0.8)',
  },
  footer: {
    padding: '6px 12px 8px',
    fontSize: '10px',
    color: 'rgba(55, 43, 31, 0.42)',
    borderTop: '1px solid rgba(73, 55, 37, 0.08)',
    background: 'rgba(255,255,255,0.16)',
  },
  footerHint: {
    fontSize: '10px',
    letterSpacing: '0.04em',
    color: 'rgba(55, 43, 31, 0.5)',
  },
  modalOverlay: {
    position: 'absolute' as const,
    inset: 0,
    background: 'rgba(17,12,8,0.26)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '14px',
    WebkitAppRegion: 'no-drag' as unknown as string,
  },
  modal: {
    width: '100%',
    maxWidth: 352,
    borderRadius: 16,
    background: 'linear-gradient(180deg, rgba(255,252,247,0.98), rgba(248,241,229,0.96))',
    boxShadow: '0 18px 44px rgba(18,13,9,0.26)',
    padding: '14px 14px 12px',
    border: '1px solid rgba(73,55,37,0.08)',
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: 700,
    margin: '0 0 10px',
    color: '#31271d',
    fontFamily: SERIF_STACK,
    letterSpacing: '-0.03em',
  },
  shortcutRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    padding: '8px 0',
    borderTop: '1px solid rgba(73,55,37,0.08)',
  },
  shortcutLabel: {
    fontSize: 12,
    color: 'rgba(55,43,31,0.74)',
  },
  shortcutValue: {
    fontSize: 12,
    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
    color: 'rgba(40,31,23,0.82)',
    background: 'rgba(73,55,37,0.08)',
    padding: '3px 7px',
    borderRadius: 7,
    userSelect: 'text' as const,
  },
  modalActions: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: 8,
    marginTop: 12,
  },
};

export function NoteWindow() {
  const [note, setNote] = useState<StickyNote | null>(null);
  const noteRef = useRef<StickyNote | null>(null);
  const [pinned, setPinned] = useState(false);
  const [actionHint, setActionHint] = useState('');
  const [actionBusy, setActionBusy] = useState(false);
  const [ocrBusy, setOcrBusy] = useState(false);
  const [livePreviewEnabled, setLivePreviewEnabled] = useState(() => {
    try {
      return window.localStorage.getItem('desktop-assistant:note:live-preview') === '1';
    } catch (error) {
      console.warn('[note-window] failed to read live preview preference', error);
      return false;
    }
  });
  const [noteFontSize, setNoteFontSize] = useState(() => loadFontSizeFromStorage());
  const [shortcuts, setShortcuts] = useState<NoteShortcutConfig>(() => {
    try {
      return loadShortcutConfigFromStorage();
    } catch (error) {
      console.warn('[note-window] failed to init shortcuts', error);
      return getDefaultNoteShortcuts();
    }
  });
  const [shortcutModalOpen, setShortcutModalOpen] = useState(false);
  const [shortcutDraft, setShortcutDraft] = useState<NoteShortcutConfig>(() => getDefaultNoteShortcuts());
  const [recordingAction, setRecordingAction] = useState<NoteShortcutAction | null>(null);
  const [recordingHint, setRecordingHint] = useState('');
  const [colorPickerOpen, setColorPickerOpen] = useState(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const sourceTextareaRef = useRef<HTMLTextAreaElement>(null);

  // 从 URL 获取便签 ID
  const noteId = new URLSearchParams(window.location.search).get('id');

  const loadNote = useCallback(async () => {
    if (!noteId) return;
    const notes = await window.desktopAPI.getNotes();
    const found = notes.find(n => n.id === noteId);
    if (found) {
      setNote(found);
      setPinned(found.pinned);
    }
  }, [noteId]);

  useEffect(() => {
    loadNote();
  }, [loadNote]);

  useEffect(() => {
    noteRef.current = note;
  }, [note]);

  useEffect(() => {
    try {
      window.localStorage.setItem('desktop-assistant:note:live-preview', livePreviewEnabled ? '1' : '0');
    } catch (error) {
      console.warn('[note-window] failed to persist live preview preference', error);
    }
  }, [livePreviewEnabled]);

  useEffect(() => {
    try {
      persistFontSizeToStorage(noteFontSize);
    } catch (error) {
      console.warn('[note-window] failed to persist font size preference', error);
    }
  }, [noteFontSize]);

  useEffect(() => {
    if (!recordingAction) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        setRecordingAction(null);
        setRecordingHint('');
        return;
      }

      e.preventDefault();
      e.stopPropagation();

      const shortcut = shortcutFromKeyboardEvent(e);
      if (!shortcut) {
        setRecordingHint('请按下包含 Mod（Ctrl/Cmd）的组合键');
        return;
      }
      if (isReservedSystemShortcut(e)) {
        setRecordingHint('不能覆盖系统常用快捷键（复制/粘贴/撤销等）');
        return;
      }

      const nextDraft = { ...shortcutDraft, [recordingAction]: shortcut };
      const err = validateShortcutConfig(nextDraft);
      if (err) {
        setRecordingHint(err);
        return;
      }

      setShortcutDraft(nextDraft);
      setRecordingAction(null);
      setRecordingHint('');
    };

    window.addEventListener('keydown', onKeyDown, true);
    return () => window.removeEventListener('keydown', onKeyDown, true);
  }, [recordingAction, shortcutDraft]);

  const handleContentChange = useCallback((content: string) => {
    const current = noteRef.current;
    if (!current) return;
    if (content === current.content) return;

    setNote(prev => (prev ? { ...prev, content } : prev));

    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      window.desktopAPI.saveNote({ id: current.id, content });
    }, 300);
  }, []);

  const insertTextAtCursor = useCallback(
    (text: string) => {
      const current = noteRef.current;
      if (!current) return;

      const base = current.content ?? '';
      const needsLeadingNewline = base.length > 0 && !base.endsWith('\n');
      const insertion = `${needsLeadingNewline ? '\n' : ''}${text}\n`;

      if (!livePreviewEnabled) {
        const textarea = sourceTextareaRef.current;
        if (textarea) {
          const selectionStart = textarea.selectionStart ?? base.length;
          const selectionEnd = textarea.selectionEnd ?? selectionStart;
          const nextContent = `${base.slice(0, selectionStart)}${insertion}${base.slice(selectionEnd)}`;
          handleContentChange(nextContent);

          const nextCaret = selectionStart + insertion.length;
          requestAnimationFrame(() => {
            textarea.focus();
            textarea.selectionStart = nextCaret;
            textarea.selectionEnd = nextCaret;
          });
          return;
        }
      }

      handleContentChange(base + insertion);
    },
    [handleContentChange, livePreviewEnabled],
  );

  useEffect(() => {
    const unsubscribe = window.desktopAPI.onOcrResult(payload => {
      const current = noteRef.current;
      if (!current || payload.noteId !== current.id) return;

      setOcrBusy(false);
      if (payload.ok) {
        insertTextAtCursor(payload.text);
        setActionHint('OCR 识别结果已插入');
      } else {
        setActionHint(payload.message || 'OCR 识别失败');
      }
    });

    return () => unsubscribe();
  }, [insertTextAtCursor]);

  const handleOcr = useCallback(async () => {
    const current = noteRef.current;
    if (!current) return;
    if (actionBusy || ocrBusy) return;

    setOcrBusy(true);
    setActionHint('请在弹出的 OCR 截图窗口中框选区域...');

    try {
      const ok = await window.desktopAPI.openOcrCapture(current.id);
      if (!ok) {
        setOcrBusy(false);
        setActionHint('打开 OCR 截图失败');
      }
    } catch (error) {
      setOcrBusy(false);
      const detail = error instanceof Error ? error.message : '打开 OCR 截图失败';
      setActionHint(detail || '打开 OCR 截图失败');
    }
  }, [actionBusy, ocrBusy]);

  const handlePin = async () => {
    if (!note) return;
    const newPinned = !pinned;
    setPinned(newPinned);
    await window.desktopAPI.pinWindow(newPinned);
    await window.desktopAPI.saveNote({ id: note.id, pinned: newPinned });
  };

  const handleDelete = async () => {
    if (!note) return;
    if (actionBusy) return;
    const confirmed = window.confirm('将便签移入垃圾桶？可在主面板垃圾桶中恢复。');
    if (!confirmed) return;

    setActionBusy(true);
    setActionHint('正在移入垃圾桶...');

    try {
      const ok = await window.desktopAPI.deleteNote(note.id);
      if (!ok) {
        setActionBusy(false);
        setActionHint('移入垃圾桶失败');
        return;
      }

      setActionHint('已移入垃圾桶，可在主面板垃圾桶中恢复');
      setTimeout(() => {
        void window.desktopAPI.closeWindow();
      }, 650);
    } catch (error) {
      setActionBusy(false);
      const detail = error instanceof Error ? error.message : '移入垃圾桶失败';
      setActionHint(detail || '移入垃圾桶失败');
    }
  };

  const handleClose = () => {
    window.desktopAPI.closeWindow();
  };

  const handleColorChange = useCallback((newColor: string) => {
    if (!note) return;
    const updated = { ...note, color: newColor };
    setNote(updated);
    window.desktopAPI.saveNote({ id: note.id, color: newColor });
  }, [note]);

  const handleOpacityChange = useCallback((newOpacity: number) => {
    if (!note) return;
    const updated = { ...note, opacity: newOpacity };
    setNote(updated);
    window.desktopAPI.saveNote({ id: note.id, opacity: newOpacity });
  }, [note]);

  const openShortcutModal = () => {
    setShortcutDraft(shortcuts);
    setRecordingAction(null);
    setRecordingHint('');
    setShortcutModalOpen(true);
  };

  const saveShortcutDraft = () => {
    const err = validateShortcutConfig(shortcutDraft);
    if (err) {
      window.alert(err);
      return;
    }

    try {
      persistShortcutConfigToStorage(shortcutDraft);
      setShortcuts(shortcutDraft);
      setShortcutModalOpen(false);
    } catch (error) {
      console.warn('[note-window] failed to persist shortcuts', error);
      window.alert('保存快捷键失败');
    }
  };

  const toggleEditorMode = useCallback(() => {
    setLivePreviewEnabled(v => !v);
  }, []);

  const handleTextareaKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (!note) return;

    if (e.key === 'Tab' && !e.ctrlKey && !e.metaKey && !e.altKey) {
      e.preventDefault();
      const textarea = e.currentTarget;
      const { value, selectionStart, selectionEnd } = textarea;
      const next = e.shiftKey
        ? applyOutdentFormatting(value, selectionStart, selectionEnd, NOTE_INDENT)
        : applyIndentFormatting(value, selectionStart, selectionEnd, NOTE_INDENT);
      handleContentChange(next.value);
      requestAnimationFrame(() => {
        textarea.selectionStart = next.selectionStart;
        textarea.selectionEnd = next.selectionEnd;
      });
      return;
    }

    if (!e.ctrlKey && !e.metaKey) return;
    if (isReservedSystemShortcut(e.nativeEvent)) return;

    const shortcut = shortcutFromKeyboardEvent(e.nativeEvent);
    if (!shortcut) return;

    const action = (Object.keys(shortcuts) as NoteShortcutAction[]).find(a => shortcuts[a] === shortcut);
    if (!action) return;

    e.preventDefault();
    if (action === 'toggleLivePreview') {
      toggleEditorMode();
      return;
    }
    if (action === 'togglePin') {
      void handlePin();
      return;
    }
    if (action === 'moveToTrash') {
      void handleDelete();
    }
  };

  useEffect(() => {
    if (recordingAction) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (!e.ctrlKey && !e.metaKey) return;
      if (isReservedSystemShortcut(e)) return;

      const shortcut = shortcutFromKeyboardEvent(e);
      if (!shortcut) return;

      const action = (Object.keys(shortcuts) as NoteShortcutAction[]).find(a => shortcuts[a] === shortcut);
      if (!action) return;

      e.preventDefault();

      if (action === 'toggleLivePreview') {
        toggleEditorMode();
        return;
      }
      if (action === 'togglePin') {
        void handlePin();
        return;
      }
      if (action === 'moveToTrash') {
        void handleDelete();
      }
    };

    window.addEventListener('keydown', onKeyDown, true);
    return () => window.removeEventListener('keydown', onKeyDown, true);
  }, [handleDelete, handlePin, recordingAction, shortcuts, toggleEditorMode]);

  if (!note) return null;

  const darkenColor = (hex: string, amount: number): string => {
    const num = parseInt(hex.replace('#', ''), 16);
    const r = Math.max(0, (num >> 16) - amount);
    const g = Math.max(0, ((num >> 8) & 0x00ff) - amount);
    const b = Math.max(0, (num & 0x0000ff) - amount);
    return `rgb(${r},${g},${b})`;
  };

  const noteOpacity = note.opacity ?? 100;
  const bgRgba = hexToRgba(note.color, noteOpacity);
  const headerBg = darkenColor(note.color, 15);

  return (
    <div style={{ ...styles.container, background: bgRgba }}>
      <div style={{ ...styles.header, background: `linear-gradient(180deg, ${headerBg}, ${darkenColor(note.color, 24)})` }}>
        <div style={styles.headerActions}>
          <button
            style={{
              ...styles.iconBtn,
              color: pinned ? '#a5241a' : 'rgba(44,34,25,0.7)',
            }}
            onClick={handlePin}
            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(0,0,0,0.08)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            title={pinned ? '取消固定' : '固定到桌面'}
            aria-label={pinned ? '取消固定' : '固定到桌面'}
          >
            📌
          </button>

          <button
            style={{
              ...styles.iconBtn,
              fontSize: '11px',
              color: livePreviewEnabled ? 'rgba(0,0,0,0.85)' : 'rgba(0,0,0,0.5)',
            }}
            onClick={toggleEditorMode}
            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(0,0,0,0.08)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            title={livePreviewEnabled ? '切换到源码模式' : '切换到预览模式'}
            aria-label={livePreviewEnabled ? '切换到源码模式' : '切换到预览模式'}
          >
            {livePreviewEnabled ? '源码' : '预览'}
          </button>

          <button
            style={{
              ...styles.iconBtn,
              fontSize: '11px',
              opacity: noteFontSize <= NOTE_FONT_SIZE_MIN ? 0.35 : 1,
            }}
            onClick={() => setNoteFontSize(v => clampFontSize(v - 1))}
            disabled={noteFontSize <= NOTE_FONT_SIZE_MIN}
            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(0,0,0,0.08)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            title={`减小字号（当前 ${noteFontSize}px）`}
            aria-label="减小字号"
          >
            A-
          </button>

          <button
            style={{
              ...styles.iconBtn,
              fontSize: '11px',
              opacity: noteFontSize >= NOTE_FONT_SIZE_MAX ? 0.35 : 1,
            }}
            onClick={() => setNoteFontSize(v => clampFontSize(v + 1))}
            disabled={noteFontSize >= NOTE_FONT_SIZE_MAX}
            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(0,0,0,0.08)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            title={`增大字号（当前 ${noteFontSize}px）`}
            aria-label="增大字号"
          >
            A+
          </button>

          <button
            style={styles.iconBtn}
            onClick={openShortcutModal}
            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(0,0,0,0.08)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            title="快捷键设置"
            aria-label="快捷键设置"
          >
            ⌨
          </button>

          <button
            style={{ ...styles.iconBtn, fontSize: '11px' }}
            onClick={() => void handleOcr()}
            disabled={actionBusy || ocrBusy}
            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(0,0,0,0.08)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            title="OCR 截图识别文字"
            aria-label="OCR 截图识别文字"
          >
            OCR
          </button>

          <button
            style={styles.iconBtn}
            onClick={() => setColorPickerOpen(v => !v)}
            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(0,0,0,0.08)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            title="背景颜色与透明度"
            aria-label="背景颜色与透明度"
          >
            🎨
          </button>
        </div>
        <div style={styles.headerActions}>
          <button
            style={styles.iconBtn}
            onClick={handleClose}
            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(0,0,0,0.08)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            title="关闭"
            aria-label="关闭便签窗口"
          >
            ✕
          </button>
        </div>
      </div>

      <div style={styles.body}>
        <div style={{ flex: 1, minHeight: 0 }} className="note-mdx">
          <style>{`
            .note-mdx {
              display: flex;
              min-height: 0;
              user-select: text;
              -webkit-user-select: text;
            }
            .note-mdx .note-mdx-editor,
            .note-mdx .mdxeditor-diff-source-wrapper,
            .note-mdx .mdxeditor-rich-text-editor {
              display: flex !important;
              flex: 1 1 0 !important;
              flex-direction: column !important;
              min-height: 0 !important;
              overflow: hidden !important;
            }
            .note-mdx .mdxeditor-source-editor,
            .note-mdx .cm-editor {
              flex: 1;
              min-height: 0;
            }
            .note-mdx .cm-editor {
              height: 100%;
            }
            .note-mdx .cm-scroller,
            .note-mdx .mdxeditor-root-contenteditable {
              flex: 1;
              min-height: 0;
              overflow-x: hidden;
              overflow-y: auto;
              overscroll-behavior: contain;
              scrollbar-gutter: stable;
            }
            .note-mdx .mdxeditor-root-contenteditable > div {
              display: block;
              min-height: 100%;
            }
            .note-mdx .note-mdx-prose {
              display: block;
              width: 100%;
              min-height: 100%;
              font-size: ${noteFontSize}px;
              line-height: 1.8;
              color: rgba(39,30,22,0.84);
              padding: 10px 16px 18px;
              outline: none;
              font-family: ${SERIF_STACK};
            }
            .note-mdx .note-mdx-prose p,
            .note-mdx .note-mdx-prose li {
              letter-spacing: 0.01em;
            }
            .note-mdx .note-mdx-prose h1,
            .note-mdx .note-mdx-prose h2,
            .note-mdx .note-mdx-prose h3 {
              font-family: ${SERIF_STACK};
              color: rgba(36,29,22,0.92);
              letter-spacing: -0.03em;
            }
            .note-mdx .note-mdx-prose blockquote {
              margin: 0.8em 0;
              padding-left: 12px;
              border-left: 2px solid rgba(88, 66, 43, 0.22);
              color: rgba(66, 52, 39, 0.72);
            }
          `}</style>

          {livePreviewEnabled ? (
            <div
              className="note-markdown-preview"
              style={{ ...styles.preview, fontSize: `${noteFontSize}px`, overflowY: 'auto' }}
              dangerouslySetInnerHTML={{ __html: renderMarkdownToSafeHtml(note.content || '') }}
              aria-label="便签预览"
            />
          ) : (
            <textarea
              ref={sourceTextareaRef}
              className="note-source-textarea"
              value={note.content}
              onChange={e => handleContentChange(e.target.value)}
              onKeyDown={handleTextareaKeyDown}
              readOnly={actionBusy}
              spellCheck={false}
              style={{ ...styles.textarea, fontSize: `${noteFontSize}px`, padding: '10px 16px 18px' }}
              aria-label="便签源码编辑器"
            />
          )}
        </div>
      </div>

      <div style={{ ...styles.footer, display: 'flex', justifyContent: 'space-between', gap: 8 }}>
        <span style={styles.footerHint}>{actionHint || '写一点今天要记住的话。'}</span>
        <span>{new Date(note.updatedAt).toLocaleString('zh-CN')}</span>
      </div>

      {colorPickerOpen && note ? (
        <ColorOpacityPicker
          color={note.color}
          opacity={note.opacity ?? 100}
          onColorChange={handleColorChange}
          onOpacityChange={handleOpacityChange}
          onClose={() => setColorPickerOpen(false)}
        />
      ) : null}

      {shortcutModalOpen ? (
        <div
          style={styles.modalOverlay}
          onClick={() => {
            if (recordingAction) return;
            setShortcutModalOpen(false);
          }}
          role="dialog"
          aria-label="快捷键设置"
        >
          <div
            style={styles.modal}
            onClick={e => e.stopPropagation()}
            aria-label="快捷键设置面板"
          >
            <div style={styles.modalTitle}>快捷键设置</div>

            <div style={{ fontSize: 11, color: 'rgba(0,0,0,0.55)', marginBottom: 6 }}>
              {recordingAction
                ? '按下组合键以设置（Esc 取消）。'
                : '仅支持包含 Mod（Ctrl/Cmd）的组合键，避免影响输入。'}
            </div>
            {recordingHint ? (
              <div style={{ fontSize: 11, color: 'rgba(229,57,53,0.9)', marginBottom: 6 }}>{recordingHint}</div>
            ) : null}

            <div style={styles.shortcutRow}>
              <div style={styles.shortcutLabel}>编辑模式</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={styles.shortcutValue}>{shortcutDraft.toggleLivePreview}</span>
                <button
                  style={styles.iconBtn}
                  onClick={() => {
                    setRecordingHint('');
                    setRecordingAction('toggleLivePreview');
                  }}
                  title="设置"
                  aria-label="设置编辑模式快捷键"
                >
                  设
                </button>
              </div>
            </div>

            <div style={styles.shortcutRow}>
              <div style={styles.shortcutLabel}>固定到桌面</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={styles.shortcutValue}>{shortcutDraft.togglePin}</span>
                <button
                  style={styles.iconBtn}
                  onClick={() => {
                    setRecordingHint('');
                    setRecordingAction('togglePin');
                  }}
                  title="设置"
                  aria-label="设置固定快捷键"
                >
                  设
                </button>
              </div>
            </div>

            <div style={styles.shortcutRow}>
              <div style={styles.shortcutLabel}>移入垃圾桶</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={styles.shortcutValue}>{shortcutDraft.moveToTrash}</span>
                <button
                  style={styles.iconBtn}
                  onClick={() => {
                    setRecordingHint('');
                    setRecordingAction('moveToTrash');
                  }}
                  title="设置"
                  aria-label="设置删除快捷键"
                >
                  设
                </button>
              </div>
            </div>

            <div style={styles.modalActions}>
              <button
                style={styles.iconBtn}
                onClick={() => {
                  if (recordingAction) return;
                  setShortcutDraft(getDefaultNoteShortcuts());
                }}
                title="恢复默认"
                aria-label="恢复默认快捷键"
              >
                默认
              </button>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  style={styles.iconBtn}
                  onClick={() => {
                    if (recordingAction) return;
                    setShortcutModalOpen(false);
                  }}
                  title="取消"
                  aria-label="取消快捷键设置"
                >
                  取消
                </button>
                <button
                  style={styles.iconBtn}
                  onClick={() => {
                    if (recordingAction) return;
                    saveShortcutDraft();
                  }}
                  title="保存"
                  aria-label="保存快捷键"
                >
                  保存
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
