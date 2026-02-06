/**
 * Points Redemption API
 * Allow users to redeem points for discounts
 * POST /api/points/redeem
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get current user
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return res.status(401).json({ error: 'Invalid session' });
    }

    const { points, description, metadata } = req.body;

    if (!points || points <= 0) {
      return res.status(400).json({ error: 'Points amount required and must be positive' });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!supabaseUrl || !supabaseServiceKey) {
      return res.status(500).json({ error: 'Database not configured' });
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Check user's current balance
    const { data: sharedUser } = await supabaseAdmin
      .from('shared_users')
      .select('total_points')
      .eq('id', user.id)
      .single();

    if (!sharedUser || (sharedUser.total_points || 0) < points) {
      return res.status(400).json({ 
        error: 'Insufficient points',
        current_balance: sharedUser?.total_points || 0,
        requested: points,
      });
    }

    // Create redemption transaction (negative points)
    const { error: txError } = await supabaseAdmin
      .from('loyalty_transactions')
      .insert({
        user_id: user.id,
        transaction_type: 'redeemed',
        points: -points, // Negative for redemption
        platform: metadata?.platform || 'gcc',
        source_type: 'manual', // Use 'manual' since redemption is a user action
        source_id: metadata?.source_id || null,
        description: description || `Redeemed ${points} points`,
        metadata: { ...metadata, redemption: true },
      });

    if (txError) {
      console.error('Error creating redemption transaction:', txError);
      return res.status(500).json({ 
        error: 'Failed to process redemption',
        details: txError.message,
        code: txError.code,
      });
    }

    // Calculate new balance
    const newBalance = (sharedUser.total_points || 0) - points;

    // Update loyalty tier (which also updates total_points)
    // This function recalculates total_points from transactions and updates tier
    try {
      const { error: tierError, data: tierResult } = await supabaseAdmin.rpc('update_loyalty_tier', {
        p_user_id: user.id,
      });

      if (tierError) {
        console.error('Error updating loyalty tier:', tierError);
        // Fallback: manually update total_points and tier
        let newTier = 'bronze';
        if (newBalance >= 10000) newTier = 'platinum';
        else if (newBalance >= 5000) newTier = 'gold';
        else if (newBalance >= 2500) newTier = 'silver';

        await supabaseAdmin
          .from('shared_users')
          .update({ 
            total_points: newBalance,
            loyalty_tier: newTier,
          })
          .eq('id', user.id);
      }
    } catch (tierErr: any) {
      console.error('Error in tier update:', tierErr);
      // Fallback: manually update total_points and tier
      let newTier = 'bronze';
      if (newBalance >= 10000) newTier = 'platinum';
      else if (newBalance >= 5000) newTier = 'gold';
      else if (newBalance >= 2500) newTier = 'silver';

      await supabaseAdmin
        .from('shared_users')
        .update({ 
          total_points: newBalance,
          loyalty_tier: newTier,
        })
        .eq('id', user.id);
    }

    // Get updated balance to confirm
    const { data: updatedUser } = await supabaseAdmin
      .from('shared_users')
      .select('total_points, loyalty_tier')
      .eq('id', user.id)
      .single();

    return res.status(200).json({
      success: true,
      points_redeemed: points,
      new_balance: updatedUser?.total_points || newBalance,
      loyalty_tier: updatedUser?.loyalty_tier || 'bronze',
      message: `Successfully redeemed ${points} points`,
    });
  } catch (error: any) {
    console.error('Error processing points redemption:', error);
    return res.status(500).json({
      error: 'Failed to process redemption',
      details: error.message,
    });
  }
}
