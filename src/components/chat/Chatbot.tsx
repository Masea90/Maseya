import { useState } from 'react';
import { MessageCircle, Send, X, Sparkles, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUser } from '@/contexts/UserContext';

interface Message {
  id: number;
  type: 'bot' | 'user';
  content: string;
  time: string;
}

const initialMessages: Message[] = [
  {
    id: 1,
    type: 'bot',
    content: "Hi there! 👋 I'm Zara, your personal beauty assistant. How can I help you today?",
    time: 'Just now',
  },
];

const quickReplies = [
  'Best products for dry skin',
  'How to reduce acne?',
  'Hair growth tips',
  'What users like me use?',
];

export const Chatbot = () => {
  const { user } = useUser();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [input, setInput] = useState('');

  const handleSend = (text?: string) => {
    const messageText = text || input;
    if (!messageText.trim()) return;

    const userMessage: Message = {
      id: Date.now(),
      type: 'user',
      content: messageText,
      time: 'Just now',
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');

    // Simulate bot response
    setTimeout(() => {
      let botResponse = '';
      
      if (messageText.toLowerCase().includes('dry skin')) {
        botResponse = `Based on your profile, I'd recommend hyaluronic acid serums and ceramide-rich moisturizers. Users like you love CeraVe's Hydrating Cleanser - it's a 94% match for your skin type! 💧`;
      } else if (messageText.toLowerCase().includes('acne')) {
        botResponse = `For acne concerns, look for products with salicylic acid or niacinamide. Since you have sensitive skin, start with lower concentrations. The Inkey List Niacinamide is popular in our community! 🌿`;
      } else if (messageText.toLowerCase().includes('hair')) {
        botResponse = `For hair growth, rosemary oil is trending in our community! 847 users with similar hair types have seen great results. Try our Rosemary Hair Oil Treatment in the Remedies section. 💇‍♀️`;
      } else if (messageText.toLowerCase().includes('users like me')) {
        botResponse = `Users with your profile are currently loving: 1) Rice water rinses 2) Vitamin C serums 3) Gentle cleansers without fragrance. Want me to show you specific products?`;
      } else {
        botResponse = `That's a great question! Based on your ${user.skinConcerns.length > 0 ? 'skin concerns' : 'profile'}, I can help you find the perfect products. Would you like personalized recommendations? 🌸`;
      }

      const botMessage: Message = {
        id: Date.now(),
        type: 'bot',
        content: botResponse,
        time: 'Just now',
      };

      setMessages(prev => [...prev, botMessage]);
    }, 1000);
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
            <h3 className="font-semibold">Zara</h3>
            <p className="text-xs opacity-80">Your beauty assistant</p>
          </div>
        </div>
        <button
          onClick={() => setIsOpen(false)}
          className="p-2 rounded-full hover:bg-primary-foreground/20 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Messages */}
      <div className="h-80 overflow-y-auto p-4 space-y-3 bg-background">
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
                  ? 'bg-primary text-primary-foreground rounded-br-none'
                  : 'bg-card border border-border rounded-bl-none'
              )}
            >
              {message.content}
            </div>
          </div>
        ))}
      </div>

      {/* Quick Replies */}
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

      {/* Input */}
      <div className="p-3 bg-card border-t border-border">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSend()}
            placeholder="Ask me anything..."
            className="flex-1 h-10 px-4 rounded-full bg-background border border-border focus:border-primary focus:outline-none text-sm"
          />
          <button
            onClick={() => handleSend()}
            disabled={!input.trim()}
            className="w-10 h-10 bg-gradient-olive rounded-full flex items-center justify-center text-primary-foreground disabled:opacity-50 transition-opacity"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
