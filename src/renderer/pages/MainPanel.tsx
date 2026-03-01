import React, { useEffect, useState } from 'react';
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
    WebkitAppRegion: 'drag' as unknown as string,
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
};

export function MainPanel() {
  const [notes, setNotes] = useState<StickyNote[]>([]);
  const [actionError, setActionError] = useState('');

  const runAction = async (action: () => Promise<unknown>, fallbackMessage: string): Promise<void> => {
    try {
      setActionError('');
      await action();
    } catch (error) {
      const detail = error instanceof Error ? error.message : fallbackMessage;
      setActionError(detail || fallbackMessage);
    }
  };

  const loadNotes = async () => {
    await runAction(async () => {
      const data = await window.desktopAPI.getNotes();
      setNotes(data);
    }, '加载便签失败');
  };

  useEffect(() => {
    loadNotes();
  }, []);

  const handleNewNote = async () => {
    await runAction(async () => {
      await window.desktopAPI.createNote();
      await loadNotes();
    }, '新建便签失败');
  };

  const handleOpenCalendar = async () => {
    await runAction(async () => {
      await window.desktopAPI.openCalendar();
    }, '打开日历失败');
  };

  const handleOpenNote = async (id: string) => {
    await runAction(async () => {
      await window.desktopAPI.openNote(id);
    }, '打开便签失败');
  };

  const handleDeleteNote = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    await runAction(async () => {
      await window.desktopAPI.deleteNote(id);
      await loadNotes();
    }, '删除便签失败');
  };

  const handleClose = async () => {
    await runAction(async () => {
      await window.desktopAPI.closeWindow();
    }, '关闭窗口失败');
  };

  return (
    <div style={styles.container}>
      <div style={styles.titleBar}>
        <span style={styles.title}>桌面助手</span>
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

      <div style={styles.body}>
        {actionError ? (
          <div
            style={{
              marginBottom: '12px',
              fontSize: '12px',
              color: '#fff',
              background: 'rgba(229,57,53,0.28)',
              border: '1px solid rgba(255,255,255,0.25)',
              borderRadius: '8px',
              padding: '8px 10px',
            }}
          >
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
