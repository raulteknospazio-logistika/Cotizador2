import React, { useEffect, useState } from 'react';

interface PhotoViewerModalProps {
  url: string | null;
  title: string;
  onClose: () => void;
}

export const PhotoViewerModal: React.FC<PhotoViewerModalProps> = ({ url, title, onClose }) => {
  const [zoom, setZoom] = useState(1);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  if (!url) return null;

  const handleDownload = () => {
    const a = document.createElement('a');
    a.href = url;
    a.download = `${title.replace(/[^a-z0-9]/gi, '_')}.jpg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-between bg-slate-950/95 p-4 sm:p-6 no-print"
      onClick={onClose}
    >
      {/* Top controls */}
      <div
        className="flex w-full max-w-5xl items-center justify-between gap-3 text-white py-2"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="min-w-0">
          <h3 className="truncate text-sm font-bold sm:text-base">{title || 'Visor de Foto'}</h3>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={handleDownload}
            className="rounded-lg bg-white/10 px-3 py-1.5 text-xs font-semibold text-white hover:bg-white/20 transition"
          >
            <i className="fa-solid fa-download mr-1"></i> Descargar
          </button>
          <button
            type="button"
            onClick={() => setZoom((z) => Math.max(0.5, z - 0.25))}
            className="rounded-lg bg-white/10 px-3 py-1.5 text-xs text-white hover:bg-white/20"
          >
            −
          </button>
          <button
            type="button"
            onClick={() => setZoom(1)}
            className="rounded-lg bg-white/10 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-white/20"
          >
            {Math.round(zoom * 100)}%
          </button>
          <button
            type="button"
            onClick={() => setZoom((z) => Math.min(3, z + 0.25))}
            className="rounded-lg bg-white/10 px-3 py-1.5 text-xs text-white hover:bg-white/20"
          >
            +
          </button>
          <button
            type="button"
            onClick={onClose}
            className="ml-2 rounded-lg bg-white/10 px-3 py-1.5 text-xs font-bold text-white hover:bg-red-600 transition"
          >
            ×
          </button>
        </div>
      </div>

      {/* Main Image View */}
      <div
        className="flex flex-1 items-center justify-center overflow-auto w-full max-w-5xl my-2"
        onClick={(e) => e.stopPropagation()}
      >
        <img
          src={url}
          alt={title}
          style={{
            transform: `scale(${zoom})`,
            transition: 'transform 150ms ease',
          }}
          className="max-h-[75vh] max-w-full select-none object-contain rounded-lg shadow-2xl"
        />
      </div>

      <p className="text-[11px] text-slate-400 text-center py-1">
        Presiona Esc para cerrar el visor de imágenes.
      </p>
    </div>
  );
};
