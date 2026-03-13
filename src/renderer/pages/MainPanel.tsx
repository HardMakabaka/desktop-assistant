import React, { useEffect, useRef, useState, type CSSProperties } from 'react';
import type { StickyNote } from '../../shared/types';

type DesktopStyle = CSSProperties & {
  WebkitAppRegion?: string;
};

const clamp = (value: number, min: number, max: number): number => Math.min(max, Math.max(min, value));

const expandHex = (hex: string): string => {
  const value = hex.replace('#', '');
  if (value.length === 3) {
    return value
      .split('')
      .map(part => part + part)
      .join('');
  }
  return value;
};

const toRgba = (hex: string, alpha: number): string => {
  const color = expandHex(hex);
  const r = Number.parseInt(color.slice(0, 2), 16);
  const g = Number.parseInt(color.slice(2, 4), 16);
  const b = Number.parseInt(color.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

const shiftHex = (hex: string, amount: number): string => {
  const color = expandHex(hex);
  const channels = [0, 2, 4].map(index => clamp(Number.parseInt(color.slice(index, index + 2), 16) + amount, 0, 255));
  return `#${channels.map(channel => channel.toString(16).padStart(2, '0')).join('')}`;
};

const styles: Record<string, DesktopStyle> = {
  container: {
    height: '100vh',
    display: 'flex',
    flexDirection: 'column',
    color: '#1c2430',
    background:
      'radial-gradient(circle at top left, rgba(255, 210, 122, 0.52), transparent 30%), radial-gradient(circle at bottom right, rgba(55, 186, 146, 0.2), transparent 34%), linear-gradient(160deg, #fbf3dc 0%, #f4e0bf 48%, #ead5b2 100%)',
  },
  titleBar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '12px',
    padding: '18px 18px 10px',
    position: 'relative',
    WebkitAppRegion: 'drag' as unknown as string,
  },
  titleGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    minWidth: 0,
  },
  eyebrow: {
    fontSize: '11px',
    letterSpacing: '0.12em',
    textTransform: 'uppercase',
    color: 'rgba(28,36,48,0.58)',
    fontWeight: 700,
  },
  title: {
    fontSize: '28px',
    lineHeight: 1,
    fontWeight: 800,
    letterSpacing: '-0.03em',
  },
  subtitle: {
    fontSize: '13px',
    color: 'rgba(28,36,48,0.72)',
  },
  titleActions: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    WebkitAppRegion: 'no-drag' as unknown as string,
  },
  settingsWrap: {
    position: 'relative',
  },
  iconBtn: {
    width: 34,
    height: 34,
    borderRadius: '12px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#1c2430',
    fontSize: '15px',
    transition: 'transform 0.18s ease, background 0.18s ease, box-shadow 0.18s ease',
    background: 'rgba(255,255,255,0.36)',
    boxShadow: '0 10px 24px rgba(28,36,48,0.08)',
  },
  settingsMenu: {
    position: 'absolute',
    top: '40px',
    right: 0,
    minWidth: '160px',
    background: 'rgba(28,36,48,0.94)',
    border: '1px solid rgba(255,255,255,0.14)',
    borderRadius: '14px',
    boxShadow: '0 16px 36px rgba(10, 14, 20, 0.25)',
    padding: '8px',
    zIndex: 20,
  },
  settingsItem: {
    width: '100%',
    border: 'none',
    background: 'transparent',
    color: '#fffdf7',
    fontSize: '13px',
    textAlign: 'left',
    borderRadius: '10px',
    padding: '10px 12px',
    transition: 'background 0.18s ease',
    WebkitAppRegion: 'no-drag' as unknown as string,
    cursor: 'pointer',
  },
  body: {
    flex: 1,
    minHeight: 0,
    padding: '0 18px 18px',
    overflowY: 'auto',
    WebkitAppRegion: 'no-drag' as unknown as string,
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  heroCard: {
    display: 'grid',
    gridTemplateColumns: 'minmax(0, 1.2fr) minmax(0, 0.8fr)',
    gap: '14px',
    padding: '16px',
    borderRadius: '24px',
    background: 'linear-gradient(145deg, rgba(255,255,255,0.6), rgba(255,244,222,0.82))',
    border: '1px solid rgba(28,36,48,0.08)',
    boxShadow: '0 22px 60px rgba(28,36,48,0.1)',
  },
  heroMain: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  heroTitle: {
    fontSize: '22px',
    lineHeight: 1.15,
    fontWeight: 800,
    letterSpacing: '-0.03em',
  },
  heroText: {
    fontSize: '13px',
    lineHeight: 1.65,
    color: 'rgba(28,36,48,0.7)',
  },
  heroMeta: {
    display: 'flex',
    gap: '8px',
    flexWrap: 'wrap',
  },
  heroChip: {
    padding: '6px 10px',
    borderRadius: '999px',
    background: 'rgba(28,36,48,0.06)',
    fontSize: '12px',
    fontWeight: 700,
    color: 'rgba(28,36,48,0.76)',
  },
  heroAside: {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    gap: '10px',
    padding: '14px',
    borderRadius: '18px',
    background: 'linear-gradient(145deg, rgba(40, 78, 67, 0.92), rgba(26, 41, 51, 0.98))',
    color: '#fff8e7',
  },
  heroAsideLabel: {
    fontSize: '11px',
    letterSpacing: '0.12em',
    textTransform: 'uppercase',
    color: 'rgba(255,248,231,0.7)',
    fontWeight: 700,
  },
  heroAsideValue: {
    fontSize: '34px',
    lineHeight: 1,
    fontWeight: 800,
    letterSpacing: '-0.04em',
  },
  heroAsideText: {
    fontSize: '12px',
    lineHeight: 1.6,
    color: 'rgba(255,248,231,0.78)',
  },
  feedbackError: {
    fontSize: '13px',
    color: '#8c1d18',
    background: 'rgba(241, 130, 120, 0.18)',
    border: '1px solid rgba(140,29,24,0.16)',
    borderRadius: '14px',
    padding: '12px 14px',
  },
  feedbackSuccess: {
    fontSize: '13px',
    color: '#0d5131',
    background: 'rgba(97, 204, 153, 0.18)',
    border: '1px solid rgba(13,81,49,0.16)',
    borderRadius: '14px',
    padding: '12px 14px',
  },
  sectionCard: {
    display: 'flex',
    flexDirection: 'column',
    gap: '14px',
    padding: '16px',
    borderRadius: '22px',
    background: 'rgba(255, 250, 239, 0.72)',
    border: '1px solid rgba(28,36,48,0.08)',
    boxShadow: '0 18px 44px rgba(28,36,48,0.08)',
  },
  sectionHeading: {
    display: 'flex',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: '10px',
  },
  sectionTitle: {
    fontSize: '17px',
    fontWeight: 800,
    letterSpacing: '-0.02em',
  },
  sectionHint: {
    fontSize: '12px',
    color: 'rgba(28,36,48,0.58)',
  },
  actionGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '12px',
  },
  actionCard: {
    display: 'flex',
    flexDirection: 'column',
    gap: '14px',
    borderRadius: '18px',
    padding: '16px',
    minHeight: '136px',
    cursor: 'pointer',
    transition: 'transform 0.18s ease, box-shadow 0.18s ease, filter 0.18s ease',
    WebkitAppRegion: 'no-drag' as unknown as string,
    boxShadow: '0 14px 28px rgba(28,36,48,0.12)',
  },
  actionIcon: {
    width: '44px',
    height: '44px',
    borderRadius: '14px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '22px',
    background: 'rgba(255,255,255,0.22)',
  },
  actionLabel: {
    fontSize: '17px',
    fontWeight: 800,
    letterSpacing: '-0.02em',
  },
  actionDesc: {
    fontSize: '12px',
    lineHeight: 1.6,
    opacity: 0.84,
  },
  noteList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  noteItem: {
    display: 'grid',
    gridTemplateColumns: 'auto minmax(0, 1fr) auto',
    gap: '12px',
    alignItems: 'center',
    padding: '14px',
    borderRadius: '18px',
    cursor: 'pointer',
    transition: 'transform 0.18s ease, box-shadow 0.18s ease, background 0.18s ease',
    WebkitAppRegion: 'no-drag' as unknown as string,
  },
  noteColor: {
    width: 14,
    height: 46,
    borderRadius: '999px',
    flexShrink: 0,
  },
  noteContent: {
    minWidth: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  noteText: {
    fontSize: '14px',
    lineHeight: 1.5,
    color: 'rgba(28,36,48,0.88)',
    display: '-webkit-box',
    WebkitLineClamp: 2,
    WebkitBoxOrient: 'vertical',
    overflow: 'hidden',
  },
  noteMeta: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    flexWrap: 'wrap',
    fontSize: '11px',
    color: 'rgba(28,36,48,0.56)',
  },
  noteMetaChip: {
    padding: '4px 8px',
    borderRadius: '999px',
    background: 'rgba(255,255,255,0.44)',
    fontWeight: 700,
  },
  noteDelete: {
    color: 'rgba(28,36,48,0.5)',
    fontSize: '15px',
    padding: '8px',
    borderRadius: '10px',
    transition: 'background 0.18s ease, color 0.18s ease',
    WebkitAppRegion: 'no-drag' as unknown as string,
  },
  empty: {
    textAlign: 'center',
    color: 'rgba(28,36,48,0.54)',
    fontSize: '13px',
    lineHeight: 1.7,
    padding: '26px 12px',
    borderRadius: '18px',
    background: 'rgba(255,255,255,0.42)',
    border: '1px dashed rgba(28,36,48,0.14)',
  },
};

