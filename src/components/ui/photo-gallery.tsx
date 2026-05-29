'use client';

import { useState } from 'react';
import { Camera, X, ChevronLeft, ChevronRight, ZoomIn } from 'lucide-react';

interface PhotoGalleryProps {
  photos: string[];          // base64 data URLs
  label?: string;
  emptyMessage?: string;
}

export function PhotoGallery({
  photos,
  label = 'Photos',
  emptyMessage = 'Aucune photo disponible',
}: PhotoGalleryProps) {
  const [lightbox, setLightbox] = useState<number | null>(null);

  if (photos.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-8 text-gray-300">
        <Camera size={28} />
        <p className="text-xs text-gray-400">{emptyMessage}</p>
      </div>
    );
  }

  const prev = () => setLightbox((i) => (i! > 0 ? i! - 1 : photos.length - 1));
  const next = () => setLightbox((i) => (i! < photos.length - 1 ? i! + 1 : 0));

  return (
    <>
      {/* Thumbnails grid */}
      <div className="flex flex-wrap gap-3">
        {photos.map((src, i) => (
          <button
            key={i}
            onClick={() => setLightbox(i)}
            className="relative group w-28 h-28 rounded-xl overflow-hidden border border-gray-100 shadow-sm hover:shadow-md transition-shadow focus:outline-none focus:ring-2 focus:ring-brand-500"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={src}
              alt={`${label} ${i + 1}`}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
              <ZoomIn size={18} className="text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow" />
            </div>
            <span className="absolute bottom-1 right-1.5 text-[10px] text-white/90 bg-black/40 px-1 rounded">
              {i + 1}/{photos.length}
            </span>
          </button>
        ))}
      </div>

      {/* Lightbox */}
      {lightbox !== null && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setLightbox(null)}
        >
          {/* Image */}
          <div
            className="relative max-w-3xl max-h-[80vh] w-full"
            onClick={(e) => e.stopPropagation()}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={photos[lightbox]}
              alt={`${label} ${lightbox + 1}`}
              className="w-full h-full max-h-[75vh] object-contain rounded-xl"
            />

            {/* Counter */}
            <div className="absolute top-3 left-3 text-xs text-white/80 bg-black/50 px-2 py-1 rounded-full">
              {lightbox + 1} / {photos.length}
            </div>

            {/* Close */}
            <button
              onClick={() => setLightbox(null)}
              className="absolute top-3 right-3 text-white bg-black/50 hover:bg-black/70 rounded-full p-1.5 transition"
            >
              <X size={16} />
            </button>

            {/* Prev / Next */}
            {photos.length > 1 && (
              <>
                <button
                  onClick={prev}
                  className="absolute left-2 top-1/2 -translate-y-1/2 text-white bg-black/50 hover:bg-black/70 rounded-full p-2 transition"
                >
                  <ChevronLeft size={20} />
                </button>
                <button
                  onClick={next}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-white bg-black/50 hover:bg-black/70 rounded-full p-2 transition"
                >
                  <ChevronRight size={20} />
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
