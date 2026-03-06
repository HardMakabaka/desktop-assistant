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
};

export function NoteWindow() {
  const [note, setNote] = useState<StickyNote | null>(null);
  const [pinned, setPinned] = useState(false);
  const [livePreviewEnabled, setLivePreviewEnabled] = useState(() => {
    try {
      return window.localStorage.getItem('desktop-assistant:note:live-preview') === '1';
    } catch (error) {
      console.warn('[note-window] failed to read live preview preference', error);
      return false;
    }
  });
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

      <div style={styles.body}>
        <textarea
          ref={textareaRef}
          style={styles.textarea}
          value={note.content}
          onChange={e => handleContentChange(e.target.value)}
          placeholder="在这里写点什么..."
          aria-label="便签内容"
        />

        {livePreviewEnabled ? (
          <div
            style={styles.preview}
            aria-label="实时预览"
            dangerouslySetInnerHTML={{ __html: previewHtml }}
          />
        ) : null}
      </div>

      <div style={styles.footer}>
        {new Date(note.updatedAt).toLocaleString('zh-CN')}
      </div>
    </div>
  );
}
