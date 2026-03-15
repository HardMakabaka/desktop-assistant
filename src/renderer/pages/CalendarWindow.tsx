import React, { useEffect, useState, useCallback } from 'react';
import type { CalendarMark } from '../../shared/types';
import { ColorOpacityPicker, hexToRgba } from './ColorOpacityPicker';

const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六'];
const MARK_COLORS = ['#e53935', '#43a047', '#1e88e5', '#fb8c00', '#8e24aa', '#00acc1'];
const SERIF_STACK = '"Iowan Old Style", "Palatino Linotype", "Book Antiqua", Georgia, "STSong", "SimSun", serif';
const SANS_STACK = '"Avenir Next", "Trebuchet MS", "Microsoft YaHei", sans-serif';

const styles = {
  container: {
    height: '100vh',
    display: 'flex',
    flexDirection: 'column' as const,
    borderRadius: '16px',
    overflow: 'hidden',
    background:
      'radial-gradient(circle at top left, rgba(255, 240, 197, 0.52), transparent 28%), linear-gradient(165deg, rgba(255,255,255,0.78), rgba(247,240,226,0.92))',
    boxShadow: '0 20px 52px rgba(35, 30, 24, 0.18)',
    color: '#28303a',
    fontFamily: SANS_STACK,
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '10px',
    padding: '12px 14px 10px',
    background: 'linear-gradient(155deg, rgba(39, 70, 77, 0.95), rgba(25, 36, 44, 0.98))',
    color: '#fff8ef',
    WebkitAppRegion: 'drag' as unknown as string,
    boxShadow: 'inset 0 -1px 0 rgba(255,255,255,0.06)',
  },
  headerMain: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '3px',
    minWidth: 0,
  },
  headerEyebrow: {
    fontSize: '10px',
    letterSpacing: '0.16em',
    textTransform: 'uppercase' as const,
    color: 'rgba(255,248,239,0.62)',
    fontWeight: 700,
  },
  headerActions: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    WebkitAppRegion: 'no-drag' as unknown as string,
  },
  navBtn: {
    width: 30,
    height: 30,
    borderRadius: '12px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#fff8ef',
    fontSize: '14px',
    transition: 'background 0.15s, transform 0.15s',
  },
  monthLabel: {
    fontSize: '21px',
    lineHeight: 1.1,
    fontWeight: 700,
    fontFamily: SERIF_STACK,
    letterSpacing: '-0.03em',
  },
  monthHint: {
    fontSize: '12px',
    color: 'rgba(255,248,239,0.76)',
  },
  iconBtn: {
    width: 28,
    height: 28,
    borderRadius: '11px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '12px',
    color: '#fff8ef',
    transition: 'background 0.15s, transform 0.15s',
  },
  weekRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(7, 1fr)',
    padding: '10px 12px 6px',
    background: 'rgba(255, 250, 242, 0.55)',
    borderBottom: '1px solid rgba(60, 48, 37, 0.08)',
  },
  weekCell: {
    textAlign: 'center' as const,
    fontSize: '11px',
    color: 'rgba(54, 44, 36, 0.54)',
    fontWeight: 700,
    letterSpacing: '0.08em',
    padding: '4px 0',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(7, 1fr)',
    padding: '10px 12px 14px',
    gap: '6px',
    flex: 1,
  },
  dayCell: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '16px',
    cursor: 'pointer',
    padding: '6px 0',
    minHeight: '44px',
    transition: 'background 0.15s, transform 0.15s, box-shadow 0.15s',
    position: 'relative' as const,
    border: '1px solid transparent',
  },
  dayNum: {
    fontSize: '14px',
    fontWeight: 600,
    fontFamily: SERIF_STACK,
  },
  markDot: {
    width: 6,
    height: 6,
    borderRadius: '50%',
    marginTop: '4px',
    boxShadow: '0 0 0 3px rgba(255,255,255,0.4)',
  },
  modal: {
    position: 'fixed' as const,
    inset: 0,
    background: 'rgba(22, 18, 14, 0.34)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100,
  },
  modalContent: {
    background: 'linear-gradient(180deg, rgba(255,252,247,0.98), rgba(248,241,229,0.96))',
    borderRadius: '20px',
    padding: '22px',
    width: '292px',
    border: '1px solid rgba(73, 55, 37, 0.08)',
    boxShadow: '0 18px 48px rgba(21, 17, 13, 0.24)',
  },
  modalTitle: {
    fontSize: '19px',
    fontWeight: 700,
    marginBottom: '14px',
    color: '#31271d',
    fontFamily: SERIF_STACK,
    letterSpacing: '-0.03em',
  },
  modalText: {
    fontSize: '12px',
    lineHeight: 1.65,
    marginBottom: '12px',
    color: 'rgba(49,39,29,0.62)',
  },
  input: {
    width: '100%',
    padding: '10px 12px',
    border: '1px solid rgba(73, 55, 37, 0.14)',
    borderRadius: '12px',
    fontSize: '13px',
    outline: 'none',
    marginBottom: '12px',
    fontFamily: SANS_STACK,
    background: 'rgba(255,255,255,0.72)',
    color: '#31271d',
  },
  colorRow: {
    display: 'flex',
    gap: '8px',
    marginBottom: '18px',
  },
  colorDot: {
    width: 24,
    height: 24,
    borderRadius: '50%',
    cursor: 'pointer',
    border: '2px solid transparent',
    transition: 'border-color 0.15s, transform 0.15s',
  },
  modalActions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '8px',
  },
  btn: {
    padding: '7px 16px',
    borderRadius: '10px',
    fontSize: '13px',
    fontWeight: 600,
    transition: 'background 0.15s, color 0.15s, transform 0.15s',
  },
};

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfWeek(year: number, month: number): number {
  return new Date(year, month, 1).getDay();
}

