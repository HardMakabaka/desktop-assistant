import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createWorker, type Worker } from 'tesseract.js';
import type { OcrResultPayload } from '../../shared/types';

type Rect = { x: number; y: number; w: number; h: number };

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

function rectFromPoints(ax: number, ay: number, bx: number, by: number): Rect {
  const x1 = Math.min(ax, bx);
  const y1 = Math.min(ay, by);
  const x2 = Math.max(ax, bx);
  const y2 = Math.max(ay, by);
  return { x: x1, y: y1, w: x2 - x1, h: y2 - y1 };
}

const styles = {
  root: {
    width: '100vw',
    height: '100vh',
    background: '#0b0b0b',
    color: 'rgba(255,255,255,0.9)',
    fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif',
    userSelect: 'none' as const,
    position: 'relative' as const,
    overflow: 'hidden',
  },
  img: {
    position: 'absolute' as const,
    inset: 0,
    width: '100%',
    height: '100%',
    objectFit: 'contain' as const,
  },
  mask: {
    position: 'absolute' as const,
    inset: 0,
    background: 'rgba(0,0,0,0.25)',
  },
  selection: {
    position: 'absolute' as const,
    border: '2px solid rgba(255,255,255,0.95)',
    boxShadow: '0 0 0 9999px rgba(0,0,0,0.35)',
    borderRadius: 2,
  },
  hud: {
    position: 'absolute' as const,
    left: 18,
    bottom: 18,
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    background: 'rgba(0,0,0,0.55)',
    border: '1px solid rgba(255,255,255,0.15)',
    borderRadius: 10,
    padding: '10px 12px',
    backdropFilter: 'blur(8px)',
  },
  btn: {
    border: '1px solid rgba(255,255,255,0.18)',
    background: 'rgba(255,255,255,0.06)',
    color: 'rgba(255,255,255,0.9)',
    borderRadius: 10,
    padding: '8px 10px',
    fontSize: 12,
    cursor: 'pointer',
  },
  btnPrimary: {
    border: '1px solid rgba(45,212,191,0.55)',
    background: 'rgba(45,212,191,0.15)',
  },
  hint: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.85)',
  },
  subHint: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.55)',
  },
  topRight: {
    position: 'absolute' as const,
    top: 14,
    right: 14,
    background: 'rgba(0,0,0,0.55)',
    border: '1px solid rgba(255,255,255,0.15)',
    borderRadius: 10,
    padding: '8px 10px',
    fontSize: 12,
    color: 'rgba(255,255,255,0.85)',
  },
};

