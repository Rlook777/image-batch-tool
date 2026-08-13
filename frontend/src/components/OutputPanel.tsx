import type { NameRule, OutputSettings } from '../types';

export interface Progress {
  phase: 'idle' | 'processing' | 'zipping';
  current: number;
  total: number;
  zipPercent: number;
}

interface Props {
  settings: OutputSettings;
  progress: Progress;
  disabledReason: string | null;
  onChange: (s: OutputSettings) => void;
  onRun: () => void;
}

export default function OutputPanel({
  settings,
  progress,
  disabledReason,
  onChange,
  onRun,
}: Props) {
  const set = (patch: Partial<OutputSettings>) =>
    onChange({ ...settings, ...patch });
  const busy = progress.phase !== 'idle';

  const percent =
    progress.phase === 'processing'
      ? (progress.current / Math.max(1, progress.total)) * 100
      : progress.phase === 'zipping'
        ? progress.zipPercent
        : 0;

  return (
    <div className="section">
      <div className="section-title">
        <span>輸出與下載</span>
      </div>
      <div className="rows">
        <div className="row">
          <label>檔名規則</label>
          <select
            value={settings.nameRule}
            onChange={(e) => set({ nameRule: e.target.value as NameRule })}
          >
            <option value="suffix">原檔名 + 後綴</option>
            <option value="prefix">前綴 + 原檔名</option>
            <option value="original">保留原檔名</option>
            <option value="sequence">流水號(image_001…)</option>
          </select>
        </div>

        {(settings.nameRule === 'prefix' || settings.nameRule === 'suffix') && (
          <div className="row">
            <label>{settings.nameRule === 'prefix' ? '前綴' : '後綴'}文字</label>
            <input
              type="text"
              value={settings.affix}
              onChange={(e) => set({ affix: e.target.value })}
            />
          </div>
        )}

        <div className="row">
          <label>輸出格式</label>
          <select
            value={settings.format}
            onChange={(e) =>
              set({ format: e.target.value as OutputSettings['format'] })
            }
          >
            <option value="original">維持原格式</option>
            <option value="jpeg">統一轉 JPG(檔案較小)</option>
            <option value="png">統一轉 PNG(無損)</option>
          </select>
        </div>

        {settings.format !== 'png' && (
          <div className="row">
            <label>
              <span>JPG 品質</span>
              <span>{settings.jpegQuality.toFixed(2)}</span>
            </label>
            <input
              type="range"
              min={0.6}
              max={1}
              step={0.05}
              value={settings.jpegQuality}
              onChange={(e) => set({ jpegQuality: Number(e.target.value) })}
            />
          </div>
        )}

        <button className="btn" disabled={busy || !!disabledReason} onClick={onRun}>
          {progress.phase === 'processing'
            ? `處理中 ${progress.current}/${progress.total}…`
            : progress.phase === 'zipping'
              ? `打包中 ${Math.round(progress.zipPercent)}%…`
              : '批量套用並下載 ZIP'}
        </button>
        {disabledReason && !busy && (
          <div style={{ color: 'var(--text-dim)', fontSize: 12 }}>
            {disabledReason}
          </div>
        )}
        {busy && (
          <div className="progress">
            <div style={{ width: `${percent}%` }} />
          </div>
        )}
      </div>
    </div>
  );
}
