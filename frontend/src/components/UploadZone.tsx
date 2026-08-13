import { useRef, useState } from 'react';

interface Props {
  onFiles: (files: File[]) => void;
  compact?: boolean;
}

export default function UploadZone({ onFiles, compact }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragover, setDragover] = useState(false);

  const pick = (list: FileList | null) => {
    if (!list) return;
    const files = Array.from(list).filter((f) => f.type.startsWith('image/'));
    if (files.length) onFiles(files);
  };

  return (
    <div
      className={`dropzone ${dragover ? 'dragover' : ''}`}
      style={compact ? { padding: '10px' } : undefined}
      onClick={() => inputRef.current?.click()}
      onDragOver={(e) => {
        e.preventDefault();
        setDragover(true);
      }}
      onDragLeave={() => setDragover(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragover(false);
        pick(e.dataTransfer.files);
      }}
    >
      {compact ? '+ 繼續加圖' : '點擊或拖曳圖片到這裡(可多選)'}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        hidden
        onChange={(e) => {
          pick(e.target.files);
          e.target.value = '';
        }}
      />
    </div>
  );
}
