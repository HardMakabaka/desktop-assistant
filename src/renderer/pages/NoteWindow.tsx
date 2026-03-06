import React, { useEffect, useState, useRef, useCallback } from 'react';
import type { StickyNote } from '../../shared/types';

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

const styles = {
  container: {
    height: '100vh',
    position: 'relative' as const,
    display: 'flex',
    flexDirection: 'column' as const,
    borderRadius: '10px',
    overflow: 'hidden',
    boxShadow: '0 4px 24px rgba(0,0,0,0.15)',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '6px 8px',
    WebkitAppRegion: 'drag' as unknown as string,
    minHeight: '32px',
  },
  headerActions: {
    display: 'flex',
    gap: '4px',
    WebkitAppRegion: 'no-drag' as unknown as string,
  },
  iconBtn: {
    width: 24,
    height: 24,
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '12px',
    color: 'rgba(0,0,0,0.5)',
    transition: 'background 0.15s, color 0.15s',
  },
  textarea: {
    flex: 1,
    border: 'none',
    outline: 'none',
    resize: 'none' as const,
    padding: '8px 14px 14px',
    fontSize: '14px',
    lineHeight: '1.6',
    fontFamily: 'inherit',
    background: 'transparent',
    color: 'rgba(0,0,0,0.8)',
  },
  body: {
    flex: 1,
    display: 'flex',
    minHeight: 0,
  },
  preview: {
    flex: 1,
    minWidth: 0,
    padding: '10px 14px 14px',
    overflow: 'auto',
    color: 'rgba(0,0,0,0.8)',
  },
  footer: {
    padding: '4px 10px 6px',
    fontSize: '10px',
    color: 'rgba(0,0,0,0.3)',
    textAlign: 'right' as const,
  },
  modalOverlay: {
    position: 'absolute' as const,
    inset: 0,
    background: 'rgba(0,0,0,0.25)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '14px',
    WebkitAppRegion: 'no-drag' as unknown as string,
  },
  modal: {
    width: '100%',
    maxWidth: 340,
    borderRadius: 12,
    background: 'rgba(255,255,255,0.96)',
    boxShadow: '0 12px 40px rgba(0,0,0,0.25)',
    padding: '12px 12px 10px',
  },
  modalTitle: {
    fontSize: 13,
    fontWeight: 700,
    margin: '0 0 10px',
    color: 'rgba(0,0,0,0.82)',
  },
  shortcutRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    padding: '6px 0',
    borderTop: '1px solid rgba(0,0,0,0.06)',
  },
  shortcutLabel: {
    fontSize: 12,
    color: 'rgba(0,0,0,0.7)',
  },
  shortcutValue: {
    fontSize: 12,
    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
    color: 'rgba(0,0,0,0.82)',
    background: 'rgba(0,0,0,0.06)',
    padding: '2px 6px',
    borderRadius: 6,
    userSelect: 'text' as const,
  },
  modalActions: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: 8,
    marginTop: 10,
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
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout>>();

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
    if (note && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [note]);

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
    setNote(prev => (prev ? { ...prev, content } : prev));

    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      window.desktopAPI.saveNote({ id: current.id, content });
    }, 300);
  }, []);

  const insertTextAtCursor = useCallback(
    (text: string) => {
      const current = noteRef.current;
      const textarea = textareaRef.current;
      if (!current || !textarea) return;

      const value = current.content;
      const start = typeof textarea.selectionStart === 'number' ? textarea.selectionStart : value.length;
      const end = typeof textarea.selectionEnd === 'number' ? textarea.selectionEnd : value.length;
      const prefix = value.slice(0, start);
      const suffix = value.slice(end);

      const needsLeadingNewline = prefix.length > 0 && !prefix.endsWith('\n');
      const insertion = `${needsLeadingNewline ? '\n' : ''}${text}\n`;
      const nextValue = prefix + insertion + suffix;
      handleContentChange(nextValue);

      requestAnimationFrame(() => {
        if (!textareaRef.current) return;
        const nextPos = start + insertion.length;
        textareaRef.current.focus();
        textareaRef.current.selectionStart = nextPos;
        textareaRef.current.selectionEnd = nextPos;
      });
    },
    [handleContentChange],
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
        if (!textareaRef.current) return;
        textareaRef.current.selectionStart = next.selectionStart;
        textareaRef.current.selectionEnd = next.selectionEnd;
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
      setLivePreviewEnabled(v => !v);
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

  if (!note) return null;

  const darkenColor = (hex: string, amount: number): string => {
    const num = parseInt(hex.replace('#', ''), 16);
    const r = Math.max(0, (num >> 16) - amount);
    const g = Math.max(0, ((num >> 8) & 0x00ff) - amount);
    const b = Math.max(0, (num & 0x0000ff) - amount);
    return `rgb(${r},${g},${b})`;
  };

  const headerBg = darkenColor(note.color, 15);
  const previewHtml = livePreviewEnabled ? renderMarkdownToSafeHtml(note.content) : '';

  return (
    <div style={{ ...styles.container, background: note.color }}>
      <div style={{ ...styles.header, background: headerBg }}>
        <div style={styles.headerActions}>
          <button
            style={{
              ...styles.iconBtn,
              color: pinned ? '#e53935' : 'rgba(0,0,0,0.5)',
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
            onClick={() => setLivePreviewEnabled(v => !v)}
            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(0,0,0,0.08)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            title={livePreviewEnabled ? '切换到源码模式' : '开启实时预览'}
            aria-label={livePreviewEnabled ? '切换到源码模式' : '开启实时预览'}
          >
            {livePreviewEnabled ? '源码' : '预览'}
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
        </div>
        <div style={styles.headerActions}>
          <button
            style={styles.iconBtn}
            onClick={handleDelete}
            disabled={actionBusy}
            onMouseEnter={e => {
              e.currentTarget.style.background = 'rgba(229,57,53,0.15)';
              e.currentTarget.style.color = '#e53935';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'transparent';
              e.currentTarget.style.color = 'rgba(0,0,0,0.5)';
            }}
            title="移入垃圾桶"
            aria-label="移入垃圾桶"
          >
            🗑
          </button>
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
        <textarea
          ref={textareaRef}
          style={styles.textarea}
          value={note.content}
          onChange={e => handleContentChange(e.target.value)}
          onKeyDown={handleTextareaKeyDown}
          placeholder="在这里写点什么..."
          aria-label="便签内容"
          disabled={actionBusy}
        />

        {livePreviewEnabled ? (
          <div
            style={styles.preview}
            aria-label="实时预览"
            dangerouslySetInnerHTML={{ __html: previewHtml }}
          />
        ) : null}
      </div>

      <div style={{ ...styles.footer, display: 'flex', justifyContent: 'space-between' }}>
        <span>{actionHint}</span>
        <span>{new Date(note.updatedAt).toLocaleString('zh-CN')}</span>
      </div>

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
              <div style={styles.shortcutLabel}>实时预览</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={styles.shortcutValue}>{shortcutDraft.toggleLivePreview}</span>
                <button
                  style={styles.iconBtn}
                  onClick={() => {
                    setRecordingHint('');
                    setRecordingAction('toggleLivePreview');
                  }}
                  title="设置"
                  aria-label="设置实时预览快捷键"
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
