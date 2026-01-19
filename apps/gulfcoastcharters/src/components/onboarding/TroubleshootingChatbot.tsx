/**
 * Troubleshooting Chatbot Component
 * AI-powered assistant that helps developers solve common issues
 * Uses Fishy AI assistant with developer-specific knowledge
 * 
 * Features:
 * - Natural language problem solving
 * - Code examples and solutions
 * - Common error database
 * - Step-by-step debugging
 * 
 * @component
 */

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Send, Bot, User, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export default function TroubleshootingChatbot() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: 'Hi! I\'m your development assistant. Ask me about setup issues, errors, or how to implement features. I can help with:\n\n• Environment setup\n• Database queries\n• Component creation\n• Edge functions\n• Deployment issues\n• Common errors',
      timestamp: new Date()
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const commonIssues = [
    'How do I set up environment variables?',
    'Database connection failed',
    'Component not rendering',
    'Edge function CORS error',
    'Deployment failing'
  ];

  const handleSend = async (question?: string) => {
    const userMessage = question || input;
    if (!userMessage.trim()) return;

    const newUserMessage: Message = {
      role: 'user',
      content: userMessage,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, newUserMessage]);
    setInput('');
    setLoading(true);

    try {
      // Call Fishy AI assistant with developer context
      const { data, error } = await supabase.functions.invoke('fishy-ai-assistant', {
        body: {
          message: `Developer question: ${userMessage}. Provide technical solution with code examples if applicable.`,
          context: 'developer_support'
        }
      });

      if (error) throw error;

      const assistantMessage: Message = {
        role: 'assistant',
        content: data.response || 'I apologize, but I encountered an error. Please try rephrasing your question.',
        timestamp: new Date()
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Chatbot error:', error);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please check the console for details.',
        timestamp: new Date()
      }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <Card className="h-[600px] flex flex-col">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bot className="w-6 h-6 text-primary" />
            Development Assistant
          </CardTitle>
          <div className="flex flex-wrap gap-2 mt-4">
            {commonIssues.map((issue, idx) => (
              <Badge
                key={idx}
                variant="outline"
                className="cursor-pointer hover:bg-primary hover:text-primary-foreground"
                onClick={() => handleSend(issue)}
              >
                {issue}
              </Badge>
            ))}
          </div>
        </CardHeader>
        <CardContent className="flex-1 flex flex-col">
          <ScrollArea className="flex-1 pr-4 mb-4">
            <div className="space-y-4">
              {messages.map((message, idx) => (
                <div
                  key={idx}
                  className={`flex gap-3 ${
                    message.role === 'user' ? 'justify-end' : 'justify-start'
                  }`}
                >
                  {message.role === 'assistant' && (
                    <Bot className="w-8 h-8 text-primary flex-shrink-0" />
                  )}
                  <div
                    className={`max-w-[80%] rounded-lg p-3 ${
                      message.role === 'user'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted'
                    }`}
                  >
                    <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                  </div>
                  {message.role === 'user' && (
                    <User className="w-8 h-8 text-muted-foreground flex-shrink-0" />
                  )}
                </div>
              ))}
              {loading && (
                <div className="flex gap-3">
                  <Bot className="w-8 h-8 text-primary" />
                  <div className="bg-muted rounded-lg p-3">
                    <Loader2 className="w-4 h-4 animate-spin" />
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>

          <div className="flex gap-2">
            <Input
              placeholder="Ask a question..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSend()}
              disabled={loading}
            />
            <Button onClick={() => handleSend()} disabled={loading || !input.trim()}>
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}