import type { MosaicSettings, WatermarkSettings } from '../types';

/** 馬賽克/模糊的取樣來源:原圖或縮放後的中介 canvas */
type BaseSource = ImageBitmap | HTMLCanvasElement;

/**
 * 對來源圖套用縮放 + 馬賽克 + 浮水印,回傳處理後的 canvas。
 * @param blockScale 預覽時來源圖是縮小過的,格子大小需乘上同樣比例,
 *                   讓預覽效果與全解析度輸出一致(輸出時傳 1)
 * @param targetW/targetH Layout 尺寸覆寫(px);targetH 為 null 時由 targetW 等比推算。
 *                        先縮放再套效果,馬賽克強度以輸出解析度為準
 */
export function renderProcessed(
  src: ImageBitmap,
  mosaic: MosaicSettings,
  wm: WatermarkSettings,
  wmImage: ImageBitmap | null,
  blockScale = 1,
  targetW?: number | null,
  targetH?: number | null,
): HTMLCanvasElement {
  let base: BaseSource = src;
  if (targetW || targetH) {
    const W = Math.max(
      1,
      Math.round(targetW ?? src.width * (targetH! / src.height)),
    );
    const H = Math.max(
      1,
      Math.round(targetH ?? src.height * (targetW! / src.width)),
    );
    if (W !== src.width || H !== src.height) {
      const b = document.createElement('canvas');
      b.width = W;
      b.height = H;
      b.getContext('2d')!.drawImage(src, 0, 0, W, H);
      base = b;
    }
  }

  const canvas = document.createElement('canvas');
  canvas.width = base.width;
  canvas.height = base.height;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(base, 0, 0);

  if (mosaic.enabled) {
    applyMosaic(ctx, base, mosaic, blockScale);
  }
  if (wm.enabled && wmImage) {
    applyWatermark(ctx, base.width, base.height, wm, wmImage);
  }
  return canvas;
}

