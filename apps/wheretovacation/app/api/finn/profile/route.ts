/**
 * Finn concierge profile (shared GCC + WTV, same Supabase)
 * GET: load profile for current user
 * POST: upsert profile (sync from client)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerUser, getSupabaseAdminClient } from '@/lib/supabase';

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

export async function GET() {
  const user = await getServerUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const supabase = getSupabaseAdminClient();
  if (!supabase) return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
  const { data, error } = await supabase
    .from('finn_profiles')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(rowToProfile(data));
}

export async function POST(request: NextRequest) {
  const user = await getServerUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const body = await request.json().catch(() => ({}));
  const profile = { ...body, userId: user.id };
  const row = profileToRow(profile);
  const supabase = getSupabaseAdminClient();
  if (!supabase) return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
  const { data, error } = await supabase
    .from('finn_profiles')
    .upsert(row, { onConflict: 'user_id' })
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(rowToProfile(data));
}
