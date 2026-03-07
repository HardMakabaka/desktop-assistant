import React, { useState, useRef, useEffect, useCallback } from 'react';

const PRESET_COLORS = [
  { hex: '#ffffff', label: '白' },
  { hex: '#fff9c4', label: '浅黄' },
  { hex: '#e3f2fd', label: '浅蓝' },
  { hex: '#e8f5e9', label: '浅绿' },
  { hex: '#fce4ec', label: '浅粉' },
  { hex: '#f3e5f5', label: '浅紫' },
  { hex: '#ffe0b2', label: '浅橙' },
  { hex: '#424242', label: '深灰' },
];

export interface ColorOpacityPickerProps {
  color: string;
  opacity: number; // 20-100
  onColorChange: (color: string) => void;
  onOpacityChange: (opacity: number) => void;
  onClose: () => void;
}

const panelStyles = {
  overlay: {
    position: 'fixed' as const,
    inset: 0,
    zIndex: 9999,
  },
  panel: {
    position: 'absolute' as const,
    zIndex: 10000,
    width: 220,
    borderRadius: 10,
    background: 'rgba(255,255,255,0.97)',
    boxShadow: '0 8px 32px rgba(0,0,0,0.22)',
    padding: '10px 12px 12px',
  },
  title: {
    fontSize: 12,
    fontWeight: 700 as const,
    color: 'rgba(0,0,0,0.75)',
    margin: '0 0 8px',
  },
  colorGrid: {
    display: 'flex',
    flexWrap: 'wrap' as const,
    gap: 6,
    marginBottom: 10,
  },
  colorDot: {
    width: 24,
    height: 24,
    borderRadius: '50%',
    cursor: 'pointer',
    border: '2px solid transparent',
    transition: 'border-color 0.15s, transform 0.15s',
  },
  customRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  customLabel: {
    fontSize: 11,
    color: 'rgba(0,0,0,0.55)',
  },
  colorInput: {
    width: 28,
    height: 28,
    border: 'none',
    borderRadius: 6,
    padding: 0,
    cursor: 'pointer',
    background: 'transparent',
  },
  sliderRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  sliderLabel: {
    fontSize: 11,
    color: 'rgba(0,0,0,0.55)',
    minWidth: 40,
  },
  slider: {
    flex: 1,
    height: 4,
    cursor: 'pointer',
    accentColor: '#1976d2',
  },
  sliderValue: {
    fontSize: 11,
    color: 'rgba(0,0,0,0.6)',
    minWidth: 32,
    textAlign: 'right' as const,
  },
};

export function ColorOpacityPicker({
  color,
  opacity,
  onColorChange,
  onOpacityChange,
  onClose,
}: ColorOpacityPickerProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  // close on outside click
  const handleOverlayClick = useCallback(
    (e: React.MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onClose();
      }
    },
    [onClose],
  );

  return (
    <div style={panelStyles.overlay} onClick={handleOverlayClick}>
      <div ref={panelRef} style={panelStyles.panel} onClick={e => e.stopPropagation()}>
        <div style={panelStyles.title}>背景颜色</div>

        <div style={panelStyles.colorGrid}>
          {PRESET_COLORS.map(preset => (
            <div
              key={preset.hex}
              style={{
                ...panelStyles.colorDot,
                background: preset.hex,
                borderColor:
                  color.toLowerCase() === preset.hex.toLowerCase()
                    ? '#1976d2'
                    : 'rgba(0,0,0,0.12)',
                transform:
                  color.toLowerCase() === preset.hex.toLowerCase() ? 'scale(1.15)' : 'scale(1)',
                boxShadow:
                  preset.hex === '#ffffff'
                    ? 'inset 0 0 0 1px rgba(0,0,0,0.08)'
                    : 'none',
              }}
              title={preset.label}
              onClick={() => onColorChange(preset.hex)}
            />
          ))}
        </div>

        <div style={panelStyles.customRow}>
          <span style={panelStyles.customLabel}>自定义</span>
          <input
            type="color"
            value={color}
            onChange={e => onColorChange(e.target.value)}
            style={panelStyles.colorInput}
            title="选择自定义颜色"
          />
          <span style={{ fontSize: 11, color: 'rgba(0,0,0,0.5)', fontFamily: 'monospace' }}>
            {color}
          </span>
        </div>

        <div style={panelStyles.title}>透明度</div>
        <div style={panelStyles.sliderRow}>
          <span style={panelStyles.sliderLabel}>透明</span>
          <input
            type="range"
            min={20}
            max={100}
            step={5}
            value={opacity}
            onChange={e => onOpacityChange(Number(e.target.value))}
            style={panelStyles.slider}
          />
          <span style={panelStyles.sliderValue}>{opacity}%</span>
        </div>
      </div>
    </div>
  );
}

/**
 * Convert hex color + opacity (20-100) to rgba string for CSS background.
 */
export function hexToRgba(hex: string, opacity: number): string {
  const cleaned = hex.replace('#', '');
  const num = parseInt(cleaned, 16);
  const r = (num >> 16) & 0xff;
  const g = (num >> 8) & 0xff;
  const b = num & 0xff;
  const a = Math.max(0.2, Math.min(1, opacity / 100));
  return `rgba(${r},${g},${b},${a})`;
}
