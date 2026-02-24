import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import EmailTemplateBuilder from './EmailTemplateBuilder';
import CampaignAnalytics from './CampaignAnalytics';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface Campaign {
  id: string;
  name: string;
  subject: string;
  status: string;
  scheduledAt?: string;
  stats: {
    sent: number;
    opened: number;
    clicked: number;
  };
}

const EmailMarketingDashboard: React.FC = () => {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(false);
  const [newCampaign, setNewCampaign] = useState({
    name: '',
    targetAudience: 'all',
    scheduledDate: '',
    scheduledTime: '',
    isABTest: false
  });
  const [emailTemplate, setEmailTemplate] = useState({ subject: '', html: '', preview: '' });
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    loadCampaigns();
  }, []);

  const loadCampaigns = async () => {
    // Mock data for demonstration
    setCampaigns([
      {
        id: '1',
        name: 'Summer Vacation Promo',
        subject: '50% Off Summer Bookings',
        status: 'sent',
        stats: { sent: 1250, opened: 875, clicked: 312 }
      },
      {
        id: '2',
        name: 'New Destination Launch',
        subject: 'Explore Our New Caribbean Routes',
        status: 'scheduled',
        scheduledAt: '2025-11-20',
        stats: { sent: 0, opened: 0, clicked: 0 }
      }
    ]);
  };

  const handleCreateCampaign = async () => {
    if (!newCampaign.name || !emailTemplate.subject) {
      setMessage({ type: 'error', text: 'Please fill in campaign name and email template' });
      return;
    }

    setLoading(true);
    try {
      const scheduledAt = newCampaign.scheduledDate && newCampaign.scheduledTime
        ? new Date(`${newCampaign.scheduledDate}T${newCampaign.scheduledTime}`).toISOString()
        : null;

      const { data, error } = await supabase.functions.invoke('email-campaign-manager', {
        body: {
          action: 'create',
          campaign: {
            name: newCampaign.name,
            subject: emailTemplate.subject,
            htmlContent: emailTemplate.html,
            previewText: emailTemplate.preview,
            targetAudience: newCampaign.targetAudience,
            scheduledAt,
            isABTest: newCampaign.isABTest
          }
        }
      });

      if (error) throw error;

      setMessage({ type: 'success', text: 'Campaign created successfully!' });
      loadCampaigns();
      setNewCampaign({ name: '', targetAudience: 'all', scheduledDate: '', scheduledTime: '', isABTest: false });
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setLoading(false);
    }
  };

  const handleSendCampaign = async (campaignId: string) => {
    setLoading(true);
    try {
      const { error } = await supabase.functions.invoke('email-campaign-manager', {
        body: { action: 'send', campaignId }
      });

      if (error) throw error;
      setMessage({ type: 'success', text: 'Campaign sent successfully!' });
      loadCampaigns();
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Email Marketing Dashboard</h1>

      <Tabs defaultValue="campaigns">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="campaigns">Campaigns</TabsTrigger>
          <TabsTrigger value="create">Create Campaign</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="campaigns" className="space-y-4">
          <div className="grid gap-4">
            {campaigns.map(campaign => (
              <Card key={campaign.id}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle>{campaign.name}</CardTitle>
                      <p className="text-sm text-gray-500">{campaign.subject}</p>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                      campaign.status === 'sent' ? 'bg-green-100 text-green-800' :
                      campaign.status === 'scheduled' ? 'bg-blue-100 text-blue-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {campaign.status}
                    </span>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex justify-between items-center">
                    <div className="flex gap-6 text-sm">
                      <div>
                        <span className="text-gray-500">Sent:</span> <strong>{campaign.stats.sent}</strong>
                      </div>
                      <div>
                        <span className="text-gray-500">Opened:</span> <strong>{campaign.stats.opened}</strong>
                      </div>
                      <div>
                        <span className="text-gray-500">Clicked:</span> <strong>{campaign.stats.clicked}</strong>
                      </div>
                    </div>
                    {campaign.status === 'draft' && (
                      <Button onClick={() => handleSendCampaign(campaign.id)} disabled={loading}>
                        Send Now
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="create" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Campaign Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input
                placeholder="Campaign Name"
                value={newCampaign.name}
                onChange={(e) => setNewCampaign({ ...newCampaign, name: e.target.value })}
              />
              
              <Select value={newCampaign.targetAudience} onValueChange={(v) => setNewCampaign({ ...newCampaign, targetAudience: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Target Audience" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Customers</SelectItem>
                  <SelectItem value="active">Active Bookers</SelectItem>
                  <SelectItem value="inactive">Inactive (90+ days)</SelectItem>
                  <SelectItem value="premium">Premium Members</SelectItem>
                </SelectContent>
              </Select>

              <div className="grid grid-cols-2 gap-4">
                <Input
                  type="date"
                  value={newCampaign.scheduledDate}
                  onChange={(e) => setNewCampaign({ ...newCampaign, scheduledDate: e.target.value })}
                />
                <Input
                  type="time"
                  value={newCampaign.scheduledTime}
                  onChange={(e) => setNewCampaign({ ...newCampaign, scheduledTime: e.target.value })}
                />
              </div>

              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={newCampaign.isABTest}
                  onChange={(e) => setNewCampaign({ ...newCampaign, isABTest: e.target.checked })}
                  className="rounded"
                />
                <span>Enable A/B Testing</span>
              </label>
            </CardContent>
          </Card>

          <EmailTemplateBuilder onSave={setEmailTemplate} />

          {message && (
            <Alert className={message.type === 'success' ? 'bg-green-50' : 'bg-red-50'}>
              <AlertDescription>{message.text}</AlertDescription>
            </Alert>
          )}

          <Button onClick={handleCreateCampaign} disabled={loading} className="w-full" size="lg">
            {loading ? 'Creating...' : 'Create Campaign'}
          </Button>
        </TabsContent>

        <TabsContent value="analytics">
          <CampaignAnalytics
            campaigns={campaigns.map(c => ({
              campaignName: c.name,
              totalSent: c.stats.sent,
              opened: c.stats.opened,
              clicked: c.stats.clicked,
              bounced: Math.floor(c.stats.sent * 0.02),
              unsubscribed: Math.floor(c.stats.sent * 0.005)
            }))}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default EmailMarketingDashboard;
