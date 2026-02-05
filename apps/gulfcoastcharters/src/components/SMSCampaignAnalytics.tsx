import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/lib/supabase';
import { MessageSquare, TrendingUp, TrendingDown, MousePointer, UserX } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

export default function SMSCampaignAnalytics({ campaignId }: { campaignId: string }) {
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAnalytics();
  }, [campaignId]);

  const loadAnalytics = async () => {
    try {
      const { data } = await supabase.functions.invoke('sms-campaign-manager', {
        body: { action: 'analytics', campaignId }
      });
      if (data?.analytics) setAnalytics(data.analytics);
    } catch (error) {
      console.error('Error loading analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading analytics...</div>;
  }

  if (!analytics) {
    return <div className="text-center py-8">No analytics available</div>;
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Sent</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.total_sent}</div>
            <p className="text-xs text-muted-foreground">
              {analytics.delivered} delivered
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Delivery Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.delivery_rate}%</div>
            <Progress value={analytics.delivery_rate} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Click Rate</CardTitle>
            <MousePointer className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.click_rate}%</div>
            <p className="text-xs text-muted-foreground">
              {analytics.clicks} total clicks
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Opt-Out Rate</CardTitle>
            <UserX className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.optout_rate}%</div>
            <p className="text-xs text-muted-foreground">
              {analytics.optouts} unsubscribed
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Link Performance</CardTitle>
          <CardDescription>Click-through rates for each link in your message</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {analytics.link_performance?.map((link: any, idx: number) => (
              <div key={idx} className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium truncate max-w-md">{link.link}</span>
                  <span className="text-sm text-muted-foreground">
                    {link.clicks} clicks ({link.unique_clicks} unique)
                  </span>
                </div>
                <Progress 
                  value={(link.clicks / analytics.total_sent) * 100} 
                  className="h-2"
                />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Delivery Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm">Delivered</span>
                <span className="font-semibold text-green-600">{analytics.delivered}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">Failed</span>
                <span className="font-semibold text-red-600">{analytics.failed}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">Pending</span>
                <span className="font-semibold text-yellow-600">
                  {analytics.total_sent - analytics.delivered - analytics.failed}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Engagement Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm">Clicked Links</span>
                <span className="font-semibold text-blue-600">{analytics.clicks}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">Opted Out</span>
                <span className="font-semibold text-red-600">{analytics.optouts}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">Engagement Rate</span>
                <span className="font-semibold text-green-600">
                  {((analytics.clicks / analytics.delivered) * 100).toFixed(1)}%
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}