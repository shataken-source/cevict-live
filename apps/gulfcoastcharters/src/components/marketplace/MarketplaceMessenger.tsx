import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Send, Image as ImageIcon, CheckCheck } from 'lucide-react';

export default function MarketplaceMessenger({ listingId, sellerId, buyerId, currentUserId, onClose }: any) {
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const threadId = [listingId, sellerId, buyerId].sort().join('_');
  const otherUserId = currentUserId === sellerId ? buyerId : sellerId;

  const quickReplies = [
    "Is this still available?",
    "What's your best price?",
    "Can you ship this?",
    "When can I pick it up?"
  ];

  useEffect(() => {
    loadMessages();
    const interval = setInterval(loadMessages, 3000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadMessages = async () => {
    const { data } = await supabase.functions.invoke('marketplace-manager', {
      body: { action: 'get_messages', thread_id: threadId }
    });
    if (data?.messages) {
      setMessages(data.messages);
      await supabase.functions.invoke('marketplace-manager', {
        body: { action: 'mark_read', thread_id: threadId, user_id: currentUserId }
      });
    }
  };

  const sendMessage = async (text: string = newMessage) => {
    if (!text.trim() && !imageFile) return;

    let imageUrl = null;
    if (imageFile) {
      const { data: uploadData } = await supabase.storage
        .from('review-photos')
        .upload(`messages/${Date.now()}_${imageFile.name}`, imageFile);
      if (uploadData) imageUrl = supabase.storage.from('review-photos').getPublicUrl(uploadData.path).data.publicUrl;
    }

    await supabase.functions.invoke('marketplace-manager', {
      body: {
        action: 'send_message',
        listing_id: listingId,
        sender_id: currentUserId,
        receiver_id: otherUserId,
        message_text: text,
        image_url: imageUrl
      }
    });

    setNewMessage('');
    setImageFile(null);
    loadMessages();
  };

  const handleTyping = async () => {
    await supabase.functions.invoke('marketplace-manager', {
      body: { action: 'set_typing', thread_id: threadId, user_id: currentUserId, is_typing: true }
    });
  };

  return (
    <Card className="flex flex-col h-[600px]">
      <div className="p-4 border-b flex justify-between items-center">
        <h3 className="font-semibold">Messages</h3>
        <Button variant="ghost" size="sm" onClick={onClose}>Close</Button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.sender_id === currentUserId ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[70%] rounded-lg p-3 ${msg.sender_id === currentUserId ? 'bg-blue-500 text-white' : 'bg-gray-100'}`}>
              {msg.image_url && <img src={msg.image_url} alt="Shared" className="rounded mb-2 max-w-full" />}
              <p className="text-sm">{msg.message_text}</p>
              <div className="flex items-center justify-end gap-1 mt-1">
                <span className="text-xs opacity-70">{new Date(msg.created_at).toLocaleTimeString()}</span>
                {msg.sender_id === currentUserId && msg.read && <CheckCheck className="w-3 h-3" />}
              </div>
            </div>
          </div>
        ))}
        {isTyping && <div className="text-sm text-gray-500 italic">Typing...</div>}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-4 border-t space-y-2">
        <div className="flex gap-2 flex-wrap">
          {quickReplies.map((reply) => (
            <Button key={reply} variant="outline" size="sm" onClick={() => sendMessage(reply)}>
              {reply}
            </Button>
          ))}
        </div>
        <div className="flex gap-2">
          <Input
            type="file"
            accept="image/*"
            className="hidden"
            id="message-image"
            onChange={(e) => setImageFile(e.target.files?.[0] || null)}
          />
          <Button variant="outline" size="icon" onClick={() => document.getElementById('message-image')?.click()}>
            <ImageIcon className="w-4 h-4" />
          </Button>
          <Input
            value={newMessage}
            onChange={(e) => { setNewMessage(e.target.value); handleTyping(); }}
            placeholder="Type a message..."
            onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
          />
          <Button onClick={() => sendMessage()} size="icon">
            <Send className="w-4 h-4" />
          </Button>
        </div>
        {imageFile && <p className="text-sm text-gray-600">Image selected: {imageFile.name}</p>}
      </div>
    </Card>
  );
}
