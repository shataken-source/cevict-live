/**
 * Local Activities API endpoint
 * Returns local activities for Gulf Coast area
 * Used by Finn concierge
 */

import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // In production, this would fetch from database
    // For now, return mock data
    const activities = [
      {
        name: 'Gulf Coast Exploreum',
        description: 'Interactive science museum with hands-on exhibits',
        price: 15,
        duration: '2-3 hours',
        type: 'indoor',
      },
      {
        name: 'USS Alabama Battleship',
        description: 'Historic battleship museum and park',
        price: 18,
        duration: '2-3 hours',
        type: 'outdoor',
      },
      {
        name: 'Gulf State Park',
        description: 'Beach activities, hiking trails, and nature center',
        price: 5,
        duration: 'Full day',
        type: 'outdoor',
      },
    ];

    return res.status(200).json(activities);
  } catch (error: any) {
    console.error('Error fetching activities:', error);
    return res.status(500).json({ error: 'Failed to fetch activities' });
  }
}
