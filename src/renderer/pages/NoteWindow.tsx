import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { createWorker } from 'tesseract.js';
import type { StickyNote } from '../../shared/types';

const NOTE_COLORS = ['#fff9c4', '#c8e6c9', '#bbdefb', '#f8bbd0', '#e1bee7', '#ffe0b2', '#d7ccc8', '#b2dfdb'];

type SelectionBox = {
  x: number;
  y: number;
  width: number;
  height: number;
};

type Point = {
  x: number;
  y: number;
};

type CaptureDraft = {
  imageUrl: string;
  selection: SelectionBox | null;
};

const OCR_LANGS = 'chi_sim+eng';
const MIN_SELECTION_SIZE = 12;

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
  footerStatus: {
    minWidth: '128px',
    textAlign: 'right' as const,
    color: '#b71c1c',
    fontSize: '10px',
    whiteSpace: 'nowrap' as const,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  captureOverlay: {
    position: 'fixed' as const,
    inset: 0,
    background: 'rgba(0,0,0,0.72)',
    zIndex: 1200,
    display: 'flex',
    flexDirection: 'column' as const,
    padding: '12px',
    gap: '10px',
    WebkitAppRegion: 'no-drag' as unknown as string,
  },
  captureToolbar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '8px',
    color: '#fff',
    fontSize: '12px',
  },
  captureToolbarActions: {
    display: 'flex',
    gap: '8px',
  },
  captureButton: {
    border: 'none',
    borderRadius: '8px',
    padding: '5px 10px',
    fontSize: '12px',
    cursor: 'pointer',
    background: 'rgba(255,255,255,0.18)',
    color: '#fff',
  },
  captureButtonPrimary: {
    background: '#4caf50',
    color: '#fff',
  },
  captureArea: {
    flex: 1,
    minHeight: 0,
    borderRadius: '10px',
    overflow: 'auto' as const,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'rgba(255,255,255,0.06)',
  },
  captureImageWrap: {
    position: 'relative' as const,
    maxWidth: '100%',
    maxHeight: '100%',
    userSelect: 'none' as const,
    cursor: 'crosshair',
  },
  captureImage: {
    display: 'block',
    maxWidth: '100%',
    maxHeight: 'calc(100vh - 120px)',
  },
  captureSelection: {
    position: 'absolute' as const,
    border: '2px solid #4caf50',
    boxShadow: '0 0 0 9999px rgba(0,0,0,0.34)',
    background: 'rgba(76,175,80,0.16)',
    pointerEvents: 'none' as const,
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

function normalizeSelection(start: Point, end: Point): SelectionBox {
  const x = Math.min(start.x, end.x);
  const y = Math.min(start.y, end.y);
  const width = Math.abs(start.x - end.x);
  const height = Math.abs(start.y - end.y);
  return { x, y, width, height };
}

function getLocalPoint(event: React.MouseEvent, element: HTMLElement): Point {
  const rect = element.getBoundingClientRect();
  return {
    x: event.clientX - rect.left,
    y: event.clientY - rect.top,
  };
}

async function captureScreenImage(): Promise<string> {
  if (!navigator.mediaDevices?.getDisplayMedia) {
    throw new Error('当前环境不支持截图，请在桌面端启用屏幕捕获权限。');
  }

  const stream = await navigator.mediaDevices.getDisplayMedia({
    video: {
      frameRate: 1,
    },
    audio: false,
  });

  try {
    const track = stream.getVideoTracks()[0];
    if (!track) {
      throw new Error('未获取到屏幕视频流。');
    }

    const video = document.createElement('video');
    video.srcObject = stream;
    video.muted = true;
    video.playsInline = true;

    await new Promise<void>(resolve => {
      video.onloadedmetadata = () => resolve();
    });
    await video.play();

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('无法创建截图上下文。');
    }

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/png');
  } finally {
    stream.getTracks().forEach(track => track.stop());
  }
}

async function cropSelectionFromImage(
  imageElement: HTMLImageElement,
  selection: SelectionBox,
): Promise<Blob> {
  const displayWidth = imageElement.clientWidth;
  const displayHeight = imageElement.clientHeight;

  if (!displayWidth || !displayHeight) {
    throw new Error('截图尺寸异常，请重试。');
  }

  const scaleX = imageElement.naturalWidth / displayWidth;
  const scaleY = imageElement.naturalHeight / displayHeight;

  const cropX = Math.max(0, Math.floor(selection.x * scaleX));
  const cropY = Math.max(0, Math.floor(selection.y * scaleY));
  const cropWidth = Math.max(1, Math.floor(selection.width * scaleX));
  const cropHeight = Math.max(1, Math.floor(selection.height * scaleY));

  const canvas = document.createElement('canvas');
  canvas.width = cropWidth;
  canvas.height = cropHeight;

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('无法创建 OCR 裁剪画布。');
  }

  ctx.drawImage(
    imageElement,
    cropX,
    cropY,
    cropWidth,
    cropHeight,
    0,
    0,
    cropWidth,
    cropHeight,
  );

  const blob = await new Promise<Blob | null>(resolve => {
    canvas.toBlob(resolve, 'image/png');
  });

  if (!blob) {
    throw new Error('裁剪截图失败，请重试。');
  }

  return blob;
}

