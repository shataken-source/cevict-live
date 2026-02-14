import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { Card } from './ui/card';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { ScrollArea } from './ui/scroll-area';

interface User {
  id: string;
  username: string;
  avatar: string;
  status: 'online' | 'away' | 'offline';
}

interface Message {
  id: string;
  senderId: string;
  senderName: string;
  content: string;
  timestamp: Date;
}

const MOCK_USERS: User[] = [
  { id: '1', username: 'Sarah Chen', avatar: 'https://i.pravatar.cc/150?img=1', status: 'online' },
  { id: '2', username: 'Mike Torres', avatar: 'https://i.pravatar.cc/150?img=3', status: 'online' },
  { id: '3', username: 'Emma Wilson', avatar: 'https://i.pravatar.cc/150?img=5', status: 'away' },
  { id: '4', username: 'James Park', avatar: 'https://i.pravatar.cc/150?img=7', status: 'offline' },
];

export default function RealtimeMessenger() {
  const [currentUser] = useState<User>({ 
    id: 'me', 
    username: 'You', 
    avatar: 'https://i.pravatar.cc/150?img=12', 
    status: 'online' 
  });
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const channelRef = useRef<any>(null);

  useEffect(() => {
    if (!selectedUser) return;

    const channel = supabase.channel(`chat:${selectedUser.id}`);
    
    channel
      .on('broadcast', { event: 'message' }, ({ payload }) => {
        setMessages(prev => [...prev, payload]);
      })
      .on('broadcast', { event: 'typing' }, ({ payload }) => {
        setIsTyping(payload.isTyping);
        if (payload.isTyping) {
          setTimeout(() => setIsTyping(false), 3000);
        }
      })
      .subscribe();

    channelRef.current = channel;

    return () => {
      channel.unsubscribe();
    };
  }, [selectedUser]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedUser || !channelRef.current) return;

    const message: Message = {
      id: Date.now().toString(),
      senderId: currentUser.id,
      senderName: currentUser.username,
      content: newMessage,
      timestamp: new Date()
    };

    await channelRef.current.send({
      type: 'broadcast',
      event: 'message',
      payload: message
    });

    setMessages(prev => [...prev, message]);
    setNewMessage('');
  };

  const handleTyping = async () => {
    if (!channelRef.current) return;
    await channelRef.current.send({
      type: 'broadcast',
      event: 'typing',
      payload: { isTyping: true, userId: currentUser.id }
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online': return 'bg-green-500';
      case 'away': return 'bg-yellow-500';
      default: return 'bg-gray-400';
    }
  };

  return (
    <Card className="h-[600px] flex overflow-hidden shadow-2xl">
      {/* Users Sidebar */}
      <div className="w-80 border-r bg-gradient-to-b from-purple-50 to-blue-50">
        <div className="p-4 bg-gradient-to-r from-purple-600 to-blue-600 text-white">
          <h2 className="text-xl font-bold">Messenger 2025</h2>
          <p className="text-sm opacity-90">Real-time Chat</p>
        </div>
        <ScrollArea className="h-[calc(600px-80px)]">
          <div className="p-2 space-y-1">
            {MOCK_USERS.map(user => (
              <button
                key={user.id}
                onClick={() => {
                  setSelectedUser(user);
                  setMessages([]);
                }}
                className={`w-full p-3 rounded-lg flex items-center gap-3 transition-all ${
                  selectedUser?.id === user.id 
                    ? 'bg-white shadow-md' 
                    : 'hover:bg-white/50'
                }`}
              >
                <div className="relative">
                  <Avatar>
                    <AvatarImage src={user.avatar} />
                    <AvatarFallback>{user.username[0]}</AvatarFallback>
                  </Avatar>
                  <div className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white ${getStatusColor(user.status)}`} />
                </div>
                <div className="flex-1 text-left">
                  <p className="font-semibold text-sm">{user.username}</p>
                  <p className="text-xs text-gray-500 capitalize">{user.status}</p>
                </div>
              </button>
            ))}
          </div>
        </ScrollArea>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col">
        {selectedUser ? (
          <>
            <div className="p-4 border-b bg-gradient-to-r from-purple-600 to-blue-600 text-white flex items-center gap-3">
              <Avatar>
                <AvatarImage src={selectedUser.avatar} />
                <AvatarFallback>{selectedUser.username[0]}</AvatarFallback>
              </Avatar>
              <div>
                <h3 className="font-bold">{selectedUser.username}</h3>
                <p className="text-xs opacity-90 capitalize">{selectedUser.status}</p>
              </div>
            </div>

            <ScrollArea className="flex-1 p-4 bg-gradient-to-b from-gray-50 to-white">
              <div className="space-y-4">
                {messages.map(msg => (
                  <div key={msg.id} className={`flex ${msg.senderId === currentUser.id ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[70%] ${msg.senderId === currentUser.id ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white' : 'bg-white shadow-md text-gray-900'} rounded-2xl p-3`}>
                      <p className="text-sm">{msg.content}</p>
                      <p className="text-xs mt-1 opacity-70">{new Date(msg.timestamp).toLocaleTimeString()}</p>
                    </div>
                  </div>
                ))}
                {isTyping && (
                  <div className="flex items-center gap-2 text-gray-500 text-sm">
                    <div className="flex gap-1">
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                    </div>
                    <span>{selectedUser.username} is typing...</span>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>

            <div className="p-4 border-t bg-white">
              <div className="flex gap-2">
                <Input
                  value={newMessage}
                  onChange={(e) => {
                    setNewMessage(e.target.value);
                    handleTyping();
                  }}
                  onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                  placeholder="Type a message..."
                  className="flex-1"
                />
                <Button onClick={sendMessage} className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700">
                  Send
                </Button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center bg-gradient-to-br from-purple-50 to-blue-50">
            <div className="text-center">
              <div className="text-6xl mb-4">💬</div>
              <h3 className="text-xl font-bold text-gray-700">Select a conversation</h3>
              <p className="text-gray-500">Choose a user to start chatting</p>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}
