/**
 * Finn concierge profile (shared GCC + WTV, same Supabase)
 * GET: load profile for current user
 * POST: upsert profile (sync from client)
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { getSupabaseServer, getAuthedUser } from '../_lib/supabase';

function rowToProfile(row: any) {
  if (!row) return null;
  return {
    userId: row.user_id,
    traditions: row.traditions || [],
    preferredLocations: row.preferred_locations || [],
    avoidedIssues: row.avoided_issues || [],
    speciesPreferences: row.species_preferences || [],
    boatTypePreferences: row.boat_type_preferences || [],
    captainPreferences: row.captain_preferences || [],
    weatherTolerance: row.weather_tolerance || 'moderate',
    budgetRange: { min: Number(row.budget_min) ?? 200, max: Number(row.budget_max) ?? 1000 },
    recentBookings: row.recent_bookings || [],
    gearPurchaseHistory: row.gear_purchase_history || [],
    familyMembers: row.family_members || [],
    lastUpdated: row.last_updated,
    conversationHistory: row.conversation_history || [],
    learnedPreferences: row.learned_preferences || [],
    questionPatterns: row.question_patterns || [],
    interactionCount: row.interaction_count ?? 0,
  };
}

function profileToRow(profile: any) {
  return {
    user_id: profile.userId,
    platform: profile.platform ?? 'both',
    preferred_locations: profile.preferredLocations ?? [],
    avoided_issues: profile.avoidedIssues ?? [],
    species_preferences: profile.speciesPreferences ?? [],
    boat_type_preferences: profile.boatTypePreferences ?? [],
    captain_preferences: profile.captainPreferences ?? [],
    weather_tolerance: profile.weatherTolerance ?? 'moderate',
    budget_min: profile.budgetRange?.min ?? 200,
    budget_max: profile.budgetRange?.max ?? 1000,
    traditions: profile.traditions ?? [],
    family_members: profile.familyMembers ?? [],
    learned_preferences: profile.learnedPreferences ?? [],
    question_patterns: profile.questionPatterns ?? [],
    conversation_history: profile.conversationHistory ?? [],
    recent_bookings: profile.recentBookings ?? [],
    gear_purchase_history: profile.gearPurchaseHistory ?? [],
    interaction_count: profile.interactionCount ?? 0,
    last_updated: new Date().toISOString(),
  };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { user, error: authError } = await getAuthedUser(req, res);
  if (authError || !user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  const userId = user.id;

  if (req.method === 'GET') {
    const supabase = getSupabaseServer(req, res);
    const { data, error } = await supabase
      .from('finn_profiles')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json(rowToProfile(data));
  }

  if (req.method === 'POST') {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {};
    const profile = { ...body, userId };
    const row = profileToRow(profile);
    const supabase = getSupabaseServer(req, res);
    const { data, error } = await supabase
      .from('finn_profiles')
      .upsert(row, { onConflict: 'user_id' })
      .select()
      .single();
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json(rowToProfile(data));
  }

  return res.setHeader('Allow', 'GET, POST').status(405).end();
}
