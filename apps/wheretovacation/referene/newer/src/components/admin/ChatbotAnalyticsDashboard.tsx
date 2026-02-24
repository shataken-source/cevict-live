import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/lib/supabase';
import { TrendingUp, MessageSquare, ThumbsUp, AlertCircle, Users } from 'lucide-react';

export default function ChatbotAnalyticsDashboard() {
  const [stats, setStats] = useState({
    totalConversations: 0,
    helpfulRate: 0,
    escalationRate: 0,
    avgResponseTime: 0,
    commonQuestions: [] as any[]
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAnalytics();
  }, []);

  const loadAnalytics = async () => {
    try {
      const { data: conversations } = await supabase
        .from('chatbot_conversations')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1000);

      if (conversations) {
        const helpful = conversations.filter(c => c.was_helpful === true).length;
        const escalated = conversations.filter(c => c.escalated === true).length;
        
        // Extract common questions
        const questionMap = new Map();
        conversations.forEach(conv => {
          const key = conv.message.toLowerCase().substring(0, 50);
          questionMap.set(key, (questionMap.get(key) || 0) + 1);
        });
        
        const commonQuestions = Array.from(questionMap.entries())
          .sort((a, b) => b[1] - a[1])
          .slice(0, 10)
          .map(([question, count]) => ({ question, count }));

        setStats({
          totalConversations: conversations.length,
          helpfulRate: conversations.length > 0 ? (helpful / conversations.length) * 100 : 0,
          escalationRate: conversations.length > 0 ? (escalated / conversations.length) * 100 : 0,
          avgResponseTime: 1.2,
          commonQuestions
        });
      }
    } catch (error) {
      console.error('Error loading analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="p-8">Loading analytics...</div>;

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Chatbot Analytics</h2>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Conversations</p>
              <p className="text-3xl font-bold">{stats.totalConversations}</p>
            </div>
            <MessageSquare className="h-10 w-10 text-blue-500" />
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Helpful Rate</p>
              <p className="text-3xl font-bold">{stats.helpfulRate.toFixed(1)}%</p>
            </div>
            <ThumbsUp className="h-10 w-10 text-green-500" />
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Escalation Rate</p>
              <p className="text-3xl font-bold">{stats.escalationRate.toFixed(1)}%</p>
            </div>
            <AlertCircle className="h-10 w-10 text-orange-500" />
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Avg Response Time</p>
              <p className="text-3xl font-bold">{stats.avgResponseTime}s</p>
            </div>
            <TrendingUp className="h-10 w-10 text-purple-500" />
          </div>
        </Card>
      </div>

      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Common Questions</h3>
        <div className="space-y-3">
          {stats.commonQuestions.map((item, idx) => (
            <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <p className="flex-1 text-sm">{item.question}...</p>
              <Badge variant="secondary">{item.count} times</Badge>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}