function applyMosaic(
  ctx: CanvasRenderingContext2D,
  src: BaseSource,
  s: MosaicSettings,
  blockScale: number,
) {
  const W = src.width;
  const H = src.height;
  const regions =
    s.mode === 'full' ? [{ x: 0, y: 0, w: 1, h: 1 }] : s.regions;
  const strength = Math.max(1, s.blockSize * blockScale);
  // 毛玻璃的模糊整張只算一次,多個框選區域共用
  let blurred: HTMLCanvasElement | null = null;

  for (const r of regions) {
    const rx = Math.round(r.x * W);
    const ry = Math.round(r.y * H);
    const rw = Math.round(r.w * W);
    const rh = Math.round(r.h * H);
    if (rw < 2 || rh < 2) continue;

    if (s.effect === 'glass') {
      if (!blurred) blurred = makeBlurred(src, strength);
      ctx.save();
      ctx.globalAlpha = s.opacity / 100;
      ctx.drawImage(blurred, rx, ry, rw, rh, rx, ry, rw, rh);
      // 細噪點 + 輕微提亮,構成毛玻璃質感
      ctx.globalAlpha = (s.opacity / 100) * 0.08;
      ctx.fillStyle = noisePattern(ctx);
      ctx.fillRect(rx, ry, rw, rh);
      ctx.globalAlpha = (s.opacity / 100) * 0.1;
      ctx.fillStyle = '#fff';
      ctx.fillRect(rx, ry, rw, rh);
      ctx.restore();
      continue;
    }

    // 像素馬賽克 = 區域縮小再放大:縮小時像素平均,放大時關閉平滑保留格子邊緣
    const sw = Math.max(1, Math.round(rw / strength));
    const sh = Math.max(1, Math.round(rh / strength));
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

function makeBlurred(src: BaseSource, radius: number): HTMLCanvasElement {
  const W = src.width;
  const H = src.height;
  // blur 濾鏡在邊緣會取樣到圖片外的透明像素,使邊緣半透明、底下原圖透出。
  // 先把邊緣像素向外延展(edge clamp)再模糊,最後裁回原尺寸。
  const pad = Math.ceil(radius * 2);
  const padded = document.createElement('canvas');
  padded.width = W + pad * 2;
  padded.height = H + pad * 2;
  const pctx = padded.getContext('2d')!;
  pctx.drawImage(src, pad, pad);
  // 四邊:各取 1px 邊條拉伸鋪滿 padding
  pctx.drawImage(src, 0, 0, W, 1, pad, 0, W, pad);
  pctx.drawImage(src, 0, H - 1, W, 1, pad, H + pad, W, pad);
  pctx.drawImage(src, 0, 0, 1, H, 0, pad, pad, H);
  pctx.drawImage(src, W - 1, 0, 1, H, W + pad, pad, pad, H);
  // 四角:用角落像素填滿
  pctx.drawImage(src, 0, 0, 1, 1, 0, 0, pad, pad);
  pctx.drawImage(src, W - 1, 0, 1, 1, W + pad, 0, pad, pad);
  pctx.drawImage(src, 0, H - 1, 1, 1, 0, H + pad, pad, pad);
  pctx.drawImage(src, W - 1, H - 1, 1, 1, W + pad, H + pad, pad, pad);

  const out = document.createElement('canvas');
  out.width = W;
  out.height = H;
  const octx = out.getContext('2d')!;
  if (supportsCanvasFilter()) {
    octx.filter = `blur(${radius}px)`;
    octx.drawImage(padded, -pad, -pad);
  } else {
    // Safari 18 之前不支援 ctx.filter,改用重採樣近似模糊
    const blurred = blurByResample(padded, radius);
    octx.drawImage(blurred, pad, pad, W, H, 0, 0, W, H);
  }
  return out;
}

let filterSupport: boolean | null = null;
function supportsCanvasFilter(): boolean {
  if (filterSupport === null) {
    const ctx = document.createElement('canvas').getContext('2d')!;
    ctx.filter = 'blur(2px)';
    // 不支援的瀏覽器(舊 Safari)會忽略賦值,讀回來仍是 'none'
    filterSupport = ctx.filter === 'blur(2px)';
  }
  return filterSupport;
}

/** 逐步半縮到 1/(radius/2) 再放大回原尺寸,近似高斯模糊 */
function blurByResample(
  source: HTMLCanvasElement,
  radius: number,
): HTMLCanvasElement {
  const w = source.width;
  const h = source.height;
  const k = Math.max(1, radius / 2);
  const targetW = Math.max(1, Math.round(w / k));

  let cur: HTMLCanvasElement = source;
  // 多段半縮比一次縮到底平滑(每段縮小都做一次雙線性平均)
  while (cur.width / 2 > targetW) {
    const next = document.createElement('canvas');
    next.width = Math.max(1, Math.round(cur.width / 2));
    next.height = Math.max(1, Math.round(cur.height / 2));
    next.getContext('2d')!.drawImage(cur, 0, 0, next.width, next.height);
    cur = next;
  }
  const small = document.createElement('canvas');
  small.width = targetW;
  small.height = Math.max(1, Math.round(h * (targetW / w)));
  small.getContext('2d')!.drawImage(cur, 0, 0, small.width, small.height);

  const out = document.createElement('canvas');
  out.width = w;
  out.height = h;
  const octx = out.getContext('2d')!;
  octx.imageSmoothingQuality = 'high';
  octx.drawImage(small, 0, 0, w, h);
  return out;
}

// 噪點用 128px 小磚重複平鋪,避免對大圖逐像素產生隨機值
let noiseTile: HTMLCanvasElement | null = null;
function noisePattern(ctx: CanvasRenderingContext2D): CanvasPattern {
  if (!noiseTile) {
    noiseTile = document.createElement('canvas');
    noiseTile.width = 128;
    noiseTile.height = 128;
    const tctx = noiseTile.getContext('2d')!;
    const data = tctx.createImageData(128, 128);
    for (let i = 0; i < data.data.length; i += 4) {
      const v = Math.floor(Math.random() * 256);
      data.data[i] = v;
      data.data[i + 1] = v;
      data.data[i + 2] = v;
      data.data[i + 3] = 255;
    }
    tctx.putImageData(data, 0, 0);
  }
  return ctx.createPattern(noiseTile, 'repeat')!;
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
