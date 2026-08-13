import type { MosaicSettings, WatermarkSettings } from '../types';

/**
 * 對來源圖套用馬賽克 + 浮水印,回傳處理後的 canvas。
 * @param blockScale 預覽時來源圖是縮小過的,格子大小需乘上同樣比例,
 *                   讓預覽效果與全解析度輸出一致(輸出時傳 1)
 */
export function renderProcessed(
  src: ImageBitmap,
  mosaic: MosaicSettings,
  wm: WatermarkSettings,
  wmImage: ImageBitmap | null,
  blockScale = 1,
): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = src.width;
  canvas.height = src.height;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(src, 0, 0);

  if (mosaic.enabled) {
    applyMosaic(ctx, src, mosaic, blockScale);
  }
  if (wm.enabled && wmImage) {
    applyWatermark(ctx, src.width, src.height, wm, wmImage);
  }
  return canvas;
}

function applyMosaic(
  ctx: CanvasRenderingContext2D,
  src: ImageBitmap,
  s: MosaicSettings,
  blockScale: number,
) {
  const W = src.width;
  const H = src.height;
  const regions =
    s.mode === 'full' ? [{ x: 0, y: 0, w: 1, h: 1 }] : s.regions;
  const block = Math.max(1, s.blockSize * blockScale);

  for (const r of regions) {
    const rx = Math.round(r.x * W);
    const ry = Math.round(r.y * H);
    const rw = Math.round(r.w * W);
    const rh = Math.round(r.h * H);
    if (rw < 2 || rh < 2) continue;

    // 馬賽克 = 區域縮小再放大:縮小時像素平均,放大時關閉平滑保留格子邊緣
    const sw = Math.max(1, Math.round(rw / block));
    const sh = Math.max(1, Math.round(rh / block));
    const small = document.createElement('canvas');
    small.width = sw;
    small.height = sh;
    small.getContext('2d')!.drawImage(src, rx, ry, rw, rh, 0, 0, sw, sh);

    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.globalAlpha = s.opacity / 100;
    ctx.drawImage(small, 0, 0, sw, sh, rx, ry, rw, rh);
    ctx.restore();
  }
}

function applyWatermark(
  ctx: CanvasRenderingContext2D,
  W: number,
  H: number,
  s: WatermarkSettings,
  img: ImageBitmap,
) {
  const wmW = Math.max(1, (W * s.scale) / 100);
  const wmH = wmW * (img.height / img.width);

  ctx.save();
  ctx.globalAlpha = s.opacity / 100;

  if (s.tiled) {
    const gap = (wmW * s.tileGap) / 100;
    const stepX = wmW + gap;
    const stepY = wmH + gap;
    // 以對角線長度為鋪設範圍,旋轉任意角度後仍能覆蓋整張圖
    const diag = Math.hypot(W, H);
    ctx.translate(W / 2, H / 2);
    ctx.rotate((s.tileAngle * Math.PI) / 180);
    for (let y = -diag / 2; y < diag / 2; y += stepY) {
      for (let x = -diag / 2; x < diag / 2; x += stepX) {
        ctx.drawImage(img, x, y, wmW, wmH);
      }
    }
  } else {
    const padX = (W * s.offsetX) / 100;
    const padY = (H * s.offsetY) / 100;
    const col = s.position[1]; // l / c / r
    const row = s.position[0]; // t / c / b
    const x =
      col === 'l' ? padX : col === 'r' ? W - wmW - padX : (W - wmW) / 2 + padX;
    const y =
      row === 't' ? padY : row === 'b' ? H - wmH - padY : (H - wmH) / 2 + padY;
    ctx.drawImage(img, x, y, wmW, wmH);
  }
  ctx.restore();
}
