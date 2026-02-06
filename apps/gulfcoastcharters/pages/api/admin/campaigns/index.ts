import type { NextApiRequest, NextApiResponse } from 'next';
import { getAuthedUser, getSupabaseAdmin } from '../../_lib/supabase';
import { requireRole } from '../../_lib/rbac';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const authed = await requireRole(req, res, ['admin']);
  if (!authed) return;

  const supabase = getSupabaseAdmin();
  if (req.method === 'GET') {
    return getCampaigns(req, res, supabase);
  } else if (req.method === 'POST') {
    return createCampaign(req, res, supabase);
  } else {
    return res.status(405).json({ error: 'Method not allowed' });
  }
}

async function getCampaigns(req: NextApiRequest, res: NextApiResponse, supabase: any) {
  try {
    const { data: campaigns, error } = await supabase
      .from('email_campaigns')
      .select('id, name, subject, body, status, created_at, sent_at')
      .order('created_at', { ascending: false });

    if (error) throw error;

    const campaignsWithStats = await Promise.all(
      (campaigns || []).map(async (campaign: any) => {
        const { count: total } = await supabase
          .from('email_campaign_recipients')
          .select('*', { count: 'exact', head: true })
          .eq('campaign_id', campaign.id);
        const { count: sent } = await supabase
          .from('email_campaign_recipients')
          .select('*', { count: 'exact', head: true })
          .eq('campaign_id', campaign.id)
          .eq('status', 'sent');
        return {
          id: campaign.id,
          name: campaign.name,
          subject: campaign.subject,
          body: campaign.body,
          status: campaign.status,
          created_at: campaign.created_at,
          createdAt: campaign.created_at,
          sent_at: campaign.sent_at,
          recipientCount: total ?? 0,
          sentCount: sent ?? 0,
        };
      })
    );

    return res.status(200).json({ campaigns: campaignsWithStats });
  } catch (error: any) {
    // Table/columns may not exist or RLS may block; return empty so dashboard never 500s
    console.warn('Campaigns fetch failed (returning empty):', error?.message ?? error);
    return res.status(200).json({ campaigns: [] });
  }
}

async function createCampaign(req: NextApiRequest, res: NextApiResponse, supabase: any) {
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

    // If sendNow, trigger email sending (forward cookies so send endpoint sees same session)
    if (sendNow) {
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
      const cookieHeader = req.headers.cookie;
      await fetch(`${baseUrl}/api/admin/campaigns/${campaign.id}/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(cookieHeader ? { Cookie: cookieHeader } : {}),
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
