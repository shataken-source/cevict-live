import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { createPagesBrowserClient } from '@supabase/auth-helpers-nextjs';

interface Campaign {
  id: string;
  name: string;
  subject: string;
  status: 'draft' | 'scheduled' | 'sending' | 'sent' | 'failed';
  recipientCount: number;
  sentCount: number;
  createdAt: string;
  scheduledFor?: string;
}

export default function EmailCampaigns() {
  const router = useRouter();
  const supabase = createPagesBrowserClient();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) router.replace('/admin/login');
      else fetchCampaigns();
    });
  }, [router, supabase]);

  const fetchCampaigns = async () => {
    try {
      const response = await fetch('/api/admin/campaigns');
      const data = await response.json();
      setCampaigns(data.campaigns || []);
    } catch (error) {
      console.error('Failed to fetch campaigns:', error);
      // Show placeholder on error
      setCampaigns([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Head>
        <title>Email Campaigns - Admin - Gulf Coast Charters</title>
      </Head>

      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="flex justify-between items-center mb-8">
            <div>
              <button
                onClick={() => router.push('/admin')}
                className="text-blue-600 hover:text-blue-800 mb-2 flex items-center gap-2"
              >
                ← Back to Dashboard
              </button>
              <h1 className="text-3xl font-bold text-gray-900">Email Campaigns</h1>
            </div>
            <button
              onClick={() => router.push('/admin/campaigns/new')}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 font-semibold"
            >
              + New Campaign
            </button>
          </div>

          {/* Campaigns List */}
          {loading ? (
            <div className="text-center py-12">
              <p className="text-gray-600">Loading campaigns...</p>
            </div>
          ) : campaigns.length === 0 ? (
            <div className="bg-white rounded-lg shadow p-12 text-center">
              <div className="text-6xl mb-4">📧</div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No campaigns yet</h3>
              <p className="text-gray-600 mb-6">Create your first email campaign to get started</p>
              <button
                onClick={() => router.push('/admin/campaigns/new')}
                className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 font-semibold"
              >
                Create Campaign
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {campaigns.map((campaign) => (
                <CampaignCard
                  key={campaign.id}
                  campaign={campaign}
                  onClick={() => router.push(`/admin/campaigns/${campaign.id}`)}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

function CampaignCard({ campaign, onClick }: { campaign: Campaign; onClick: () => void }) {
  const statusColors = {
    draft: 'bg-gray-100 text-gray-800',
    scheduled: 'bg-blue-100 text-blue-800',
    sending: 'bg-yellow-100 text-yellow-800',
    sent: 'bg-green-100 text-green-800',
    failed: 'bg-red-100 text-red-800'
  };

  return (
    <button
      onClick={onClick}
      className="w-full bg-white rounded-lg shadow p-6 text-left hover:shadow-lg transition-shadow"
    >
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-1">{campaign.name}</h3>
          <p className="text-sm text-gray-600">{campaign.subject}</p>
        </div>
        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${statusColors[campaign.status]}`}>
          {campaign.status.charAt(0).toUpperCase() + campaign.status.slice(1)}
        </span>
      </div>

      <div className="flex gap-6 text-sm text-gray-600">
        <div>
          <span className="font-semibold">{campaign.recipientCount}</span> recipients
        </div>
        {campaign.status === 'sent' && (
          <div>
            <span className="font-semibold">{campaign.sentCount}</span> sent
          </div>
        )}
        <div>
          Created {new Date(campaign.createdAt).toLocaleDateString()}
        </div>
        {campaign.scheduledFor && (
          <div>
            Scheduled for {new Date(campaign.scheduledFor).toLocaleString()}
          </div>
        )}
      </div>
    </button>
  );
}
