import React, { useState } from 'react';
import { Upload, Link as LinkIcon, FileText, CheckCircle2, AlertCircle, X, Loader2 } from 'lucide-react';
import { uploadDocumentFile, indexDocumentFromUrl } from '../api/client';

export default function DocumentModal({ isOpen, onClose, onDocumentAdded }) {
  const [activeTab, setActiveTab] = useState('upload'); // 'upload' | 'url'
  const [file, setFile] = useState(null);
  const [url, setUrl] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusMessage, setStatusMessage] = useState(null);
  const [error, setError] = useState(null);

  if (!isOpen) return null;

  const handleFileUpload = async (e) => {
    e.preventDefault();
    if (!file) return;
    setIsProcessing(true);
    setError(null);
    setStatusMessage(null);

    try {
      const res = await uploadDocumentFile(file);
      setStatusMessage(res.message || 'Successfully indexed document!');
      setFile(null);
      onDocumentAdded && onDocumentAdded();
      setTimeout(() => {
        setStatusMessage(null);
        onClose();
      }, 1500);
    } catch (err) {
      setError(err.message || 'Failed to index file.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleUrlIndex = async (e) => {
    e.preventDefault();
    if (!url.trim()) return;
    setIsProcessing(true);
    setError(null);
    setStatusMessage(null);

    try {
      const res = await indexDocumentFromUrl(url.trim());
      setStatusMessage(res.message || 'Successfully indexed document from URL!');
      setUrl('');
      onDocumentAdded && onDocumentAdded();
      setTimeout(() => {
        setStatusMessage(null);
        onClose();
      }, 1500);
    } catch (err) {
      setError(err.message || 'Failed to index URL.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="relative w-full max-w-lg rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-100 dark:border-neutral-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-sky-50 dark:bg-sky-950 text-sky-600 dark:text-sky-400">
              <Upload className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-neutral-900 dark:text-neutral-100 text-sm md:text-base">
                Add Knowledge Documents
              </h3>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                Index new PDF files into the persistent vector database
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Buttons */}
        <div className="flex px-6 pt-4 border-b border-neutral-100 dark:border-neutral-800/80 gap-4">
          <button
            onClick={() => setActiveTab('upload')}
            className={`pb-2 text-xs font-semibold uppercase tracking-wider transition-colors flex items-center gap-1.5 border-b-2 ${
              activeTab === 'upload'
                ? 'border-sky-500 text-sky-600 dark:text-sky-400'
                : 'border-transparent text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300'
            }`}
          >
            <FileText className="w-4 h-4" />
            Upload PDF
          </button>
          <button
            onClick={() => setActiveTab('url')}
            className={`pb-2 text-xs font-semibold uppercase tracking-wider transition-colors flex items-center gap-1.5 border-b-2 ${
              activeTab === 'url'
                ? 'border-sky-500 text-sky-600 dark:text-sky-400'
                : 'border-transparent text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300'
            }`}
          >
            <LinkIcon className="w-4 h-4" />
            PDF via URL
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {activeTab === 'upload' ? (
            <form onSubmit={handleFileUpload} className="space-y-4">
              <label
                htmlFor="pdf-upload"
                className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-neutral-300 dark:border-neutral-700 rounded-xl hover:border-sky-500/60 dark:hover:border-sky-500/60 transition-colors cursor-pointer bg-neutral-50/50 dark:bg-neutral-950/50"
              >
                <Upload className="w-8 h-8 text-neutral-400 mb-2" />
                <span className="text-xs font-medium text-neutral-700 dark:text-neutral-300">
                  {file ? file.name : 'Click to browse or drag & drop PDF'}
                </span>
                <span className="text-[11px] text-neutral-400 mt-1">Maximum 50MB PDF</span>
                <input
                  id="pdf-upload"
                  type="file"
                  accept="application/pdf"
                  className="hidden"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                />
              </label>

              <button
                type="submit"
                disabled={!file || isProcessing}
                className={`w-full py-2.5 px-4 rounded-xl text-xs font-medium flex items-center justify-center gap-2 transition-all ${
                  file && !isProcessing
                    ? 'bg-sky-500 hover:bg-sky-600 text-white shadow-md shadow-sky-500/20'
                    : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-400 dark:text-neutral-600 cursor-not-allowed'
                }`}
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Extracting, chunking & indexing...
                  </>
                ) : (
                  'Index PDF Document'
                )}
              </button>
            </form>
          ) : (
            <form onSubmit={handleUrlIndex} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">
                  Direct PDF Link
                </label>
                <input
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://example.com/handbook.pdf"
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-transparent text-xs text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                />
              </div>

              <button
                type="submit"
                disabled={!url.trim() || isProcessing}
                className={`w-full py-2.5 px-4 rounded-xl text-xs font-medium flex items-center justify-center gap-2 transition-all ${
                  url.trim() && !isProcessing
                    ? 'bg-sky-500 hover:bg-sky-600 text-white shadow-md shadow-sky-500/20'
                    : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-400 dark:text-neutral-600 cursor-not-allowed'
                }`}
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Downloading & indexing...
                  </>
                ) : (
                  'Download & Index PDF'
                )}
              </button>
            </form>
          )}

          {/* Feedback messages */}
          {statusMessage && (
            <div className="mt-4 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/40 text-emerald-700 dark:text-emerald-300 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500" />
              <span>{statusMessage}</span>
            </div>
          )}

          {error && (
            <div className="mt-4 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800/40 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
              <span>{error}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
