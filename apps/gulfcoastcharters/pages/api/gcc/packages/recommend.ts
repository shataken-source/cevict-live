/**
 * Finn AI Package Recommendation API (Pages Router style)
 * POST /api/gcc/packages/recommend
 * Returns Finn's AI-powered package recommendation
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { generatePackageRecommendation } from '@/lib/smart-vacation-packages';
import { getAuthedUser } from '../../_lib/supabase';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ success: false, error: 'Method Not Allowed' });
  }

  try {
    const { user, error: authError } = await getAuthedUser(req, res);
    if (authError || !user) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const {
      customerId,
      charterId,
      rentalId,
      startDate,
      endDate,
      location,
    } = req.body || {};

    if (!customerId || !startDate || !endDate || !location) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: customerId, startDate, endDate, location',
      });
    }

    const recommendation = await generatePackageRecommendation({
      customerId,
      packageName: 'Recommended Package',
      charterId,
      rentalId,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      location,
    });

    if (!recommendation) {
      return res.status(500).json({
        success: false,
        error: 'Failed to generate recommendation',
      });
    }

    return res.status(200).json({
      success: true,
      data: recommendation,
      finn_message: `I've found the perfect vacation package for you! ${recommendation.finn_reasoning.join(' ')}`,
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: error.message || 'Internal server error',
    });
  }
}
