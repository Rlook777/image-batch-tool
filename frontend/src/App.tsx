import { useEffect, useRef, useState } from 'react';
import type {
  MosaicSettings,
  OutputSettings,
  SourceImage,
  WatermarkSettings,
} from './types';
import { renderProcessed } from './lib/render';
import {
  buildFileName,
  canvasToBlob,
  downloadZip,
  resolveMime,
} from './lib/download';
import UploadZone from './components/UploadZone';
import ImageGrid from './components/ImageGrid';
import Preview from './components/Preview';
import WatermarkPanel from './components/WatermarkPanel';
import MosaicPanel from './components/MosaicPanel';
import LayoutPanel from './components/LayoutPanel';
import OutputPanel, { type Progress } from './components/OutputPanel';

/** 預覽用縮圖的最長邊,避免大圖在調參數時重繪卡頓 */
const PREVIEW_MAX = 1200;

let idSeq = 0;
const nextId = () => `img_${++idSeq}`;

export default function App() {
  const [images, setImages] = useState<SourceImage[]>([]);
  const [previewId, setPreviewId] = useState<string | null>(null);

  const [watermark, setWatermark] = useState<WatermarkSettings>({
    enabled: false,
    position: 'br',
    offsetX: 3,
    offsetY: 3,
    scale: 25,
    opacity: 60,
    tiled: false,
    tileGap: 60,
    tileAngle: -30,
  });
  const [wmImage, setWmImage] = useState<ImageBitmap | null>(null);
  const [wmUrl, setWmUrl] = useState<string | null>(null);

  const [mosaic, setMosaic] = useState<MosaicSettings>({
    enabled: false,
    effect: 'pixelate',
    mode: 'full',
    blockSize: 15,
    opacity: 100,
    regions: [],
  });

  const [output, setOutput] = useState<OutputSettings>({
    nameRule: 'suffix',
    affix: '_processed',
    format: 'original',
    jpegQuality: 0.9,
  });

  const [progress, setProgress] = useState<Progress>({
    phase: 'idle',
    current: 0,
    total: 0,
    zipPercent: 0,
  });

  // 預覽縮圖快取:key = 圖片 id,value = 縮小後 bitmap 與縮放比
  const previewCache = useRef(
    new Map<string, { bitmap: ImageBitmap; scale: number }>(),
  );
  const [previewData, setPreviewData] = useState<{
    bitmap: ImageBitmap;
    scale: number;
  } | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!previewId) {
        setPreviewData(null);
        return;
      }
      const cached = previewCache.current.get(previewId);
      if (cached) {
        setPreviewData(cached);
        return;
      }
      const img = images.find((i) => i.id === previewId);
      if (!img) {
        setPreviewData(null);
        return;
      }
      const ratio = Math.min(
        1,
        PREVIEW_MAX / Math.max(img.width, img.height),
      );
      const bitmap =
        ratio < 1
          ? await createImageBitmap(img.bitmap, {
              resizeWidth: Math.round(img.width * ratio),
              resizeHeight: Math.round(img.height * ratio),
            })
          : img.bitmap;
      const data = { bitmap, scale: ratio };
      previewCache.current.set(previewId, data);
      if (!cancelled) setPreviewData(data);
    })();
    return () => {
      cancelled = true;
    };
  }, [previewId, images]);

  const addFiles = async (files: File[]) => {
    const loaded: SourceImage[] = [];
    for (const file of files) {
      try {
        const bitmap = await createImageBitmap(file);
        loaded.push({
          id: nextId(),
          file,
          name: file.name,
          bitmap,
          width: bitmap.width,
          height: bitmap.height,
          thumbUrl: URL.createObjectURL(file),
          selected: true,
        });
      } catch {
        console.warn(`無法解碼圖片:${file.name}`);
      }
    }
    setImages((prev) => [...prev, ...loaded]);
    if (!previewId && loaded.length) setPreviewId(loaded[0].id);
  };

  const removeImage = (id: string) => {
    setImages((prev) => {
      const target = prev.find((i) => i.id === id);
      if (target) URL.revokeObjectURL(target.thumbUrl);
      previewCache.current.delete(id);
      const rest = prev.filter((i) => i.id !== id);
      if (previewId === id) setPreviewId(rest[0]?.id ?? null);
      return rest;
    });
  };

  const uploadWatermark = async (file: File) => {
    const bitmap = await createImageBitmap(file);
    if (wmUrl) URL.revokeObjectURL(wmUrl);
    setWmImage(bitmap);
    setWmUrl(URL.createObjectURL(file));
    setWatermark((s) => ({ ...s, enabled: true }));
  };

  const applyLayout = (scope: 'single' | 'batch', w: number, h: number | null) =>
    setImages((prev) =>
      prev.map((i) =>
        (scope === 'single' ? i.id === previewId : i.selected)
          ? { ...i, targetW: w, targetH: h }
          : i,
      ),
    );

  const resetLayout = (scope: 'single' | 'batch') =>
    setImages((prev) =>
      prev.map((i) =>
        (scope === 'single' ? i.id === previewId : i.selected)
          ? { ...i, targetW: null, targetH: null }
          : i,
      ),
    );

  const selected = images.filter((i) => i.selected);
  const hasLayout = selected.some((i) => i.targetW || i.targetH);
  const disabledReason = !selected.length
    ? '請先上傳並勾選圖片'
    : !watermark.enabled && !mosaic.enabled && !hasLayout
      ? '請至少啟用浮水印或馬賽克,或設定尺寸'
      : watermark.enabled && !wmImage
        ? '已啟用浮水印,請先上傳浮水印圖片'
        : mosaic.enabled && mosaic.mode === 'regions' && !mosaic.regions.length
          ? '框選模式下請先在預覽圖上框選至少一個區域'
          : null;

  const run = async () => {
    setProgress({ phase: 'processing', current: 0, total: selected.length, zipPercent: 0 });
    const files: { name: string; blob: Blob }[] = [];
    const used = new Set<string>();
    try {
      for (let i = 0; i < selected.length; i++) {
        const img = selected[i];
        const canvas = renderProcessed(
          img.bitmap,
          mosaic,
          watermark,
          wmImage,
          1,
          img.targetW ?? null,
          img.targetH ?? null,
        );
        const mime = resolveMime(img.name, output);
        const blob = await canvasToBlob(
          canvas,
          mime,
          mime === 'image/png' ? undefined : output.jpegQuality,
        );
        files.push({
          name: buildFileName(img.name, i, output, mime, used),
          blob,
        });
        setProgress((p) => ({ ...p, current: i + 1 }));
        // 讓出主執行緒,批量處理時進度條與 UI 不凍結
        await new Promise((r) => setTimeout(r, 0));
      }
      setProgress((p) => ({ ...p, phase: 'zipping' }));
      await downloadZip(files, (percent) =>
        setProgress((p) => ({ ...p, zipPercent: percent })),
      );
    } finally {
      setProgress({ phase: 'idle', current: 0, total: 0, zipPercent: 0 });
    }
  };

  // 預覽端把尺寸覆寫按預覽縮圖比例縮小後傳入,
  // 預覽會真實呈現目標比例(含變形),效果強度也與輸出一致
  const previewImg = images.find((i) => i.id === previewId) ?? null;
  const q = previewData?.scale ?? 1;
  const pTargetW = previewImg?.targetW
    ? Math.max(1, Math.round(previewImg.targetW * q))
    : null;
  const pTargetH = previewImg?.targetH
    ? Math.max(1, Math.round(previewImg.targetH * q))
    : null;

  return (
    <div className="app">
      <div className="mobile-warn">
        📱 本工具以桌面操作為主,手機畫面較擠,建議使用電腦開啟
      </div>
      <header className="app-header">
        <h1>圖片批量處理工具</h1>
        <span className="hint">
          馬賽克 · 浮水印 · 批量下載(全程在你的瀏覽器處理,圖片不會上傳)
        </span>
      </header>
      <div className="app-body">
        <aside className="sidebar">
          <UploadZone onFiles={addFiles} compact={images.length > 0} />
          <LayoutPanel
            previewImg={previewImg}
            selectedCount={selected.length}
            onApply={applyLayout}
            onReset={resetLayout}
          />
          <MosaicPanel settings={mosaic} onChange={setMosaic} />
          <WatermarkPanel
            settings={watermark}
            wmUrl={wmUrl}
            onChange={setWatermark}
            onUploadImage={uploadWatermark}
          />
          <OutputPanel
            settings={output}
            progress={progress}
            disabledReason={disabledReason}
            onChange={setOutput}
            onRun={run}
          />
        </aside>
        <main className="main">
          <Preview
            bitmap={previewData?.bitmap ?? null}
            blockScale={q}
            targetW={pTargetW}
            targetH={pTargetH}
            mosaic={mosaic}
            watermark={watermark}
            wmImage={wmImage}
            onAddRegion={(r) =>
              setMosaic((s) => ({
                ...s,
                regions: [...s.regions, { ...r, id: `r_${Date.now()}` }],
              }))
            }
            onRemoveRegion={(id) =>
              setMosaic((s) => ({
                ...s,
                regions: s.regions.filter((r) => r.id !== id),
              }))
            }
          />
          {images.length > 0 && (
            <ImageGrid
              images={images}
              previewId={previewId}
              onToggle={(id) =>
                setImages((prev) =>
                  prev.map((i) =>
                    i.id === id ? { ...i, selected: !i.selected } : i,
                  ),
                )
              }
              onSelectAll={(sel) =>
                setImages((prev) => prev.map((i) => ({ ...i, selected: sel })))
              }
              onInvert={() =>
                setImages((prev) =>
                  prev.map((i) => ({ ...i, selected: !i.selected })),
                )
              }
              onPreview={setPreviewId}
              onRemove={removeImage}
            />
          )}
        </main>
      </div>
    </div>
  );
}
