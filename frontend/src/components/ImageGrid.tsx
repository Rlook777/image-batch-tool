import type { SourceImage } from '../types';

interface Props {
  images: SourceImage[];
  previewId: string | null;
  onToggle: (id: string) => void;
  onSelectAll: (selected: boolean) => void;
  onInvert: () => void;
  onPreview: (id: string) => void;
  onRemove: (id: string) => void;
}

export default function ImageGrid({
  images,
  previewId,
  onToggle,
  onSelectAll,
  onInvert,
  onPreview,
  onRemove,
}: Props) {
  const selectedCount = images.filter((i) => i.selected).length;

  return (
    <div className="grid-area">
      <div className="grid-toolbar">
        <span>
          共 {images.length} 張,已選 {selectedCount} 張
        </span>
        <button className="btn small ghost" onClick={() => onSelectAll(true)}>
          全選
        </button>
        <button className="btn small ghost" onClick={() => onSelectAll(false)}>
          全不選
        </button>
        <button className="btn small ghost" onClick={onInvert}>
          反選
        </button>
        <span style={{ marginLeft: 'auto' }}>
          點縮圖切換預覽,勾選框決定是否批量處理
        </span>
      </div>
      <div className="thumb-grid">
        {images.map((img) => (
          <div
            key={img.id}
            className={`thumb ${img.selected ? 'checked' : ''} ${
              img.id === previewId ? 'previewing' : ''
            }`}
            onClick={() => onPreview(img.id)}
          >
            <img src={img.thumbUrl} alt={img.name} />
            <input
              type="checkbox"
              className="check"
              checked={img.selected}
              onClick={(e) => e.stopPropagation()}
              onChange={() => onToggle(img.id)}
            />
            <button
              className="remove"
              title="移除"
              onClick={(e) => {
                e.stopPropagation();
                onRemove(img.id);
              }}
            >
              ✕
            </button>
            <div className="meta">
              {img.name} · {img.width}×{img.height}
              {(img.targetW || img.targetH) &&
                ` → ${img.targetW ?? Math.round(img.width * (img.targetH! / img.height))}×${
                  img.targetH ??
                  Math.round(img.height * (img.targetW! / img.width))
                }`}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
