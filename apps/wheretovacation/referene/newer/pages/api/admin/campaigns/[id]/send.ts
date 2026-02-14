import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

// Conditionally import Resend - only if available
let Resend: any = null;
try {
  const resendModule = require('resend');
  Resend = resendModule.Resend || resendModule.default?.Resend;
} catch (e) {
  console.warn('Resend package not available');
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const resend = Resend ? new Resend(process.env.RESEND_API_KEY) : null;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!resend) {
    return res.status(503).json({ error: 'Email service not configured. Please install resend package.' });
  }

  const { id } = req.query;

  try {
    // Get campaign
    const { data: campaign, error: campaignError } = await supabase
      .from('email_campaigns')
      .select('*')
      .eq('id', id)
      .single();

    if (campaignError || !campaign) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    // Get pending recipients
    const { data: recipients, error: recipientsError } = await supabase
      .from('email_campaign_recipients')
      .select('*')
      .eq('campaign_id', id)
      .eq('status', 'pending');

    if (recipientsError) throw recipientsError;

    if (!recipients || recipients.length === 0) {
      return res.status(400).json({ error: 'No pending recipients' });
    }

    // Send emails
    let successCount = 0;
    let failCount = 0;

    for (const recipient of recipients) {
      try {
        // Replace variables in body
        const personalizedBody = campaign.body
          .replace(/\{name\}/g, recipient.name || recipient.email.split('@')[0])
          .replace(/\{email\}/g, recipient.email);

        // Send via Resend
        const { data, error } = await resend.emails.send({
          from: process.env.RESEND_FROM_EMAIL || 'Gulf Coast Charters <onboarding@resend.dev>',
          to: [recipient.email],
          subject: campaign.subject,
          text: personalizedBody,
          replyTo: process.env.RESEND_REPLY_TO || 'shataken@gmail.com'
        });

        if (error) {
          // Mark as failed
          await supabase
            .from('email_campaign_recipients')
            .update({
              status: 'failed',
              error_message: error.message
            })
            .eq('id', recipient.id);
          
          failCount++;
        } else {
          // Mark as sent
          await supabase
            .from('email_campaign_recipients')
            .update({
              status: 'sent',
              sent_at: new Date().toISOString()
            })
            .eq('id', recipient.id);
          
          successCount++;
        }
      } catch (error: any) {
        console.error(`Failed to send to ${recipient.email}:`, error);
        
        await supabase
          .from('email_campaign_recipients')
          .update({
            status: 'failed',
            error_message: error.message
          })
          .eq('id', recipient.id);
        
        failCount++;
      }
    }

    // Update campaign status
    const finalStatus = failCount === 0 ? 'sent' : successCount === 0 ? 'failed' : 'sent';
    await supabase
      .from('email_campaigns')
      .update({
        status: finalStatus,
        sent_at: new Date().toISOString()
      })
      .eq('id', id);

    return res.status(200).json({
      success: true,
      successCount,
      failCount,
      totalRecipients: recipients.length
    });
  } catch (error: any) {
    console.error('Error sending campaign:', error);
    return res.status(500).json({ error: error.message });
  }
}
