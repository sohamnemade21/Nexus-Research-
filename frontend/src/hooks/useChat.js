import { useState, useEffect, useCallback } from 'react';
import { streamChatQuery } from '../api/client';

export function useChat() {
  const [conversations, setConversations] = useState(() => {
    try {
      const saved = localStorage.getItem('rag_conversations');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [activeId, setActiveId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Sync active conversation messages with storage
  useEffect(() => {
    if (conversations.length > 0 && !activeId) {
      // Don't auto-select to leave landing page fresh, but if desired:
    }
  }, [conversations, activeId]);

  const saveCurrentConversation = (updatedMessages, id = activeId) => {
    if (updatedMessages.length === 0) return;
    const convId = id || Date.now().toString();
    const firstUserMsg = updatedMessages.find(m => m.role === 'user');
    const title = firstUserMsg ? firstUserMsg.content.slice(0, 40) + '...' : 'New Research';

    setConversations(prev => {
      const existingIndex = prev.findIndex(c => c.id === convId);
      let updated;
      if (existingIndex >= 0) {
        updated = [...prev];
        updated[existingIndex] = {
          ...updated[existingIndex],
          messages: updatedMessages,
          updatedAt: new Date().toISOString(),
        };
      } else {
        updated = [
          {
            id: convId,
            title,
            messages: updatedMessages,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
          ...prev,
        ];
      }
      try {
        localStorage.setItem('rag_conversations', JSON.stringify(updated));
      } catch (e) {
        console.error('Failed to save to localStorage:', e);
      }
      return updated;
    });

    if (!activeId) {
      setActiveId(convId);
    }
  };

  const selectConversation = (id) => {
    const conv = conversations.find(c => c.id === id);
    if (conv) {
      setActiveId(id);
      setMessages(conv.messages || []);
      setError(null);
    }
  };

  const startNewChat = () => {
    setActiveId(null);
    setMessages([]);
    setError(null);
    setIsLoading(false);
  };

  const deleteConversation = (id, e) => {
    e && e.stopPropagation();
    setConversations(prev => {
      const filtered = prev.filter(c => c.id !== id);
      try {
        localStorage.setItem('rag_conversations', JSON.stringify(filtered));
      } catch (e) {
        console.error(e);
      }
      return filtered;
    });
    if (activeId === id) {
      startNewChat();
    }
  };

  const sendMessage = useCallback(async (userQuestion) => {
    if (!userQuestion || !userQuestion.trim() || isLoading) return;

    setError(null);
    setIsLoading(true);

    const userMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: userQuestion.trim(),
      timestamp: new Date().toISOString(),
    };

    const assistantPlaceholder = {
      id: (Date.now() + 1).toString(),
      role: 'assistant',
      content: '',
      sources: [],
      isStreaming: true,
      timestamp: new Date().toISOString(),
    };

    const nextMessages = [...messages, userMessage, assistantPlaceholder];
    setMessages(nextMessages);

    // Build chat history excluding placeholder
    const chatHistory = messages.map(m => ({
      role: m.role,
      content: m.content,
    }));

    let currentSources = [];
    let currentAnswer = '';
    const convId = activeId || Date.now().toString();
    if (!activeId) setActiveId(convId);

    await streamChatQuery({
      question: userQuestion.trim(),
      chatHistory,
      onSources: (sources) => {
        currentSources = sources;
        setMessages(prev => {
          const updated = [...prev];
          const last = updated[updated.length - 1];
          if (last && last.role === 'assistant') {
            last.sources = sources;
          }
          return updated;
        });
      },
      onToken: (token) => {
        currentAnswer += token;
        setMessages(prev => {
          const updated = [...prev];
          const last = updated[updated.length - 1];
          if (last && last.role === 'assistant') {
            last.content = currentAnswer;
          }
          return updated;
        });
      },
      onError: (err) => {
        console.error('Chat stream error:', err);
        setError(err.message || 'An error occurred during generation.');
        setIsLoading(false);
        setMessages(prev => {
          const updated = [...prev];
          const last = updated[updated.length - 1];
          if (last && last.role === 'assistant') {
            last.isStreaming = false;
            if (!last.content) {
              last.content = 'Failed to generate answer. Please try again.';
              last.isError = true;
            }
          }
          return updated;
        });
      },
      onDone: () => {
        setIsLoading(false);
        setMessages(prev => {
          const updated = [...prev];
          const last = updated[updated.length - 1];
          if (last && last.role === 'assistant') {
            last.isStreaming = false;
          }
          saveCurrentConversation(updated, convId);
          return updated;
        });
      },
    });
  }, [messages, isLoading, activeId]);

  return {
    messages,
    isLoading,
    error,
    conversations,
    activeId,
    sendMessage,
    startNewChat,
    selectConversation,
    deleteConversation,
  };
}
