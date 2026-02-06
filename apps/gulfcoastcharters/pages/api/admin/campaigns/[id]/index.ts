import type { NextApiRequest, NextApiResponse } from 'next';
import { getSupabaseAdmin } from '../../../_lib/supabase';
import { requireRole } from '../../../_lib/rbac';

/**
 * GET /api/admin/campaigns/[id] - Fetch one campaign with recipients
 * PATCH /api/admin/campaigns/[id] - Update campaign (e.g. status: 'failed' to unstick "sending")
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;
  const campaignId = Array.isArray(id) ? id[0] : id;

  if (!campaignId) {
    return res.status(400).json({ error: 'Campaign ID required' });
  }

  const authed = await requireRole(req, res, ['admin']);
  if (!authed) return;

  const supabase = getSupabaseAdmin();

  if (req.method === 'GET') {
    try {
      const { data: campaign, error: campaignError } = await supabase
        .from('email_campaigns')
        .select('*')
        .eq('id', campaignId)
        .single();

      if (campaignError || !campaign) {
        return res.status(404).json({ error: 'Campaign not found' });
      }

      const { data: recipients, error: recipientsError } = await supabase
        .from('email_campaign_recipients')
        .select('*')
        .eq('campaign_id', campaignId)
        .order('created_at', { ascending: true });

      if (recipientsError) {
        return res.status(500).json({ error: recipientsError.message });
      }

      return res.status(200).json({
        campaign: { ...campaign, createdAt: campaign.created_at },
        recipients: recipients || [],
      });
    } catch (error: any) {
      console.error('Error fetching campaign:', error);
      return res.status(500).json({ error: error.message });
    }
  }

  if (req.method === 'PATCH') {
    try {
      const { status } = req.body || {};
      if (!status || !['draft', 'sending', 'sent', 'failed', 'scheduled'].includes(status)) {
        return res.status(400).json({ error: 'Valid status required (draft|sending|sent|failed|scheduled)' });
      }

      const { data, error } = await supabase
        .from('email_campaigns')
        .update({
          status,
          ...(status === 'sent' ? { sent_at: new Date().toISOString() } : {}),
        })
        .eq('id', campaignId)
        .select()
        .single();

      if (error) throw error;

      // When marking campaign as failed, also mark any still-pending recipients as failed
      if (status === 'failed') {
        const { error: recipError } = await supabase
          .from('email_campaign_recipients')
          .update({ status: 'failed', error_message: 'Campaign marked as failed' })
          .eq('campaign_id', campaignId)
          .eq('status', 'pending');
        if (recipError) {
          console.error('[Campaign PATCH] Recipient update failed:', recipError.message);
        }
      }

      return res.status(200).json({ campaign: data });
    } catch (error: any) {
      console.error('Error updating campaign:', error);
      return res.status(500).json({ error: error.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
