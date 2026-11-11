import React, { useState, useEffect, useRef } from 'react';
import { Menu, Plus, Upload, BookOpen, Sparkles, Database, CheckCircle2, Search, ArrowRight } from 'lucide-react';
import { useTheme } from './hooks/useTheme';
import { useChat } from './hooks/useChat';
import { fetchHealth } from './api/client';
import ThemeToggle from './components/ThemeToggle';
import SearchBar from './components/SearchBar';
import ChatMessage from './components/ChatMessage';
import LoadingState from './components/LoadingState';
import ErrorState from './components/ErrorState';
import ConversationHistory from './components/ConversationHistory';
import DocumentModal from './components/DocumentModal';

export default function App() {
  const { theme, toggleTheme } = useTheme();
  const {
    messages,
    isLoading,
    error,
    conversations,
    activeId,
    sendMessage,
    startNewChat,
    selectConversation,
    deleteConversation,
  } = useChat();

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isDocModalOpen, setIsDocModalOpen] = useState(false);
  const [health, setHealth] = useState(null);
  const messagesEndRef = useRef(null);

  const loadHealthStatus = async () => {
    try {
      const data = await fetchHealth();
      setHealth(data);
    } catch (e) {
      console.error('Health check error:', e);
    }
  };

  useEffect(() => {
    loadHealthStatus();
    let interval = setInterval(loadHealthStatus, 30000);

    // Pause polling when tab is hidden, resume when visible
    const handleVisibility = () => {
      if (document.hidden) {
        clearInterval(interval);
      } else {
        loadHealthStatus();
        interval = setInterval(loadHealthStatus, 30000);
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, []);

  useEffect(() => {
    if (messages.length > 0) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isLoading]);

  const isLanding = messages.length === 0;

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#fafafa] dark:bg-[#0f1117] text-[#1a1a1a] dark:text-[#f0f0f0]">
      {/* Sidebar (Conversation History) */}
      <ConversationHistory
        conversations={conversations}
        activeId={activeId}
        onSelect={selectConversation}
        onNewChat={startNewChat}
        onDelete={deleteConversation}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden relative">
        {/* Top Navigation Bar */}
        <header className="h-14 px-4 md:px-6 border-b border-neutral-200/80 dark:border-neutral-800/80 bg-white/60 dark:bg-neutral-900/60 backdrop-blur-md flex items-center justify-between z-10 shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="md:hidden p-2 rounded-lg text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800"
              aria-label="Open menu"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Brand Logo */}
            <div
              onClick={startNewChat}
              className="flex items-center gap-2.5 cursor-pointer select-none group"
            >
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-sky-600 to-cyan-400 flex items-center justify-center text-white shadow-md shadow-sky-500/20 group-hover:scale-105 transition-transform">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <h1 className="text-sm font-bold tracking-tight text-neutral-900 dark:text-white flex items-center gap-1.5">
                  Nexus <span className="text-sky-500 font-normal">Research</span>
                </h1>
              </div>
            </div>
          </div>

          {/* Right Header Actions */}
          <div className="flex items-center gap-2 md:gap-3">
            {/* Vector DB Status badge */}
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900 text-neutral-600 dark:text-neutral-400">
              <span className={`w-2 h-2 rounded-full ${health?.status === 'healthy' ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse'}`} />
              <span>{health ? `${health.chunks_count} chunks indexed` : 'Connecting...'}</span>
            </div>

            {/* Add Document button */}
            <button
              onClick={() => setIsDocModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 transition-colors border border-neutral-200/60 dark:border-neutral-700/60"
            >
              <Upload className="w-3.5 h-3.5 text-sky-500" />
              <span className="hidden sm:inline">Add PDF</span>
            </button>

            {/* Dark/Light mode toggle */}
            <ThemeToggle theme={theme} toggleTheme={toggleTheme} />
          </div>
        </header>

        {/* Scrollable Viewport */}
        <main className="flex-1 overflow-y-auto px-4 md:px-8 py-6">
          {isLanding ? (
            /* Landing View (Perplexity style Hero) */
            <div className="min-h-[80vh] flex flex-col items-center justify-center max-w-3xl mx-auto text-center px-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium border border-sky-500/20 bg-sky-50/50 dark:bg-sky-950/40 text-sky-600 dark:text-sky-400 mb-6">
                <BookOpen className="w-3.5 h-3.5" />
                <span>Strictly Document-Grounded Answers & Citations</span>
              </div>

              <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight text-neutral-900 dark:text-white mb-4 leading-tight">
                Where knowledge begins.
              </h2>
              <p className="text-sm md:text-base text-neutral-500 dark:text-neutral-400 max-w-lg mb-8 leading-relaxed">
                Ask any question and get verified, cited answers derived strictly from your indexed books and technical documents.
              </p>

              {/* Large Search Bar */}
              <SearchBar
                onSearch={sendMessage}
                isLoading={isLoading}
                isLanding={true}
              />

              {/* Quick Info Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full max-w-2xl mt-12 text-left">
                <div className="p-3.5 rounded-xl border border-neutral-200/70 dark:border-neutral-800/80 bg-white/40 dark:bg-neutral-900/40">
                  <div className="text-xs font-semibold text-neutral-800 dark:text-neutral-200 mb-1">
                    No Hallucinations
                  </div>
                  <div className="text-[11px] text-neutral-500 dark:text-neutral-400">
                    If an answer isn't in your documents, it says "I don't know" directly.
                  </div>
                </div>
                <div className="p-3.5 rounded-xl border border-neutral-200/70 dark:border-neutral-800/80 bg-white/40 dark:bg-neutral-900/40">
                  <div className="text-xs font-semibold text-neutral-800 dark:text-neutral-200 mb-1">
                    Clickable Sources
                  </div>
                  <div className="text-[11px] text-neutral-500 dark:text-neutral-400">
                    Inspect exact document titles, page numbers, and snippet passages.
                  </div>
                </div>
                <div className="p-3.5 rounded-xl border border-neutral-200/70 dark:border-neutral-800/80 bg-white/40 dark:bg-neutral-900/40">
                  <div className="text-xs font-semibold text-neutral-800 dark:text-neutral-200 mb-1">
                    Real-time Streaming
                  </div>
                  <div className="text-[11px] text-neutral-500 dark:text-neutral-400">
                    Fast token-by-token streaming powered by gpt-4o-mini and ChromaDB.
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* Ongoing Chat View */
            <div className="max-w-3xl mx-auto pb-24">
              {messages.map((msg) => (
                <ChatMessage key={msg.id} message={msg} />
              ))}

              {error && <ErrorState error={error} onRetry={() => {}} />}
              <div ref={messagesEndRef} />
            </div>
          )}
        </main>

        {/* Bottom Search Bar (Visible only when in active conversation) */}
        {!isLanding && (
          <div className="absolute bottom-0 inset-x-0 p-4 bg-gradient-to-t from-[#fafafa] dark:from-[#0f1117] via-[#fafafa]/90 dark:via-[#0f1117]/90 to-transparent">
            <SearchBar
              onSearch={sendMessage}
              isLoading={isLoading}
              isLanding={false}
            />
          </div>
        )}
      </div>

      {/* Document Ingestion Modal */}
      <DocumentModal
        isOpen={isDocModalOpen}
        onClose={() => setIsDocModalOpen(false)}
        onDocumentAdded={loadHealthStatus}
      />
    </div>
  );
}
