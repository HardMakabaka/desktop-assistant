import React, { useEffect, useState, useRef, useCallback } from 'react';
import type { StickyNote } from '../../shared/types';

const styles = {
  container: {
    height: '100vh',
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
  footer: {
    padding: '4px 10px 6px',
    fontSize: '10px',
    color: 'rgba(0,0,0,0.3)',
    textAlign: 'right' as const,
  },
};

export function NoteWindow() {
  const [note, setNote] = useState<StickyNote | null>(null);
  const [pinned, setPinned] = useState(false);
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
    if (note && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [note]);

  const handleContentChange = (content: string) => {
    if (!note) return;
    setNote({ ...note, content });

    // 防抖保存
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      window.desktopAPI.saveNote({ id: note.id, content });
    }, 300);
  };

  const handlePin = async () => {
    if (!note) return;
    const newPinned = !pinned;
    setPinned(newPinned);
    await window.desktopAPI.pinWindow(newPinned);
    await window.desktopAPI.saveNote({ id: note.id, pinned: newPinned });
  };

  const handleDelete = async () => {
    if (!note) return;
    await window.desktopAPI.deleteNote(note.id);
  };

  const handleClose = () => {
    window.desktopAPI.closeWindow();
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
        </div>
        <div style={styles.headerActions}>
          <button
            style={styles.iconBtn}
            onClick={handleDelete}
            onMouseEnter={e => {
              e.currentTarget.style.background = 'rgba(229,57,53,0.15)';
              e.currentTarget.style.color = '#e53935';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'transparent';
              e.currentTarget.style.color = 'rgba(0,0,0,0.5)';
            }}
            title="删除便签"
            aria-label="删除便签"
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

      <textarea
        ref={textareaRef}
        style={styles.textarea}
        value={note.content}
        onChange={e => handleContentChange(e.target.value)}
        placeholder="在这里写点什么..."
        aria-label="便签内容"
      />

      <div style={styles.footer}>
        {new Date(note.updatedAt).toLocaleString('zh-CN')}
      </div>
    </div>
  );
}
