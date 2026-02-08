import { useState, useCallback, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useUser } from '@/contexts/UserContext';

export interface ChatMessage {
  id: number;
  type: 'bot' | 'user';
  content: string;
  time: string;
}

export type AiMessage = { role: 'user' | 'assistant'; content: string };

const STORAGE_KEY_PREFIX = 'mira_chat_history_';
const MAX_PERSISTED_MESSAGES = 50;

function getStorageKey(userId: string | undefined): string {
  return `${STORAGE_KEY_PREFIX}${userId || 'anonymous'}`;
}

function loadMessages(userId: string | undefined, greeting: string): ChatMessage[] {
  try {
    const key = getStorageKey(userId);
    const stored = localStorage.getItem(key);
    if (stored) {
      const parsed = JSON.parse(stored) as ChatMessage[];
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch {
    // Corrupted data — start fresh
  }
  return [{ id: 1, type: 'bot', content: greeting, time: 'Just now' }];
}

function persistMessages(userId: string | undefined, messages: ChatMessage[]) {
  try {
    const key = getStorageKey(userId);
    // Only keep the last N messages to avoid storage bloat
    const toStore = messages.slice(-MAX_PERSISTED_MESSAGES);
    localStorage.setItem(key, JSON.stringify(toStore));
  } catch {
    // Storage full or unavailable — ignore silently
  }
}

export function useChatHistory() {
  const { currentUser } = useAuth();
  const { t } = useUser();
  const userId = currentUser?.id;
  const greeting = t('chatbotGreeting');

  const [messages, setMessages] = useState<ChatMessage[]>(() =>
    loadMessages(userId, greeting)
  );

  // Persist whenever messages change (skip initial load)
  useEffect(() => {
    if (messages.length > 0) {
      persistMessages(userId, messages);
    }
  }, [messages, userId]);

  // Reload from storage if user changes (login/logout)
  useEffect(() => {
    setMessages(loadMessages(userId, greeting));
  }, [userId, greeting]);

  const addMessage = useCallback((msg: ChatMessage) => {
    setMessages(prev => [...prev, msg]);
  }, []);

  const updateMessage = useCallback((id: number, content: string) => {
    setMessages(prev =>
      prev.map(m => (m.id === id ? { ...m, content } : m))
    );
  }, []);

  const clearHistory = useCallback(() => {
    const fresh: ChatMessage[] = [
      { id: Date.now(), type: 'bot', content: greeting, time: 'Just now' },
    ];
    setMessages(fresh);
  }, [greeting]);

  const buildConversationHistory = useCallback(
    (msgs: ChatMessage[]): AiMessage[] => {
      // Skip the very first greeting message for the AI context
      const first = msgs[0];
      return msgs
        .filter(m => !(m.id === first?.id && m.type === 'bot'))
        .map(m => ({
          role: m.type === 'user' ? ('user' as const) : ('assistant' as const),
          content: m.content,
        }));
    },
    []
  );

  return {
    messages,
    setMessages,
    addMessage,
    updateMessage,
    clearHistory,
    buildConversationHistory,
  };
}
