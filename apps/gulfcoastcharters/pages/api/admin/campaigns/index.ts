import type { NextApiRequest, NextApiResponse } from 'next';
import { getSupabaseAdmin } from '../../_lib/supabase';
import { getAuthedUser } from '../../_lib/supabase';
import { requireRole } from '../../_lib/rbac';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const authed = await requireRole(req, res, ['admin']);
  if (!authed) return;

  const supabase = getSupabaseAdmin();
  if (req.method === 'GET') {
    return getCampaigns(req, res);
  } else if (req.method === 'POST') {
    return createCampaign(req, res);
  } else {
    return res.status(405).json({ error: 'Method not allowed' });
  }
}

async function getCampaigns(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { data: campaigns, error } = await supabase
      .from('email_campaigns')
      .select(`
        *,
        template:email_campaign_templates(name),
        recipients:email_campaign_recipients(count)
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Transform data to include recipient count
    const campaignsWithStats = await Promise.all(
      (campaigns || []).map(async (campaign) => {
        const { data: stats } = await supabase.rpc('get_campaign_stats', {
          campaign_uuid: campaign.id
        });

        return {
          ...campaign,
          recipientCount: stats?.[0]?.total_recipients || 0,
          sentCount: stats?.[0]?.sent_count || 0
        };
      })
    );

    return res.status(200).json({ campaigns: campaignsWithStats });
  } catch (error: any) {
    console.error('Error fetching campaigns:', error);
    return res.status(500).json({ error: error.message });
  }
}

async function createCampaign(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { name, subject, body, recipients, sendNow = true } = req.body;

    if (!name || !subject || !body || !recipients) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Parse recipients
    const recipientList = Array.isArray(recipients)
      ? recipients
      : recipients.split(',').map((r: string) => r.trim()).filter(Boolean);

    if (recipientList.length === 0) {
      return res.status(400).json({ error: 'No valid recipients provided' });
    }

    // Create campaign
    const { data: campaign, error: campaignError } = await supabase
      .from('email_campaigns')
      .insert({
        name,
        subject,
        body,
        status: sendNow ? 'sending' : 'draft',
        sender_id: null // set below (best-effort)
      })
      .select()
      .single();

    if (campaignError) throw campaignError;

    // Best-effort attach sender_id from cookie session (if present). Not required for sending.
    try {
      const { user } = await getAuthedUser(req, res);
      if (user?.id) {
        await supabase.from('email_campaigns').update({ sender_id: user.id }).eq('id', campaign.id);
      }
    } catch {
      // ignore
    }

    // Create recipient records
    const recipientRecords = recipientList.map((email: string) => ({
      campaign_id: campaign.id,
      email,
      name: email.split('@')[0], // Extract name from email for now
      status: 'pending'
    }));

    const { error: recipientsError } = await supabase
      .from('email_campaign_recipients')
      .insert(recipientRecords);

    if (recipientsError) throw recipientsError;

    // If sendNow, trigger email sending
    if (sendNow) {
      // Call the send endpoint
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
      await fetch(`${baseUrl}/api/admin/campaigns/${campaign.id}/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // Allow server-to-server execution even if cookie auth isn't present.
          ...(process.env.GCC_ADMIN_KEY ? { 'x-admin-key': process.env.GCC_ADMIN_KEY } : {}),
        }
      });
    }

    return res.status(201).json({ campaign, recipientCount: recipientList.length });
  } catch (error: any) {
    console.error('Error creating campaign:', error);
    return res.status(500).json({ error: error.message });
  }
}
