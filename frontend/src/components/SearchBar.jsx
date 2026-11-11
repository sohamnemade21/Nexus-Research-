import React, { useState, useRef, useEffect } from 'react';
import { Search, ArrowUp, Sparkles, CornerDownLeft } from 'lucide-react';

const SUGGESTIONS = [
  'What is Retrieval-Augmented Generation (RAG)?',
  'What is a Python list and how is it used?',
  'What is point cloud data in 3D data science?',
  'What is prompt engineering in LLMs?',
  'What is the purpose of a function in Python?',
];

export default function SearchBar({ onSearch, isLoading, isLanding = false }) {
  const [query, setQuery] = useState('');
  const textareaRef = useRef(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 180)}px`;
    }
  }, [query]);

  const handleSubmit = (e) => {
    e && e.preventDefault();
    if (!query.trim() || isLoading) return;
    onSearch(query);
    setQuery('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleSuggestionClick = (suggestion) => {
    onSearch(suggestion);
  };

  return (
    <div className={`w-full max-w-3xl mx-auto transition-all duration-300 ${isLanding ? 'py-8' : 'py-2'}`}>
      <form
        onSubmit={handleSubmit}
        className={`relative flex items-end gap-2 p-2 rounded-2xl border transition-all duration-200 ${
          isLanding
            ? 'bg-white dark:bg-neutral-900 border-neutral-300/80 dark:border-neutral-700 shadow-xl shadow-black/5 dark:shadow-black/20 focus-within:border-sky-500 dark:focus-within:border-sky-500 focus-within:ring-4 focus-within:ring-sky-500/10'
            : 'bg-white/90 dark:bg-neutral-900/90 backdrop-blur-md border-neutral-200 dark:border-neutral-800 shadow-lg focus-within:border-sky-500 dark:focus-within:border-sky-500'
        }`}
      >
        <div className="flex items-center pl-3 pb-2 text-neutral-400 dark:text-neutral-500">
          <Search className="w-5 h-5" />
        </div>

        <textarea
          ref={textareaRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask anything from your indexed books & documents..."
          rows={1}
          disabled={isLoading}
          className="flex-1 max-h-44 py-2 px-1 bg-transparent border-0 resize-none text-sm md:text-base text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 dark:placeholder-neutral-500 focus:outline-none focus:ring-0 leading-relaxed font-sans"
        />

        <div className="flex items-center gap-1.5 pr-1 pb-1">
          <button
            type="submit"
            disabled={!query.trim() || isLoading}
            aria-label="Send message"
            className={`flex items-center justify-center w-9 h-9 rounded-xl transition-all duration-200 ${
              query.trim() && !isLoading
                ? 'bg-sky-500 hover:bg-sky-600 text-white shadow-md shadow-sky-500/20 active:scale-95'
                : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-400 dark:text-neutral-600 cursor-not-allowed'
            }`}
          >
            {isLoading ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <ArrowUp className="w-5 h-5" />
            )}
          </button>
        </div>
      </form>

      {/* Suggestion pills on landing page */}
      {isLanding && (
        <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
          <span className="text-xs text-neutral-400 dark:text-neutral-500 flex items-center gap-1 mr-1">
            <Sparkles className="w-3.5 h-3.5 text-sky-500" /> Try:
          </span>
          {SUGGESTIONS.map((s, idx) => (
            <button
              key={idx}
              onClick={() => handleSuggestionClick(s)}
              className="text-xs px-3 py-1.5 rounded-full border border-neutral-200/80 dark:border-neutral-800 bg-white/50 dark:bg-neutral-900/50 text-neutral-600 dark:text-neutral-400 hover:border-sky-500/40 hover:text-sky-600 dark:hover:text-sky-400 hover:bg-sky-50/30 dark:hover:bg-sky-950/30 transition-all duration-150 text-left"
            >
              {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
