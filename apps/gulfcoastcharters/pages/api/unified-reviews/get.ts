/**
 * Get Unified Reviews API
 * Simple endpoint to fetch reviews for a property/vessel/captain
 * GET /api/unified-reviews/get?review_type=...&wtv_property_id=...
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { getReviewsForEntity, getAverageRating, getReviewCount } from '@/lib/unified-reviews';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { review_type, wtv_property_id, gcc_vessel_id, gcc_captain_id, status } = req.query;

    if (!review_type) {
      return res.status(400).json({ error: 'review_type query parameter required' });
    }

    // Get reviews
    const reviews = await getReviewsForEntity(review_type as any, {
      wtv_property_id: wtv_property_id as string | undefined,
      gcc_vessel_id: gcc_vessel_id as string | undefined,
      gcc_captain_id: gcc_captain_id as string | undefined,
      status: (status as 'approved' | 'pending' | 'all') || 'approved',
    });

    // Get average rating and count
    const avgRating = await getAverageRating(review_type as any, {
      wtv_property_id: wtv_property_id as string | undefined,
      gcc_vessel_id: gcc_vessel_id as string | undefined,
      gcc_captain_id: gcc_captain_id as string | undefined,
    });

    const count = await getReviewCount(review_type as any, {
      wtv_property_id: wtv_property_id as string | undefined,
      gcc_vessel_id: gcc_vessel_id as string | undefined,
      gcc_captain_id: gcc_captain_id as string | undefined,
    });

    return res.status(200).json({
      success: true,
      reviews,
      average_rating: avgRating,
      review_count: count,
    });
  } catch (error: any) {
    console.error('Error fetching unified reviews:', error);
    return res.status(500).json({
      error: 'Failed to fetch unified reviews',
      details: error.message,
    });
  }
}
