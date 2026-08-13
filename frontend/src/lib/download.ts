import JSZip from 'jszip';
import type { OutputSettings } from '../types';

const MIME_MAP: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
};

/** 依輸出設定決定編碼 mime;原格式不可再編碼者(如 gif)退回 png */
export function resolveMime(originalName: string, s: OutputSettings): string {
  if (s.format === 'jpeg') return 'image/jpeg';
  if (s.format === 'png') return 'image/png';
  const ext = originalName.split('.').pop()?.toLowerCase() ?? '';
  return MIME_MAP[ext] ?? 'image/png';
}

export function buildFileName(
  originalName: string,
  index: number,
  s: OutputSettings,
  mime: string,
  used: Set<string>,
): string {
  const base = originalName.replace(/\.[^.]+$/, '');
  const ext = mime === 'image/jpeg' ? 'jpg' : mime === 'image/webp' ? 'webp' : 'png';

  let name: string;
  switch (s.nameRule) {
    case 'original':
      name = base;
      break;
    case 'prefix':
      name = s.affix + base;
      break;
    case 'suffix':
      name = base + s.affix;
      break;
    case 'sequence':
      name = `image_${String(index + 1).padStart(3, '0')}`;
      break;
  }

  // 檔名衝突自動加序號,避免 ZIP 內互相覆蓋
  let candidate = `${name}.${ext}`;
  let n = 2;
  while (used.has(candidate)) {
    candidate = `${name}_${n}.${ext}`;
    n++;
  }
  used.add(candidate);
  return candidate;
}

export function canvasToBlob(
  canvas: HTMLCanvasElement,
  mime: string,
  quality?: number,
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('toBlob failed'))),
      mime,
      quality,
    );
  });
}

export async function downloadZip(
  files: { name: string; blob: Blob }[],
  onProgress?: (percent: number) => void,
): Promise<void> {
  const zip = new JSZip();
  for (const f of files) {
    zip.file(f.name, f.blob);
  }
  const blob = await zip.generateAsync({ type: 'blob' }, (meta) =>
    onProgress?.(meta.percent),
  );
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `processed_${Date.now()}.zip`;
  a.click();
  URL.revokeObjectURL(url);
}
