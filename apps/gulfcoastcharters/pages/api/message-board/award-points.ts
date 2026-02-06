/**
 * API Route: Award Message Board Points
 * Server-side endpoint for awarding points for message board activity
 */

import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import { getOrCreateSharedUser } from '@/lib/shared-users';
import { checkAndAwardBadges } from '@/lib/badges';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabaseAdmin = supabaseUrl && supabaseServiceKey
  ? createClient(supabaseUrl, supabaseServiceKey)
  : null;

// Point values for message board actions
const MESSAGE_BOARD_POINTS = {
  CREATE_POST: 25,      // Creating a new thread
  REPLY_TO_POST: 5,     // Replying to a thread
  HELPFUL_REPLY: 10,    // Reply marked as helpful (bonus)
  FIRST_POST: 50,       // First post bonus
  SHARE_POST: 8,        // Sharing a post
};

function getDescriptionForAction(action: string): string {
  switch (action) {
    case 'create_post':
      return 'Posted to message board';
    case 'reply_to_post':
      return 'Replied to message board post';
    case 'helpful_reply':
      return 'Reply marked as helpful';
    case 'first_post':
      return 'First post bonus!';
    case 'share_post':
      return 'Shared message board post';
    default:
      return 'Message board activity';
  }
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!supabaseAdmin) {
    return res.status(500).json({ 
      success: false, 
      error: 'Database not configured',
      points: 0,
      totalPoints: 0
    });
  }

  try {
    const { userId, action, metadata } = req.body;

    if (!userId || !action) {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing userId or action',
        points: 0,
        totalPoints: 0
      });
    }

    // Verify user is authenticated (get user from auth token)
    const authHeader = req.headers.authorization;
    let verifiedUser = null;
    
    if (authHeader) {
      // Try to verify token
      const token = authHeader.replace('Bearer ', '');
      const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
      if (!authError && user && user.id === userId) {
        verifiedUser = user;
      }
    }
    
    // If token verification failed, verify userId exists in auth.users using admin API
    if (!verifiedUser && userId) {
      try {
        const { data: { user }, error } = await supabaseAdmin.auth.admin.getUserById(userId);
        if (!error && user && user.id === userId) {
          verifiedUser = user;
        }
      } catch (err) {
        console.error('Error verifying user:', err);
      }
    }
    
    if (!verifiedUser || verifiedUser.id !== userId) {
      return res.status(403).json({ 
        success: false, 
        error: 'Unauthorized - user verification failed',
        points: 0,
        totalPoints: 0
      });
    }

    // Ensure shared user exists
    await getOrCreateSharedUser(userId, verifiedUser.email || '');

    // Get point value
    let points = 0;
    switch (action) {
      case 'create_post':
        points = MESSAGE_BOARD_POINTS.CREATE_POST;
        break;
      case 'reply_to_post':
        points = MESSAGE_BOARD_POINTS.REPLY_TO_POST;
        break;
      case 'helpful_reply':
        points = MESSAGE_BOARD_POINTS.HELPFUL_REPLY;
        break;
      case 'first_post':
        points = MESSAGE_BOARD_POINTS.FIRST_POST;
        break;
      case 'share_post':
        points = MESSAGE_BOARD_POINTS.SHARE_POST;
        break;
      default:
        return res.status(400).json({ 
          success: false, 
          error: 'Invalid action',
          points: 0,
          totalPoints: 0
        });
    }

    // Check if this is first post
    if (action === 'create_post') {
      const { count } = await supabaseAdmin
        .from('loyalty_transactions')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('source_type', 'message_post');

      if (count === 0) {
        // First post - award bonus
        await supabaseAdmin
          .from('loyalty_transactions')
          .insert({
            user_id: userId,
            transaction_type: 'earned',
            points: MESSAGE_BOARD_POINTS.FIRST_POST,
            platform: 'gcc',
            source_type: 'message_post',
            source_id: null, // Store post_id in metadata instead
            description: 'First post bonus!',
            metadata: { 
              ...metadata, 
              is_first_post: true,
              post_id: metadata?.post_id || null,
            },
          });
      }
    }

    // Create transaction
    // Note: source_id expects UUID, but we're using timestamp strings for post/reply IDs
    // So we'll store the ID in metadata instead and leave source_id as null
    const { error: txError } = await supabaseAdmin
      .from('loyalty_transactions')
      .insert({
        user_id: userId,
        transaction_type: 'earned',
        points,
        platform: 'gcc',
        source_type: action === 'create_post' ? 'message_post' : 'message_reply',
        source_id: null, // Store post/reply ID in metadata instead since it's not a UUID
        description: getDescriptionForAction(action),
        metadata: {
          ...metadata,
          post_id: metadata?.post_id || null,
          reply_id: metadata?.reply_id || null,
        },
      });

    if (txError) {
      console.error('Error creating loyalty transaction:', txError);
      return res.status(500).json({ 
        success: false, 
        error: txError.message,
        points: 0,
        totalPoints: 0
      });
    }

    // Update user stats
    await supabaseAdmin.rpc('increment_user_post_count', {
      p_user_id: userId,
      p_is_reply: action === 'reply_to_post',
    });

    // Update loyalty tier (which also updates total_points)
    const { error: tierError } = await supabaseAdmin.rpc('update_loyalty_tier', {
      p_user_id: userId,
    });

    if (tierError) {
      console.warn('Could not update loyalty tier:', tierError);
    }

    // Check and award badges
    const newBadges = await checkAndAwardBadges(userId);
    if (newBadges.length > 0) {
      console.log('New badges earned:', newBadges);
    }

    // Wait a moment for the tier update to complete
    await new Promise(resolve => setTimeout(resolve, 500));

    // Get updated total points - calculate from transactions for accuracy
    const { data: transactions } = await supabaseAdmin
      .from('loyalty_transactions')
      .select('points, is_reversed, expires_at')
      .eq('user_id', userId);

    let calculatedTotal = 0;
    if (transactions) {
      calculatedTotal = transactions
        .filter(tx => {
          const notReversed = !tx.is_reversed || tx.is_reversed === false;
          const notExpired = !tx.expires_at || new Date(tx.expires_at) > new Date();
          return notReversed && notExpired;
        })
        .reduce((sum, tx) => sum + (tx.points || 0), 0);
    }

    // Also get from shared_users
    const { data: sharedUser } = await supabaseAdmin
      .from('shared_users')
      .select('total_points')
      .eq('id', userId)
      .single();

    // Use calculated total (most accurate)
    const totalPoints = calculatedTotal || (sharedUser?.total_points || 0);
    
    console.log('[API] Calculated total:', calculatedTotal, 'Shared users total:', sharedUser?.total_points, 'Returning:', totalPoints);

    return res.status(200).json({
      success: true,
      points,
      totalPoints,
    });
  } catch (error: any) {
    console.error('Error awarding message board points:', error);
    return res.status(500).json({ 
      success: false, 
      error: error.message,
      points: 0,
      totalPoints: 0
    });
  }
}
