import React, { useEffect, useState, useCallback } from 'react';
import type { CalendarMark } from '../../shared/types';

const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六'];
const MARK_COLORS = ['#e53935', '#43a047', '#1e88e5', '#fb8c00', '#8e24aa', '#00acc1'];

const styles = {
  container: {
    height: '100vh',
    display: 'flex',
    flexDirection: 'column' as const,
    borderRadius: '12px',
    overflow: 'hidden',
    background: '#fff',
    boxShadow: '0 4px 24px rgba(0,0,0,0.12)',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '10px 14px',
    background: '#1976d2',
    color: '#fff',
    WebkitAppRegion: 'drag' as unknown as string,
  },
  headerActions: {
    display: 'flex',
    gap: '4px',
    WebkitAppRegion: 'no-drag' as unknown as string,
  },
  navBtn: {
    width: 28,
    height: 28,
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#fff',
    fontSize: '14px',
    transition: 'background 0.15s',
  },
  monthLabel: {
    fontSize: '15px',
    fontWeight: 600,
  },
  iconBtn: {
    width: 24,
    height: 24,
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '12px',
    color: '#fff',
    transition: 'background 0.15s',
  },
  weekRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(7, 1fr)',
    padding: '8px 10px 4px',
    background: '#f5f5f5',
  },
  weekCell: {
    textAlign: 'center' as const,
    fontSize: '11px',
    color: '#999',
    fontWeight: 500,
    padding: '4px 0',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(7, 1fr)',
    padding: '4px 10px',
    gap: '2px',
    flex: 1,
  },
  dayCell: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '8px',
    cursor: 'pointer',
    padding: '4px 0',
    minHeight: '40px',
    transition: 'background 0.15s',
    position: 'relative' as const,
  },
  dayNum: {
    fontSize: '13px',
    fontWeight: 500,
  },
  markDot: {
    width: 6,
    height: 6,
    borderRadius: '50%',
    marginTop: '2px',
  },
  modal: {
    position: 'fixed' as const,
    inset: 0,
    background: 'rgba(0,0,0,0.3)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100,
  },
  modalContent: {
    background: '#fff',
    borderRadius: '14px',
    padding: '20px',
    width: '280px',
    boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
  },
  modalTitle: {
    fontSize: '15px',
    fontWeight: 600,
    marginBottom: '14px',
    color: '#333',
  },
  input: {
    width: '100%',
    padding: '8px 12px',
    border: '1px solid #ddd',
    borderRadius: '8px',
    fontSize: '13px',
    outline: 'none',
    marginBottom: '12px',
    fontFamily: 'inherit',
  },
  colorRow: {
    display: 'flex',
    gap: '8px',
    marginBottom: '16px',
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
    padding: '6px 16px',
    borderRadius: '8px',
    fontSize: '13px',
    fontWeight: 500,
    transition: 'background 0.15s',
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
    <div style={styles.container}>
      <div style={styles.header}>
        <div style={styles.headerActions}>
          <button
            style={styles.navBtn}
            onClick={prevMonth}
            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.15)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            aria-label="上个月"
          >
            ◀
          </button>
          <span style={styles.monthLabel}>{year}年{month + 1}月</span>
          <button
            style={styles.navBtn}
            onClick={nextMonth}
            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.15)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            aria-label="下个月"
          >
            ▶
          </button>
        </div>
        <div style={styles.headerActions}>
          <button
            style={{ ...styles.iconBtn, color: pinned ? '#ffeb3b' : '#fff' }}
            onClick={handlePin}
            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.15)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            title={pinned ? '取消固定' : '固定到桌面'}
            aria-label={pinned ? '取消固定' : '固定到桌面'}
          >
            📌
          </button>
          <button
            style={styles.iconBtn}
            onClick={handleClose}
            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.15)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
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
                background: isToday ? '#e3f2fd' : 'transparent',
                fontWeight: isToday ? 700 : 400,
              }}
              onClick={() => handleDayClick(day)}
              onMouseEnter={e => {
                if (!isToday) e.currentTarget.style.background = '#f5f5f5';
              }}
              onMouseLeave={e => {
                if (!isToday) e.currentTarget.style.background = 'transparent';
              }}
              role="button"
              tabIndex={0}
              onKeyDown={e => e.key === 'Enter' && handleDayClick(day)}
              aria-label={`${month + 1}月${day}日${mark ? ` - ${mark.label}` : ''}`}
              title={mark?.label}
            >
              <span style={{
                ...styles.dayNum,
                color: isToday ? '#1976d2' : '#333',
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
                style={{ ...styles.btn, color: '#e53935' }}
                onClick={handleDeleteMark}
                onMouseEnter={e => (e.currentTarget.style.background = '#ffebee')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                删除
              </button>
              <button
                style={{ ...styles.btn, color: '#666' }}
                onClick={() => setSelectedDate(null)}
                onMouseEnter={e => (e.currentTarget.style.background = '#f5f5f5')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                取消
              </button>
              <button
                style={{ ...styles.btn, background: '#1976d2', color: '#fff' }}
                onClick={handleSaveMark}
                onMouseEnter={e => (e.currentTarget.style.background = '#1565c0')}
                onMouseLeave={e => (e.currentTarget.style.background = '#1976d2')}
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
