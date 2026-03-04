import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import type { StickyNote } from '../../shared/types';

const NOTE_COLORS = ['#fff9c4', '#c8e6c9', '#bbdefb', '#f8bbd0', '#e1bee7', '#ffe0b2', '#d7ccc8', '#b2dfdb'];

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
  modeToggle: {
    display: 'inline-flex',
    borderRadius: '999px',
    background: 'rgba(255,255,255,0.34)',
    padding: '2px',
    gap: '2px',
  },
  modeBtn: {
    border: 'none',
    borderRadius: '999px',
    padding: '2px 8px',
    fontSize: '11px',
    color: 'rgba(0,0,0,0.62)',
    background: 'transparent',
    cursor: 'pointer',
    transition: 'background 0.15s, color 0.15s',
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
  sourceTextarea: {
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
  previewLayout: {
    flex: 1,
    display: 'grid',
    gridTemplateRows: 'minmax(120px, 42%) minmax(0, 1fr)',
  },
  previewInput: {
    border: 'none',
    outline: 'none',
    resize: 'none' as const,
    padding: '8px 14px',
    fontSize: '14px',
    lineHeight: '1.6',
    fontFamily: 'inherit',
    background: 'rgba(255,255,255,0.34)',
    color: 'rgba(0,0,0,0.86)',
    borderBottom: '1px solid rgba(0,0,0,0.1)',
  },
  previewPane: {
    overflow: 'auto' as const,
    padding: '10px 14px 14px',
    fontSize: '14px',
    lineHeight: '1.7',
    color: 'rgba(0,0,0,0.83)',
  },
  footer: {
    padding: '6px 10px 8px',
    fontSize: '10px',
    color: 'rgba(0,0,0,0.3)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '8px',
  },
  colorRow: {
    display: 'flex',
    gap: '6px',
  },
  colorDot: {
    width: 14,
    height: 14,
    borderRadius: '50%',
    border: '1px solid rgba(0,0,0,0.12)',
    cursor: 'pointer',
    transition: 'transform 0.15s, box-shadow 0.15s',
  },
  rangeWrap: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    color: 'rgba(0,0,0,0.45)',
    fontSize: '10px',
  },
  range: {
    width: '78px',
  },
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function sanitizeUrl(raw: string): string | null {
  const value = raw.trim();
  if (!value) return null;

  if (/^(https?:|file:|\/|\.\/|\.\.\/|data:image\/)/i.test(value)) {
    return value;
  }

  return null;
}

function renderInlineMarkdown(line: string): string {
  let html = escapeHtml(line);

  html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (_full, alt, src) => {
    const safe = sanitizeUrl(src);
    if (!safe) return `![${escapeHtml(alt)}](${escapeHtml(src)})`;
    return `<img src="${escapeHtml(safe)}" alt="${escapeHtml(alt)}" style="max-width:100%;border-radius:6px;display:block;margin:6px 0;" />`;
  });

  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_full, text, href) => {
    const safe = sanitizeUrl(href);
    if (!safe) return `[${escapeHtml(text)}](${escapeHtml(href)})`;
    return `<a href="${escapeHtml(safe)}" target="_blank" rel="noreferrer" style="color:#1565c0;">${escapeHtml(text)}</a>`;
  });

  return html.replace(/`([^`]+)`/g, (_full, code) => {
    return `<code style="background:rgba(0,0,0,0.08);padding:1px 4px;border-radius:4px;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;">${escapeHtml(code)}</code>`;
  });
}

function renderMarkdownToHtml(markdown: string): string {
  const lines = markdown.replace(/\r\n?/g, '\n').split('\n');
  const html: string[] = [];

  let inCodeBlock = false;
  let codeBuffer: string[] = [];
  let codeLang = '';
  let listMode: 'ul' | 'ol' | null = null;

  const closeList = () => {
    if (listMode) {
      html.push(`</${listMode}>`);
      listMode = null;
    }
  };

  const flushCode = () => {
    const langClass = codeLang ? ` class="language-${escapeHtml(codeLang)}"` : '';
    html.push(`<pre style="margin:8px 0;padding:8px 10px;background:rgba(0,0,0,0.08);border-radius:8px;overflow:auto;"><code${langClass}>${escapeHtml(codeBuffer.join('\n'))}</code></pre>`);
    codeBuffer = [];
    codeLang = '';
  };

  for (const line of lines) {
    const codeFence = line.match(/^```\s*([^\s`]+)?\s*$/);
    if (codeFence) {
      closeList();
      if (!inCodeBlock) {
        inCodeBlock = true;
        codeLang = codeFence[1] ?? '';
      } else {
        inCodeBlock = false;
        flushCode();
      }
      continue;
    }

    if (inCodeBlock) {
      codeBuffer.push(line);
      continue;
    }

    if (!line.trim()) {
      closeList();
      continue;
    }

    const headingMatch = line.match(/^(#{1,6})\s+(.*)$/);
    if (headingMatch) {
      closeList();
      const level = headingMatch[1].length;
      html.push(`<h${level} style="margin:10px 0 6px;font-size:${Math.max(16, 28 - level * 2)}px;line-height:1.35;">${renderInlineMarkdown(headingMatch[2])}</h${level}>`);
      continue;
    }

    const orderedMatch = line.match(/^\d+\.\s+(.*)$/);
    if (orderedMatch) {
      if (listMode !== 'ol') {
        closeList();
        html.push('<ol style="margin:6px 0 8px;padding-left:22px;">');
        listMode = 'ol';
      }
      html.push(`<li>${renderInlineMarkdown(orderedMatch[1])}</li>`);
      continue;
    }

    const unorderedMatch = line.match(/^[-*]\s+(.*)$/);
    if (unorderedMatch) {
      if (listMode !== 'ul') {
        closeList();
        html.push('<ul style="margin:6px 0 8px;padding-left:22px;">');
        listMode = 'ul';
      }
      html.push(`<li>${renderInlineMarkdown(unorderedMatch[1])}</li>`);
      continue;
    }

    const quoteMatch = line.match(/^>\s?(.*)$/);
    if (quoteMatch) {
      closeList();
      html.push(`<blockquote style="margin:8px 0;padding:2px 0 2px 10px;border-left:3px solid rgba(0,0,0,0.2);color:rgba(0,0,0,0.68);">${renderInlineMarkdown(quoteMatch[1])}</blockquote>`);
      continue;
    }

    closeList();
    html.push(`<p style="margin:7px 0;">${renderInlineMarkdown(line)}</p>`);
  }

  closeList();

  if (inCodeBlock) {
    flushCode();
  }

  if (html.length === 0) {
    return '<p style="margin:7px 0;color:rgba(0,0,0,0.45);">在上方输入 Markdown 内容，这里会实时预览。</p>';
  }

  return html.join('');
}

export function NoteWindow() {
  const [note, setNote] = useState<StickyNote | null>(null);
  const [pinned, setPinned] = useState(false);
  const [editorMode, setEditorMode] = useState<'preview' | 'source'>('preview');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout>>();

  const renderedMarkdown = useMemo(() => {
    return renderMarkdownToHtml(note?.content ?? '');
  }, [note?.content]);

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

  const handleMoveToTrash = async () => {
    if (!note) return;
    await window.desktopAPI.deleteNote(note.id);
    await window.desktopAPI.closeWindow();
  };

  const handleClose = () => {
    window.desktopAPI.closeWindow();
  };

  const handleColorChange = (color: string) => {
    if (!note) return;
    const next = { ...note, color };
    setNote(next);
    window.desktopAPI.saveNote({ id: note.id, color });
  };

  const handleOpacityChange = (opacity: number) => {
    if (!note) return;
    const next = { ...note, opacity };
    setNote(next);
    window.desktopAPI.saveNote({ id: note.id, opacity });
  };

  if (!note) return null;

  const darkenColor = (hex: string, amount: number): string => {
    const num = parseInt(hex.replace('#', ''), 16);
    const r = Math.max(0, (num >> 16) - amount);
    const g = Math.max(0, ((num >> 8) & 0x00ff) - amount);
    const b = Math.max(0, (num & 0x0000ff) - amount);
    return `#${[r, g, b].map(v => v.toString(16).padStart(2, '0')).join('')}`;
  };

  const headerBg = darkenColor(note.color, 15);
  const normalizedOpacity = Math.min(1, Math.max(0.2, note.opacity ?? 0.92));

  const toRgba = (hex: string, alpha: number): string => {
    const value = hex.replace('#', '');
    const color = value.length === 3
      ? value.split('').map(ch => ch + ch).join('')
      : value;
    const r = Number.parseInt(color.slice(0, 2), 16);
    const g = Number.parseInt(color.slice(2, 4), 16);
    const b = Number.parseInt(color.slice(4, 6), 16);
    return `rgba(${r},${g},${b},${alpha})`;
  };

  return (
    <div style={{ ...styles.container, background: toRgba(note.color, normalizedOpacity) }}>
      <div style={{ ...styles.header, background: toRgba(headerBg, Math.min(1, normalizedOpacity + 0.06)) }}>
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
          <div style={styles.modeToggle} aria-label="编辑模式切换">
            <button
              style={{
                ...styles.modeBtn,
                background: editorMode === 'preview' ? 'rgba(255,255,255,0.74)' : 'transparent',
                color: editorMode === 'preview' ? 'rgba(0,0,0,0.9)' : 'rgba(0,0,0,0.62)',
              }}
              onClick={() => setEditorMode('preview')}
              title="实时预览"
              aria-label="切换到实时预览模式"
            >
              预览
            </button>
            <button
              style={{
                ...styles.modeBtn,
                background: editorMode === 'source' ? 'rgba(255,255,255,0.74)' : 'transparent',
                color: editorMode === 'source' ? 'rgba(0,0,0,0.9)' : 'rgba(0,0,0,0.62)',
              }}
              onClick={() => setEditorMode('source')}
              title="源码模式"
              aria-label="切换到源码模式"
            >
              源码
            </button>
          </div>
        </div>
        <div style={styles.headerActions}>
          <button
            style={styles.iconBtn}
            onClick={handleMoveToTrash}
            onMouseEnter={e => {
              e.currentTarget.style.background = 'rgba(255,152,0,0.18)';
              e.currentTarget.style.color = '#ef6c00';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'transparent';
              e.currentTarget.style.color = 'rgba(0,0,0,0.5)';
            }}
            title="移入垃圾桶"
            aria-label="移入垃圾桶"
          >
            🗂
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

      {editorMode === 'source' ? (
        <textarea
          ref={textareaRef}
          style={styles.sourceTextarea}
          value={note.content}
          onChange={e => handleContentChange(e.target.value)}
          placeholder="在这里写点什么..."
          aria-label="Markdown 源码编辑区"
        />
      ) : (
        <div style={styles.previewLayout}>
          <textarea
            ref={textareaRef}
            style={styles.previewInput}
            value={note.content}
            onChange={e => handleContentChange(e.target.value)}
            placeholder="在这里输入 Markdown 内容..."
            aria-label="Markdown 输入区"
          />
          <div
            style={styles.previewPane}
            aria-label="Markdown 实时预览"
            dangerouslySetInnerHTML={{ __html: renderedMarkdown }}
          />
        </div>
      )}

      <div style={styles.footer}>
        <div style={styles.colorRow}>
          {NOTE_COLORS.map(color => (
            <div
              key={color}
              style={{
                ...styles.colorDot,
                background: color,
                transform: color === note.color ? 'scale(1.15)' : 'scale(1)',
                boxShadow: color === note.color ? '0 0 0 2px rgba(0,0,0,0.18)' : 'none',
              }}
              role="button"
              tabIndex={0}
              onClick={() => handleColorChange(color)}
              onKeyDown={e => e.key === 'Enter' && handleColorChange(color)}
              aria-label={`设置便签颜色 ${color}`}
            />
          ))}
        </div>
        <div style={styles.rangeWrap}>
          <span>透明度</span>
          <input
            style={styles.range}
            type="range"
            min={20}
            max={100}
            value={Math.round(normalizedOpacity * 100)}
            onChange={e => handleOpacityChange(Number(e.target.value) / 100)}
            aria-label="调整便签透明度"
          />
          <span>{Math.round(normalizedOpacity * 100)}%</span>
        </div>
      </div>
    </div>
  );
}
