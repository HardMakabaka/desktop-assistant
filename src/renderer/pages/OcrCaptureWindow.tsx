import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createWorker } from 'tesseract.js';
import type { OcrResultPayload } from '../../shared/types';

interface OcrWorkerLike {
  recognize(input: HTMLCanvasElement): Promise<{ data?: { text?: string } }>;
  terminate(): Promise<unknown>;
}

type Rect = { x: number; y: number; w: number; h: number };

type OcrPhase = 'init' | 'download-confirm' | 'downloading' | 'ready' | 'selecting' | 'recognizing';

const LANG_DOWNLOADED_KEY = 'desktop-assistant:ocr:lang-downloaded';

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

function isLangCached(): boolean {
  try {
    return window.localStorage.getItem(LANG_DOWNLOADED_KEY) === '1';
  } catch {
    return false;
  }
}

function markLangCached(): void {
  try {
    window.localStorage.setItem(LANG_DOWNLOADED_KEY, '1');
  } catch { /* */ }
}

function getTesseractAssetURL(fileName: string): string {
  return new URL(`./tesseract/${fileName}`, window.location.href).toString();
}

function getTesseractCorePath(): string {
  return new URL('./tesseract/', window.location.href).toString();
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
  centerDialog: {
    position: 'absolute' as const,
    inset: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'rgba(0,0,0,0.6)',
    zIndex: 50,
  },
  dialogBox: {
    background: 'rgba(30,30,30,0.95)',
    border: '1px solid rgba(255,255,255,0.15)',
    borderRadius: 14,
    padding: '24px 28px',
    maxWidth: 380,
    textAlign: 'center' as const,
    backdropFilter: 'blur(12px)',
  },
  dialogTitle: {
    fontSize: 15,
    fontWeight: 700 as const,
    marginBottom: 10,
    color: 'rgba(255,255,255,0.92)',
  },
  dialogText: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.7)',
    lineHeight: 1.6,
    marginBottom: 16,
  },
  dialogActions: {
    display: 'flex',
    justifyContent: 'center',
    gap: 10,
  },
  progressBar: {
    width: '100%',
    height: 6,
    borderRadius: 3,
    background: 'rgba(255,255,255,0.1)',
    overflow: 'hidden',
    marginBottom: 12,
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
    background: 'rgba(45,212,191,0.8)',
    transition: 'width 0.3s ease',
  },
};

/** Friendly error messages based on error type */
function friendlyError(err: unknown, context: string): string {
  const msg = err instanceof Error ? err.message : String(err);
  const lower = msg.toLowerCase();

  if (context === 'capture') {
    if (lower.includes('not supported') || lower.includes('getdisplaymedia') || lower.includes('not allowed') || lower.includes('not found')) {
      return '当前系统不支持屏幕截图。如果使用 Wayland 桌面，请尝试切换到 X11 桌面环境，或确认已安装 PipeWire + xdg-desktop-portal。';
    }
    if (lower.includes('denied') || lower.includes('permission') || lower.includes('dismissed') || lower.includes('cancel')) {
      return '屏幕截图权限被拒绝。请在系统设置中允许屏幕录制/截图权限后重试。';
    }
    return `截图失败：${msg}`;
  }

  if (context === 'download') {
    if (lower.includes('network') || lower.includes('fetch') || lower.includes('failed to fetch') || lower.includes('load')) {
      return '语言包下载失败，请检查网络连接后点击"重试"。';
    }
    return `语言包下载失败：${msg}`;
  }

  if (context === 'recognize') {
    if (lower.includes('timeout') || lower.includes('超时')) {
      return '识别超时，请尝试选择更小的区域后重试。';
    }
    return `识别失败：${msg}`;
  }

  return msg;
}

