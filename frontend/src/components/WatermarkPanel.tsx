import { useRef } from 'react';
import type { NinePosition, WatermarkSettings } from '../types';

const POSITIONS: NinePosition[] = [
  'tl', 'tc', 'tr',
  'cl', 'cc', 'cr',
  'bl', 'bc', 'br',
];

interface Props {
  settings: WatermarkSettings;
  wmUrl: string | null;
  onChange: (s: WatermarkSettings) => void;
  onUploadImage: (file: File) => void;
}

export default function WatermarkPanel({
  settings,
  wmUrl,
  onChange,
  onUploadImage,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const set = (patch: Partial<WatermarkSettings>) =>
    onChange({ ...settings, ...patch });

  return (
    <div className="section">
      <div className="section-title">
        <span>浮水印</span>
        <label className="switch">
          <input
            type="checkbox"
            checked={settings.enabled}
            onChange={(e) => set({ enabled: e.target.checked })}
          />
          啟用
        </label>
      </div>
      <div className="rows">
        <div className="row">
          <button className="btn ghost" onClick={() => inputRef.current?.click()}>
            {wmUrl ? '更換浮水印圖片' : '上傳浮水印圖片(建議透明 PNG)'}
          </button>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            hidden
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) onUploadImage(f);
              e.target.value = '';
            }}
          />
          {wmUrl && <img className="wm-thumb" src={wmUrl} alt="浮水印" />}
        </div>

        <div className="row">
          <label>位置(九宮格)</label>
          <div className="pos-grid">
            {POSITIONS.map((p) => (
              <button
                key={p}
                className={settings.position === p ? 'active' : ''}
                onClick={() => set({ position: p })}
              />
            ))}
          </div>
        </div>

        <div className="row">
          <label>
            <span>大小(佔原圖寬度)</span>
            <span>{settings.scale}%</span>
          </label>
          <input
            type="range"
            min={5}
            max={100}
            value={settings.scale}
            onChange={(e) => set({ scale: Number(e.target.value) })}
          />
        </div>

        <div className="row">
          <label>
            <span>透明度</span>
            <span>{settings.opacity}%</span>
          </label>
          <input
            type="range"
            min={0}
            max={100}
            value={settings.opacity}
            onChange={(e) => set({ opacity: Number(e.target.value) })}
          />
        </div>

        <div className="row">
          <label>
            <span>邊距 X / Y(%)</span>
            <span>
              {settings.offsetX} / {settings.offsetY}
            </span>
          </label>
          <input
            type="range"
            min={0}
            max={30}
            value={settings.offsetX}
            onChange={(e) => set({ offsetX: Number(e.target.value) })}
          />
          <input
            type="range"
            min={0}
            max={30}
            value={settings.offsetY}
            onChange={(e) => set({ offsetY: Number(e.target.value) })}
          />
        </div>

        <label className="switch">
          <input
            type="checkbox"
            checked={settings.tiled}
            onChange={(e) => set({ tiled: e.target.checked })}
          />
          平鋪模式(鋪滿整張,防裁切盜圖)
        </label>

        {settings.tiled && (
          <>
            <div className="row">
              <label>
                <span>平鋪間距</span>
                <span>{settings.tileGap}%</span>
              </label>
              <input
                type="range"
                min={0}
                max={200}
                value={settings.tileGap}
                onChange={(e) => set({ tileGap: Number(e.target.value) })}
              />
            </div>
            <div className="row">
              <label>
                <span>旋轉角度</span>
                <span>{settings.tileAngle}°</span>
              </label>
              <input
                type="range"
                min={-90}
                max={90}
                value={settings.tileAngle}
                onChange={(e) => set({ tileAngle: Number(e.target.value) })}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
