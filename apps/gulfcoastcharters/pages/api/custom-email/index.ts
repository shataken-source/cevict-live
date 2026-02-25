/**
 * Custom @gulfcoastcharters.com Email API
 *
 * GET  /api/custom-email                — get user's custom email(s) + availability check
 * GET  /api/custom-email?check=captain.john — check if prefix is available
 * POST /api/custom-email { action: 'purchase', emailPrefix, paymentMethod, userType, forwardTo }
 * POST /api/custom-email { action: 'updateForward', emailId, forwardTo }
 * POST /api/custom-email { action: 'deactivate', emailId }
 *
 * Pricing:
 *   Cash: $25 one-time (handled via Stripe checkout externally, webhook inserts record)
 *   Points: 5,000 points (deducted here)
 *   Prize/Referral: admin-only grant
 *
 * Limits: 1 active email per (user_id, user_type)
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { getAuthedUser, getSupabaseAdmin } from '../_lib/supabase';

const DOMAIN = 'gulfcoastcharters.com';
const POINTS_COST = 5000;
const CASH_PRICE = 25;

// Reserved prefixes that can't be purchased
const RESERVED_PREFIXES = new Set([
  'admin', 'support', 'info', 'help', 'noreply', 'no-reply',
  'postmaster', 'webmaster', 'abuse', 'security', 'billing',
  'sales', 'marketing', 'press', 'legal', 'privacy',
  'root', 'hostmaster', 'ssl', 'ftp', 'mail', 'smtp',
  'imap', 'pop', 'dns', 'ns1', 'ns2', 'www', 'api',
]);

function validatePrefix(prefix: string): { valid: boolean; error?: string } {
  if (!prefix || typeof prefix !== 'string') {
    return { valid: false, error: 'Email prefix is required' };
  }

  const clean = prefix.toLowerCase().trim();

  if (clean.length < 3) return { valid: false, error: 'Prefix must be at least 3 characters' };
  if (clean.length > 30) return { valid: false, error: 'Prefix must be 30 characters or less' };
  if (!/^[a-z0-9][a-z0-9-]*[a-z0-9]$/.test(clean) && clean.length > 2) {
    return { valid: false, error: 'Only lowercase letters, numbers, and hyphens allowed. Cannot start or end with a hyphen.' };
  }
  if (clean.length <= 2 && !/^[a-z0-9]+$/.test(clean)) {
    return { valid: false, error: 'Short prefixes can only contain letters and numbers' };
  }
  if (/--/.test(clean)) {
    return { valid: false, error: 'Cannot have consecutive hyphens' };
  }
  if (RESERVED_PREFIXES.has(clean)) {
    return { valid: false, error: 'This prefix is reserved' };
  }

  return { valid: true };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { user, error: authError } = await getAuthedUser(req, res);
  if (authError || !user) return res.status(401).json({ error: 'Unauthorized' });

  const admin = getSupabaseAdmin();
  const userId = user.id;

  // ── GET ──
  if (req.method === 'GET') {
    try {
      const checkPrefix = String(req.query.check || '').trim().toLowerCase();

      // Availability check
      if (checkPrefix) {
        const validation = validatePrefix(checkPrefix);
        if (!validation.valid) {
          return res.status(200).json({ available: false, reason: validation.error });
        }

        const fullAddress = `${checkPrefix}@${DOMAIN}`;
        const { data: activeExisting } = await admin
          .from('custom_emails')
          .select('id')
          .eq('email_address', fullAddress)
          .eq('is_active', true)
          .maybeSingle();

        const { data: inactiveExisting } = !activeExisting ? await admin
          .from('custom_emails')
          .select('id')
          .eq('email_address', fullAddress)
          .eq('is_active', false)
          .maybeSingle() : { data: null };

        return res.status(200).json({
          available: !activeExisting,
          prefix: checkPrefix,
          fullAddress,
          reason: activeExisting ? 'This email is already taken' : null,
          note: inactiveExisting ? 'This prefix was previously used but is now deactivated' : null,
        });
      }

      // Get user's custom emails
      const { data: emails } = await admin
        .from('custom_emails')
        .select('id, email_address, email_prefix, user_type, payment_method, forward_to_email, is_active, subscription_tier, purchased_at, expires_at')
        .eq('user_id', userId)
        .order('purchased_at', { ascending: false });

      // Get aliases if any
      const emailIds = (emails || []).map(e => e.id);
      let aliases: any[] = [];
      if (emailIds.length > 0) {
        const { data: aliasData } = await admin
          .from('email_aliases')
          .select('id, custom_email_id, alias_address, forward_to, is_active, usage_count, last_used_at')
          .in('custom_email_id', emailIds);
        aliases = aliasData || [];
      }

      return res.status(200).json({
        success: true,
        emails: emails || [],
        aliases,
        pricing: { cash: CASH_PRICE, points: POINTS_COST },
        domain: DOMAIN,
      });
    } catch (e: any) {
      return res.status(500).json({ error: e.message || 'Internal server error' });
    }
  }

  // ── POST ──
  if (req.method === 'POST') {
    try {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
      const { action } = body;

      // ── Purchase custom email ──
      if (action === 'purchase') {
        const { emailPrefix, paymentMethod, userType, forwardTo } = body;

        // Validate prefix
        const prefix = String(emailPrefix || '').toLowerCase().trim();
        const validation = validatePrefix(prefix);
        if (!validation.valid) {
          return res.status(400).json({ error: validation.error });
        }

        // Validate payment method
        if (!['points', 'cash'].includes(paymentMethod)) {
          return res.status(400).json({ error: 'paymentMethod must be "points" or "cash"' });
        }

        // Validate user type
        const type = String(userType || 'customer').toLowerCase();
        if (!['captain', 'customer'].includes(type)) {
          return res.status(400).json({ error: 'userType must be "captain" or "customer"' });
        }

        // Validate forward-to email
        if (!forwardTo || typeof forwardTo !== 'string' || !forwardTo.includes('@')) {
          return res.status(400).json({ error: 'Valid forwardTo email is required' });
        }

        const fullAddress = `${prefix}@${DOMAIN}`;

        // Check if prefix is taken
        const { data: existing } = await admin
          .from('custom_emails')
          .select('id')
          .eq('email_address', fullAddress)
          .eq('is_active', true)
          .maybeSingle();

        if (existing) {
          return res.status(409).json({ error: 'This email address is already taken' });
        }

        // Check if user already has an active email of this type
        const { data: userExisting } = await admin
          .from('custom_emails')
          .select('id, email_address')
          .eq('user_id', userId)
          .eq('user_type', type)
          .eq('is_active', true)
          .maybeSingle();

        if (userExisting) {
          return res.status(400).json({
            error: `You already have an active ${type} email: ${userExisting.email_address}`,
          });
        }

        // Handle payment
        if (paymentMethod === 'points') {
          // Check points balance
          const { data: sharedUser } = await admin
            .from('shared_users')
            .select('total_points')
            .eq('id', userId)
            .maybeSingle();

          const currentPoints = sharedUser?.total_points || 0;
          if (currentPoints < POINTS_COST) {
            return res.status(400).json({
              error: 'Insufficient points',
              required: POINTS_COST,
              current: currentPoints,
            });
          }

          // Deduct points
          const { error: pointsError } = await admin
            .from('shared_users')
            .update({ total_points: currentPoints - POINTS_COST })
            .eq('id', userId);

          if (pointsError) {
            return res.status(500).json({ error: 'Failed to deduct points' });
          }

          // Log transaction
          await admin.from('loyalty_transactions').insert({
            user_id: userId,
            points: -POINTS_COST,
            type: 'spent',
            description: `Custom email purchase: ${fullAddress}`,
          }).catch(() => { });
        }

        if (paymentMethod === 'cash') {
          // For cash, we create the record as "pending" — Stripe webhook will activate it.
          // Or if you want to handle Stripe here, redirect to checkout.
          // For now, create with a flag so webhook can find it.
        }

        // Create the custom email record
        const { data: newEmail, error: insertError } = await admin
          .from('custom_emails')
          .insert({
            user_id: userId,
            email_address: fullAddress,
            email_prefix: prefix,
            user_type: type,
            payment_method: paymentMethod,
            amount_paid: paymentMethod === 'cash' ? CASH_PRICE : 0,
            points_spent: paymentMethod === 'points' ? POINTS_COST : 0,
            forward_to_email: forwardTo.trim(),
            is_active: paymentMethod === 'points', // points = instant, cash = pending until Stripe confirms
          })
          .select()
          .single();

        if (insertError) {
          // Refund points if insert failed
          if (paymentMethod === 'points') {
            const { data: su } = await admin.from('shared_users').select('total_points').eq('id', userId).maybeSingle();
            if (su) {
              await admin.from('shared_users').update({ total_points: (su.total_points || 0) + POINTS_COST }).eq('id', userId);
            }
          }
          return res.status(500).json({ error: insertError.message });
        }

        return res.status(201).json({
          success: true,
          email: newEmail,
          message: paymentMethod === 'points'
            ? `Your email ${fullAddress} is now active! All mail will forward to ${forwardTo}.`
            : `Email reserved. Complete payment ($${CASH_PRICE}) to activate ${fullAddress}.`,
        });
      }

      // ── Update forwarding address ──
      if (action === 'updateForward') {
        const { emailId, forwardTo } = body;
        if (!emailId) return res.status(400).json({ error: 'emailId required' });
        if (!forwardTo || !forwardTo.includes('@')) return res.status(400).json({ error: 'Valid forwardTo email required' });

        const { error } = await admin
          .from('custom_emails')
          .update({ forward_to_email: forwardTo.trim(), updated_at: new Date().toISOString() })
          .eq('id', emailId)
          .eq('user_id', userId);

        if (error) return res.status(500).json({ error: error.message });
        return res.status(200).json({ success: true, message: 'Forwarding address updated' });
      }

      // ── Deactivate ──
      if (action === 'deactivate') {
        const { emailId } = body;
        if (!emailId) return res.status(400).json({ error: 'emailId required' });

        const { error } = await admin
          .from('custom_emails')
          .update({ is_active: false, updated_at: new Date().toISOString() })
          .eq('id', emailId)
          .eq('user_id', userId);

        if (error) return res.status(500).json({ error: error.message });

        // Deactivate aliases too
        await admin
          .from('email_aliases')
          .update({ is_active: false })
          .eq('custom_email_id', emailId);

        return res.status(200).json({ success: true, message: 'Email deactivated' });
      }

      // ── Add alias (Pro/Premium only) ──
      if (action === 'addAlias') {
        const { emailId, aliasPrefix, forwardTo } = body;
        if (!emailId) return res.status(400).json({ error: 'emailId required' });
        if (!aliasPrefix) return res.status(400).json({ error: 'aliasPrefix required' });
        if (!forwardTo || !forwardTo.includes('@')) return res.status(400).json({ error: 'Valid forwardTo email required' });

        // Validate alias prefix
        const aPrefix = String(aliasPrefix).toLowerCase().trim();
        const aValidation = validatePrefix(aPrefix);
        if (!aValidation.valid) return res.status(400).json({ error: aValidation.error });

        // Get the custom email and check subscription tier
        const { data: customEmail } = await admin
          .from('custom_emails')
          .select('id, subscription_tier, is_active')
          .eq('id', emailId)
          .eq('user_id', userId)
          .single();

        if (!customEmail || !customEmail.is_active) {
          return res.status(404).json({ error: 'Custom email not found or inactive' });
        }

        // Check tier limits
        const tierLimits: Record<string, number> = { basic: 1, pro: 3, premium: 10 };
        const maxAliases = tierLimits[customEmail.subscription_tier] || 1;

        const { count: currentAliases } = await admin
          .from('email_aliases')
          .select('id', { count: 'exact', head: true })
          .eq('custom_email_id', emailId)
          .eq('is_active', true);

        if ((currentAliases || 0) >= maxAliases) {
          return res.status(400).json({
            error: `Maximum ${maxAliases} aliases for ${customEmail.subscription_tier} tier. Upgrade to add more.`,
          });
        }

        const aliasAddress = `${aPrefix}@${DOMAIN}`;

        // Check uniqueness
        const { data: aliasExists } = await admin
          .from('email_aliases')
          .select('id')
          .eq('alias_address', aliasAddress)
          .maybeSingle();

        if (aliasExists) {
          return res.status(409).json({ error: 'This alias is already taken' });
        }

        // Also check against custom_emails
        const { data: emailExists } = await admin
          .from('custom_emails')
          .select('id')
          .eq('email_address', aliasAddress)
          .maybeSingle();

        if (emailExists) {
          return res.status(409).json({ error: 'This address is already in use as a custom email' });
        }

        const { data: alias, error: aliasError } = await admin
          .from('email_aliases')
          .insert({
            custom_email_id: emailId,
            user_id: userId,
            alias_address: aliasAddress,
            forward_to: forwardTo.trim(),
          })
          .select()
          .single();

        if (aliasError) return res.status(500).json({ error: aliasError.message });

        return res.status(201).json({
          success: true,
          alias,
          message: `Alias ${aliasAddress} created and forwarding to ${forwardTo}`,
        });
      }

      return res.status(400).json({ error: 'Invalid action. Use: purchase, updateForward, deactivate, addAlias' });
    } catch (e: any) {
      console.error('[Custom Email] Error:', e);
      return res.status(500).json({ error: e.message || 'Internal server error' });
    }
  }

  res.setHeader('Allow', ['GET', 'POST']);
  return res.status(405).json({ error: 'Method not allowed' });
}
