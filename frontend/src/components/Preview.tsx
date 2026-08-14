import { useEffect, useRef, useState } from 'react';
import type { MosaicRegion, MosaicSettings, WatermarkSettings } from '../types';
import { renderProcessed } from '../lib/render';

interface Props {
  bitmap: ImageBitmap | null;
  /** 預覽用縮圖相對原圖的縮放比(<1),用來校正馬賽克格子大小 */
  blockScale: number;
  /** Layout 尺寸覆寫(已按預覽縮圖比例縮小) */
  targetW: number | null;
  targetH: number | null;
  mosaic: MosaicSettings;
  watermark: WatermarkSettings;
  wmImage: ImageBitmap | null;
  onAddRegion: (r: Omit<MosaicRegion, 'id'>) => void;
  onRemoveRegion: (id: string) => void;
}

interface Draft {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

export default function Preview({
  bitmap,
  blockScale,
  targetW,
  targetH,
  mosaic,
  watermark,
  wmImage,
  onAddRegion,
  onRemoveRegion,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const layerRef = useRef<HTMLDivElement>(null);
  const [draft, setDraft] = useState<Draft | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !bitmap) return;
    const rendered = renderProcessed(
      bitmap,
      mosaic,
      watermark,
      wmImage,
      blockScale,
      targetW,
      targetH,
    );
    canvas.width = rendered.width;
    canvas.height = rendered.height;
    canvas.getContext('2d')!.drawImage(rendered, 0, 0);
  }, [bitmap, blockScale, targetW, targetH, mosaic, watermark, wmImage]);

  if (!bitmap) {
    return (
      <div className="preview-area">
        <div className="preview-empty">
          <h2>三步驟完成批量處理</h2>
          <ol>
            <li>左上角上傳圖片(可一次多張,最多建議 100 張)</li>
            <li>啟用「馬賽克」或「浮水印」,調整參數,在這裡即時預覽</li>
            <li>按「批量套用並下載 ZIP」,一次拿到所有處理好的圖</li>
          </ol>
          <p className="privacy-note">
            🔒 圖片全程在你的瀏覽器裡處理,不會上傳到任何伺服器
          </p>
        </div>
      </div>
    );
  }

  const drawingEnabled = mosaic.enabled && mosaic.mode === 'regions';

  // 滑鼠座標 → 相對比例(0~1),存相對值才能套用到不同尺寸的圖
  const relPos = (e: React.MouseEvent) => {
    const rect = layerRef.current!.getBoundingClientRect();
    return {
      x: Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width)),
      y: Math.min(1, Math.max(0, (e.clientY - rect.top) / rect.height)),
    };
  };

  const draftRect = draft
    ? {
        x: Math.min(draft.x0, draft.x1),
        y: Math.min(draft.y0, draft.y1),
        w: Math.abs(draft.x1 - draft.x0),
        h: Math.abs(draft.y1 - draft.y0),
      }
    : null;

  return (
    <div className="preview-area">
      <div className="preview-wrap">
        <canvas ref={canvasRef} />
        {drawingEnabled && (
          <div
            ref={layerRef}
            className="region-layer"
            onMouseDown={(e) => {
              const p = relPos(e);
              setDraft({ x0: p.x, y0: p.y, x1: p.x, y1: p.y });
            }}
            onMouseMove={(e) => {
              if (!draft) return;
              const p = relPos(e);
              setDraft({ ...draft, x1: p.x, y1: p.y });
            }}
            onMouseUp={() => {
              if (draftRect && draftRect.w > 0.01 && draftRect.h > 0.01) {
                onAddRegion(draftRect);
              }
              setDraft(null);
            }}
            onMouseLeave={() => setDraft(null)}
          >
            {mosaic.regions.map((r) => (
              <div
                key={r.id}
                className="region-box"
                style={{
                  left: `${r.x * 100}%`,
                  top: `${r.y * 100}%`,
                  width: `${r.w * 100}%`,
                  height: `${r.h * 100}%`,
                }}
              >
                <button
                  className="del"
                  onMouseDown={(e) => e.stopPropagation()}
                  onClick={() => onRemoveRegion(r.id)}
                >
                  ✕
                </button>
              </div>
            ))}
            {draftRect && (
              <div
                className="region-box"
                style={{
                  left: `${draftRect.x * 100}%`,
                  top: `${draftRect.y * 100}%`,
                  width: `${draftRect.w * 100}%`,
                  height: `${draftRect.h * 100}%`,
                }}
              />
            )}
            <div className="region-hint">
              在圖上拖曳框選馬賽克區域(可框多個,框以相對位置套用到所有選中圖)
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
