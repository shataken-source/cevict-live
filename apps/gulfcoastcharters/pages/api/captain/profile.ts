/**
 * Captain Profile API
 * GET /api/captain/profile - Get captain profile
 * PUT /api/captain/profile - Update captain profile
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { getAuthedUser, getSupabaseAdmin } from '../_lib/supabase';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { user, error: authError } = await getAuthedUser(req, res);
  
  if (authError || !user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const admin = getSupabaseAdmin();

  // Verify user is a captain
  const { data: captainProfile } = await admin
    .from('captain_profiles')
    .select('*')
    .eq('user_id', user.id)
    .single();

  if (!captainProfile) {
    return res.status(403).json({ error: 'User is not a captain' });
  }

  if (req.method === 'GET') {
    try {
      // Get additional info from profiles table if available
      const { data: profile } = await admin
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      return res.status(200).json({
        success: true,
        profile: {
          ...captainProfile,
          email: user.email,
          full_name: profile?.full_name || user.user_metadata?.full_name,
          phone: profile?.phone,
        },
      });
    } catch (error: any) {
      console.error('Error in GET /api/captain/profile:', error);
      return res.status(500).json({ error: error.message });
    }
  }

  if (req.method === 'PUT') {
    try {
      const { 
        specialties,
        half_day_rate,
        full_day_rate,
        bio,
        location,
        years_experience,
      } = req.body;

      const updates: any = {
        updated_at: new Date().toISOString(),
      };

      if (specialties !== undefined) updates.specialties = specialties;
      if (half_day_rate !== undefined) updates.half_day_rate = half_day_rate;
      if (full_day_rate !== undefined) updates.full_day_rate = full_day_rate;
      if (bio !== undefined) updates.bio = bio;
      if (location !== undefined) updates.location = location;
      if (years_experience !== undefined) updates.years_experience = years_experience;

      const { error: updateError } = await admin
        .from('captain_profiles')
        .update(updates)
        .eq('user_id', user.id);

      if (updateError) {
        return res.status(500).json({ error: updateError.message });
      }

      return res.status(200).json({ success: true });
    } catch (error: any) {
      console.error('Error in PUT /api/captain/profile:', error);
      return res.status(500).json({ error: error.message });
    }
  }

  res.setHeader('Allow', ['GET', 'PUT']);
  return res.status(405).json({ error: 'Method not allowed' });
}
