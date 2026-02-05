import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Mail, Users, TrendingUp, Send, Plus } from 'lucide-react';
import CampaignAnalytics from './CampaignAnalytics';

const EmailCampaignManager: React.FC = () => {
  const [activeTab, setActiveTab] = useState('campaigns');
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [leads, setLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showNewCampaign, setShowNewCampaign] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState<any>(null);

  // New campaign form
  const [campaignName, setCampaignName] = useState('');
  const [subjectLineA, setSubjectLineA] = useState('');
  const [subjectLineB, setSubjectLineB] = useState('');
  const [emailTemplate, setEmailTemplate] = useState('');
  const [targetSegment, setTargetSegment] = useState<string[]>([]);

  // New lead form
  const [newLeadEmail, setNewLeadEmail] = useState('');
  const [newLeadFirstName, setNewLeadFirstName] = useState('');
  const [newLeadLastName, setNewLeadLastName] = useState('');
  const [newLeadPhone, setNewLeadPhone] = useState('');
  const [newLeadSource, setNewLeadSource] = useState('');

  useEffect(() => {
    loadCampaigns();
    loadLeads();
  }, []);

  const loadCampaigns = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('email-campaign-manager', {
        body: { action: 'get_all_campaigns' }
      });
      if (!error && data?.campaigns) {
        setCampaigns(data.campaigns);
      }
    } catch (error) {
      console.error('Error loading campaigns:', error);
    }
  };

  const loadLeads = async () => {
    // Mock leads for demonstration
    setLeads([
      { id: '1', email: 'captain1@example.com', firstName: 'John', lastName: 'Smith', status: 'new', source: 'website' },
      { id: '2', email: 'captain2@example.com', firstName: 'Sarah', lastName: 'Johnson', status: 'contacted', source: 'referral' }
    ]);
  };

  const handleAddLead = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('email-campaign-manager', {
        body: {
          action: 'add_lead',
          email: newLeadEmail,
          firstName: newLeadFirstName,
          lastName: newLeadLastName,
          phone: newLeadPhone,
          source: newLeadSource,
          tags: ['captain', 'new']
        }
      });

      if (!error) {
        alert('Lead added successfully!');
        setNewLeadEmail('');
        setNewLeadFirstName('');
        setNewLeadLastName('');
        setNewLeadPhone('');
        setNewLeadSource('');
        loadLeads();
      }
    } catch (error: any) {
      alert('Error: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCampaign = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('email-campaign-manager', {
        body: {
          action: 'create_campaign',
          name: campaignName,
          subjectLineA,
          subjectLineB: subjectLineB || null,
          emailTemplate,
          targetSegment
        }
      });

      if (!error) {
        alert('Campaign created successfully!');
        setShowNewCampaign(false);
        setCampaignName('');
        setSubjectLineA('');
        setSubjectLineB('');
        setEmailTemplate('');
        loadCampaigns();
      }
    } catch (error: any) {
      alert('Error: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Email Campaign Manager</h1>
        <p className="text-gray-600">Automated campaigns with A/B testing and behavioral triggers</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="campaigns">
            <Mail className="w-4 h-4 mr-2" />
            Campaigns
          </TabsTrigger>
          <TabsTrigger value="leads">
            <Users className="w-4 h-4 mr-2" />
            Leads
          </TabsTrigger>
          <TabsTrigger value="analytics">
            <TrendingUp className="w-4 h-4 mr-2" />
            Analytics
          </TabsTrigger>
        </TabsList>

        <TabsContent value="campaigns" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Active Campaigns</h2>
            <Button onClick={() => setShowNewCampaign(!showNewCampaign)}>
              <Plus className="w-4 h-4 mr-2" />
              New Campaign
            </Button>
          </div>

          {showNewCampaign && (
            <Card>
              <CardHeader>
                <CardTitle>Create New Campaign</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Campaign Name</label>
                  <Input
                    value={campaignName}
                    onChange={(e) => setCampaignName(e.target.value)}
                    placeholder="Captain Onboarding - Wave 1"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Subject Line A</label>
                  <Input
                    value={subjectLineA}
                    onChange={(e) => setSubjectLineA(e.target.value)}
                    placeholder="Join Gulf Coast Charters Today"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Subject Line B (Optional - for A/B testing)</label>
                  <Input
                    value={subjectLineB}
                    onChange={(e) => setSubjectLineB(e.target.value)}
                    placeholder="Start Earning as a Captain"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Email Template (HTML)</label>
                  <Textarea
                    value={emailTemplate}
                    onChange={(e) => setEmailTemplate(e.target.value)}
                    placeholder="<html><body>Your email content here...</body></html>"
                    rows={6}
                  />
                </div>
                <Button onClick={handleCreateCampaign} disabled={loading}>
                  Create Campaign
                </Button>
              </CardContent>
            </Card>
          )}

          <div className="grid gap-4">
            {campaigns.map((campaign) => (
              <Card key={campaign.id} className="cursor-pointer hover:shadow-lg transition-shadow"
                onClick={() => setSelectedCampaign(campaign)}>
                <CardContent className="pt-6">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="font-semibold text-lg">{campaign.name}</h3>
                      <p className="text-sm text-gray-500">
                        Created {new Date(campaign.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <Badge variant={campaign.status === 'active' ? 'default' : 'secondary'}>
                      {campaign.status}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-4 gap-4 text-center">
                    <div>
                      <p className="text-2xl font-bold">{campaign.totalSent}</p>
                      <p className="text-sm text-gray-500">Sent</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-blue-600">{campaign.openRate}%</p>
                      <p className="text-sm text-gray-500">Open Rate</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-green-600">{campaign.clickRate}%</p>
                      <p className="text-sm text-gray-500">Click Rate</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-purple-600">{campaign.conversionRate}%</p>
                      <p className="text-sm text-gray-500">Conversion</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="leads" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Add New Lead</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Input
                  placeholder="First Name"
                  value={newLeadFirstName}
                  onChange={(e) => setNewLeadFirstName(e.target.value)}
                />
                <Input
                  placeholder="Last Name"
                  value={newLeadLastName}
                  onChange={(e) => setNewLeadLastName(e.target.value)}
                />
              </div>
              <Input
                type="email"
                placeholder="Email"
                value={newLeadEmail}
                onChange={(e) => setNewLeadEmail(e.target.value)}
              />
              <Input
                placeholder="Phone"
                value={newLeadPhone}
                onChange={(e) => setNewLeadPhone(e.target.value)}
              />
              <Input
                placeholder="Source (e.g., website, referral)"
                value={newLeadSource}
                onChange={(e) => setNewLeadSource(e.target.value)}
              />
              <Button onClick={handleAddLead} disabled={loading}>
                <Plus className="w-4 h-4 mr-2" />
                Add Lead
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>All Leads ({leads.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {leads.map((lead) => (
                  <div key={lead.id} className="flex justify-between items-center p-3 border rounded-lg">
                    <div>
                      <p className="font-medium">{lead.firstName} {lead.lastName}</p>
                      <p className="text-sm text-gray-500">{lead.email}</p>
                    </div>
                    <div className="flex gap-2">
                      <Badge variant="outline">{lead.source}</Badge>
                      <Badge>{lead.status}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics">
          {selectedCampaign ? (
            <CampaignAnalytics campaignId={selectedCampaign.id} />
          ) : (
            <Card>
              <CardContent className="pt-6 text-center">
                <p className="text-gray-500">Select a campaign to view detailed analytics</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default EmailCampaignManager;
