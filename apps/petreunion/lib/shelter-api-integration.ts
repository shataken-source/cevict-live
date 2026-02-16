/**
 * Shelter API Integration Service
 * Connects to Petfinder, RescueGroups, etc. for auto-populating found pets
 * Uses CLIP embeddings for visual matching
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Resend } from 'resend';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env.local') });

let supabase: SupabaseClient | null = null;

function getClient(): SupabaseClient {
  if (!supabase) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) {
      throw new Error('Supabase credentials missing for Shelter API Integration');
    }
    supabase = createClient(url, key);
  }
  return supabase;
}

// ============================================================================
// TYPES
// ============================================================================

export interface ShelterIntegration {
  id: string;
  shelter_name: string;
  api_type: 'petfinder' | 'rescuegroups' | 'custom';
  api_key: string;
  api_url: string;
  location: string;
  is_active: boolean;
  last_synced_at?: Date;
  pets_synced: number;
}

export interface ShelterPet {
  id: string;
  shelter_integration_id: string;
  shelter_pet_id: string;
  pet_type: 'dog' | 'cat' | 'other';
  breed?: string;
  color?: string;
  age?: string;
  sex?: string;
  description?: string;
  photo_urls: string[];
  image_embedding?: number[]; // CLIP 512-dim vector
  found_location?: string;
  found_date?: Date;
  matched_lost_pet_ids: number[];
  created_at: Date;
}

// ============================================================================
// PETFINDER API CLIENT
// ============================================================================

class PetfinderClient {
  private apiKey: string;
  private apiSecret: string;
  private accessToken: string | null = null;
  private tokenExpiry: number = 0;

  constructor(apiKey: string, apiSecret: string) {
    this.apiKey = apiKey;
    this.apiSecret = apiSecret;
  }

  private async getAccessToken(): Promise<string> {
    const now = Date.now();
    if (this.accessToken && now < this.tokenExpiry) {
      return this.accessToken;
    }

    const response = await fetch('https://api.petfinder.com/v2/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `grant_type=client_credentials&client_id=${this.apiKey}&client_secret=${this.apiSecret}`,
    });

    if (!response.ok) {
      throw new Error(`Petfinder auth failed: ${response.status}`);
    }

    const data = await response.json();
    this.accessToken = data.access_token;
    this.tokenExpiry = now + data.expires_in * 1000;

    return this.accessToken;
  }

  async searchAnimals(location: string, type: 'dog' | 'cat' | 'other', limit = 100): Promise<any[]> {
    const token = await this.getAccessToken();
    const response = await fetch(
      `https://api.petfinder.com/v2/animals?type=${type}&location=${location}&limit=${limit}`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    if (!response.ok) {
      throw new Error(`Petfinder API error: ${response.status}`);
    }

    const data = await response.json();
    return data.animals || [];
  }
}

// ============================================================================
// SYNC SHELTER PETS
// ============================================================================

export async function syncShelterPets(integrationId: string): Promise<number> {
  try {
    const client = getClient();

    // Get integration details
    const { data: integration, error: intError } = await client
      .from('shelter_integrations')
      .select('*')
      .eq('id', integrationId)
      .single();

    if (intError || !integration) {
      console.error('❌ Integration not found:', integrationId);
      return 0;
    }

    let syncedCount = 0;

    if (integration.api_type === 'petfinder') {
      // Sync from Petfinder
      const petfinderClient = new PetfinderClient(integration.api_key, integration.api_secret);

      const animals = await petfinderClient.searchAnimals(integration.location, 'dog', 100);

      for (const animal of animals) {
        const photoUrls = animal.photos?.map((p: any) => p.large || p.medium || p.small) || [];

        const { error: insertError } = await client.from('shelter_pets').upsert({
          shelter_integration_id: integrationId,
          shelter_pet_id: animal.id.toString(),
          pet_type: animal.type.toLowerCase(),
          breed: animal.breeds?.primary,
          color: animal.colors?.primary,
          age: animal.age,
          sex: animal.gender,
          description: animal.description,
          photo_urls: photoUrls,
          found_location: animal.contact?.address?.city,
          found_date: animal.published_at ? new Date(animal.published_at) : null,
        }, {
          onConflict: 'shelter_integration_id,shelter_pet_id',
        });

        if (!insertError) {
          syncedCount++;
        }
      }
    }

    // Update last_synced_at
    await client
      .from('shelter_integrations')
      .update({
        last_synced_at: new Date().toISOString(),
        pets_synced: syncedCount,
      })
      .eq('id', integrationId);

    console.log(`✅ Synced ${syncedCount} pets from shelter integration ${integrationId}`);
    return syncedCount;
  } catch (e: any) {
    console.error('❌ Exception syncing shelter pets:', e.message);
    return 0;
  }
}

// ============================================================================
// GENERATE CLIP EMBEDDINGS (Placeholder - requires @xenova/transformers)
// ============================================================================

export async function generateImageEmbedding(imageUrl: string): Promise<number[] | null> {
  // CLIP embedding generation requires @xenova/transformers
  // Returns null until implemented - visual matching will use database embeddings only
  return null;
}

// ============================================================================
// VISUAL MATCHING (Find similar lost pets)
// ============================================================================

export async function findVisualMatches(shelterPetId: string, threshold = 0.85): Promise<Array<{
  lost_pet_id: number;
  similarity_score: number;
}>> {
  try {
    const client = getClient();

    // Get shelter pet embedding
    const { data: shelterPet, error: petError } = await client
      .from('shelter_pets')
      .select('image_embedding')
      .eq('id', shelterPetId)
      .single();

    if (petError || !shelterPet || !shelterPet.image_embedding) {
      return [];
    }

    // Find similar lost pets using pgvector cosine similarity
    const { data, error } = await client.rpc('find_similar_lost_pets', {
      p_embedding: shelterPet.image_embedding,
      p_threshold: threshold,
      p_limit: 10,
    });

    if (error) {
      console.error('❌ Error finding matches:', error);
      return [];
    }

    return (data || []).map((m: any) => ({
      lost_pet_id: m.lost_pet_id,
      similarity_score: Number(m.similarity_score || 0),
    }));
  } catch (e: any) {
    console.error('❌ Exception finding matches:', e.message);
    return [];
  }
}

// ============================================================================
// EMAIL NOTIFICATION FOR HIGH-CONFIDENCE MATCHES
// ============================================================================

export async function notifyOwnerOfMatch(lostPetId: number, shelterPetId: string, similarityScore: number): Promise<boolean> {
  try {
    const client = getClient();

    // Get lost pet owner email
    const { data: lostPet } = await client
      .from('lost_pets')
      .select('owner_email, pet_name')
      .eq('id', lostPetId)
      .single();

    if (!lostPet || !lostPet.owner_email) {
      return false;
    }

    // Get shelter pet details
    const { data: shelterPet } = await client
      .from('shelter_pets')
      .select('*')
      .eq('id', shelterPetId)
      .single();

    if (!shelterPet) {
      return false;
    }

    // Log notification
    await client.from('match_notification_log').insert({
      lost_pet_id: lostPetId,
      shelter_pet_id: shelterPetId,
      similarity_score: similarityScore,
      owner_email: lostPet.owner_email,
      sent_at: new Date().toISOString(),
    });

    const resendKey = process.env.RESEND_API_KEY?.trim();
    if (resendKey) {
      const resend = new Resend(resendKey);
      const from = process.env.RESEND_FROM_EMAIL || 'PetReunion <onboarding@resend.dev>';
      const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://petreunion.vercel.app';
      const searchUrl = `${baseUrl}/search`;
      const pct = (similarityScore * 100).toFixed(1);
      const subject = `PetReunion: Possible match for ${lostPet.pet_name}`;
      const html = `
        <p>We may have found a possible match for <strong>${lostPet.pet_name}</strong>.</p>
        <p>Similarity score: <strong>${pct}%</strong>. A shelter or rescue listing matches the details and photo you reported.</p>
        <p><a href="${searchUrl}" style="background:#0d9488;color:#fff;padding:10px 20px;text-decoration:none;border-radius:6px;">View search &amp; matches</a></p>
        <p>Log in to your PetReunion account to see the full listing and next steps.</p>
        <p>— PetReunion</p>
      `;
      const { error } = await resend.emails.send({ from, to: lostPet.owner_email, subject, html });
      if (error) {
        console.error('❌ Resend error notifying owner:', error);
        return false;
      }
      console.log(`📧 Emailed ${lostPet.owner_email}: Possible match for ${lostPet.pet_name} (${pct}%)`);
    } else {
      console.log(`📧 Would email ${lostPet.owner_email}: Possible match for ${lostPet.pet_name} (${(similarityScore * 100).toFixed(1)}% similarity) — RESEND_API_KEY not set`);
    }

    return true;
  } catch (e: any) {
    console.error('❌ Exception notifying owner:', e.message);
    return false;
  }
}

// ============================================================================
// CRON JOB: Sync All Active Shelters
// ============================================================================

export async function syncAllActiveShelters(): Promise<{ totalSynced: number; shelterCount: number }> {
  try {
    const client = getClient();

    const { data: integrations, error } = await client
      .from('shelter_integrations')
      .select('id')
      .eq('is_active', true);

    if (error || !integrations) {
      return { totalSynced: 0, shelterCount: 0 };
    }

    let totalSynced = 0;

    for (const integration of integrations) {
      const synced = await syncShelterPets(integration.id);
      totalSynced += synced;
    }

    console.log(`✅ Synced ${totalSynced} pets from ${integrations.length} shelters`);

    return { totalSynced, shelterCount: integrations.length };
  } catch (e: any) {
    console.error('❌ Exception syncing all shelters:', e.message);
    return { totalSynced: 0, shelterCount: 0 };
  }
}

// ============================================================================
// EXPORT ALL FUNCTIONS
// ============================================================================

export const shelterApiIntegration = {
  syncShelterPets,
  syncAllActiveShelters,
  generateImageEmbedding,
  findVisualMatches,
  notifyOwnerOfMatch,
};
