import React, { useState } from 'react';
import {
  Image as ImageIcon,
  BookOpen,
  Maximize2,
  ZoomIn,
  ZoomOut,
  ChevronLeft,
  ChevronRight,
  X,
  FileText,
} from 'lucide-react';

export default function PagePhotoGallery({ sources = [] }) {
  const [selectedIdx, setSelectedIdx] = useState(null);
  const [zoom, setZoom] = useState(1);

  if (!sources || sources.length === 0) return null;

  // Filter and deduplicate unique (document_name, page) pairs
  const uniquePages = [];
  const seen = new Set();
  sources.forEach((s) => {
    const key = `${s.document_name}_${s.page}`;
    if (!seen.has(key)) {
      seen.add(key);
      const imageUrl =
        s.image_url ||
        (s.source_file && s.page
          ? `/api/documents/page-image?source_file=${encodeURIComponent(s.source_file)}&page=${s.page}`
          : null);
      uniquePages.push({
        ...s,
        resolvedImageUrl: imageUrl,
      });
    }
  });

  if (uniquePages.length === 0) return null;

  const current = selectedIdx !== null ? uniquePages[selectedIdx] : null;

  const handlePrev = (e) => {
    e.stopPropagation();
    setSelectedIdx((prev) => (prev > 0 ? prev - 1 : uniquePages.length - 1));
    setZoom(1);
  };

  const handleNext = (e) => {
    e.stopPropagation();
    setSelectedIdx((prev) => (prev < uniquePages.length - 1 ? prev + 1 : 0));
    setZoom(1);
  };

  return (
    <div className="mt-6 pt-5 border-t border-neutral-200/70 dark:border-neutral-800/80">
      {/* Section Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 text-xs font-semibold text-neutral-600 dark:text-neutral-400 uppercase tracking-wider">
          <ImageIcon className="w-4 h-4 text-sky-500" />
          <span>Cited Book Pages ({uniquePages.length} {uniquePages.length === 1 ? 'Page' : 'Pages'})</span>
        </div>
        <span className="text-[11px] text-neutral-400">
          Click any page to view original book scan
        </span>
      </div>

      {/* Horizontal Carousel of Book Page Photos */}
      <div className="flex items-stretch gap-3 overflow-x-auto pb-2 scrollbar-thin">
        {uniquePages.map((item, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => {
              setSelectedIdx(idx);
              setZoom(1);
            }}
            className="group relative flex flex-col w-32 sm:w-36 shrink-0 rounded-xl overflow-hidden border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-sm hover:shadow-md hover:border-sky-500/70 dark:hover:border-sky-500/70 transition-all text-left cursor-pointer focus:outline-none focus:ring-2 focus:ring-sky-500/40"
          >
            {/* Page Photo Thumbnail */}
            <div className="relative w-full h-44 bg-neutral-100 dark:bg-neutral-800 overflow-hidden flex items-center justify-center">
              {item.resolvedImageUrl ? (
                <img
                  src={item.resolvedImageUrl}
                  alt={`${item.document_name} Page ${item.page}`}
                  className="w-full h-full object-cover object-top transition-transform duration-300 group-hover:scale-105"
                  loading="lazy"
                />
              ) : (
                <div className="flex flex-col items-center text-neutral-400 p-2 text-center">
                  <BookOpen className="w-6 h-6 mb-1 opacity-50" />
                  <span className="text-[10px]">Page Scan</span>
                </div>
              )}
              {/* Overlay Badge */}
              <div className="absolute top-2 left-2 px-1.5 py-0.5 rounded-md bg-black/70 backdrop-blur-xs text-white text-[10px] font-bold tracking-wide">
                Page {item.page}
              </div>
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-center pb-2">
                <span className="text-[11px] font-semibold text-white drop-shadow flex items-center gap-1">
                  <Maximize2 className="w-3 h-3" /> View Photo
                </span>
              </div>
            </div>

            {/* Book Title Footer */}
            <div className="p-2 bg-white dark:bg-neutral-900 border-t border-neutral-100 dark:border-neutral-800/80">
              <p className="text-[11px] font-semibold text-neutral-800 dark:text-neutral-200 truncate group-hover:text-sky-600 dark:group-hover:text-sky-400 transition-colors">
                {item.document_name}
              </p>
              <p className="text-[10px] text-neutral-400 truncate">
                Source #{item.source_id || idx + 1}
              </p>
            </div>
          </button>
        ))}
      </div>

      {/* High-Resolution Full Page Lightbox Modal */}
      {selectedIdx !== null && current && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-150"
          onClick={() => setSelectedIdx(null)}
        >
          <div
            className="relative w-full max-w-4xl h-[92vh] flex flex-col rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50/90 dark:bg-neutral-900/90">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="p-1.5 rounded-lg bg-sky-100 dark:bg-sky-950 text-sky-600 dark:text-sky-400 shrink-0">
                  <ImageIcon className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-semibold text-neutral-900 dark:text-neutral-100 text-sm truncate">
                    {current.document_name}
                  </h3>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">
                    Original Book Scan • Page {current.page} ({selectedIdx + 1} of {uniquePages.length})
                  </p>
                </div>
              </div>

              {/* Controls */}
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setZoom((z) => Math.max(0.6, z - 0.2))}
                  className="p-1.5 rounded-lg text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition"
                  title="Zoom out"
                >
                  <ZoomOut className="w-4 h-4" />
                </button>
                <span className="font-mono text-xs px-1 text-neutral-500">
                  {Math.round(zoom * 100)}%
                </span>
                <button
                  type="button"
                  onClick={() => setZoom((z) => Math.min(2.5, z + 0.2))}
                  className="p-1.5 rounded-lg text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition"
                  title="Zoom in"
                >
                  <ZoomIn className="w-4 h-4" />
                </button>

                {current.resolvedImageUrl && (
                  <a
                    href={current.resolvedImageUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="p-1.5 rounded-lg text-neutral-500 hover:text-sky-600 dark:hover:text-sky-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition ml-1"
                    title="Open full resolution in new tab"
                  >
                    <Maximize2 className="w-4 h-4" />
                  </a>
                )}

                <button
                  type="button"
                  onClick={() => setSelectedIdx(null)}
                  className="p-1.5 ml-2 rounded-lg text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition"
                  title="Close"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Main Image Body with Navigation Arrows */}
            <div className="relative flex-1 overflow-auto p-4 flex items-center justify-center bg-neutral-950/20 dark:bg-black/60">
              {/* Prev Arrow */}
              {uniquePages.length > 1 && (
                <button
                  type="button"
                  onClick={handlePrev}
                  className="absolute left-4 z-10 p-2 rounded-full bg-black/60 hover:bg-black/80 text-white backdrop-blur-sm shadow-lg transition-transform hover:scale-110"
                  title="Previous page"
                >
                  <ChevronLeft className="w-6 h-6" />
                </button>
              )}

              {/* Rendered Book Page */}
              {current.resolvedImageUrl ? (
                <div
                  className="transition-transform duration-150 ease-out flex items-center justify-center max-h-full"
                  style={{ transform: `scale(${zoom})`, transformOrigin: 'top center' }}
                >
                  <img
                    src={current.resolvedImageUrl}
                    alt={`Page ${current.page}`}
                    className="max-h-[80vh] w-auto rounded-lg shadow-2xl border border-neutral-200 dark:border-neutral-800 bg-white"
                  />
                </div>
              ) : (
                <div className="text-neutral-400 text-sm">Image unavailable</div>
              )}

              {/* Next Arrow */}
              {uniquePages.length > 1 && (
                <button
                  type="button"
                  onClick={handleNext}
                  className="absolute right-4 z-10 p-2 rounded-full bg-black/60 hover:bg-black/80 text-white backdrop-blur-sm shadow-lg transition-transform hover:scale-110"
                  title="Next page"
                >
                  <ChevronRight className="w-6 h-6" />
                </button>
              )}
            </div>

            {/* Footer with Passage Snippet */}
            <div className="px-5 py-3 border-t border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 flex items-center justify-between text-xs text-neutral-500">
              <div className="flex items-center gap-2 truncate max-w-[80%]">
                <FileText className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                <span className="truncate">"{current.snippet}"</span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedIdx(null)}
                className="px-3 py-1 rounded-md bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 font-medium transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
