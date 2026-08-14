import { useEffect, useState } from 'react';
import type { SourceImage } from '../types';

export type LayoutScope = 'single' | 'batch';

interface Props {
  previewImg: SourceImage | null;
  selectedCount: number;
  onApply: (scope: LayoutScope, w: number, h: number | null) => void;
  onReset: (scope: LayoutScope) => void;
}

const clamp = (n: number) => Math.min(8192, Math.max(16, Math.round(n) || 16));

export default function LayoutPanel({
  previewImg,
  selectedCount,
  onApply,
  onReset,
}: Props) {
  // 輸入框存字串,打字過程不做範圍修正(否則打「8」會被立刻改成 16),
  // 失焦或按套用時才 clamp
  const [w, setW] = useState('');
  const [h, setH] = useState('');
  const [locked, setLocked] = useState(true);
  const [scope, setScope] = useState<LayoutScope>('single');

  // 切換預覽圖時,把輸入框同步成該圖目前的輸出尺寸
  useEffect(() => {
    if (!previewImg) return;
    const curW = previewImg.targetW ?? previewImg.width;
    const curH =
      previewImg.targetH ??
      (previewImg.targetW
        ? Math.round(previewImg.height * (previewImg.targetW / previewImg.width))
        : previewImg.height);
    setW(String(curW));
    setH(String(curH));
  }, [previewImg?.id, previewImg?.targetW, previewImg?.targetH]);

  if (!previewImg) return null;

  const ratio = previewImg.height / previewImg.width;
  const hasOverride = !!(previewImg.targetW || previewImg.targetH);

  const changeW = (v: string) => {
    setW(v);
    const n = Number(v);
    if (locked && n > 0) setH(String(Math.max(1, Math.round(n * ratio))));
  };
  const changeH = (v: string) => {
    setH(v);
    const n = Number(v);
    if (locked && n > 0) setW(String(Math.max(1, Math.round(n / ratio))));
  };
  const normalize = () => {
    const nw = clamp(Number(w));
    setW(String(nw));
    if (locked) {
      setH(String(Math.max(1, Math.round(nw * ratio))));
    } else {
      setH(String(clamp(Number(h))));
    }
    return nw;
  };

  return (
    <div className="section">
      <div className="section-title">
        <span>尺寸 Layout</span>
        <span style={{ color: 'var(--text-dim)', fontSize: 12 }}>
          原始 {previewImg.width}×{previewImg.height}
        </span>
      </div>
      <div className="rows">
        <div className="row">
          <label>寬 W / 高 H(px)</label>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <input
              type="number"
              min={16}
              max={8192}
              value={w}
              style={{ width: '50%' }}
              onChange={(e) => changeW(e.target.value)}
              onBlur={normalize}
            />
            <input
              type="number"
              min={16}
              max={8192}
              value={h}
              style={{ width: '50%' }}
              onChange={(e) => changeH(e.target.value)}
              onBlur={normalize}
            />
          </div>
        </div>

        <label className="switch">
          <input
            type="checkbox"
            checked={locked}
            onChange={(e) => setLocked(e.target.checked)}
          />
          🔒 鎖定長寬比(解鎖可自由變形)
        </label>

        <div className="row">
          <label>套用範圍</label>
          <select
            value={scope}
            onChange={(e) => setScope(e.target.value as LayoutScope)}
          >
            <option value="single">單張(目前預覽的圖)</option>
            <option value="batch">批量(已勾選 {selectedCount} 張)</option>
          </select>
          {scope === 'batch' && (
            <span style={{ color: 'var(--text-dim)', fontSize: 12 }}>
              {locked
                ? '鎖定比例:批量套用寬度,各圖高度依自身比例'
                : '解鎖:所有圖強制變成同一 W×H,比例不同的圖會變形'}
            </span>
          )}
        </div>

        <div style={{ display: 'flex', gap: 6 }}>
          <button
            className="btn small"
            onClick={() => {
              const nw = normalize();
              onApply(scope, nw, locked ? null : clamp(Number(h)));
            }}
          >
            套用尺寸
          </button>
          {hasOverride && (
            <button className="btn small ghost" onClick={() => onReset(scope)}>
              還原原始尺寸
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
