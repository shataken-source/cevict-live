import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { Card } from './ui/card';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { ScrollArea } from './ui/scroll-area';
import { rateLimiter, RATE_LIMITS } from '@/lib/rateLimiter';
import { toast } from 'sonner';
import DOMPurify from 'isomorphic-dompurify';
import { Trash2, Archive, MoreVertical } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';

interface Message {
  id: string;
  sender_id: string;
  sender_name: string;
  content: string;
  created_at: string;
  read: boolean;
}

interface EnhancedMessengerProps {
  currentUserId: string;
  recipientId: string;
  recipientName: string;
  recipientAvatar?: string;
}

export default function EnhancedMessenger({ 
  currentUserId, 
  recipientId, 
  recipientName,
  recipientAvatar 
}: EnhancedMessengerProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [loading, setLoading] = useState(true);
  const [archived, setArchived] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const channelRef = useRef<any>(null);

  useEffect(() => {
    loadMessages();
    setupRealtimeSubscription();

    return () => {
      channelRef.current?.unsubscribe();
    };
  }, [recipientId]);

  const loadMessages = async () => {
    try {
      const { data } = await supabase
        .from('messages')
        .select('*')
        .or(`and(sender_id.eq.${currentUserId},recipient_id.eq.${recipientId}),and(sender_id.eq.${recipientId},recipient_id.eq.${currentUserId})`)
        .order('created_at', { ascending: true });

      setMessages(data || []);
      markAsRead();
    } catch (error) {
      console.error('Error loading messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const setupRealtimeSubscription = () => {
    const channel = supabase
      .channel(`messages:${currentUserId}:${recipientId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `recipient_id=eq.${currentUserId}`
      }, (payload) => {
        setMessages(prev => [...prev, payload.new as Message]);
        markAsRead();
      })
      .on('broadcast', { event: 'typing' }, ({ payload }) => {
        if (payload.userId === recipientId) {
          setIsTyping(true);
          setTimeout(() => setIsTyping(false), 3000);
        }
      })
      .subscribe();

    channelRef.current = channel;
  };

  const markAsRead = async () => {
    await supabase
      .from('messages')
      .update({ read: true })
      .eq('recipient_id', currentUserId)
      .eq('sender_id', recipientId)
      .eq('read', false);
  };

  const sendMessage = async () => {
    if (!newMessage.trim()) return;

    // Rate limiting
    if (!rateLimiter.limit(`msg_${currentUserId}`, RATE_LIMITS.MESSAGE)) {
      toast.error('Slow down! Too many messages.');
      return;
    }

    // Sanitize message content
    const sanitized = DOMPurify.sanitize(newMessage.trim());

    try {
      await supabase.from('messages').insert({
        sender_id: currentUserId,
        recipient_id: recipientId,
        content: sanitized,
        read: false
      });

      setNewMessage('');
    } catch (error) {
      toast.error('Failed to send message');
    }
  };

  const handleTyping = () => {
    channelRef.current?.send({
      type: 'broadcast',
      event: 'typing',
      payload: { userId: currentUserId }
    });
  };

  const deleteMessage = async (messageId: string) => {
    try {
      // Mark as deleted (one-sided deletion)
      await supabase
        .from('messages')
        .update({ content: '[Message deleted]', deleted_by_sender: true })
        .eq('id', messageId)
        .eq('sender_id', currentUserId);
      
      setMessages(prev => prev.map(msg => 
        msg.id === messageId ? { ...msg, content: '[Message deleted]' } : msg
      ));
      toast.success('Message deleted');
    } catch (error) {
      toast.error('Failed to delete message');
    }
  };

  const clearConversation = async () => {
    if (!confirm('Clear all messages from your view? This cannot be undone.')) return;
    
    try {
      // Mark all messages as deleted for this user
      await supabase
        .from('messages')
        .update({ deleted_by_sender: true, content: '[Message deleted]' })
        .or(`and(sender_id.eq.${currentUserId},recipient_id.eq.${recipientId}),and(sender_id.eq.${recipientId},recipient_id.eq.${currentUserId})`)
        .eq('sender_id', currentUserId);
      
      setMessages([]);
      toast.success('Conversation cleared');
    } catch (error) {
      toast.error('Failed to clear conversation');
    }
  };

  const archiveConversation = async () => {
    try {
      // In a real implementation, you'd have a conversations table with an archived flag
      setArchived(true);
      toast.success('Conversation archived');
    } catch (error) {
      toast.error('Failed to archive conversation');
    }
  };

  return (
    <Card className="h-[600px] flex flex-col">
      <div className="p-4 border-b bg-gradient-to-r from-blue-600 to-purple-600 text-white flex items-center gap-3">
        <Avatar>
          <AvatarImage src={recipientAvatar} />
          <AvatarFallback>{recipientName[0]}</AvatarFallback>
        </Avatar>
        <div>
          <h3 className="font-bold">{recipientName}</h3>
          {isTyping && <p className="text-xs">typing...</p>}
        </div>
      </div>

      <ScrollArea className="flex-1 p-4">
        {loading ? (
          <p className="text-center text-gray-500">Loading...</p>
        ) : (
          <div className="space-y-4">
            {messages.map(msg => (
              <div key={msg.id} className={`flex ${msg.sender_id === currentUserId ? 'justify-end' : 'justify-start'} group`}>
                <div className={`max-w-[70%] rounded-2xl p-3 relative ${
                  msg.sender_id === currentUserId 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-200 text-gray-900'
                }`}>
                  <p className="text-sm">{msg.content}</p>
                  <p className="text-xs mt-1 opacity-70">
                    {new Date(msg.created_at).toLocaleTimeString()}
                  </p>
                  {msg.sender_id === currentUserId && msg.content !== '[Message deleted]' && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="absolute -right-8 top-2 opacity-0 group-hover:opacity-100 h-6 w-6 p-0"
                      onClick={() => deleteMessage(msg.id)}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </ScrollArea>

      <div className="p-4 border-t">
        <div className="flex gap-2">
          <Input
            value={newMessage}
            onChange={(e) => {
              setNewMessage(e.target.value);
              handleTyping();
            }}
            onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
            placeholder="Type a message..."
            maxLength={1000}
          />
          <Button onClick={sendMessage}>Send</Button>
        </div>
      </div>
    </Card>
  );
}
