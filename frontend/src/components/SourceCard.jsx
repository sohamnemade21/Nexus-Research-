import React, { useState } from 'react';
import {
  BookOpen,
  ExternalLink,
  X,
  FileText,
  Image as ImageIcon,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Columns,
  Eye,
} from 'lucide-react';

export default function SourceCard({ source, index }) {
  const [isOpen, setIsOpen] = useState(false);
  const [viewMode, setViewMode] = useState('split'); // 'split' | 'photo' | 'text'
  const [imgZoom, setImgZoom] = useState(1);
  const [imageError, setImageError] = useState(false);

  const imageUrl = source.image_url || (source.source_file && source.page ? `/api/documents/page-image?source_file=${encodeURIComponent(source.source_file)}&page=${source.page}` : null);

  const resetModal = () => {
    setIsOpen(false);
    setImgZoom(1);
  };

  return (
    <>
      {/* Citation Card */}
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="group relative flex items-start gap-3 text-left p-3 rounded-xl border border-neutral-200/90 dark:border-neutral-800 bg-white dark:bg-neutral-900 hover:border-sky-500/60 dark:hover:border-sky-500/60 hover:shadow-lg hover:shadow-sky-500/5 transition-all duration-200 w-full sm:w-[260px] flex-shrink-0 cursor-pointer focus:outline-none focus:ring-2 focus:ring-sky-500/40"
      >
        {/* Page Photo Thumbnail */}
        {imageUrl && !imageError ? (
          <div className="relative w-14 h-18 rounded-md overflow-hidden bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700/80 shrink-0 shadow-xs group-hover:shadow-md transition-all">
            <img
              src={imageUrl}
              alt={`Page ${source.page}`}
              onError={() => setImageError(true)}
              className="w-full h-full object-cover object-top transition-transform duration-300 group-hover:scale-105"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-center pb-1">
              <Eye className="w-3.5 h-3.5 text-white drop-shadow" />
            </div>
          </div>
        ) : (
          <div className="w-14 h-18 rounded-md bg-sky-50 dark:bg-sky-950/60 border border-sky-200/50 dark:border-sky-900/50 flex flex-col items-center justify-center shrink-0 text-sky-600 dark:text-sky-400">
            <BookOpen className="w-5 h-5 mb-0.5" />
            <span className="text-[10px] font-semibold">P.{source.page}</span>
          </div>
        )}

        {/* Text Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-1">
            <span className="inline-flex items-center justify-center px-1.5 py-0.5 rounded-full bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-300 text-[10px] font-bold">
              #{source.source_id || index + 1}
            </span>
            <span className="text-[11px] font-semibold text-neutral-600 dark:text-neutral-400">
              Page {source.page}
            </span>
          </div>
          <h4 className="text-xs font-semibold text-neutral-900 dark:text-neutral-100 line-clamp-1 leading-snug group-hover:text-sky-600 dark:group-hover:text-sky-400 transition-colors">
            {source.document_name}
          </h4>
          <p className="mt-1 text-[11px] text-neutral-500 dark:text-neutral-400 line-clamp-2 leading-tight">
            {source.snippet}
          </p>
        </div>
      </button>

      {/* Rich Page Photo & Passage Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-150">
          <div className="relative w-full max-w-5xl h-[92vh] flex flex-col rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50/80 dark:bg-neutral-900/80">
              <div className="flex items-center gap-3 min-w-0">
                <div className="p-2 rounded-lg bg-sky-100 dark:bg-sky-950 text-sky-600 dark:text-sky-400 shrink-0">
                  <BookOpen className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-neutral-900 dark:text-neutral-100 text-sm md:text-base truncate">
                      {source.document_name}
                    </h3>
                    <span className="px-2 py-0.5 rounded-md bg-neutral-200 dark:bg-neutral-800 text-[11px] font-semibold text-neutral-700 dark:text-neutral-300">
                      Page {source.page}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">
                    <span>Source #{source.source_id || index + 1}</span>
                    {source.source_file && (
                      <>
                        <span>•</span>
                        <span className="truncate">{source.source_file}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* View Mode Switcher & Close */}
              <div className="flex items-center gap-2">
                <div className="hidden sm:flex items-center rounded-lg bg-neutral-200/80 dark:bg-neutral-800 p-0.5 text-xs">
                  <button
                    onClick={() => setViewMode('split')}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md font-medium transition-all ${
                      viewMode === 'split'
                        ? 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white shadow-xs'
                        : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
                    }`}
                  >
                    <Columns className="w-3.5 h-3.5" />
                    <span>Side-by-Side</span>
                  </button>
                  <button
                    onClick={() => setViewMode('photo')}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md font-medium transition-all ${
                      viewMode === 'photo'
                        ? 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white shadow-xs'
                        : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
                    }`}
                  >
                    <ImageIcon className="w-3.5 h-3.5" />
                    <span>Page Photo</span>
                  </button>
                  <button
                    onClick={() => setViewMode('text')}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md font-medium transition-all ${
                      viewMode === 'text'
                        ? 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white shadow-xs'
                        : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
                    }`}
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>Passage</span>
                  </button>
                </div>

                <button
                  onClick={resetModal}
                  className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-200/60 dark:hover:bg-neutral-800 transition-colors ml-2"
                  title="Close modal"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-hidden grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-neutral-200 dark:divide-neutral-800 bg-neutral-100/50 dark:bg-neutral-950/40">
              {/* Left / Page Photo View */}
              {(viewMode === 'split' || viewMode === 'photo') && (
                <div
                  className={`flex flex-col h-full overflow-hidden ${
                    viewMode === 'photo' ? 'col-span-1 md:col-span-2' : ''
                  }`}
                >
                  {/* Photo Toolbar */}
                  <div className="flex items-center justify-between px-4 py-2 bg-white/60 dark:bg-neutral-900/60 border-b border-neutral-200 dark:border-neutral-800/80 text-xs text-neutral-600 dark:text-neutral-400">
                    <div className="flex items-center gap-2 font-medium">
                      <ImageIcon className="w-4 h-4 text-sky-500" />
                      <span>Original Book Page {source.page}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setImgZoom((z) => Math.max(0.7, z - 0.2))}
                        className="p-1 rounded hover:bg-neutral-200 dark:hover:bg-neutral-800 transition"
                        title="Zoom out"
                      >
                        <ZoomOut className="w-3.5 h-3.5" />
                      </button>
                      <span className="font-mono text-[11px] px-1 text-neutral-500">
                        {Math.round(imgZoom * 100)}%
                      </span>
                      <button
                        onClick={() => setImgZoom((z) => Math.min(2.5, z + 0.2))}
                        className="p-1 rounded hover:bg-neutral-200 dark:hover:bg-neutral-800 transition"
                        title="Zoom in"
                      >
                        <ZoomIn className="w-3.5 h-3.5" />
                      </button>
                      {imageUrl && (
                        <a
                          href={imageUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="p-1 ml-1 rounded hover:bg-neutral-200 dark:hover:bg-neutral-800 transition text-sky-600 dark:text-sky-400"
                          title="Open full resolution in new tab"
                        >
                          <Maximize2 className="w-3.5 h-3.5" />
                        </a>
                      )}
                    </div>
                  </div>

                  {/* Image Display Area */}
                  <div className="flex-1 overflow-auto p-4 flex items-center justify-center bg-neutral-900/5 dark:bg-black/40">
                    {imageUrl && !imageError ? (
                      <div
                        className="transition-transform duration-150 ease-out flex items-center justify-center"
                        style={{ transform: `scale(${imgZoom})`, transformOrigin: 'top center' }}
                      >
                        <img
                          src={imageUrl}
                          alt={`Book page ${source.page}`}
                          className="max-w-full rounded-lg shadow-xl border border-neutral-200 dark:border-neutral-800 bg-white"
                          onError={() => setImageError(true)}
                        />
                      </div>
                    ) : (
                      <div className="text-center p-8 text-neutral-400">
                        <ImageIcon className="w-12 h-12 mx-auto mb-2 opacity-40" />
                        <p className="text-sm">Page photo unavailable for this document.</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Right / Text Content View */}
              {(viewMode === 'split' || viewMode === 'text') && (
                <div
                  className={`flex flex-col h-full overflow-hidden bg-white dark:bg-neutral-900 ${
                    viewMode === 'text' ? 'col-span-1 md:col-span-2' : ''
                  }`}
                >
                  <div className="flex items-center justify-between px-4 py-2 bg-neutral-50 dark:bg-neutral-800/50 border-b border-neutral-200 dark:border-neutral-800 text-xs text-neutral-600 dark:text-neutral-400 font-medium">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-emerald-500" />
                      <span>Retrieved Text Passage</span>
                    </div>
                    <span className="text-[11px] text-neutral-400">
                      {(source.full_content || source.snippet || '').length} characters
                    </span>
                  </div>

                  <div className="flex-1 overflow-y-auto p-6 font-mono text-xs sm:text-sm leading-relaxed text-neutral-800 dark:text-neutral-200 whitespace-pre-wrap select-text">
                    {source.full_content || source.snippet}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-5 py-3 border-t border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 flex items-center justify-between">
              <div className="text-xs text-neutral-500 dark:text-neutral-400">
                Extracted from <span className="font-semibold text-neutral-700 dark:text-neutral-300">{source.document_name}</span> (Page {source.page})
              </div>
              <button
                type="button"
                onClick={resetModal}
                className="px-4 py-2 text-xs font-semibold rounded-lg bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-200 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
