export interface SourceImage {
  id: string;
  file: File;
  name: string;
  bitmap: ImageBitmap;
  width: number;
  height: number;
  thumbUrl: string;
  selected: boolean;
}

export type NinePosition =
  | 'tl' | 'tc' | 'tr'
  | 'cl' | 'cc' | 'cr'
  | 'bl' | 'bc' | 'br';

export interface WatermarkSettings {
  enabled: boolean;
  position: NinePosition;
  /** 邊距/偏移,佔原圖寬高的百分比 */
  offsetX: number;
  offsetY: number;
  /** 浮水印寬度佔原圖寬度的百分比 */
  scale: number;
  opacity: number;
  tiled: boolean;
  /** 平鋪間距,佔浮水印寬度的百分比 */
  tileGap: number;
  tileAngle: number;
}

/** 框選區域,座標為相對比例 0~1,可跨不同尺寸圖片套用 */
export interface MosaicRegion {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface MosaicSettings {
  enabled: boolean;
  mode: 'full' | 'regions';
  /** 馬賽克格子大小(px,以原圖解析度計) */
  blockSize: number;
  opacity: number;
  regions: MosaicRegion[];
}

export type NameRule = 'original' | 'prefix' | 'suffix' | 'sequence';

export interface OutputSettings {
  nameRule: NameRule;
  affix: string;
  format: 'original' | 'jpeg' | 'png';
  jpegQuality: number;
}
