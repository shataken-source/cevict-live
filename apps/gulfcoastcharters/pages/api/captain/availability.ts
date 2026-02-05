/**
 * Captain Availability API
 * GET /api/captain/availability - Get availability for authenticated captain
 * POST /api/captain/availability - Create/update availability
 * DELETE /api/captain/availability/:id - Delete availability
 * 
 * Replaces: supabase.functions.invoke('availability-manager')
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

  // Verify user is a captain and get captain_id
  // Note: calendar_availability.captain_id might reference captains.id OR captain_profiles.id
  const { data: captainProfile } = await admin
    .from('captain_profiles')
    .select('id, user_id')
    .eq('user_id', user.id)
    .single();

  if (!captainProfile) {
    return res.status(403).json({ error: 'User is not a captain' });
  }

  // Try to find which captain_id is used in calendar_availability
  let captainId: string | null = captainProfile.id;

  // Check if there's a captains table
  try {
    const { data: captainRecord } = await admin
      .from('captains')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle();
    
    if (captainRecord) {
      // Check which one is actually used in calendar_availability
      const { data: availTest } = await admin
        .from('calendar_availability')
        .select('captain_id')
        .eq('captain_id', captainRecord.id)
        .limit(1)
        .maybeSingle();
      
      if (availTest) {
        captainId = captainRecord.id;
      }
    }
  } catch (err) {
    // captains table might not exist, use captain_profiles.id
    console.log('Using captain_profiles.id for calendar_availability');
  }
  
  // If calendar_availability doesn't have any records, we'll use captain_profiles.id
  // and let the insert create the relationship

  if (req.method === 'GET') {
    try {
      const { startDate, endDate, date, status } = req.query;

      let query = admin
        .from('calendar_availability')
        .select('*')
        .eq('captain_id', captainId)
        .order('date', { ascending: true });

      if (startDate) {
        query = query.gte('date', startDate);
      }

      if (endDate) {
        query = query.lte('date', endDate);
      }

      if (date) {
        query = query.eq('date', date);
      }

      if (status) {
        query = query.eq('status', status);
      }

      const { data: availability, error } = await query;

      if (error) {
        console.error('Error fetching availability:', error);
        return res.status(500).json({ error: error.message });
      }

      return res.status(200).json({
        success: true,
        availability: availability || [],
        slots: availability || [], // For backward compatibility
      });
    } catch (error: any) {
      console.error('Error in GET /api/captain/availability:', error);
      return res.status(500).json({ error: error.message });
    }
  }

  if (req.method === 'POST') {
    try {
      const { action, availabilityId, data: availabilityData } = req.body;

      if (action === 'create' || action === 'update') {
        const { date, time_slot, start_time, end_time, status, max_passengers, price, notes } = availabilityData || {};

        if (!date || !time_slot) {
          return res.status(400).json({ error: 'Missing required fields: date, time_slot' });
        }

        const payload: any = {
          captain_id: captainId,
          date,
          time_slot,
          status: status || 'available',
          updated_at: new Date().toISOString(),
        };

        if (start_time) payload.start_time = start_time;
        if (end_time) payload.end_time = end_time;
        if (max_passengers) payload.max_passengers = max_passengers;
        if (price) payload.price = price;
        if (notes) payload.notes = notes;

        if (action === 'update' && availabilityId) {
          const { error: updateError } = await admin
            .from('calendar_availability')
            .update(payload)
            .eq('availability_id', availabilityId)
            .eq('captain_id', captainId); // Ensure captain owns this

          if (updateError) {
            return res.status(500).json({ error: updateError.message });
          }

          return res.status(200).json({ success: true });
        } else {
          // Create new
          const { data, error: insertError } = await admin
            .from('calendar_availability')
            .insert(payload)
            .select()
            .single();

          if (insertError) {
            return res.status(500).json({ error: insertError.message });
          }

          return res.status(201).json({ success: true, availability: data });
        }
      }

      if (action === 'blockDate') {
        const { date, reason } = availabilityData || {};
        if (!date) {
          return res.status(400).json({ error: 'Missing date' });
        }

        // Block all time slots for this date
        const timeSlots = ['morning', 'afternoon', 'full_day'];
        const blocks = timeSlots.map(slot => ({
          captain_id: captainId,
          date,
          time_slot: slot,
          status: 'blocked',
          notes: reason || 'Blocked by captain',
        }));

        const { error: insertError } = await admin
          .from('calendar_availability')
          .upsert(blocks, { onConflict: 'captain_id,date,time_slot,start_time,end_time' });

        if (insertError) {
          return res.status(500).json({ error: insertError.message });
        }

        return res.status(200).json({ success: true });
      }

      return res.status(400).json({ error: 'Invalid action' });
    } catch (error: any) {
      console.error('Error in POST /api/captain/availability:', error);
      return res.status(500).json({ error: error.message });
    }
  }

  if (req.method === 'DELETE') {
    try {
      const { id } = req.query;

      if (!id || typeof id !== 'string') {
        return res.status(400).json({ error: 'Missing availability id' });
      }

      const { error: deleteError } = await admin
        .from('calendar_availability')
        .delete()
        .eq('availability_id', id)
        .eq('captain_id', captainId); // Ensure captain owns this

      if (deleteError) {
        return res.status(500).json({ error: deleteError.message });
      }

      return res.status(200).json({ success: true });
    } catch (error: any) {
      console.error('Error in DELETE /api/captain/availability:', error);
      return res.status(500).json({ error: error.message });
    }
  }

  res.setHeader('Allow', ['GET', 'POST', 'DELETE']);
  return res.status(405).json({ error: 'Method not allowed' });
}
