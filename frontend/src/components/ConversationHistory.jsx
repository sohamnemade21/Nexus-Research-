import React from 'react';
import { Plus, MessageSquare, Trash2, X } from 'lucide-react';

export default function ConversationHistory({
  conversations,
  activeId,
  onSelect,
  onNewChat,
  onDelete,
  isOpen,
  onClose,
}) {
  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-xs md:hidden"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed md:static inset-y-0 left-0 z-40 w-64 md:w-60 lg:w-64 flex flex-col bg-[#f5f5f7] dark:bg-[#141721] border-r border-neutral-200/80 dark:border-neutral-800 transition-transform duration-200 ease-in-out shrink-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        {/* Top bar with New Chat */}
        <div className="p-3 border-b border-neutral-200/60 dark:border-neutral-800/60 flex items-center justify-between">
          <button
            onClick={() => {
              onNewChat();
              onClose && onClose();
            }}
            className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-white dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 text-xs font-medium border border-neutral-200 dark:border-neutral-700/60 shadow-xs hover:border-sky-500/50 hover:text-sky-600 dark:hover:text-sky-400 transition-all active:scale-98"
          >
            <Plus className="w-4 h-4 text-sky-500" />
            <span>New Research</span>
          </button>
          <button
            onClick={onClose}
            className="md:hidden p-2 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* History List */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          <div className="px-2 py-1.5 text-[11px] font-semibold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider">
            History
          </div>

          {conversations.length === 0 ? (
            <div className="p-3 text-center text-xs text-neutral-400 dark:text-neutral-500 italic">
              No recent searches
            </div>
          ) : (
            conversations.map((conv) => {
              const isActive = conv.id === activeId;
              return (
                <div
                  key={conv.id}
                  onClick={() => {
                    onSelect(conv.id);
                    onClose && onClose();
                  }}
                  className={`group relative flex items-center justify-between px-2.5 py-2 rounded-xl text-xs cursor-pointer transition-all ${
                    isActive
                      ? 'bg-sky-100/70 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 font-medium'
                      : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200/50 dark:hover:bg-neutral-800/50'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate pr-6">
                    <MessageSquare className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-sky-500' : 'text-neutral-400'}`} />
                    <span className="truncate">{conv.title}</span>
                  </div>
                  <button
                    onClick={(e) => onDelete(conv.id, e)}
                    title="Delete conversation"
                    className="opacity-0 group-hover:opacity-100 p-1 text-neutral-400 hover:text-rose-500 transition-opacity rounded-md"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })
          )}
        </div>

        {/* Footer info */}
        <div className="p-3 border-t border-neutral-200/60 dark:border-neutral-800/60 text-[11px] text-neutral-400 dark:text-neutral-500 text-center">
          Strict Document Grounding
        </div>
      </aside>
    </>
  );
}