export function MainPanel() {
  const [notes, setNotes] = useState<StickyNote[]>([]);
  const [trashedNotes, setTrashedNotes] = useState<StickyNote[]>([]);
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

  const runAction = async (action: () => Promise<unknown>, fallbackMessage: string): Promise<boolean> => {
    try {
      setActionError('');
      setActionSuccess('');
      await action();
      return true;
    } catch (error) {
      const detail = error instanceof Error ? error.message : fallbackMessage;
      setActionSuccess('');
      setActionError(detail || fallbackMessage);
      return false;
    }
  };

  const loadNotes = async () => {
    await runAction(async () => {
      const data = await getDesktopAPI().getNotes();
      setNotes(data);
    }, '加载便签失败');
  };

  const loadTrashedNotes = async () => {
    await runAction(async () => {
      const data = await getDesktopAPI().getTrashedNotes();
      setTrashedNotes(data);
    }, '加载垃圾桶失败');
  };

  useEffect(() => {
    void loadNotes();
    void loadTrashedNotes();
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

  const handleDeleteNote = async (event: React.MouseEvent, id: string) => {
    event.stopPropagation();
    const ok = await runAction(async () => {
      await getDesktopAPI().deleteNote(id);
      await loadNotes();
      await loadTrashedNotes();
    }, '删除便签失败');

    if (ok) {
      setActionSuccess('已移入垃圾桶');
    }
  };

  const handleRestoreNote = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const ok = await runAction(async () => {
      await getDesktopAPI().restoreNote(id);
      await loadNotes();
      await loadTrashedNotes();
    }, '恢复便签失败');

    if (ok) {
      setActionSuccess('已从垃圾桶恢复');
    }
  };

  const handlePurgeNote = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const confirmed = window.confirm('彻底删除后无法恢复，是否继续？');
    if (!confirmed) return;

    const ok = await runAction(async () => {
      await getDesktopAPI().purgeNote(id);
      await loadNotes();
      await loadTrashedNotes();
    }, '彻底删除失败');

    if (ok) {
      setActionSuccess('已彻底删除，无法恢复');
    }
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

  const pinnedCount = notes.filter(note => note.pinned).length;

  return (
    <div style={styles.container}>
      <div style={styles.titleBar}>
        <div style={styles.titleGroup}>
          <span style={styles.eyebrow}>Desktop Assistant</span>
          <span style={styles.title}>桌面助手</span>
          <span style={styles.subtitle}>便签和日历放在同一个顺手、安静、能长期打开的控制台里。</span>
        </div>

        <div style={styles.titleActions}>
          <div style={styles.settingsWrap} ref={settingsRef}>
            <button
              style={styles.iconBtn}
              onClick={() => setShowSettingsMenu(previous => !previous)}
              onMouseEnter={event => {
                event.currentTarget.style.transform = 'translateY(-1px)';
                event.currentTarget.style.background = 'rgba(255,255,255,0.62)';
              }}
              onMouseLeave={event => {
                event.currentTarget.style.transform = 'translateY(0)';
                event.currentTarget.style.background = 'rgba(255,255,255,0.36)';
              }}
              aria-label="打开设置菜单"
            >
              ⚙
            </button>
            {showSettingsMenu ? (
              <div style={styles.settingsMenu}>
                <button
                  style={styles.settingsItem}
                  onClick={() => void handleCheckUpdates()}
                  onMouseEnter={event => (event.currentTarget.style.background = 'rgba(255,255,255,0.1)')}
                  onMouseLeave={event => (event.currentTarget.style.background = 'transparent')}
                  aria-label="检查更新"
                >
                  检查更新
                </button>
              </div>
            ) : null}
          </div>
          <button
            style={styles.iconBtn}
            onClick={() => void handleClose()}
            onMouseEnter={event => {
              event.currentTarget.style.transform = 'translateY(-1px)';
              event.currentTarget.style.background = 'rgba(255,255,255,0.62)';
            }}
            onMouseLeave={event => {
              event.currentTarget.style.transform = 'translateY(0)';
              event.currentTarget.style.background = 'rgba(255,255,255,0.36)';
            }}
            aria-label="关闭窗口"
          >
            ✕
          </button>
        </div>
      </div>

      <div style={styles.body}>
        <div style={styles.heroCard}>
          <div style={styles.heroMain}>
            <span style={styles.heroTitle}>把零碎想法留在桌面上，而不是留在脑子里。</span>
            <span style={styles.heroText}>
              新建便签、随手固定窗口、快速回看历史记录。主面板现在走一套更温暖的纸张质感，和便签窗口的视觉语言也统一了。
            </span>
            <div style={styles.heroMeta}>
              <span style={styles.heroChip}>{notes.length} 张便签</span>
              <span style={styles.heroChip}>{pinnedCount} 张固定中</span>
              <span style={styles.heroChip}>日历一键打开</span>
            </div>
          </div>

          <div style={styles.heroAside}>
            <span style={styles.heroAsideLabel}>Notes online</span>
            <span style={styles.heroAsideValue}>{notes.length}</span>
            <span style={styles.heroAsideText}>打开任意便签后，即使窗口缩小，正文区域也会保持可滚动，长内容不再被闷住。</span>
          </div>
        </div>

        {actionSuccess ? <div style={styles.feedbackSuccess}>{actionSuccess}</div> : null}
        {actionError ? <div style={styles.feedbackError}>操作失败：{actionError}</div> : null}

        <div style={styles.sectionCard}>
          <div style={styles.sectionHeading}>
            <span style={styles.sectionTitle}>快速操作</span>
            <span style={styles.sectionHint}>先做最常用的两件事</span>
          </div>

          <div style={styles.actionGrid}>
            <div
              style={{
                ...styles.actionCard,
                background: 'linear-gradient(155deg, #ef7f52 0%, #d85c3a 100%)',
                color: '#fff8f1',
              }}
              role="button"
              tabIndex={0}
              onClick={() => void handleNewNote()}
              onMouseEnter={event => {
                event.currentTarget.style.transform = 'translateY(-2px)';
                event.currentTarget.style.filter = 'saturate(1.04)';
                event.currentTarget.style.boxShadow = '0 18px 36px rgba(216, 92, 58, 0.24)';
              }}
              onMouseLeave={event => {
                event.currentTarget.style.transform = 'translateY(0)';
                event.currentTarget.style.filter = 'saturate(1)';
                event.currentTarget.style.boxShadow = '0 14px 28px rgba(28,36,48,0.12)';
              }}
              onKeyDown={event => event.key === 'Enter' && void handleNewNote()}
              aria-label="新建便签"
            >
              <span style={styles.actionIcon}>📝</span>
              <span style={styles.actionLabel}>新建便签</span>
              <span style={styles.actionDesc}>开一个新窗口，适合临时记录、待办拆分和桌面固定提醒。</span>
            </div>

            <div
              style={{
                ...styles.actionCard,
                background: 'linear-gradient(155deg, #205c50 0%, #16333f 100%)',
                color: '#f9f6ea',
              }}
              role="button"
              tabIndex={0}
              onClick={() => void handleOpenCalendar()}
              onMouseEnter={event => {
                event.currentTarget.style.transform = 'translateY(-2px)';
                event.currentTarget.style.filter = 'saturate(1.04)';
                event.currentTarget.style.boxShadow = '0 18px 36px rgba(22, 51, 63, 0.22)';
              }}
              onMouseLeave={event => {
                event.currentTarget.style.transform = 'translateY(0)';
                event.currentTarget.style.filter = 'saturate(1)';
                event.currentTarget.style.boxShadow = '0 14px 28px rgba(28,36,48,0.12)';
              }}
              onKeyDown={event => event.key === 'Enter' && void handleOpenCalendar()}
              aria-label="打开日历"
            >
              <span style={styles.actionIcon}>📅</span>
              <span style={styles.actionLabel}>打开日历</span>
              <span style={styles.actionDesc}>查看日期标记，把计划和便签窗口放在一起，用起来更顺手。</span>
            </div>
          </div>
        </div>

        <div style={styles.sectionCard}>
          <div style={styles.sectionHeading}>
            <span style={styles.sectionTitle}>我的便签</span>
            <span style={styles.sectionHint}>{notes.length === 0 ? '还没有内容' : `${notes.length} 条可快速打开`}</span>
          </div>

          {notes.length === 0 ? (
            <div style={styles.empty}>还没有便签。点上面的“新建便签”，先把今天脑子里最吵的一件事写下来。</div>
          ) : (
            <div style={styles.noteList}>
              {notes.map(note => {
                const preview = note.content.trim().replace(/\s+/gu, ' ') || '空便签';
                const chipColor = shiftHex(note.color, -28);
                const itemBorder = shiftHex(note.color, -18);
                const itemShadow = shiftHex(note.color, -50);
                const previewMeta = `${preview.replace(/\s+/gu, '').length} 字`;

                return (
                  <div
                    key={note.id}
                    style={{
                      ...styles.noteItem,
                      background: `linear-gradient(145deg, ${toRgba('#ffffff', 0.66)}, ${toRgba(note.color, 0.46)})`,
                      border: `1px solid ${toRgba(itemBorder, 0.14)}`,
                      boxShadow: `0 10px 22px ${toRgba(itemShadow, 0.12)}`,
                    }}
                    onClick={() => void handleOpenNote(note.id)}
                    onMouseEnter={event => {
                      event.currentTarget.style.transform = 'translateY(-1px)';
                      event.currentTarget.style.boxShadow = `0 16px 30px ${toRgba(itemShadow, 0.16)}`;
                    }}
                    onMouseLeave={event => {
                      event.currentTarget.style.transform = 'translateY(0)';
                      event.currentTarget.style.boxShadow = `0 10px 22px ${toRgba(itemShadow, 0.12)}`;
                    }}
                    role="button"
                    tabIndex={0}
                    onKeyDown={event => event.key === 'Enter' && void handleOpenNote(note.id)}
                    aria-label={`打开便签: ${preview.slice(0, 20)}`}
                  >
                    <span style={{ ...styles.noteColor, background: `linear-gradient(180deg, ${shiftHex(note.color, 22)}, ${shiftHex(note.color, -20)})` }} />
                    <span style={styles.noteContent}>
                      <span style={styles.noteText}>{preview}</span>
                      <span style={styles.noteMeta}>
                        <span style={{ ...styles.noteMetaChip, color: toRgba(chipColor, 0.86) }}>{previewMeta}</span>
                        {note.pinned ? (
                          <span style={{ ...styles.noteMetaChip, color: '#9f1239' }}>已固定</span>
                        ) : null}
                      </span>
                    </span>
                    <button
                      style={styles.noteDelete}
                      onClick={event => void handleDeleteNote(event, note.id)}
                      onMouseEnter={event => {
                        event.currentTarget.style.background = 'rgba(159,18,57,0.1)';
                        event.currentTarget.style.color = '#9f1239';
                      }}
                      onMouseLeave={event => {
                        event.currentTarget.style.background = 'transparent';
                        event.currentTarget.style.color = 'rgba(28,36,48,0.5)';
                      }}
                      aria-label={`删除便签: ${preview.slice(0, 20)}`}
                    >
                      ✕
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div style={styles.section}>
          <div style={styles.sectionTitle}>垃圾桶 ({trashedNotes.length})</div>
          {trashedNotes.length === 0 ? (
            <div style={styles.empty}>垃圾桶为空</div>
          ) : (
            <div style={styles.noteList}>
              {trashedNotes.map(note => (
                <div
                  key={note.id}
                  style={{ ...styles.noteItem, opacity: 0.9 }}
                  role="group"
                  aria-label={`垃圾桶便签: ${note.content.slice(0, 20) || '空便签'}`}
                >
                  <span style={{ ...styles.noteColor, background: note.color }} />
                  <span style={styles.noteText}>{note.content || '空便签'}</span>
                  <button
                    style={styles.noteDelete}
                    onClick={e => handleRestoreNote(e, note.id)}
                    onMouseEnter={e => (e.currentTarget.style.color = '#a5d6a7')}
                    onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.5)')}
                    aria-label={`恢复便签: ${note.content.slice(0, 20) || '空便签'}`}
                    title="恢复"
                  >
                    ↩
                  </button>
                  <button
                    style={styles.noteDelete}
                    onClick={e => handlePurgeNote(e, note.id)}
                    onMouseEnter={e => (e.currentTarget.style.color = '#ff6b6b')}
                    onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.5)')}
                    aria-label={`彻底删除便签: ${note.content.slice(0, 20) || '空便签'}`}
                    title="彻底删除"
                  >
                    🗑
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
