/**
 * Create Unified Review API
 * Simple endpoint to create cross-platform reviews
 * POST /api/unified-reviews/create
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { createUnifiedReview } from '@/lib/unified-reviews';
import { createClient } from '@supabase/supabase-js';
import { getAuthedUser } from '../_lib/supabase';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { user, error: authError } = await getAuthedUser(req, res);
    if (authError || !user) {
      return res.status(401).json({ error: 'Unauthorized', details: authError?.message || 'Sign in required' });
    }
    const userId = user.id;

    const { reviewData } = req.body;

    if (!reviewData || !reviewData.review_type || !reviewData.rating) {
      return res.status(400).json({ error: 'reviewData with review_type and rating required' });
    }

    // Verify user exists in shared_users (using admin client)
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      return res.status(500).json({ error: 'Database not configured' });
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    const { data: sharedUser } = await supabaseAdmin
      .from('shared_users')
      .select('id')
      .eq('id', userId)
      .single();

    if (!sharedUser) {
      // Auto-create shared user if doesn't exist
      const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(userId);
      if (authUser?.user?.email) {
        await supabaseAdmin
          .from('shared_users')
          .insert({
            id: userId,
            email: authUser.user.email,
            gcc_active: true,
            last_gcc_activity: new Date().toISOString(),
          });
      } else {
        return res.status(404).json({ error: 'User not found' });
      }
    }

    // Create unified review
    const review = await createUnifiedReview(userId, {
      ...reviewData,
      platform: reviewData.platform || 'gcc', // Default to GCC if not specified
    });

    if (!review) {
      return res.status(500).json({ error: 'Failed to create unified review' });
    }

    return res.status(200).json({
      success: true,
      review,
      message: 'Unified review created successfully',
    });
  } catch (error: any) {
    console.error('Error creating unified review:', error);
    return res.status(500).json({
      error: 'Failed to create unified review',
      details: error.message,
    });
  }
}
