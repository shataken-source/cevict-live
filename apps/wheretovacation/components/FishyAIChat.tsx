/**
 * Fishy AI Chat Component
 * 
 * Interactive AI assistant that provides context-aware help to users.
 * Powered by AI Gateway with comprehensive platform knowledge.
 * 
 * Features:
 * - Context-aware responses
 * - Conversation history (last 6 messages)
 * - Minimizable chat window
 * - Responsive design (mobile & desktop)
 * - Learning from conversations
 */

'use client';

import { useState, useEffect, useRef } from 'react';
// Using native HTML elements instead of shadcn components
import { X, Send, Minimize2 } from 'lucide-react';
import { supabase } from '@/lib/supabase-client';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface FishyAIChatProps {
  userType?: 'customer' | 'guest';
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
    { role: 'assistant', content: "Ahoy! I'm Fishy, your AI guide for Where To Vacation. How can I help you plan your perfect trip? 🏖️" }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

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
      if (!supabase) {
        throw new Error('Supabase client not configured');
      }

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
    } catch (error) {
      console.error('Fishy AI error:', error);
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: "I apologize, but I'm having trouble right now. Please try again in a moment or contact our support team." 
      }]);
    } finally {
      setLoading(false);
    }
  };

  // Floating button when chat is closed
  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 right-4 md:bottom-6 md:right-6 rounded-full w-14 h-14 md:w-16 md:h-16 shadow-2xl bg-blue-500 hover:bg-blue-600 z-50 flex items-center justify-center"
        aria-label="Open Fishy AI Chat"
      >
        <span className="text-2xl">🐟</span>
      </button>
    );
  }

  // Chat window
  return (
    <div className={`fixed ${isMinimized ? 'bottom-4 right-4 w-64' : 'bottom-4 right-4 md:bottom-6 md:right-6 w-[calc(100vw-2rem)] md:w-96'} shadow-2xl z-50 flex flex-col ${isMinimized ? 'h-16' : 'h-[500px] md:h-[600px]'} transition-all bg-white rounded-lg border border-gray-200`}>
      {/* Chat Header */}
      <div className="flex items-center justify-between p-3 md:p-4 border-b bg-gradient-to-r from-blue-500 to-cyan-500">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 md:w-10 md:h-10 rounded-full border-2 border-white bg-blue-400 flex items-center justify-center">
            <span className="text-lg md:text-xl">🐟</span>
          </div>
          <div>
            <h3 className="font-bold text-white text-sm md:text-base">Fishy AI</h3>
            <p className="text-xs text-blue-100">Your Vacation Assistant</p>
          </div>
        </div>
        <div className="flex gap-1">
          {/* Minimize button */}
          <button 
            onClick={() => setIsMinimized(!isMinimized)} 
            className="text-white hover:bg-white/20 p-1 rounded"
            aria-label="Minimize chat"
          >
            <Minimize2 className="w-4 h-4" />
          </button>
          {/* Close button */}
          <button 
            onClick={() => setIsOpen(false)} 
            className="text-white hover:bg-white/20 p-1 rounded"
            aria-label="Close chat"
          >
            <X className="w-4 h-4" />
          </button>
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
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                placeholder="Ask Fishy anything..."
                disabled={loading}
                className="flex-1 text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button 
                onClick={sendMessage} 
                disabled={loading || !input.trim()} 
                className="bg-blue-500 text-white rounded-lg px-3 py-2 hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label="Send message"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
