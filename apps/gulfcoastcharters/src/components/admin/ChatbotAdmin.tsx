import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ThumbsUp, ThumbsDown, MessageSquare, TrendingUp, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

export default function ChatbotAdmin() {
  const [conversations, setConversations] = useState<any[]>([]);
  const [knowledgeBase, setKnowledgeBase] = useState<any[]>([]);
  const [analytics, setAnalytics] = useState<any>(null);
  const [newQuestion, setNewQuestion] = useState('');
  const [newAnswer, setNewAnswer] = useState('');
  const [newKeywords, setNewKeywords] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [convRes, kbRes, analyticsRes] = await Promise.all([
        supabase.from('chatbot_conversations').select('*').order('created_at', { ascending: false }).limit(50),
        supabase.from('chatbot_knowledge_base').select('*').order('usage_count', { ascending: false }),
        supabase.from('chatbot_analytics').select('*').order('date', { ascending: false }).limit(30)
      ]);

      if (convRes.data) setConversations(convRes.data);
      if (kbRes.data) setKnowledgeBase(kbRes.data);
      if (analyticsRes.data && analyticsRes.data.length > 0) {
        const totals = analyticsRes.data.reduce((acc, day) => ({
          total: acc.total + day.total_conversations,
          helpful: acc.helpful + day.helpful_responses,
          unhelpful: acc.unhelpful + day.unhelpful_responses,
          escalations: acc.escalations + day.escalations
        }), { total: 0, helpful: 0, unhelpful: 0, escalations: 0 });
        setAnalytics(totals);
      }
    } catch (error) {
      console.error('Error loading chatbot data:', error);
    } finally {
      setLoading(false);
    }
  };

  const markHelpful = async (convId: string, helpful: boolean) => {
    try {
      await supabase.from('chatbot_conversations').update({ was_helpful: helpful }).eq('id', convId);
      await supabase.from('chatbot_feedback').insert({
        conversation_id: convId,
        marked_helpful: helpful,
        reviewed_by: (await supabase.auth.getUser()).data.user?.id
      });
      toast.success('Feedback recorded');
      loadData();
    } catch (error) {
      toast.error('Failed to record feedback');
    }
  };

  const addKnowledgeBase = async () => {
    if (!newQuestion || !newAnswer) {
      toast.error('Question and answer required');
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      await supabase.from('chatbot_knowledge_base').insert({
        question: newQuestion,
        answer: newAnswer,
        keywords: newKeywords.split(',').map(k => k.trim()),
        created_by: user?.id
      });
      toast.success('Knowledge base entry added');
      setNewQuestion('');
      setNewAnswer('');
      setNewKeywords('');
      loadData();
    } catch (error) {
      toast.error('Failed to add entry');
    }
  };

  if (loading) return <div className="p-8">Loading...</div>;

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">AI Chatbot Management</h1>

      <Tabs defaultValue="analytics">
        <TabsList>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="conversations">Conversations</TabsTrigger>
          <TabsTrigger value="knowledge">Knowledge Base</TabsTrigger>
        </TabsList>

        <TabsContent value="analytics">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <Card className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Conversations</p>
                  <p className="text-2xl font-bold">{analytics?.total || 0}</p>
                </div>
                <MessageSquare className="h-8 w-8 text-blue-500" />
              </div>
            </Card>
            <Card className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Helpful Responses</p>
                  <p className="text-2xl font-bold">{analytics?.helpful || 0}</p>
                </div>
                <ThumbsUp className="h-8 w-8 text-green-500" />
              </div>
            </Card>
            <Card className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Resolution Rate</p>
                  <p className="text-2xl font-bold">
                    {analytics?.total ? Math.round((analytics.helpful / analytics.total) * 100) : 0}%
                  </p>
                </div>
                <TrendingUp className="h-8 w-8 text-purple-500" />
              </div>
            </Card>
            <Card className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Escalations</p>
                  <p className="text-2xl font-bold">{analytics?.escalations || 0}</p>
                </div>
                <AlertCircle className="h-8 w-8 text-orange-500" />
              </div>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="conversations">
          <div className="space-y-4">
            {conversations.map((conv) => (
              <Card key={conv.id} className="p-4">
                <div className="flex justify-between items-start mb-2">
                  <div className="flex-1">
                    <p className="font-semibold">User: {conv.message}</p>
                    <p className="text-sm text-muted-foreground mt-2">Bot: {conv.response}</p>
                  </div>
                  <div className="flex gap-2 ml-4">
                    <Badge variant={conv.sentiment === 'positive' ? 'default' : conv.sentiment === 'negative' ? 'destructive' : 'secondary'}>
                      {conv.sentiment}
                    </Badge>
                    {conv.escalated && <Badge variant="destructive">Escalated</Badge>}
                  </div>
                </div>
                <div className="flex gap-2 mt-4">
                  <Button size="sm" variant="outline" onClick={() => markHelpful(conv.id, true)}>
                    <ThumbsUp className="h-4 w-4 mr-1" /> Helpful
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => markHelpful(conv.id, false)}>
                    <ThumbsDown className="h-4 w-4 mr-1" /> Not Helpful
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="knowledge">
          <Card className="p-6 mb-6">
            <h3 className="text-lg font-semibold mb-4">Add Knowledge Base Entry</h3>
            <div className="space-y-4">
              <Input placeholder="Question" value={newQuestion} onChange={(e) => setNewQuestion(e.target.value)} />
              <Textarea placeholder="Answer" value={newAnswer} onChange={(e) => setNewAnswer(e.target.value)} />
              <Input placeholder="Keywords (comma-separated)" value={newKeywords} onChange={(e) => setNewKeywords(e.target.value)} />
              <Button onClick={addKnowledgeBase}>Add Entry</Button>
            </div>
          </Card>

          <div className="space-y-4">
            {knowledgeBase.map((kb) => (
              <Card key={kb.id} className="p-4">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <p className="font-semibold">{kb.question}</p>
                    <p className="text-sm text-muted-foreground mt-2">{kb.answer}</p>
                    <div className="flex gap-2 mt-2">
                      {kb.keywords?.map((kw: string, i: number) => (
                        <Badge key={i} variant="outline">{kw}</Badge>
                      ))}
                    </div>
                  </div>
                  <Badge>{kb.usage_count} uses</Badge>
                </div>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}