async function recognizeTextFromImage(blob: Blob): Promise<string> {
  const worker = await createWorker(OCR_LANGS);

  try {
    const { data } = await worker.recognize(blob);
    return data.text.trim();
  } finally {
    await worker.terminate();
  }
}

export function NoteWindow() {
  const [note, setNote] = useState<StickyNote | null>(null);
  const [pinned, setPinned] = useState(false);
  const [editorMode, setEditorMode] = useState<'preview' | 'source'>('preview');
  const [ocrError, setOcrError] = useState<string | null>(null);
  const [ocrBusy, setOcrBusy] = useState(false);
  const [captureDraft, setCaptureDraft] = useState<CaptureDraft | null>(null);
  const [dragStart, setDragStart] = useState<Point | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const captureImageRef = useRef<HTMLImageElement>(null);
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

  const handleStartOcrCapture = async () => {
    if (ocrBusy) return;

    setOcrError(null);
    setOcrBusy(true);

    try {
      const imageUrl = await captureScreenImage();
      setCaptureDraft({ imageUrl, selection: null });
    } catch (error) {
      const message = error instanceof Error ? error.message : '截图失败，请稍后重试。';
      setOcrError(message);
    } finally {
      setOcrBusy(false);
    }
  };

  const handleCaptureMouseDown = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!captureDraft) return;
    const point = getLocalPoint(event, event.currentTarget);
    setDragStart(point);
    setCaptureDraft(prev => {
      if (!prev) return prev;
      return { ...prev, selection: { x: point.x, y: point.y, width: 0, height: 0 } };
    });
  };

  const handleCaptureMouseMove = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!captureDraft || !dragStart) return;
    const point = getLocalPoint(event, event.currentTarget);
    const nextSelection = normalizeSelection(dragStart, point);
    setCaptureDraft(prev => {
      if (!prev) return prev;
      return { ...prev, selection: nextSelection };
    });
  };

  const handleCaptureMouseUp = () => {
    setDragStart(null);
  };

  const closeCaptureOverlay = () => {
    setDragStart(null);
    setCaptureDraft(null);
  };

  const handleRunOcr = async () => {
    if (!note || !captureDraft?.selection || !captureImageRef.current || ocrBusy) return;

    const selection = captureDraft.selection;
    if (selection.width < MIN_SELECTION_SIZE || selection.height < MIN_SELECTION_SIZE) {
      setOcrError('请选择更大的截图区域再识别。');
      return;
    }

    setOcrError(null);
    setOcrBusy(true);

    try {
      const blob = await cropSelectionFromImage(captureImageRef.current, selection);
      const recognizedText = await recognizeTextFromImage(blob);

      if (!recognizedText) {
        setOcrError('未识别到可用文本，请换一块区域重试。');
        return;
      }

      const needsNewline = note.content.length > 0 && !note.content.endsWith('\n');
      const nextContent = `${note.content}${needsNewline ? '\n' : ''}${recognizedText}`;

      handleContentChange(nextContent);
      closeCaptureOverlay();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'OCR 识别失败，请稍后重试。';
      setOcrError(message);
    } finally {
      setOcrBusy(false);
    }
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
            onClick={handleStartOcrCapture}
            onMouseEnter={e => {
              e.currentTarget.style.background = 'rgba(33,150,243,0.2)';
              e.currentTarget.style.color = '#0d47a1';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'transparent';
              e.currentTarget.style.color = 'rgba(0,0,0,0.5)';
            }}
            title="截图 OCR"
            aria-label="截图 OCR"
            disabled={ocrBusy}
          >
            📷
          </button>
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
        <div style={styles.footerStatus} title={ocrError ?? undefined}>
          {ocrBusy ? 'OCR 处理中...' : ocrError ?? 'OCR 就绪'}
        </div>
      </div>

      {captureDraft && (
        <div style={styles.captureOverlay} onMouseUp={handleCaptureMouseUp}>
          <div style={styles.captureToolbar}>
            <span>拖拽选择截图区域后点击「识别文本」</span>
            <div style={styles.captureToolbarActions}>
              <button
                style={styles.captureButton}
                onClick={closeCaptureOverlay}
                disabled={ocrBusy}
              >
                取消
              </button>
              <button
                style={{ ...styles.captureButton, ...styles.captureButtonPrimary }}
                onClick={handleRunOcr}
                disabled={ocrBusy || !captureDraft.selection}
              >
                {ocrBusy ? '识别中...' : '识别文本'}
              </button>
            </div>
          </div>
          <div style={styles.captureArea}>
            <div
              style={styles.captureImageWrap}
              onMouseDown={handleCaptureMouseDown}
              onMouseMove={handleCaptureMouseMove}
              onMouseLeave={handleCaptureMouseUp}
            >
              <img
                ref={captureImageRef}
                src={captureDraft.imageUrl}
                alt="截图预览"
                style={styles.captureImage}
                draggable={false}
              />
              {captureDraft.selection && (
                <div
                  style={{
                    ...styles.captureSelection,
                    left: captureDraft.selection.x,
                    top: captureDraft.selection.y,
                    width: captureDraft.selection.width,
                    height: captureDraft.selection.height,
                  }}
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