function formatDate(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export function CalendarWindow() {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [marks, setMarks] = useState<CalendarMark[]>([]);
  const [pinned, setPinned] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [markLabel, setMarkLabel] = useState('');
  const [markColor, setMarkColor] = useState(MARK_COLORS[0]);
  const [calBgColor, setCalBgColor] = useState(() => {
    try { return window.localStorage.getItem('desktop-assistant:calendar:bg-color') || '#ffffff'; }
    catch { return '#ffffff'; }
  });
  const [calBgOpacity, setCalBgOpacity] = useState(() => {
    try { return Number(window.localStorage.getItem('desktop-assistant:calendar:bg-opacity')) || 100; }
    catch { return 100; }
  });
  const [colorPickerOpen, setColorPickerOpen] = useState(false);

  const loadMarks = useCallback(async () => {
    const data = await window.desktopAPI.getMarks();
    setMarks(data);
  }, []);

  useEffect(() => {
    loadMarks();
  }, [loadMarks]);

  const prevMonth = () => {
    if (month === 0) { setYear(y => y - 1); setMonth(11); }
    else setMonth(m => m - 1);
  };

  const nextMonth = () => {
    if (month === 11) { setYear(y => y + 1); setMonth(0); }
    else setMonth(m => m + 1);
  };

  const handlePin = async () => {
    const newPinned = !pinned;
    setPinned(newPinned);
    await window.desktopAPI.pinWindow(newPinned);
  };

  const handleClose = () => window.desktopAPI.closeWindow();

  const handleCalColorChange = useCallback((c: string) => {
    setCalBgColor(c);
    try { window.localStorage.setItem('desktop-assistant:calendar:bg-color', c); } catch { /* */ }
  }, []);

  const handleCalOpacityChange = useCallback((o: number) => {
    setCalBgOpacity(o);
    try { window.localStorage.setItem('desktop-assistant:calendar:bg-opacity', String(o)); } catch { /* */ }
  }, []);

  const handleDayClick = (day: number) => {
    const date = formatDate(year, month, day);
    const existing = marks.find(m => m.date === date);
    setSelectedDate(date);
    setMarkLabel(existing?.label || '');
    setMarkColor(existing?.color || MARK_COLORS[0]);
  };

  const handleSaveMark = async () => {
    if (!selectedDate) return;
    if (markLabel.trim()) {
      await window.desktopAPI.saveMark({ date: selectedDate, label: markLabel.trim(), color: markColor });
    } else {
      await window.desktopAPI.deleteMark(selectedDate);
    }
    setSelectedDate(null);
    loadMarks();
  };

  const handleDeleteMark = async () => {
    if (!selectedDate) return;
    await window.desktopAPI.deleteMark(selectedDate);
    setSelectedDate(null);
    loadMarks();
  };

  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfWeek(year, month);
  const todayStr = formatDate(today.getFullYear(), today.getMonth(), today.getDate());

  const days: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) days.push(null);
  for (let d = 1; d <= daysInMonth; d++) days.push(d);

  return (
    <div style={{ ...styles.container, background: hexToRgba(calBgColor, calBgOpacity) }}>
      <div style={styles.header}>
        <div style={styles.headerActions}>
          <button
            style={styles.navBtn}
            onClick={prevMonth}
            onMouseEnter={e => {
              e.currentTarget.style.background = 'rgba(255,255,255,0.14)';
              e.currentTarget.style.transform = 'translateY(-1px)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'transparent';
              e.currentTarget.style.transform = 'translateY(0)';
            }}
            aria-label="上个月"
          >
            ◀
          </button>
          <div style={styles.headerMain}>
            <span style={styles.headerEyebrow}>Marked Days</span>
            <span style={styles.monthLabel}>{year}年{month + 1}月</span>
            <span style={styles.monthHint}>把日程写成短句，像在月历边上留下铅笔注记。</span>
          </div>
          <button
            style={styles.navBtn}
            onClick={nextMonth}
            onMouseEnter={e => {
              e.currentTarget.style.background = 'rgba(255,255,255,0.14)';
              e.currentTarget.style.transform = 'translateY(-1px)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'transparent';
              e.currentTarget.style.transform = 'translateY(0)';
            }}
            aria-label="下个月"
          >
            ▶
          </button>
        </div>
        <div style={styles.headerActions}>
          <button
            style={styles.iconBtn}
            onClick={() => setColorPickerOpen(v => !v)}
            onMouseEnter={e => {
              e.currentTarget.style.background = 'rgba(255,255,255,0.14)';
              e.currentTarget.style.transform = 'translateY(-1px)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'transparent';
              e.currentTarget.style.transform = 'translateY(0)';
            }}
            title="背景颜色与透明度"
            aria-label="背景颜色与透明度"
          >
            🎨
          </button>
          <button
            style={{ ...styles.iconBtn, color: pinned ? '#ffd76a' : '#fff8ef' }}
            onClick={handlePin}
            onMouseEnter={e => {
              e.currentTarget.style.background = 'rgba(255,255,255,0.14)';
              e.currentTarget.style.transform = 'translateY(-1px)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'transparent';
              e.currentTarget.style.transform = 'translateY(0)';
            }}
            title={pinned ? '取消固定' : '固定到桌面'}
            aria-label={pinned ? '取消固定' : '固定到桌面'}
          >
            📌
          </button>
          <button
            style={styles.iconBtn}
            onClick={handleClose}
            onMouseEnter={e => {
              e.currentTarget.style.background = 'rgba(255,255,255,0.14)';
              e.currentTarget.style.transform = 'translateY(-1px)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'transparent';
              e.currentTarget.style.transform = 'translateY(0)';
            }}
            aria-label="关闭日历"
          >
            ✕
          </button>
        </div>
      </div>

      <div style={styles.weekRow}>
        {WEEKDAYS.map(w => (
          <div key={w} style={styles.weekCell}>{w}</div>
        ))}
      </div>

      <div style={styles.grid}>
        {days.map((day, i) => {
          if (day === null) return <div key={`empty-${i}`} />;
          const dateStr = formatDate(year, month, day);
          const mark = marks.find(m => m.date === dateStr);
          const isToday = dateStr === todayStr;

          return (
            <div
              key={dateStr}
              style={{
                ...styles.dayCell,
                background: isToday ? 'linear-gradient(180deg, rgba(225, 238, 235, 0.96), rgba(246, 250, 248, 0.9))' : 'rgba(255,255,255,0.2)',
                borderColor: isToday ? 'rgba(58, 108, 101, 0.24)' : 'rgba(73, 55, 37, 0.04)',
                boxShadow: isToday ? '0 10px 24px rgba(42, 78, 74, 0.12)' : 'none',
                fontWeight: isToday ? 700 : 400,
              }}
              onClick={() => handleDayClick(day)}
              onMouseEnter={e => {
                if (!isToday) {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.56)';
                  e.currentTarget.style.transform = 'translateY(-1px)';
                  e.currentTarget.style.boxShadow = '0 10px 22px rgba(53, 40, 27, 0.08)';
                }
              }}
              onMouseLeave={e => {
                if (!isToday) {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.2)';
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = 'none';
                }
              }}
              role="button"
              tabIndex={0}
              onKeyDown={e => e.key === 'Enter' && handleDayClick(day)}
              aria-label={`${month + 1}月${day}日${mark ? ` - ${mark.label}` : ''}`}
              title={mark?.label}
            >
              <span style={{
                ...styles.dayNum,
                color: isToday ? '#275f59' : '#3b3026',
              }}>
                {day}
              </span>
              {mark && (
                <span style={{ ...styles.markDot, background: mark.color }} />
              )}
            </div>
          );
        })}
      </div>

      {colorPickerOpen ? (
        <ColorOpacityPicker
          color={calBgColor}
          opacity={calBgOpacity}
          onColorChange={handleCalColorChange}
          onOpacityChange={handleCalOpacityChange}
          onClose={() => setColorPickerOpen(false)}
        />
      ) : null}

      {/* 标记编辑弹窗 */}
      {selectedDate && (
        <div
          style={styles.modal}
          onClick={e => { if (e.target === e.currentTarget) setSelectedDate(null); }}
          role="dialog"
          aria-label="编辑日期标记"
        >
          <div style={styles.modalContent}>
            <div style={styles.modalTitle}>
              {selectedDate.replace(/-/g, '/')} 标记
            </div>
            <div style={styles.modalText}>给这一天留下一句短笺、一个提醒，或者只是一种情绪的颜色。</div>
            <input
              style={styles.input}
              value={markLabel}
              onChange={e => setMarkLabel(e.target.value)}
              placeholder="输入标记内容..."
              autoFocus
              onKeyDown={e => e.key === 'Enter' && handleSaveMark()}
              aria-label="标记内容"
            />
            <div style={styles.colorRow}>
              {MARK_COLORS.map(c => (
                <div
                  key={c}
                  style={{
                    ...styles.colorDot,
                    background: c,
                    borderColor: c === markColor ? '#333' : 'transparent',
                    transform: c === markColor ? 'scale(1.15)' : 'scale(1)',
                  }}
                  onClick={() => setMarkColor(c)}
                  role="radio"
                  aria-checked={c === markColor}
                  aria-label={`颜色 ${c}`}
                  tabIndex={0}
                  onKeyDown={e => e.key === 'Enter' && setMarkColor(c)}
                />
              ))}
            </div>
            <div style={styles.modalActions}>
              <button
                style={{ ...styles.btn, color: '#a33d35' }}
                onClick={handleDeleteMark}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(227, 111, 97, 0.12)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                删除
              </button>
              <button
                style={{ ...styles.btn, color: '#6b5b49' }}
                onClick={() => setSelectedDate(null)}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(91, 72, 51, 0.08)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                取消
              </button>
              <button
                style={{ ...styles.btn, background: 'linear-gradient(155deg, #2f756c, #244e58)', color: '#fff9ee' }}
                onClick={handleSaveMark}
                onMouseEnter={e => (e.currentTarget.style.background = 'linear-gradient(155deg, #2a685f, #1f434b)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'linear-gradient(155deg, #2f756c, #244e58)')}
              >
                保存
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
