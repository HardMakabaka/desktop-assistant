import React, { useEffect, useRef, useState } from 'react';
import type { StickyNote } from '../../shared/types';

const styles = {
  container: {
    height: '100vh',
    display: 'flex',
    flexDirection: 'column' as const,
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: '#fff',
  },
  titleBar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '12px 16px',
    position: 'relative' as const,
    WebkitAppRegion: 'drag' as unknown as string,
  },
  titleActions: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  settingsWrap: {
    position: 'relative' as const,
  },
  iconBtn: {
    width: 28,
    height: 28,
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#fff',
    fontSize: '15px',
    WebkitAppRegion: 'no-drag' as unknown as string,
    transition: 'background 0.2s',
    cursor: 'pointer',
  },
  settingsMenu: {
    position: 'absolute' as const,
    top: '34px',
    right: 0,
    minWidth: '138px',
    background: 'rgba(23,25,35,0.95)',
    border: '1px solid rgba(255,255,255,0.18)',
    borderRadius: '10px',
    boxShadow: '0 10px 26px rgba(0,0,0,0.28)',
    padding: '6px',
    zIndex: 20,
  },
  settingsItem: {
    width: '100%',
    border: 'none',
    background: 'transparent',
    color: '#fff',
    fontSize: '12px',
    textAlign: 'left' as const,
    borderRadius: '8px',
    padding: '8px 10px',
    transition: 'background 0.2s',
    WebkitAppRegion: 'no-drag' as unknown as string,
    cursor: 'pointer',
  },
  title: {
    fontSize: '16px',
    fontWeight: 600,
    letterSpacing: '1px',
  },
  closeBtn: {
    width: 28,
    height: 28,
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#fff',
    fontSize: '16px',
    WebkitAppRegion: 'no-drag' as unknown as string,
    transition: 'background 0.2s',
  },
  body: {
    flex: 1,
    padding: '0 20px 20px',
    overflowY: 'auto' as const,
    WebkitAppRegion: 'no-drag' as unknown as string,
  },
  section: {
    marginBottom: '24px',
  },
  sectionTitle: {
    fontSize: '13px',
    fontWeight: 500,
    opacity: 0.8,
    marginBottom: '12px',
    textTransform: 'uppercase' as const,
    letterSpacing: '1.5px',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '12px',
  },
  card: {
    background: 'rgba(255,255,255,0.15)',
    backdropFilter: 'blur(10px)',
    borderRadius: '14px',
    padding: '20px 16px',
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    gap: '10px',
    cursor: 'pointer',
    transition: 'transform 0.15s, background 0.2s',
    border: '1px solid rgba(255,255,255,0.2)',
    WebkitAppRegion: 'no-drag' as unknown as string,
  },
  cardIcon: {
    fontSize: '32px',
  },
  cardLabel: {
    fontSize: '13px',
    fontWeight: 500,
  },
  noteList: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '8px',
  },
  noteItem: {
    background: 'rgba(255,255,255,0.12)',
    borderRadius: '10px',
    padding: '12px 14px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    cursor: 'pointer',
    transition: 'background 0.2s',
    border: '1px solid rgba(255,255,255,0.1)',
    WebkitAppRegion: 'no-drag' as unknown as string,
  },
  noteColor: {
    width: 10,
    height: 10,
    borderRadius: '50%',
    marginRight: '10px',
    flexShrink: 0,
  },
  noteText: {
    flex: 1,
    fontSize: '13px',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap' as const,
    opacity: 0.9,
  },
  noteDelete: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: '16px',
    padding: '2px 6px',
    borderRadius: '4px',
    transition: 'color 0.2s',
    WebkitAppRegion: 'no-drag' as unknown as string,
  },
  empty: {
    textAlign: 'center' as const,
    opacity: 0.5,
    fontSize: '13px',
    padding: '20px 0',
  },
  feedbackError: {
    marginBottom: '12px',
    fontSize: '12px',
    color: '#fff',
    background: 'rgba(229,57,53,0.28)',
    border: '1px solid rgba(255,255,255,0.25)',
    borderRadius: '8px',
    padding: '8px 10px',
  },
  feedbackSuccess: {
    marginBottom: '12px',
    fontSize: '12px',
    color: '#fff',
    background: 'rgba(67,160,71,0.32)',
    border: '1px solid rgba(255,255,255,0.25)',
    borderRadius: '8px',
    padding: '8px 10px',
  },
};

