import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useUser } from '@/contexts/UserContext';
import { Send, Reply, Anchor, Waves } from 'lucide-react';
import { initialTopics } from '@/data/messageBoardTopics';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';

export default function MessageBoard() {
  const { user } = useUser();
  const { toast } = useToast();
  const [messages, setMessages] = useState<any[]>([]);
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState('');

  useEffect(() => {
    const stored = localStorage.getItem('messageBoard');
    if (!stored) localStorage.setItem('messageBoard', JSON.stringify(initialTopics));
    loadMessages();
  }, []);

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
    const all = JSON.parse(localStorage.getItem('messageBoard') || '[]');
    all.push({ id: Date.now().toString(), title: newTitle, content: newContent, author: user.name || user.email, timestamp: Date.now() });
    localStorage.setItem('messageBoard', JSON.stringify(all));
    await supabase.functions.invoke('points-rewards-system', { body: { action: 'award_points', userId: user.id, actionType: 'message_post' }});
    toast({ title: '🌊 +10 points!' });
    setNewTitle(''); setNewContent(''); loadMessages();
  };

  const postReply = (parentId: string) => {
    if (!user) return toast({ title: 'Please login', variant: 'destructive' });
    if (!replyContent.trim()) return;
    const all = JSON.parse(localStorage.getItem('messageBoard') || '[]');
    all.push({ id: Date.now().toString(), content: replyContent, author: user.name || user.email, timestamp: Date.now(), parentId });
    localStorage.setItem('messageBoard', JSON.stringify(all));
    setReplyTo(null); setReplyContent(''); loadMessages();
  };

  return (
    <div className="max-w-4xl mx-auto p-6 bg-gradient-to-b from-cyan-50 to-blue-50 min-h-screen">
      <div className="flex items-center gap-3 mb-8">
        <Anchor className="w-8 h-8 text-blue-600" />
        <h1 className="text-3xl font-bold text-blue-900">Gulf Coast Community</h1>
        <Waves className="w-8 h-8 text-cyan-500" />
      </div>
      <Card className="p-6 mb-8 border-2 border-cyan-200">
        <Input placeholder="Thread Title" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} className="mb-3" />
        <Textarea placeholder="Share with the community..." value={newContent} onChange={(e) => setNewContent(e.target.value)} rows={4} className="mb-3" />
        <Button onClick={postMessage} disabled={!user} className="bg-gradient-to-r from-blue-500 to-cyan-500"><Send className="w-4 h-4 mr-2" />Post</Button>
      </Card>
      <div className="space-y-6">{messages.map(msg => (<Card key={msg.id} className="p-6 border-cyan-100"><h3 className="text-xl font-bold text-blue-900">{msg.title}</h3><p className="text-sm text-gray-500 mb-3">by {msg.author}</p><p className="mb-4">{msg.content}</p><Button variant="outline" size="sm" onClick={() => setReplyTo(msg.id)}><Reply className="w-4 h-4 mr-2" />Reply</Button>{replyTo === msg.id && (<div className="mt-4 pl-4 border-l-2 border-cyan-300"><Textarea placeholder="Reply..." value={replyContent} onChange={(e) => setReplyContent(e.target.value)} rows={3} className="mb-2" /><Button size="sm" onClick={() => postReply(msg.id)}>Post</Button></div>)}{msg.replies?.map((r: any) => (<div key={r.id} className="mt-3 pl-6 bg-cyan-50 p-4 rounded"><p className="text-sm text-gray-500">{r.author}</p><p>{r.content}</p></div>))}</Card>))}</div>
    </div>
  );
}
