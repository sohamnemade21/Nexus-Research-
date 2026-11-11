import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Sparkles, User, Copy, Check, BookOpen, Layers } from 'lucide-react';
import SourceCard from './SourceCard';
import PagePhotoGallery from './PagePhotoGallery';

export default function ChatMessage({ message }) {
  const [copied, setCopied] = useState(false);
  const isUser = message.role === 'user';

  const copyToClipboard = () => {
    if (!message.content) return;
    navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (isUser) {
    return (
      <div className="w-full max-w-3xl mx-auto py-4">
        <h2 className="text-xl md:text-2xl font-semibold text-neutral-900 dark:text-neutral-100 font-sans tracking-tight">
          {message.content}
        </h2>
      </div>
    );
  }

  const hasSources = message.sources && message.sources.length > 0;

  return (
    <div className="w-full max-w-3xl mx-auto py-6 border-b border-neutral-100 dark:border-neutral-800/80 last:border-b-0">
      {/* Sources Section (Perplexity-style on top of answer with page thumbnails) */}
      {hasSources && (
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3 text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
            <Layers className="w-4 h-4 text-sky-500" />
            <span>Sources ({message.sources.length})</span>
          </div>
          <div className="flex flex-wrap gap-2.5 overflow-x-auto pb-1">
            {message.sources.map((source, idx) => (
              <SourceCard key={idx} source={source} index={idx} />
            ))}
          </div>
        </div>
      )}

      {/* Answer Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 text-xs font-semibold text-neutral-600 dark:text-neutral-400 uppercase tracking-wider">
          <Sparkles className="w-4 h-4 text-sky-500" />
          <span>Answer</span>
        </div>
        {message.content && (
          <button
            onClick={copyToClipboard}
            className="flex items-center gap-1 text-xs text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 transition-colors p-1 rounded-md"
            title="Copy answer"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-500" />
                <span className="text-emerald-500">Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copy</span>
              </>
            )}
          </button>
        )}
      </div>

      {/* Answer Content */}
      <div className="prose text-neutral-800 dark:text-neutral-200 text-sm md:text-base leading-relaxed font-sans">
        {message.content ? (
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              code({ node, inline, className, children, ...props }) {
                const match = /language-(\w+)/.exec(className || '');
                return !inline ? (
                  <div className="relative my-3 rounded-lg overflow-hidden border border-neutral-700/50 bg-[#1e1e2e]">
                    {match && (
                      <div className="px-3 py-1 bg-neutral-800/80 text-[11px] text-neutral-400 font-mono border-b border-neutral-700/50">
                        {match[1]}
                      </div>
                    )}
                    <pre className="p-3 text-xs md:text-sm overflow-x-auto text-[#cdd6f4] font-mono m-0">
                      <code>{children}</code>
                    </pre>
                  </div>
                ) : (
                  <code className="px-1.5 py-0.5 rounded bg-neutral-200/60 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 text-xs font-mono" {...props}>
                    {children}
                  </code>
                );
              },
            }}
          >
            {message.content}
          </ReactMarkdown>
        ) : message.isStreaming ? (
          <div className="flex items-center gap-2 text-neutral-400 dark:text-neutral-500 text-sm py-2">
            <span className="inline-block w-2 h-2 rounded-full bg-sky-500 animate-ping" />
            <span>Researching documents and synthesizing answer...</span>
          </div>
        ) : null}

        {/* Streaming Cursor */}
        {message.isStreaming && message.content && (
          <span className="inline-block w-1.5 h-4 ml-1 bg-sky-500 animate-pulse align-middle" />
        )}
      </div>

      {/* Visual Book Evidence (Photos of Cited Pages) */}
      {hasSources && (
        <PagePhotoGallery sources={message.sources} />
      )}
    </div>
  );
}