export function OcrCaptureWindow() {
  const noteId = useMemo(() => new URLSearchParams(window.location.search).get('noteId') || '', []);
  const imgRef = useRef<HTMLImageElement>(null);
  const workerRef = useRef<Worker | null>(null);
  const dragRef = useRef<{ active: boolean; ax: number; ay: number }>({ active: false, ax: 0, ay: 0 });

  const [screenshotURL, setScreenshotURL] = useState<string>('');
  const [screenshotReady, setScreenshotReady] = useState(false);
  const [selection, setSelection] = useState<Rect | null>(null);
  const [busy, setBusy] = useState(false);
  const [hint, setHint] = useState('选择屏幕后拖拽框选要识别的区域');
  const [progress, setProgress] = useState<string>('');
  const [error, setError] = useState<string>('');

  const cleanupScreenshot = useCallback(() => {
    setScreenshotReady(false);
    setSelection(null);
    setProgress('');
    setError('');
    if (screenshotURL) URL.revokeObjectURL(screenshotURL);
    setScreenshotURL('');
  }, [screenshotURL]);

  const closeWithResult = useCallback(
    async (payload: OcrResultPayload) => {
      try {
        await window.desktopAPI.sendOcrResult(payload);
      } catch (err) {
        console.warn('[ocr] failed to send result', err);
      }
    },
    [],
  );

  const cancelAndClose = useCallback(async () => {
    await closeWithResult({ noteId, ok: false, message: '已取消' });
    await window.desktopAPI.closeWindow();
  }, [closeWithResult, noteId]);

  const ensureWorker = useCallback(async (): Promise<Worker> => {
    if (workerRef.current) return workerRef.current;

    const worker = await createWorker(['chi_sim'], 1, {
      workerPath: 'https://cdn.jsdelivr.net/npm/tesseract.js@v5.0.0/dist/worker.min.js',
      corePath: 'https://cdn.jsdelivr.net/npm/tesseract.js-core@v5.0.0',
      langPath: 'https://tessdata.projectnaptha.com/4.0.0',
      logger: (m: { status?: string; progress?: number }) => {
        if (m.status === 'recognizing text' && typeof m.progress === 'number') {
          setProgress(`识别中... ${Math.round(m.progress * 100)}%`);
        } else if (m.status && typeof m.progress === 'number') {
          setProgress(`${m.status} ${Math.round(m.progress * 100)}%`);
        } else if (m.status) {
          setProgress(m.status);
        }
      },
    });

    workerRef.current = worker;
    return worker;
  }, []);

  const takeScreenshot = useCallback(async () => {
    cleanupScreenshot();
    setHint('正在请求屏幕权限...');

    if (!navigator.mediaDevices?.getDisplayMedia) {
      setError('当前环境不支持屏幕截图（缺少 getDisplayMedia）');
      setHint('');
      return;
    }

    let stream: MediaStream | null = null;
    try {
      stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });
    } catch (err) {
      const message = err instanceof Error && err.message ? err.message : '权限不足或已取消';
      setError(`截图失败：${message}`);
      setHint('');
      return;
    }

    try {
      const video = document.createElement('video');
      video.srcObject = stream;
      video.muted = true;
      await video.play();

      await new Promise<void>(resolve => {
        if (video.videoWidth && video.videoHeight) return resolve();
        const onLoaded = () => resolve();
        video.addEventListener('loadedmetadata', onLoaded, { once: true });
      });

      const width = video.videoWidth || 0;
      const height = video.videoHeight || 0;
      if (!width || !height) {
        throw new Error('截图失败：无法获取屏幕尺寸');
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('截图失败：无法创建画布');
      ctx.drawImage(video, 0, 0, width, height);

      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(b => (b ? resolve(b) : reject(new Error('截图失败：生成图片失败'))), 'image/png');
      });

      const url = URL.createObjectURL(blob);
      setScreenshotURL(url);
      setHint('拖拽框选要识别的区域（Esc 取消）');
      setError('');
    } catch (err) {
      const message = err instanceof Error && err.message ? err.message : '未知错误';
      setError(message);
      setHint('');
    } finally {
      stream?.getTracks().forEach(t => t.stop());
    }
  }, [cleanupScreenshot]);

  const mapViewportRectToImageRect = useCallback((rect: Rect): Rect | null => {
    const img = imgRef.current;
    if (!img || !img.naturalWidth || !img.naturalHeight) return null;

    const bbox = img.getBoundingClientRect();
    const x = clamp(rect.x - bbox.left, 0, bbox.width);
    const y = clamp(rect.y - bbox.top, 0, bbox.height);
    const w = clamp(rect.w, 0, bbox.width - x);
    const h = clamp(rect.h, 0, bbox.height - y);
    if (w < 3 || h < 3) return null;

    const scaleX = img.naturalWidth / bbox.width;
    const scaleY = img.naturalHeight / bbox.height;
    return {
      x: Math.round(x * scaleX),
      y: Math.round(y * scaleY),
      w: Math.round(w * scaleX),
      h: Math.round(h * scaleY),
    };
  }, []);

  const recognizeSelection = useCallback(async () => {
    if (busy) return;
    if (!noteId) {
      setError('缺少 noteId，无法写入便签');
      return;
    }
    if (!selection) {
      setError('请先框选区域');
      return;
    }

    const img = imgRef.current;
    if (!img) {
      setError('截图未准备好');
      return;
    }

    const imageRect = mapViewportRectToImageRect(selection);
    if (!imageRect) {
      setError('选区无效，请重新框选');
      return;
    }

    setBusy(true);
    setError('');
    setProgress('准备识别...');

    const cropCanvas = document.createElement('canvas');
    cropCanvas.width = Math.max(1, imageRect.w);
    cropCanvas.height = Math.max(1, imageRect.h);
    const ctx = cropCanvas.getContext('2d');
    if (!ctx) {
      setBusy(false);
      setProgress('');
      setError('识别失败：无法创建画布');
      return;
    }

    ctx.drawImage(
      img,
      imageRect.x,
      imageRect.y,
      imageRect.w,
      imageRect.h,
      0,
      0,
      imageRect.w,
      imageRect.h,
    );

    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    try {
      const worker = await ensureWorker();
      const result = await Promise.race([
        worker.recognize(cropCanvas),
        new Promise<never>((_resolve, reject) => {
          timeoutId = setTimeout(() => reject(new Error('识别超时')), 30000);
        }),
      ]);

      const text = (result as { data?: { text?: string } }).data?.text?.trim() || '';
      if (!text) {
        setError('未识别到文字（结果为空）');
        setBusy(false);
        setProgress('');
        return;
      }

      await closeWithResult({ noteId, ok: true, text });
      await window.desktopAPI.closeWindow();
    } catch (err) {
      const message = err instanceof Error && err.message ? err.message : '未知错误';
      await closeWithResult({ noteId, ok: false, message: `识别失败：${message}` });
      setError(`识别失败：${message}`);
      setProgress('');
      setBusy(false);

      if (workerRef.current) {
        try {
          await workerRef.current.terminate();
        } catch (terminateErr) {
          console.warn('[ocr] failed to terminate worker', terminateErr);
        }
        workerRef.current = null;
      }
    } finally {
      if (timeoutId) clearTimeout(timeoutId);
    }
  }, [busy, closeWithResult, ensureWorker, mapViewportRectToImageRect, noteId, selection]);

  useEffect(() => {
    void takeScreenshot();
  }, [takeScreenshot]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        void cancelAndClose();
      }
      if (e.key === 'Enter' && selection && !busy) {
        e.preventDefault();
        void recognizeSelection();
      }
    };
    window.addEventListener('keydown', onKeyDown, true);
    return () => window.removeEventListener('keydown', onKeyDown, true);
  }, [busy, cancelAndClose, recognizeSelection, selection]);

  useEffect(() => {
    return () => {
      cleanupScreenshot();
      if (workerRef.current) {
        void workerRef.current.terminate();
        workerRef.current = null;
      }
    };
  }, [cleanupScreenshot]);

  const onMouseDown = (e: React.MouseEvent) => {
    if (!screenshotReady || busy) return;
    dragRef.current = { active: true, ax: e.clientX, ay: e.clientY };
    setSelection({ x: e.clientX, y: e.clientY, w: 0, h: 0 });
  };

  const onMouseMove = (e: React.MouseEvent) => {
    if (!dragRef.current.active || busy) return;
    const next = rectFromPoints(dragRef.current.ax, dragRef.current.ay, e.clientX, e.clientY);
    setSelection(next);
  };

  const onMouseUp = () => {
    if (!dragRef.current.active) return;
    dragRef.current.active = false;
  };

  const selectionStyle = selection
    ? {
        ...styles.selection,
        left: selection.x,
        top: selection.y,
        width: selection.w,
        height: selection.h,
      }
    : null;

  return (
    <div style={styles.root} onMouseDown={onMouseDown} onMouseMove={onMouseMove} onMouseUp={onMouseUp}>
      {screenshotURL ? (
        <img
          ref={imgRef}
          src={screenshotURL}
          style={styles.img}
          alt="截图"
          onLoad={() => setScreenshotReady(true)}
          onError={() => {
            setScreenshotReady(false);
            setError('截图加载失败');
          }}
        />
      ) : (
        <div style={{ padding: 18, fontSize: 13 }}>正在准备截图...</div>
      )}

      {!screenshotReady ? <div style={styles.mask} /> : null}
      {selectionStyle ? <div style={selectionStyle} /> : null}

      <div style={styles.topRight}>
        <div style={{ fontWeight: 700 }}>OCR 截图</div>
        <div style={{ marginTop: 6, ...styles.subHint }}>Enter 识别 / Esc 取消</div>
      </div>

      <div style={styles.hud}>
        <button style={styles.btn} onClick={() => void cancelAndClose()} disabled={busy}>
          取消
        </button>
        <button
          style={{ ...styles.btn, ...styles.btnPrimary }}
          onClick={() => void recognizeSelection()}
          disabled={busy || !selection}
        >
          识别
        </button>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {error ? <div style={{ ...styles.hint, color: 'rgba(255,120,120,0.95)' }}>{error}</div> : null}
          {progress ? <div style={styles.hint}>{progress}</div> : null}
          {!error && !progress ? <div style={styles.hint}>{hint}</div> : null}
          <div style={styles.subHint}>首次使用可能需要下载语言包（联网）。</div>
        </div>
      </div>
    </div>
  );
}
