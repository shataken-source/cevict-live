/**
 * Campaign detail page - /admin/campaigns/[id]
 * View campaign and recipients; mark "sending" as failed if stuck.
 */

import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { createPagesBrowserClient } from '@supabase/auth-helpers-nextjs';

const supabase = createPagesBrowserClient();

interface Recipient {
  id: string;
  email: string;
  name: string | null;
  status: string;
  sent_at: string | null;
  error_message: string | null;
}

interface Campaign {
  id: string;
  name: string;
  subject: string;
  body: string;
  status: string;
  created_at: string;
  sent_at: string | null;
}

export default function CampaignDetailPage() {
  const router = useRouter();
  const { id } = router.query;
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (!id) return;

    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) {
        router.replace('/admin/login');
        return;
      }
      fetchCampaign();
    });
  }, [id, router]);

  const fetchCampaign = async (silent = false) => {
    if (!id) return;
    if (!silent) setLoading(true);
    try {
      const res = await fetch(`/api/admin/campaigns/${id}`);
      if (res.status === 404) {
        setCampaign(null);
        setRecipients([]);
        return;
      }
      const data = await res.json();
      setCampaign(data.campaign);
      setRecipients(data.recipients || []);
    } catch (err) {
      console.error(err);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const markFailed = async () => {
    if (!id || !campaign) return;
    setMessage(null);
    setUpdating(true);
    try {
      const res = await fetch(`/api/admin/campaigns/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'failed' }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setCampaign((c) => (c ? { ...c, status: 'failed' } : null));
        await fetchCampaign(true);
        setMessage({ type: 'success', text: 'Campaign marked as failed. Recipients synced.' });
        setTimeout(() => setMessage(null), 4000);
      } else {
        setMessage({ type: 'error', text: data.error || 'Update failed' });
      }
    } catch (err) {
      console.error(err);
      setMessage({ type: 'error', text: 'Request failed' });
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <>
        <Head><title>Campaign - Admin</title></Head>
        <div className="min-h-screen bg-gray-50 p-8">
          <p className="text-gray-600">Loading...</p>
        </div>
      </>
    );
  }

  if (!campaign) {
    return (
      <>
        <Head><title>Campaign not found - Admin</title></Head>
        <div className="min-h-screen bg-gray-50 p-8">
          <button onClick={() => router.push('/admin/campaigns')} className="text-blue-600 hover:underline mb-4">← Back to Campaigns</button>
          <p className="text-gray-700">Campaign not found.</p>
        </div>
      </>
    );
  }

  const statusColors: Record<string, string> = {
    draft: 'bg-gray-100 text-gray-800',
    scheduled: 'bg-blue-100 text-blue-800',
    sending: 'bg-yellow-100 text-yellow-800',
    sent: 'bg-green-100 text-green-800',
    failed: 'bg-red-100 text-red-800',
  };

  return (
    <>
      <Head><title>{campaign.name} - Admin</title></Head>
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-4xl mx-auto">
          <button
            onClick={() => router.push('/admin/campaigns')}
            className="text-blue-600 hover:underline mb-4 flex items-center gap-2"
          >
            ← Back to Campaigns
          </button>

          {message && (
            <div
              className={`mb-4 px-4 py-2 rounded-lg ${message.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}
              role="alert"
            >
              {message.text}
            </div>
          )}

          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <div className="flex justify-between items-start mb-4">
              <h1 className="text-2xl font-bold text-gray-900">{campaign.name}</h1>
              <span className={`px-3 py-1 rounded-full text-sm font-semibold ${statusColors[campaign.status] || 'bg-gray-100'}`}>
                {campaign.status.charAt(0).toUpperCase() + campaign.status.slice(1)}
              </span>
            </div>
            <p className="text-sm text-gray-600 mb-2"><strong>Subject:</strong> {campaign.subject}</p>
            <p className="text-xs text-gray-500 mb-4">
              Created {new Date(campaign.created_at).toLocaleString()}
              {campaign.status === 'sent' && campaign.sent_at && ` · Sent ${new Date(campaign.sent_at).toLocaleString()}`}
            </p>
            {campaign.status === 'sending' && (
              <button
                type="button"
                onClick={markFailed}
                disabled={updating}
                className="px-4 py-2 bg-red-100 text-red-800 rounded-lg font-medium hover:bg-red-200 disabled:opacity-50"
              >
                {updating ? 'Updating…' : 'Mark as failed'}
              </button>
            )}
            {campaign.status === 'failed' && recipients.some((r) => r.status === 'pending') && (
              <button
                type="button"
                onClick={markFailed}
                disabled={updating}
                className="px-4 py-2 bg-amber-100 text-amber-800 rounded-lg font-medium hover:bg-amber-200 disabled:opacity-50"
              >
                {updating ? 'Updating…' : 'Sync recipients to failed'}
              </button>
            )}
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Recipients ({recipients.length})</h2>
            <div className="space-y-2">
              {recipients.map((r) => (
                <div key={r.id} className="flex justify-between items-center py-2 border-b border-gray-100 last:border-0">
                  <div>
                    <span className="font-medium text-gray-900">{r.email}</span>
                    {r.name && <span className="text-gray-500 text-sm ml-2">({r.name})</span>}
                  </div>
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                    r.status === 'sent' ? 'bg-green-100 text-green-800' :
                    r.status === 'failed' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-700'
                  }`}>
                    {r.status}
                    {r.error_message && `: ${r.error_message}`}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6 mt-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Body</h2>
            <pre className="whitespace-pre-wrap text-sm text-gray-700 bg-gray-50 p-4 rounded-lg overflow-x-auto">
              {campaign.body}
            </pre>
          </div>
        </div>
      </div>
    </>
  );
}
