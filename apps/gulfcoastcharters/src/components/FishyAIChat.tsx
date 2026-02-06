/**
 * Fishy AI Chat Component
 * 
 * Interactive AI assistant that provides context-aware help to users.
 * Powered by OpenAI GPT-4 with comprehensive platform knowledge and web search.
 * 
 * Features:
 * - Context-aware responses based on user role (captain/customer)
 * - Conversation history (last 6 messages)
 * - Minimizable chat window
 * - Responsive design (mobile & desktop)
 * - Web search capability for external information
 * - Multilingual support (4 languages)
 * 
 * Edge Function:
 * @see supabase/functions/fishy-ai-assistant/index.ts
 * 
 * AI Services:
 * @see https://platform.openai.com/docs/api-reference - OpenAI API docs
 * @see https://supabase.com/docs/guides/functions - Supabase Edge Functions
 * 
 * UI Components:
 * @see https://ui.shadcn.com/docs/components/card - Card component
 * @see https://lucide.dev/icons - Icon library
 */

import { useState, useEffect, useRef } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { X, Send, MessageCircle, Minimize2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface FishyAIChatProps {
  userType?: 'captain' | 'customer';
  context?: { page?: string; [key: string]: any };
}

/**
 * Fishy AI Chat Widget
 * Floating chat interface with AI assistant
 */
export default function FishyAIChat({ userType = 'customer', context }: FishyAIChatProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: "Ahoy! I'm Fishy, your AI guide. How can I help you today?" }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  /**
   * Send message to Fishy AI assistant
   * Calls Supabase Edge Function with conversation context
   */
  const sendMessage = async () => {
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setLoading(true);

    try {
      // Call Fishy AI edge function
      const { data, error } = await supabase.functions.invoke('fishy-ai-assistant', {
        body: { 
          message: userMessage, 
          userType, 
          context,
          conversationHistory: messages.slice(-6) // Last 6 messages for context
        }
      });

      if (error) throw error;

      setMessages(prev => [...prev, { role: 'assistant', content: data.message }]);
      
      // Log conversation for learning (async, don't block UI)
      // The edge function handles the actual logging
    } catch (error) {
      toast({ 
        title: 'Error', 
        description: 'Failed to get response from Fishy AI', 
        variant: 'destructive' 
      });
    } finally {
      setLoading(false);
    }
  };

  // Floating button when chat is closed
  if (!isOpen) {
    return (
      <Button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 right-4 md:bottom-6 md:right-6 rounded-full w-14 h-14 md:w-16 md:h-16 shadow-2xl bg-blue-500 hover:bg-blue-600 z-50"
        size="lg"
        aria-label="Open Fishy AI Chat"
      >
        <img 
          src="https://d64gsuwffb70l.cloudfront.net/6918960e54362d714f32b6fc_1763545510842_6626974b.webp" 
          alt="Fishy AI Assistant" 
          className="w-10 h-10 md:w-12 md:h-12 rounded-full"
        />
      </Button>
    );
  }

  // Chat window
  return (
    <Card className={`fixed ${isMinimized ? 'bottom-4 right-4 w-64' : 'bottom-4 right-4 md:bottom-6 md:right-6 w-[calc(100vw-2rem)] md:w-96'} shadow-2xl z-50 flex flex-col ${isMinimized ? 'h-16' : 'h-[500px] md:h-[600px]'} transition-all`}>
      {/* Chat Header */}
      <div className="flex items-center justify-between p-3 md:p-4 border-b bg-gradient-to-r from-blue-500 to-cyan-500">
        <div className="flex items-center gap-2">
          <img 
            src="https://d64gsuwffb70l.cloudfront.net/6918960e54362d714f32b6fc_1763545510842_6626974b.webp" 
            alt="Fishy AI" 
            className="w-8 h-8 md:w-10 md:h-10 rounded-full border-2 border-white"
          />
          <div>
            <h3 className="font-bold text-white text-sm md:text-base">Fishy AI</h3>
            <p className="text-xs text-blue-100">Your Charter Assistant</p>
          </div>
        </div>
        <div className="flex gap-1">
          {/* Minimize button */}
          <Button 
            size="sm" 
            variant="ghost" 
            onClick={() => setIsMinimized(!isMinimized)} 
            className="text-white hover:bg-white/20"
            aria-label="Minimize chat"
          >
            <Minimize2 className="w-4 h-4" />
          </Button>
          {/* Close button */}
          <Button 
            size="sm" 
            variant="ghost" 
            onClick={() => setIsOpen(false)} 
            className="text-white hover:bg-white/20"
            aria-label="Close chat"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {!isMinimized && (
        <>
          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-3 md:p-4 space-y-3">
            {messages.map((msg, idx) => (
              <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] p-2 md:p-3 rounded-lg text-sm ${msg.role === 'user' ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-800'}`}>
                  {msg.content}
                </div>
              </div>
            ))}
            
            {/* Loading indicator */}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-gray-100 p-3 rounded-lg">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="p-3 md:p-4 border-t">
            <div className="flex gap-2">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                placeholder="Ask Fishy anything..."
                disabled={loading}
                className="text-sm"
              />
              <Button 
                onClick={sendMessage} 
                disabled={loading || !input.trim()} 
                size="sm"
                aria-label="Send message"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </>
      )}
    </Card>
  );
}
