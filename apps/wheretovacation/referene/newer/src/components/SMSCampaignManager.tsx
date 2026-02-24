import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/lib/supabase';
import { MessageSquare, Send, Calendar, Users, TrendingUp } from 'lucide-react';
import { toast } from 'sonner';

export default function SMSCampaignManager() {
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(false);
  const [newCampaign, setNewCampaign] = useState({
    name: '',
    message: '',
    scheduledFor: '',
    targetAudience: 'all'
  });

  const messageTemplates = [
    { name: 'Captain Recruitment', text: 'Join Gulf Coast Charters as a captain! Earn great income and set your own schedule. Apply now: https://gulfcoast.com/apply' },
    { name: 'Special Offer', text: 'Limited time offer! Book your charter today and save 20%. Visit: https://gulfcoast.com/deals' },
    { name: 'Event Announcement', text: 'Join us for our annual fishing tournament! Register now: https://gulfcoast.com/events' }
  ];

  useEffect(() => {
    loadCampaigns();
  }, []);

  const loadCampaigns = async () => {
    try {
      const { data } = await supabase.functions.invoke('sms-campaign-manager', {
        body: { action: 'list' }
      });
      if (data?.campaigns) setCampaigns(data.campaigns);
    } catch (error) {
      console.error('Error loading campaigns:', error);
    }
  };

  const createCampaign = async () => {
    if (!newCampaign.name || !newCampaign.message) {
      toast.error('Please fill in all required fields');
      return;
    }

    setLoading(true);
    try {
      const { data } = await supabase.functions.invoke('sms-campaign-manager', {
        body: { action: 'create', campaignData: newCampaign }
      });

      if (data?.success) {
        toast.success('Campaign created successfully');
        loadCampaigns();
        setNewCampaign({ name: '', message: '', scheduledFor: '', targetAudience: 'all' });
      }
    } catch (error) {
      toast.error('Failed to create campaign');
    } finally {
      setLoading(false);
    }
  };

  const sendCampaign = async (campaign: any) => {
    setLoading(true);
    try {
      const { data } = await supabase.functions.invoke('sms-campaign-manager', {
        body: { action: 'send', campaignData: campaign }
      });

      if (data?.success) {
        toast.success(`Campaign sent! ${data.results.delivered} delivered, ${data.results.failed} failed`);
        loadCampaigns();
      }
    } catch (error) {
      toast.error('Failed to send campaign');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Tabs defaultValue="campaigns" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="campaigns">Campaigns</TabsTrigger>
          <TabsTrigger value="create">Create New</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
        </TabsList>

        <TabsContent value="campaigns" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>SMS Campaigns</CardTitle>
              <CardDescription>Manage and monitor your SMS campaigns</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {campaigns.map((campaign: any) => (
                  <Card key={campaign.id}>
                    <CardContent className="pt-6">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="font-semibold">{campaign.name}</h3>
                          <p className="text-sm text-muted-foreground mt-1">{campaign.message}</p>
                          <div className="flex gap-4 mt-3">
                            <Badge variant={campaign.status === 'sent' ? 'default' : 'secondary'}>
                              {campaign.status}
                            </Badge>
                            <span className="text-sm text-muted-foreground">
                              Sent: {campaign.sent_count}
                            </span>
                            <span className="text-sm text-muted-foreground">
                              Delivered: {campaign.delivered_count}
                            </span>
                            <span className="text-sm text-muted-foreground">
                              Clicks: {campaign.click_count}
                            </span>
                          </div>
                        </div>
                        {campaign.status !== 'sent' && (
                          <Button onClick={() => sendCampaign(campaign)} disabled={loading}>
                            <Send className="h-4 w-4 mr-2" />
                            Send Now
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="create" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Create SMS Campaign</CardTitle>
              <CardDescription>Design and schedule your SMS campaign</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Campaign Name</Label>
                <Input
                  value={newCampaign.name}
                  onChange={(e) => setNewCampaign({ ...newCampaign, name: e.target.value })}
                  placeholder="e.g., Captain Recruitment - January"
                />
              </div>
              <div>
                <Label>Message (160 characters max recommended)</Label>
                <Textarea
                  value={newCampaign.message}
                  onChange={(e) => setNewCampaign({ ...newCampaign, message: e.target.value })}
                  placeholder="Your SMS message..."
                  rows={4}
                />
                <p className="text-sm text-muted-foreground mt-1">
                  {newCampaign.message.length} characters
                </p>
              </div>
              <div>
                <Label>Target Audience</Label>
                <Select
                  value={newCampaign.targetAudience}
                  onValueChange={(value) => setNewCampaign({ ...newCampaign, targetAudience: value })}
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
                <Label>Schedule For (Optional)</Label>
                <Input
                  type="datetime-local"
                  value={newCampaign.scheduledFor}
                  onChange={(e) => setNewCampaign({ ...newCampaign, scheduledFor: e.target.value })}
                />
              </div>
              <Button onClick={createCampaign} disabled={loading} className="w-full">
                <MessageSquare className="h-4 w-4 mr-2" />
                Create Campaign
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="templates" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Message Templates</CardTitle>
              <CardDescription>Quick-start templates for common campaigns</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {messageTemplates.map((template, idx) => (
                  <Card key={idx}>
                    <CardContent className="pt-6">
                      <h4 className="font-semibold mb-2">{template.name}</h4>
                      <p className="text-sm text-muted-foreground mb-3">{template.text}</p>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setNewCampaign({ ...newCampaign, message: template.text })}
                      >
                        Use Template
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}