import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useUser } from '@/contexts/UserContext';
import { Send, Reply, Anchor, Waves, Coins } from 'lucide-react';
import { initialTopics } from '@/data/messageBoardTopics';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import MessageBoardAvatar from './MessageBoardAvatar';
import UserBadges from './UserBadges';
import { getUserPoints } from '@/lib/avatar-helpers';

export default function MessageBoard() {
  const { user } = useUser();
  const { toast } = useToast();
  const [messages, setMessages] = useState<any[]>([]);
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState('');
  const [userPoints, setUserPoints] = useState<number>(0);

  useEffect(() => {
    const stored = localStorage.getItem('messageBoard');
    if (!stored) localStorage.setItem('messageBoard', JSON.stringify(initialTopics));
    loadMessages();
  }, []);

  useEffect(() => {
    if (!user?.id) {
      setUserPoints(0);
      return;
    }
    loadUserPoints(user.id);
    const pointsInterval = setInterval(() => loadUserPoints(user.id), 3000);
    return () => clearInterval(pointsInterval);
  }, [user?.id]);

  const loadUserPoints = async (userId: string) => {
    const points = await getUserPoints(userId);
    setUserPoints(points);
  };

  const loadMessages = () => {
    const stored = localStorage.getItem('messageBoard');
    if (stored) {
      const all = JSON.parse(stored);
      const threads = all.filter((m: any) => !m.parentId);
      threads.forEach((t: any) => t.replies = all.filter((m: any) => m.parentId === t.id));
      setMessages(threads.sort((a: any, b: any) => b.timestamp - a.timestamp));
    }
  };

  const postMessage = async () => {
    if (!user) return toast({ title: 'Please login', variant: 'destructive' });
    if (!newTitle.trim() || !newContent.trim()) return;
    
    try {
      const postId = Date.now().toString();
      const all = JSON.parse(localStorage.getItem('messageBoard') || '[]');
      all.push({ 
        id: postId, 
        title: newTitle, 
        content: newContent, 
        author: user.name || user.email || 'Anonymous',
        userId: user.id,
        timestamp: Date.now() 
      });
      localStorage.setItem('messageBoard', JSON.stringify(all));
      
      // Award points for posting via API
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.access_token) {
          throw new Error('No session token');
        }

        const response = await fetch('/api/message-board/award-points', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            userId: user.id,
            action: 'create_post',
            metadata: { post_id: postId, title: newTitle },
          }),
        });

        const pointsResult = await response.json();
        
        console.log('[MessageBoard] Post points result:', pointsResult);
        console.log('[MessageBoard] Current points state:', userPoints);
        
        if (pointsResult.success) {
          // Update points immediately with the returned value
          const newTotal = pointsResult.totalPoints;
          console.log('[MessageBoard] Setting points to:', newTotal);
          setUserPoints(newTotal);
          
          toast({ 
            title: `🌊 +${pointsResult.points} points!`, 
            description: `Total: ${newTotal} points` 
          });
          
          // Reload points after a delay to sync with database
          setTimeout(async () => {
            if (user?.id) {
              const refreshed = await getUserPoints(user.id);
              console.log('[MessageBoard] Refreshed points:', refreshed);
              setUserPoints(refreshed);
            }
          }, 1500);
        } else {
          toast({ 
            title: 'Message posted!', 
            description: pointsResult.error || 'Points may not have been awarded' 
          });
        }
      } catch (error: any) {
        console.error('Error awarding points:', error);
        toast({ 
          title: 'Message posted!', 
          description: 'Points may not have been awarded' 
        });
      }
      
      setNewTitle(''); 
      setNewContent(''); 
      loadMessages();
    } catch (error: any) {
      console.error('Error posting message:', error);
      toast({ title: 'Message posted, but points may not have been awarded', variant: 'destructive' });
      setNewTitle(''); 
      setNewContent(''); 
      loadMessages();
    }
  };

  const postReply = async (parentId: string) => {
    if (!user) return toast({ title: 'Please login', variant: 'destructive' });
    if (!replyContent.trim()) return;
    
    try {
      const replyId = Date.now().toString();
      const all = JSON.parse(localStorage.getItem('messageBoard') || '[]');
      all.push({ 
        id: replyId, 
        content: replyContent, 
        author: user.name || user.email || 'Anonymous',
        userId: user.id,
        timestamp: Date.now(), 
        parentId 
      });
      localStorage.setItem('messageBoard', JSON.stringify(all));
      
      // Award points for replying via API
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.access_token) {
          throw new Error('No session token');
        }

        const response = await fetch('/api/message-board/award-points', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            userId: user.id,
            action: 'reply_to_post',
            metadata: { reply_id: replyId, parent_id: parentId },
          }),
        });

        const pointsResult = await response.json();
        
        console.log('[MessageBoard] Reply points result:', pointsResult);
        console.log('[MessageBoard] Current points state:', userPoints);
        
        if (pointsResult.success) {
          // Update points immediately with the returned value
          const newTotal = pointsResult.totalPoints;
          console.log('[MessageBoard] Setting points to:', newTotal);
          setUserPoints(newTotal);
          
          toast({ 
            title: `💬 +${pointsResult.points} points!`, 
            description: `Total: ${newTotal} points` 
          });
          
          // Reload points after a delay to sync with database
          setTimeout(async () => {
            if (user?.id) {
              const refreshed = await getUserPoints(user.id);
              console.log('[MessageBoard] Refreshed points:', refreshed);
              setUserPoints(refreshed);
            }
          }, 1500);
        } else {
          toast({ 
            title: 'Reply posted!', 
            description: pointsResult.error || 'Points may not have been awarded' 
          });
        }
      } catch (error: any) {
        console.error('Error awarding points:', error);
        toast({ 
          title: 'Reply posted!', 
          description: 'Points may not have been awarded' 
        });
      }
      
      setReplyTo(null); 
      setReplyContent(''); 
      loadMessages();
    } catch (error: any) {
      console.error('Error posting reply:', error);
      toast({ title: 'Reply posted, but points may not have been awarded', variant: 'destructive' });
      setReplyTo(null); 
      setReplyContent(''); 
      loadMessages();
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 bg-gradient-to-b from-cyan-50 to-blue-50 min-h-screen">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <Anchor className="w-8 h-8 text-blue-600" />
          <h1 className="text-3xl font-bold text-blue-900">Gulf Coast Community</h1>
          <Waves className="w-8 h-8 text-cyan-500" />
        </div>
        {user && (
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-lg shadow-sm border border-blue-200">
              <Coins className="w-5 h-5 text-yellow-600" />
              <span className="font-semibold text-gray-700">{userPoints.toLocaleString()}</span>
              <span className="text-sm text-gray-500">points</span>
            </div>
            <a
              href="/avatar/shop"
              className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-4 py-2 rounded-lg hover:from-purple-600 hover:to-pink-600 font-medium shadow-sm"
            >
              🛍️ Shop
            </a>
          </div>
        )}
      </div>
      <Card className="p-6 mb-8 border-2 border-cyan-200">
        <Input placeholder="Thread Title" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} className="mb-3" />
        <Textarea placeholder="Share with the community..." value={newContent} onChange={(e) => setNewContent(e.target.value)} rows={4} className="mb-3" />
        <Button onClick={postMessage} disabled={!user} className="bg-gradient-to-r from-blue-500 to-cyan-500"><Send className="w-4 h-4 mr-2" />Post</Button>
      </Card>
      <div className="space-y-6">
        {messages.map(msg => (
          <Card key={msg.id} className="p-6 border-cyan-100">
            <div className="flex items-start gap-3 mb-3">
              {msg.userId && msg.userId !== 'system' && msg.userId.length > 10 ? (
                <MessageBoardAvatar userId={msg.userId} size={40} />
              ) : (
                <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                  <span className="text-xs text-gray-400">👤</span>
                </div>
              )}
              <div className="flex-1">
                <h3 className="text-xl font-bold text-blue-900">{msg.title}</h3>
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm text-gray-500">by {msg.author}</p>
                  {msg.userId && msg.userId !== 'system' && msg.userId.length > 10 && (
                    <UserBadges userId={msg.userId} size="sm" maxDisplay={3} />
                  )}
                </div>
              </div>
            </div>
            <p className="mb-4">{msg.content}</p>
            <Button variant="outline" size="sm" onClick={() => setReplyTo(msg.id)}>
              <Reply className="w-4 h-4 mr-2" />Reply
            </Button>
            {replyTo === msg.id && (
              <div className="mt-4 pl-4 border-l-2 border-cyan-300">
                <Textarea 
                  placeholder="Reply..." 
                  value={replyContent} 
                  onChange={(e) => setReplyContent(e.target.value)} 
                  rows={3} 
                  className="mb-2" 
                />
                <Button size="sm" onClick={() => postReply(msg.id)}>Post</Button>
              </div>
            )}
            {msg.replies?.map((r: any) => (
              <div key={r.id} className="mt-3 pl-6 bg-cyan-50 p-4 rounded">
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  {r.userId && r.userId !== 'system' && r.userId.length > 10 ? (
                    <MessageBoardAvatar userId={r.userId} size={32} />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
                      <span className="text-xs text-gray-400">👤</span>
                    </div>
                  )}
                  <p className="text-sm text-gray-500 font-medium">{r.author}</p>
                  {r.userId && r.userId !== 'system' && r.userId.length > 10 && (
                    <UserBadges userId={r.userId} size="sm" maxDisplay={2} />
                  )}
                </div>
                <p>{r.content}</p>
              </div>
            ))}
          </Card>
        ))}
      </div>
    </div>
  );
}