export function MainPanel() {
  const [notes, setNotes] = useState<StickyNote[]>([]);
  const [actionError, setActionError] = useState('');
  const [actionSuccess, setActionSuccess] = useState('');
  const [showSettingsMenu, setShowSettingsMenu] = useState(false);
  const settingsRef = useRef<HTMLDivElement | null>(null);

  const getDesktopAPI = () => {
    const api = window.desktopAPI;
    if (!api) {
      throw new Error('桌面桥接未初始化，请通过 Electron 启动应用并重试');
    }
    return api;
  };

  const runAction = async (action: () => Promise<unknown>, fallbackMessage: string): Promise<void> => {
    try {
      setActionError('');
      setActionSuccess('');
      await action();
    } catch (error) {
      const detail = error instanceof Error ? error.message : fallbackMessage;
      setActionSuccess('');
      setActionError(detail || fallbackMessage);
    }
  };

  const loadNotes = async () => {
    await runAction(async () => {
      const data = await getDesktopAPI().getNotes();
      setNotes(data);
    }, '加载便签失败');
  };

  useEffect(() => {
    loadNotes();
  }, []);

  useEffect(() => {
    const onWindowMouseDown = (event: MouseEvent) => {
      const target = event.target;
      if (!settingsRef.current || !(target instanceof Node)) return;
      if (!settingsRef.current.contains(target)) {
        setShowSettingsMenu(false);
      }
    };

    window.addEventListener('mousedown', onWindowMouseDown);
    return () => {
      window.removeEventListener('mousedown', onWindowMouseDown);
    };
  }, []);

  const handleNewNote = async () => {
    await runAction(async () => {
      await getDesktopAPI().createNote();
      await loadNotes();
    }, '新建便签失败');
  };

  const handleOpenCalendar = async () => {
    await runAction(async () => {
      await getDesktopAPI().openCalendar();
    }, '打开日历失败');
  };

  const handleOpenNote = async (id: string) => {
    await runAction(async () => {
      await getDesktopAPI().openNote(id);
    }, '打开便签失败');
  };

  const handleDeleteNote = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    await runAction(async () => {
      await getDesktopAPI().deleteNote(id);
      await loadNotes();
    }, '删除便签失败');
  };

  const handleClose = async () => {
    await runAction(async () => {
      await getDesktopAPI().closeWindow();
    }, '关闭窗口失败');
  };

  const handleCheckUpdates = async () => {
    setShowSettingsMenu(false);
    setActionError('');
    setActionSuccess('');

    try {
      const result = await getDesktopAPI().checkForUpdates();
      if (result.ok) {
        setActionSuccess(result.message);
        return;
      }

      setActionError(result.message || '检查更新失败');
    } catch (error) {
      const detail = error instanceof Error ? error.message : '检查更新失败';
      setActionError(detail);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.titleBar}>
        <span style={styles.title}>桌面助手</span>
        <div style={styles.titleActions}>
          <div style={styles.settingsWrap} ref={settingsRef}>
            <button
              style={styles.iconBtn}
              onClick={() => setShowSettingsMenu(prev => !prev)}
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.2)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              aria-label="打开设置菜单"
            >
              ⚙
            </button>
            {showSettingsMenu ? (
              <div style={styles.settingsMenu}>
                <button
                  style={styles.settingsItem}
                  onClick={handleCheckUpdates}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.12)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  aria-label="检查更新"
                >
                  检查更新
                </button>
              </div>
            ) : null}
          </div>
          <button
            style={styles.closeBtn}
            onClick={handleClose}
            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.2)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            aria-label="关闭窗口"
          >
            ✕
          </button>
        </div>
      </div>

      <div style={styles.body}>
        {actionSuccess ? (
          <div style={styles.feedbackSuccess}>
            {actionSuccess}
          </div>
        ) : null}
        {actionError ? (
          <div style={styles.feedbackError}>
            操作失败：{actionError}
          </div>
        ) : null}
        <div style={styles.section}>
          <div style={styles.sectionTitle}>快捷操作</div>
          <div style={styles.grid}>
            <div
              style={styles.card}
              role="button"
              tabIndex={0}
              onClick={handleNewNote}
              onMouseEnter={e => {
                e.currentTarget.style.transform = 'scale(1.03)';
                e.currentTarget.style.background = 'rgba(255,255,255,0.22)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.transform = 'scale(1)';
                e.currentTarget.style.background = 'rgba(255,255,255,0.15)';
              }}
              onKeyDown={e => e.key === 'Enter' && handleNewNote()}
              aria-label="新建便签"
            >
              <span style={styles.cardIcon}>📝</span>
              <span style={styles.cardLabel}>新建便签</span>
            </div>
            <div
              style={styles.card}
              role="button"
              tabIndex={0}
              onClick={handleOpenCalendar}
              onMouseEnter={e => {
                e.currentTarget.style.transform = 'scale(1.03)';
                e.currentTarget.style.background = 'rgba(255,255,255,0.22)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.transform = 'scale(1)';
                e.currentTarget.style.background = 'rgba(255,255,255,0.15)';
              }}
              onKeyDown={e => e.key === 'Enter' && handleOpenCalendar()}
              aria-label="打开日历"
            >
              <span style={styles.cardIcon}>📅</span>
              <span style={styles.cardLabel}>打开日历</span>
            </div>
          </div>
        </div>

        <div style={styles.section}>
          <div style={styles.sectionTitle}>我的便签 ({notes.length})</div>
          {notes.length === 0 ? (
            <div style={styles.empty}>还没有便签，点击上方创建一个吧</div>
          ) : (
            <div style={styles.noteList}>
              {notes.map(note => (
                <div
                  key={note.id}
                  style={styles.noteItem}
                  onClick={() => void handleOpenNote(note.id)}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.2)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.12)')}
                  role="button"
                  tabIndex={0}
                  onKeyDown={e => e.key === 'Enter' && void handleOpenNote(note.id)}
                  aria-label={`打开便签: ${note.content.slice(0, 20) || '空便签'}`}
                >
                  <span style={{ ...styles.noteColor, background: note.color }} />
                  <span style={styles.noteText}>
                    {note.content || '空便签'}
                  </span>
                  <button
                    style={styles.noteDelete}
                    onClick={e => handleDeleteNote(e, note.id)}
                    onMouseEnter={e => (e.currentTarget.style.color = '#ff6b6b')}
                    onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.5)')}
                    aria-label={`删除便签: ${note.content.slice(0, 20) || '空便签'}`}
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
