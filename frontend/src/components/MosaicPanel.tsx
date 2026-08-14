import type { MosaicSettings } from '../types';

interface Props {
  settings: MosaicSettings;
  onChange: (s: MosaicSettings) => void;
}

export default function MosaicPanel({ settings, onChange }: Props) {
  const set = (patch: Partial<MosaicSettings>) =>
    onChange({ ...settings, ...patch });

  return (
    <div className="section">
      <div className="section-title">
        <span>馬賽克</span>
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
          <label>效果類型</label>
          <select
            value={settings.effect}
            onChange={(e) =>
              set({ effect: e.target.value as MosaicSettings['effect'] })
            }
          >
            <option value="pixelate">像素馬賽克</option>
            <option value="glass">毛玻璃</option>
          </select>
          {settings.effect === 'glass' && (
            <span style={{ color: 'var(--text-dim)', fontSize: 12 }}>
              ⚠️ 模糊類效果可能被 AI 部分還原,遮擋人臉、車牌、文字等敏感資訊建議用高強度像素馬賽克
            </span>
          )}
        </div>

        <div className="row">
          <label>範圍模式</label>
          <select
            value={settings.mode}
            onChange={(e) =>
              set({ mode: e.target.value as MosaicSettings['mode'] })
            }
          >
            <option value="full">整張圖</option>
            <option value="regions">框選區域(在預覽圖上拖曳)</option>
          </select>
        </div>

        {settings.mode === 'regions' && (
          <div className="row">
            <label>
              <span>已框選 {settings.regions.length} 個區域</span>
            </label>
            {settings.regions.length > 0 && (
              <button
                className="btn small ghost"
                onClick={() => set({ regions: [] })}
              >
                清除全部區域
              </button>
            )}
          </div>
        )}

        <div className="row">
          <label>
            <span>
              強度({settings.effect === 'glass' ? '模糊半徑' : '格子大小'})
            </span>
            <span>{settings.blockSize}px</span>
          </label>
          <input
            type="range"
            min={5}
            max={50}
            value={settings.blockSize}
            onChange={(e) => set({ blockSize: Number(e.target.value) })}
          />
        </div>

        <div className="row">
          <label>
            <span>透明度(100% = 完全遮蓋)</span>
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
      </div>
    </div>
  );
}