export function OcrCaptureWindow() {
  const searchParams = useMemo(() => new URLSearchParams(window.location.search), []);
  const noteId = useMemo(() => searchParams.get('noteId') || '', [searchParams]);
  const isE2E = useMemo(() => searchParams.get('e2e') === '1', [searchParams]);
  const e2eOcrText = useMemo(() => searchParams.get('ocrText') || 'Mock OCR text', [searchParams]);
  const imgRef = useRef<HTMLImageElement>(null);
  const workerRef = useRef<OcrWorkerLike | null>(null);
  const dragRef = useRef<{ active: boolean; ax: number; ay: number }>({ active: false, ax: 0, ay: 0 });

  const [phase, setPhase] = useState<OcrPhase>('init');
  const [screenshotURL, setScreenshotURL] = useState<string>('');
  const [screenshotReady, setScreenshotReady] = useState(false);
  const [selection, setSelection] = useState<Rect | null>(null);
  const [busy, setBusy] = useState(false);
  const [hint, setHint] = useState('');
  const [progress, setProgress] = useState<string>('');
  const [progressPct, setProgressPct] = useState(0);
  const [error, setError] = useState<string>('');

  const cleanupScreenshot = useCallback(() => {
    setScreenshotReady(false);
    setSelection(null);
    setProgress('');
    setProgressPct(0);
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

  // ---- Worker initialization with download confirmation ----
  const initWorker = useCallback(async (): Promise<OcrWorkerLike> => {
    if (workerRef.current) return workerRef.current;

    const worker = await createWorker(['chi_sim'], 1, {
      workerPath: getTesseractAssetURL('worker.min.js'),
      corePath: getTesseractCorePath(),
      langPath: 'https://tessdata.projectnaptha.com/4.0.0',
      logger: (m: { status?: string; progress?: number }) => {
        if (typeof m.progress === 'number') {
          const pct = Math.round(m.progress * 100);
          setProgressPct(pct);
        }
        if (m.status === 'recognizing text' && typeof m.progress === 'number') {
          setProgress(`识别中... ${Math.round(m.progress * 100)}%`);
        } else if (m.status === 'loading language traineddata' && typeof m.progress === 'number') {
          setProgress(`下载语言包... ${Math.round(m.progress * 100)}%`);
        } else if (m.status && typeof m.progress === 'number') {
          setProgress(`${m.status} ${Math.round(m.progress * 100)}%`);
        } else if (m.status) {
          setProgress(m.status);
        }
      },
    });

    workerRef.current = worker;
    markLangCached();
    return worker;
  }, []);

  // ---- Download phase: pre-download worker before screenshot ----
  const startDownloadAndProceed = useCallback(async () => {
    setPhase('downloading');
    setError('');
    setProgress('正在下载语言包...');
    setProgressPct(0);

    try {
      await initWorker();
      setProgress('');
      // Proceed to screenshot
      setPhase('ready');
    } catch (err) {
      setError(friendlyError(err, 'download'));
      setProgress('');
      setPhase('download-confirm'); // show retry
    }
  }, [initWorker]);

  // ---- Screenshot ----
  const takeScreenshot = useCallback(async () => {
    cleanupScreenshot();

    if (isE2E) {
      const canvas = document.createElement('canvas');
      canvas.width = 1400;
      canvas.height = 420;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        setError('?????????');
        return;
      }

      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#111111';
      ctx.font = 'bold 120px "Microsoft YaHei", "PingFang SC", sans-serif';
      ctx.textBaseline = 'middle';
      ctx.fillText(e2eOcrText, 80, canvas.height / 2);

      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(b => (b ? resolve(b) : reject(new Error('??????'))), 'image/png');
      });
      const url = URL.createObjectURL(blob);
      setScreenshotURL(url);
      setScreenshotReady(true);
      setSelection({ x: 120, y: 120, w: 360, h: 140 });
      setHint('拖拽框选要识别的区域（Esc 取消）');
      setError('');
      setPhase('selecting');
      return;
    }

    setHint('????????...');
    if (!navigator.mediaDevices?.getDisplayMedia) {
      setError('当前系统不支持屏幕截图。如果使用 Wayland 桌面，请尝试切换到 X11 桌面环境，或确认已安装 PipeWire + xdg-desktop-portal。');
      setHint('');
      return;
    }

    let stream: MediaStream | null = null;
    try {
      stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });
    } catch (err) {
      setError(friendlyError(err, 'capture'));
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
        throw new Error('无法获取屏幕尺寸');
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('无法创建画布');
      ctx.drawImage(video, 0, 0, width, height);

      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(b => (b ? resolve(b) : reject(new Error('生成图片失败'))), 'image/png');
      });

      const url = URL.createObjectURL(blob);
      setScreenshotURL(url);
      setHint('拖拽框选要识别的区域（Esc 取消）');
      setError('');
      setPhase('selecting');
    } catch (err) {
      setError(friendlyError(err, 'capture'));
      setHint('');
    } finally {
      stream?.getTracks().forEach(t => t.stop());
    }
  }, [cleanupScreenshot]);

  // ---- Phase transitions ----
  useEffect(() => {
    if (phase === 'init') {
      if (isE2E || isLangCached()) {
        // Language data previously downloaded, skip confirmation
        setPhase('ready');
      } else {
        setPhase('download-confirm');
      }
    }
  }, [isE2E, phase]);

  useEffect(() => {
    if (phase === 'ready') {
      void takeScreenshot();
    }
  }, [phase, takeScreenshot]);

  // ---- Recognition ----
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
    setPhase('recognizing');
    setError('');
    setProgress('准备识别...');

    const cropCanvas = document.createElement('canvas');
    cropCanvas.width = Math.max(1, imageRect.w);
    cropCanvas.height = Math.max(1, imageRect.h);
    const ctx = cropCanvas.getContext('2d');
    if (!ctx) {
      setBusy(false);
      setPhase('selecting');
      setProgress('');
      setError('无法创建画布，请重试');
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
      const worker = await initWorker();
      const result = await Promise.race([
        worker.recognize(cropCanvas),
        new Promise<never>((_resolve, reject) => {
          timeoutId = setTimeout(() => reject(new Error('识别超时')), 30000);
        }),
      ]);

      const text = (result as { data?: { text?: string } }).data?.text?.trim() || '';
      if (!text) {
        setError('未识别到文字（结果为空），请尝试框选更清晰的区域');
        setBusy(false);
        setPhase('selecting');
        setProgress('');
        return;
      }

      await closeWithResult({ noteId, ok: true, text });
      await window.desktopAPI.closeWindow();
    } catch (err) {
      const message = friendlyError(err, 'recognize');
      await closeWithResult({ noteId, ok: false, message });
      setError(message);
      setProgress('');
      setBusy(false);
      setPhase('selecting');

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
  }, [busy, closeWithResult, initWorker, mapViewportRectToImageRect, noteId, selection]);

  useEffect(() => {
    if (!isE2E || phase !== 'selecting' || !noteId) return;

    const timer = window.setTimeout(() => {
      void closeWithResult({ noteId, ok: true, text: e2eOcrText.trim() || 'Mock OCR text' }).then(() => {
        void window.desktopAPI.closeWindow();
      });
    }, 150);

    return () => window.clearTimeout(timer);
  }, [closeWithResult, e2eOcrText, isE2E, noteId, phase]);

  // ---- Retry handler ----
  const handleRetry = useCallback(() => {
    setError('');
    setProgress('');
    if (phase === 'download-confirm' || phase === 'downloading') {
      void startDownloadAndProceed();
    } else {
      // Retry screenshot
      setPhase('ready');
    }
  }, [phase, startDownloadAndProceed]);

  // ---- Keyboard shortcuts ----
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        void cancelAndClose();
      }
      if (e.key === 'Enter' && selection && !busy && phase === 'selecting') {
        e.preventDefault();
        void recognizeSelection();
      }
    };
    window.addEventListener('keydown', onKeyDown, true);
    return () => window.removeEventListener('keydown', onKeyDown, true);
  }, [busy, cancelAndClose, recognizeSelection, selection, phase]);

  // ---- Cleanup ----
  useEffect(() => {
    return () => {
      cleanupScreenshot();
      if (workerRef.current) {
        void workerRef.current.terminate();
        workerRef.current = null;
      }
    };
  }, [cleanupScreenshot]);

  // ---- Mouse drag for selection ----
  const onMouseDown = (e: React.MouseEvent) => {
    if (!screenshotReady || busy || phase !== 'selecting') return;
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

  // ---- Download confirmation dialog ----
  if (phase === 'download-confirm') {
    return (
      <div style={styles.root}>
        <div style={styles.centerDialog}>
          <div style={styles.dialogBox}>
            <div style={styles.dialogTitle}>📦 需要下载 OCR 语言包</div>
            <div style={styles.dialogText}>
              首次使用 OCR 需要下载中文识别语言包（约 15MB）。
              <br />下载完成后将自动进入截图识别。
            </div>
            {error ? (
              <div style={{ fontSize: 12, color: 'rgba(255,120,120,0.95)', marginBottom: 12, lineHeight: 1.5 }}>
                {error}
              </div>
            ) : null}
            <div style={styles.dialogActions}>
              <button
                style={styles.btn}
                onClick={() => void cancelAndClose()}
              >
                取消
              </button>
              <button
                style={{ ...styles.btn, ...styles.btnPrimary }}
                onClick={() => void startDownloadAndProceed()}
              >
                {error ? '重试下载' : '开始下载'}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ---- Downloading phase ----
  if (phase === 'downloading') {
    return (
      <div style={styles.root}>
        <div style={styles.centerDialog}>
          <div style={styles.dialogBox}>
            <div style={styles.dialogTitle}>⏳ 正在下载语言包</div>
            <div style={styles.progressBar}>
              <div style={{ ...styles.progressFill, width: `${progressPct}%` }} />
            </div>
            <div style={styles.dialogText}>
              {progress || '准备中...'}
            </div>
            <div style={styles.dialogActions}>
              <button
                style={styles.btn}
                onClick={() => void cancelAndClose()}
              >
                取消
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ---- Main OCR UI (screenshot + selection) ----
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
        {error ? (
          <button
            style={{ ...styles.btn, border: '1px solid rgba(255,180,120,0.55)', background: 'rgba(255,180,120,0.12)' }}
            onClick={handleRetry}
            disabled={busy}
          >
            重试
          </button>
        ) : null}
        <button
          style={{ ...styles.btn, ...styles.btnPrimary }}
          onClick={() => void recognizeSelection()}
          disabled={busy || !selection}
        >
          识别
        </button>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {error ? <div style={{ ...styles.hint, color: 'rgba(255,120,120,0.95)' }}>{error}</div> : null}
          {progress && !error ? <div style={styles.hint}>{progress}</div> : null}
          {!error && !progress ? <div style={styles.hint}>{hint}</div> : null}
        </div>
      </div>
    </div>
  );
}
