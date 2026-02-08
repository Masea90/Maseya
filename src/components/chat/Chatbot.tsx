import { useState, useRef, useEffect, useCallback } from 'react';
import { MessageCircle, Send, X, Sparkles, User, Loader2, Trash2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { cn } from '@/lib/utils';
import { useUser } from '@/contexts/UserContext';
import { useChatHistory } from '@/hooks/useChatHistory';
import { getAuthHeaders } from '@/lib/authHeaders';

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`;

export const Chatbot = () => {
  const { user, t } = useUser();
  const [isOpen, setIsOpen] = useState(false);
  const {
    messages,
    setMessages,
    addMessage,
    updateMessage,
    clearHistory,
    buildConversationHistory,
  } = useChatHistory();
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const quickReplies = [
    t('bestForDrySkin'),
    t('howToReduceAcne'),
    t('hairGrowthTips'),
    t('whatUsersLikeMeUse'),
  ];

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const handleSend = async (text?: string) => {
    const messageText = text || input;
    if (!messageText.trim() || isLoading) return;

    const userMessage = {
      id: Date.now(),
      type: 'user' as const,
      content: messageText,
      time: 'Just now',
    };

    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInput('');
    setIsLoading(true);

    const aiMessages = buildConversationHistory(updatedMessages);

    const userProfile = {
      skinConcerns: user.skinConcerns,
      hairType: user.hairType,
      hairConcerns: user.hairConcerns,
      goals: user.goals,
      ageRange: user.ageRange,
      sensitivities: user.sensitivities,
      country: user.country,
      climateType: user.climateType,
      language: user.language,
    };

    let assistantContent = '';
    const botMessageId = Date.now() + 1;

    try {
      const headers = await getAuthHeaders();
      const resp = await fetch(CHAT_URL, {
        method: 'POST',
        headers,
        body: JSON.stringify({ messages: aiMessages, userProfile }),
      });

      if (!resp.ok) {
        let errorType = 'generic';
        try {
          const errData = await resp.json();
          errorType = errData.error || 'generic';
        } catch { /* ignore */ }

        let errorMessage: string;
        if (resp.status === 429 || errorType === 'rate_limit') {
          errorMessage = t('chatbotRateLimit');
        } else {
          errorMessage = t('chatbotError');
        }

        setMessages(prev => [
          ...prev,
          { id: botMessageId, type: 'bot', content: errorMessage, time: 'Just now' },
        ]);
        setIsLoading(false);
        return;
      }

      if (!resp.body) {
        throw new Error('No response body');
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = '';
      let streamDone = false;

      // Create initial bot message
      setMessages(prev => [
        ...prev,
        { id: botMessageId, type: 'bot', content: '', time: 'Just now' },
      ]);

      while (!streamDone) {
        const { done, value } = await reader.read();
        if (done) break;
        textBuffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf('\n')) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);

          if (line.endsWith('\r')) line = line.slice(0, -1);
          if (line.startsWith(':') || line.trim() === '') continue;
          if (!line.startsWith('data: ')) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === '[DONE]') {
            streamDone = true;
            break;
          }

          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) {
              assistantContent += content;
              const currentContent = assistantContent;
              setMessages(prev =>
                prev.map(m =>
                  m.id === botMessageId ? { ...m, content: currentContent } : m
                )
              );
            }
          } catch {
            textBuffer = line + '\n' + textBuffer;
            break;
          }
        }
      }

      // Final flush
      if (textBuffer.trim()) {
        for (let raw of textBuffer.split('\n')) {
          if (!raw) continue;
          if (raw.endsWith('\r')) raw = raw.slice(0, -1);
          if (raw.startsWith(':') || raw.trim() === '') continue;
          if (!raw.startsWith('data: ')) continue;
          const jsonStr = raw.slice(6).trim();
          if (jsonStr === '[DONE]') continue;
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) {
              assistantContent += content;
              const currentContent = assistantContent;
              setMessages(prev =>
                prev.map(m =>
                  m.id === botMessageId ? { ...m, content: currentContent } : m
                )
              );
            }
          } catch { /* ignore partial leftovers */ }
        }
      }

      // If we got no content at all, show error
      if (!assistantContent.trim()) {
        setMessages(prev =>
          prev.map(m =>
            m.id === botMessageId ? { ...m, content: t('chatbotError') } : m
          )
        );
      }
    } catch (e) {
      console.error('Chat error:', e);
      setMessages(prev => {
        const hasBot = prev.some(m => m.id === botMessageId);
        if (hasBot) {
          return prev.map(m =>
            m.id === botMessageId
              ? { ...m, content: assistantContent || t('chatbotError') }
              : m
          );
        }
        return [
          ...prev,
          { id: botMessageId, type: 'bot', content: t('chatbotError'), time: 'Just now' },
        ];
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-20 right-4 z-50 w-14 h-14 bg-gradient-olive rounded-full shadow-warm-lg flex items-center justify-center text-primary-foreground hover:scale-105 transition-transform"
      >
        <MessageCircle className="w-6 h-6" />
      </button>
    );
  }

  return (
    <div className="fixed bottom-20 right-4 left-4 z-50 bg-card rounded-3xl shadow-warm-lg overflow-hidden max-w-sm ml-auto animate-fade-in-scale">
      {/* Header */}
      <div className="bg-gradient-olive p-4 flex items-center justify-between text-primary-foreground">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary-foreground/20 rounded-full flex items-center justify-center">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-semibold">{t('chatbotName')}</h3>
            <p className="text-xs opacity-80">{t('chatbotSubtitle')}</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {messages.length > 1 && (
            <button
              onClick={clearHistory}
              className="p-2 rounded-full hover:bg-primary-foreground/20 transition-colors"
              title={t('clearChat') || 'Clear chat'}
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={() => setIsOpen(false)}
            className="p-2 rounded-full hover:bg-primary-foreground/20 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollContainerRef} className="h-80 overflow-y-auto p-4 space-y-3 bg-background">
        {messages.map(message => (
          <div
            key={message.id}
            className={cn(
              'flex gap-2',
              message.type === 'user' ? 'flex-row-reverse' : 'flex-row'
            )}
          >
            <div
              className={cn(
                'w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0',
                message.type === 'user' ? 'bg-primary' : 'bg-secondary'
              )}
            >
              {message.type === 'user' ? (
                <User className="w-4 h-4 text-primary-foreground" />
              ) : (
                <Sparkles className="w-4 h-4 text-primary" />
              )}
            </div>
            <div
              className={cn(
                'max-w-[80%] p-3 rounded-2xl text-sm',
                message.type === 'user'
                  ? 'bg-primary text-primary-foreground rounded-br-none whitespace-pre-wrap'
                  : 'bg-card border border-border rounded-bl-none'
              )}
            >
              {message.content ? (
                message.type === 'bot' ? (
                  <div className="prose prose-sm dark:prose-invert max-w-none [&>p]:my-1 [&>ul]:my-1 [&>ol]:my-1 [&>li]:my-0.5 [&>h1]:text-sm [&>h2]:text-sm [&>h3]:text-sm [&_a]:text-primary [&_a]:underline">
                    <ReactMarkdown>{message.content}</ReactMarkdown>
                  </div>
                ) : (
                  message.content
                )
              ) : (
                <span className="flex items-center gap-1 text-muted-foreground">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  {t('chatbotTyping')}
                </span>
              )}
            </div>
          </div>
        ))}

        {/* Typing indicator when loading but no bot message yet */}
        {isLoading && !messages.some(m => m.type === 'bot' && m.content === '' && m.id > Date.now() - 5000) && messages[messages.length - 1]?.type === 'user' && (
          <div className="flex gap-2 flex-row">
            <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 bg-secondary">
              <Sparkles className="w-4 h-4 text-primary" />
            </div>
            <div className="max-w-[80%] p-3 rounded-2xl text-sm bg-card border border-border rounded-bl-none">
              <span className="flex items-center gap-1 text-muted-foreground">
                <Loader2 className="w-3 h-3 animate-spin" />
                {t('chatbotTyping')}
              </span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Quick Replies */}
      {!isLoading && (
        <div className="px-4 py-2 bg-background border-t border-border">
          <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-2">
            {quickReplies.map(reply => (
              <button
                key={reply}
                onClick={() => handleSend(reply)}
                className="flex-shrink-0 px-3 py-1.5 bg-secondary text-xs rounded-full hover:bg-secondary/80 transition-colors"
              >
                {reply}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <div className="p-3 bg-card border-t border-border">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSend()}
            placeholder={t('askAnything')}
            disabled={isLoading}
            className="flex-1 h-10 px-4 rounded-full bg-background border border-border focus:border-primary focus:outline-none text-sm disabled:opacity-50"
          />
          <button
            onClick={() => handleSend()}
            disabled={!input.trim() || isLoading}
            className="w-10 h-10 bg-gradient-olive rounded-full flex items-center justify-center text-primary-foreground disabled:opacity-50 transition-opacity"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
