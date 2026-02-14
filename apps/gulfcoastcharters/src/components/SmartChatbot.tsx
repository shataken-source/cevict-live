import { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, Loader2, ThumbsUp, ThumbsDown, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

interface Message {
  role: 'user' | 'bot';
  text: string;
  sentiment?: string;
  needsEscalation?: boolean;
  conversationId?: string;
}

export default function SmartChatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { role: 'bot', text: 'Hi! I\'m here to help. Ask me anything about bookings, certifications, referrals, or platform features!' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionId] = useState(() => `session_${Date.now()}_${Math.random()}`);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userMessage }]);
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await supabase.functions.invoke('ai-support-bot', {
        body: { 
          question: userMessage, 
          sessionId,
          userId: user?.id,
          checkKnowledgeBase: true
        }
      });

      if (error) throw error;

      const botMessage: Message = {
        role: 'bot',
        text: data.answer,
        sentiment: data.sentiment,
        needsEscalation: data.needsEscalation,
        conversationId: data.conversationId
      };

      setMessages(prev => [...prev, botMessage]);

      if (data.needsEscalation) {
        toast.info('This seems complex. Would you like to speak with our support team?', {
          action: {
            label: 'Contact Support',
            onClick: () => window.location.href = 'mailto:support@gulfcoastcharters.com'
          }
        });
      }
    } catch (error) {
      console.error('Chatbot error:', error);
      setMessages(prev => [...prev, { 
        role: 'bot', 
        text: 'Sorry, I encountered an error. Please try again or contact support@gulfcoastcharters.com' 
      }]);
    } finally {
      setLoading(false);
    }
  };

  const rateSatisfaction = async (messageIndex: number, helpful: boolean) => {
    const message = messages[messageIndex];
    if (message.role !== 'bot') return;
    const convId = message.conversationId;
    if (convId && convId !== 'rated') {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        await supabase.from('chatbot_conversations').update({ was_helpful: helpful }).eq('id', convId);
        await supabase.from('chatbot_feedback').insert({
          conversation_id: convId,
          marked_helpful: helpful,
          reviewed_by: user?.id
        });
      } catch (e) {
        console.error('Rating error:', e);
      }
    }
    const updatedMessages = [...messages];
    updatedMessages[messageIndex] = { ...message, conversationId: 'rated' };
    setMessages(updatedMessages);
    toast.success(helpful ? 'Thanks for your feedback!' : 'We\'ll work on improving our responses');
  };

  if (!isOpen) {
    return (
      <Button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 rounded-full w-14 h-14 shadow-lg bg-blue-600 hover:bg-blue-700 z-50"
      >
        <MessageCircle size={24} />
      </Button>
    );
  }

  return (
    <Card className="fixed bottom-6 right-6 w-96 h-[500px] shadow-2xl z-50 flex flex-col">
      <div className="bg-blue-600 text-white p-4 rounded-t-lg flex justify-between items-center">
        <div>
          <h3 className="font-semibold">GCC Support Bot</h3>
          <p className="text-xs opacity-90">Powered by AI</p>
        </div>
        <Button variant="ghost" size="sm" onClick={() => setIsOpen(false)} className="text-white hover:bg-blue-700">
          <X size={20} />
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.map((msg, idx) => (
          <div key={idx}>
            <div className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] p-3 rounded-lg ${
                msg.role === 'user' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-100 text-gray-900'
              }`}>
                {msg.text}
                {msg.needsEscalation && (
                  <div className="mt-2 flex items-center gap-1 text-xs">
                    <AlertCircle size={12} />
                    <span>Complex issue detected</span>
                  </div>
                )}
              </div>
            </div>
            {msg.role === 'bot' && msg.conversationId !== 'rated' && idx > 0 && (
              <div className="flex justify-start gap-2 mt-1 ml-2">
                <Button 
                  size="sm" 
                  variant="ghost" 
                  onClick={() => rateSatisfaction(idx, true)}
                  className="h-6 px-2 text-xs"
                >
                  <ThumbsUp size={12} className="mr-1" /> Helpful
                </Button>
                <Button 
                  size="sm" 
                  variant="ghost" 
                  onClick={() => rateSatisfaction(idx, false)}
                  className="h-6 px-2 text-xs"
                >
                  <ThumbsDown size={12} className="mr-1" /> Not helpful
                </Button>
              </div>
            )}
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 p-3 rounded-lg">
              <Loader2 className="animate-spin" size={20} />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-4 border-t">
        <div className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Ask a question..."
            disabled={loading}
          />
          <Button onClick={handleSend} disabled={loading || !input.trim()}>
            <Send size={18} />
          </Button>
        </div>
      </div>
    </Card>
  );
}