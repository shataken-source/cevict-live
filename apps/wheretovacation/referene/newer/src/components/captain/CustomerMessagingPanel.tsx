import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { MessageSquare, Send, Mail } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

interface Message {
  id: string;
  customerName: string;
  customerEmail: string;
  message: string;
  timestamp: string;
  replied: boolean;
}

export function CustomerMessagingPanel({ captainId }: { captainId: string }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [reply, setReply] = useState('');

  useEffect(() => {
    loadMessages();
  }, [captainId]);

  const loadMessages = async () => {
    try {
      const { data } = await supabase.functions.invoke('captain-messages', {
        body: { action: 'getMessages', captainId }
      });
      setMessages(data?.messages || []);
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  };

  const sendReply = async () => {
    if (!selectedMessage || !reply.trim()) return;
    try {
      await supabase.functions.invoke('captain-messages', {
        body: { 
          action: 'sendReply', 
          messageId: selectedMessage.id,
          reply,
          customerEmail: selectedMessage.customerEmail
        }
      });
      toast.success('Reply sent!');
      setReply('');
      setSelectedMessage(null);
      loadMessages();
    } catch (error) {
      toast.error('Failed to send reply');
    }
  };

  return (
    <div className="grid md:grid-cols-2 gap-6">
      <Card className="p-6">
        <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
          <MessageSquare className="w-5 h-5" />
          Customer Messages
        </h3>
        <div className="space-y-3">
          {messages.map((msg) => (
            <div key={msg.id} className={`p-4 border rounded cursor-pointer hover:bg-gray-50 ${selectedMessage?.id === msg.id ? 'bg-blue-50 border-blue-300' : ''}`} onClick={() => setSelectedMessage(msg)}>
              <div className="flex justify-between items-start mb-2">
                <p className="font-semibold">{msg.customerName}</p>
                {!msg.replied && <span className="text-xs bg-red-500 text-white px-2 py-1 rounded">New</span>}
              </div>
              <p className="text-sm text-gray-600 line-clamp-2">{msg.message}</p>
              <p className="text-xs text-gray-400 mt-1">{msg.timestamp}</p>
            </div>
          ))}
        </div>
      </Card>

      <Card className="p-6">
        <h3 className="text-lg font-bold mb-4">Reply</h3>
        {selectedMessage ? (
          <div className="space-y-4">
            <div className="p-4 bg-gray-50 rounded">
              <p className="font-semibold mb-2">{selectedMessage.customerName}</p>
              <p className="text-sm">{selectedMessage.message}</p>
            </div>
            <Textarea value={reply} onChange={(e) => setReply(e.target.value)} placeholder="Type your reply..." rows={6} />
            <Button onClick={sendReply} className="w-full">
              <Send className="w-4 h-4 mr-2" />
              Send Reply
            </Button>
          </div>
        ) : (
          <p className="text-gray-500 text-center py-12">Select a message to reply</p>
        )}
      </Card>
    </div>
  );
}
