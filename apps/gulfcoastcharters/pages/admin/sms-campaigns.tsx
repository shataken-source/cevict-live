/**
 * SMS Campaign Manager - Admin Page
 * 
 * Route: /admin/sms-campaigns
 * Allows admins to create, manage, and send SMS campaigns
 */

import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { createPagesBrowserClient } from '@supabase/auth-helpers-nextjs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../src/components/ui/card';
import { Button } from '../../src/components/ui/button';
import { Input } from '../../src/components/ui/input';
import { Label } from '../../src/components/ui/label';
import { Textarea } from '../../src/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../src/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../src/components/ui/tabs';
import { MessageSquare, Plus, Send, BarChart3, Calendar, Users } from 'lucide-react';
import { toast } from 'sonner';

interface SMSCampaign {
  id: string;
  name: string;
  message: string;
  target_audience: string;
  status: string;
  scheduled_for?: string;
  sent_at?: string;
  created_at: string;
}

export default function SMSCampaignsPage() {
  const router = useRouter();
  const supabase = createPagesBrowserClient();
  const [user, setUser] = useState<any>(null);
  const [campaigns, setCampaigns] = useState<SMSCampaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    message: '',
    targetAudience: 'all',
    scheduledFor: '',
  });

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) {
        router.replace('/admin/login');
      } else {
        setUser(data.user);
        fetchCampaigns();
      }
    });
  }, [router, supabase]);

  const fetchCampaigns = async () => {
    try {
      const res = await fetch('/api/admin/sms-campaigns');
      const data = await res.json();
      setCampaigns(data.campaigns || []);
    } catch (error: any) {
      console.error('Error fetching campaigns:', error);
      toast.error('Failed to load campaigns');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCampaign = async () => {
    if (!formData.name || !formData.message) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke('sms-campaign-manager', {
        body: {
          action: 'create_campaign',
          campaignData: {
            name: formData.name,
            message: formData.message,
            targetAudience: formData.targetAudience,
            scheduledFor: formData.scheduledFor || null,
            userId: user.id,
          },
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast.success('Campaign created successfully');
      setShowCreateForm(false);
      setFormData({ name: '', message: '', targetAudience: 'all', scheduledFor: '' });
      fetchCampaigns();
    } catch (error: any) {
      console.error('Error creating campaign:', error);
      toast.error(error.message || 'Failed to create campaign');
    }
  };

  const handleSendCampaign = async (campaignId: string) => {
    if (!confirm('Are you sure you want to send this campaign? This cannot be undone.')) {
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke('sms-campaign-manager', {
        body: {
          action: 'send_campaign',
          campaignId,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast.success(data.message || 'Campaign sent successfully');
      fetchCampaigns();
    } catch (error: any) {
      console.error('Error sending campaign:', error);
      toast.error(error.message || 'Failed to send campaign');
    }
  };

  const handleGetAnalytics = async (campaignId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('sms-campaign-manager', {
        body: {
          action: 'get_analytics',
          campaignId,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      const analytics = data.analytics;
      toast.success(
        `Analytics: ${analytics.sent} sent, ${analytics.delivered} delivered, ${analytics.failed} failed`
      );
    } catch (error: any) {
      console.error('Error getting analytics:', error);
      toast.error('Failed to load analytics');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>SMS Campaigns - Admin - Gulf Coast Charters</title>
      </Head>

      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-between items-center mb-8">
            <div>
              <button
                onClick={() => router.push('/admin')}
                className="text-blue-600 hover:text-blue-800 mb-2 flex items-center gap-2"
              >
                ← Back to Dashboard
              </button>
              <h1 className="text-3xl font-bold text-gray-900">SMS Campaign Manager</h1>
            </div>
            <Button onClick={() => setShowCreateForm(!showCreateForm)}>
              <Plus className="w-4 h-4 mr-2" />
              New Campaign
            </Button>
          </div>

          {showCreateForm && (
            <Card className="mb-8">
              <CardHeader>
                <CardTitle>Create SMS Campaign</CardTitle>
                <CardDescription>
                  Send bulk SMS messages to your subscribers
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="name">Campaign Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., Captain Recruitment - January"
                  />
                </div>

                <div>
                  <Label htmlFor="message">Message</Label>
                  <Textarea
                    id="message"
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    placeholder="Enter your SMS message (under 160 characters recommended)"
                    rows={4}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    {formData.message.length} characters
                  </p>
                </div>

                <div>
                  <Label htmlFor="audience">Target Audience</Label>
                  <Select
                    value={formData.targetAudience}
                    onValueChange={(value) => setFormData({ ...formData, targetAudience: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All SMS Subscribers</SelectItem>
                      <SelectItem value="captains">Captains Only</SelectItem>
                      <SelectItem value="customers">Customers Only</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="schedule">Schedule (Optional)</Label>
                  <Input
                    id="schedule"
                    type="datetime-local"
                    value={formData.scheduledFor}
                    onChange={(e) => setFormData({ ...formData, scheduledFor: e.target.value })}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Leave empty to send immediately
                  </p>
                </div>

                <div className="flex gap-2">
                  <Button onClick={handleCreateCampaign}>Create Campaign</Button>
                  <Button variant="outline" onClick={() => setShowCreateForm(false)}>
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {campaigns.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <MessageSquare className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">No SMS campaigns yet</h3>
                <p className="text-gray-600 mb-6">Create your first SMS campaign to get started</p>
                <Button onClick={() => setShowCreateForm(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Create Campaign
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {campaigns.map((campaign) => (
                <Card key={campaign.id}>
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle>{campaign.name}</CardTitle>
                        <CardDescription className="mt-2">{campaign.message}</CardDescription>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        campaign.status === 'completed' ? 'bg-green-100 text-green-800' :
                        campaign.status === 'scheduled' ? 'bg-blue-100 text-blue-800' :
                        campaign.status === 'sending' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {campaign.status}
                      </span>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-4 text-sm text-gray-600 mb-4">
                      <div className="flex items-center gap-1">
                        <Users className="w-4 h-4" />
                        {campaign.target_audience}
                      </div>
                      {campaign.scheduled_for && (
                        <div className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          {new Date(campaign.scheduled_for).toLocaleString()}
                        </div>
                      )}
                      {campaign.sent_at && (
                        <div className="flex items-center gap-1">
                          <Send className="w-4 h-4" />
                          Sent {new Date(campaign.sent_at).toLocaleString()}
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2">
                      {campaign.status === 'draft' && (
                        <Button onClick={() => handleSendCampaign(campaign.id)}>
                          <Send className="w-4 h-4 mr-2" />
                          Send Now
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        onClick={() => handleGetAnalytics(campaign.id)}
                      >
                        <BarChart3 className="w-4 h-4 mr-2" />
                        View Analytics
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
