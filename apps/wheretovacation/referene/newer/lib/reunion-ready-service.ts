/**
 * REUNIONREADY SUBSCRIPTION SERVICE
 * 
 * Manages premium pet vault subscriptions and instant alert activations.
 * 
 * Features:
 * - Stripe subscription management
 * - Pet vault CRUD operations
 * - One-click lost pet activation
 * - Subscription validation
 */

import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';

const supabase = process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY
  ? createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
  : null;

const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2024-11-20.acacia' })
  : null;

// ReunionReady pricing
const REUNION_READY_PRICE = {
  amount: 999, // $9.99 in cents
  currency: 'usd',
  interval: 'year' as const,
  productName: 'ReunionReady Pet Vault',
  productDescription: 'Pre-register your pet for instant lost pet activation. Includes QR poster generation, camera watch alerts, and more.'
};

export interface VaultPet {
  id: number;
  user_id: string;
  pet_name: string;
  pet_type: string;
  breed?: string;
  color?: string;
  size?: string;
  weight_lbs?: number;
  age_years?: number;
  gender?: string;
  microchip_id?: string;
  microchip_company?: string;
  medical_conditions?: string[];
  medications?: string[];
  special_needs?: string;
  temperament?: string;
  approach_instructions?: string;
  primary_photo_url?: string;
  additional_photos?: string[];
  home_city?: string;
  home_state?: string;
  home_lat?: number;
  home_lon?: number;
  owner_name: string;
  owner_email?: string;
  owner_phone?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  is_reunion_ready: boolean;
  subscription_status: string;
  subscription_expires_at?: string;
  is_currently_lost: boolean;
  created_at: string;
}

export interface CreateVaultPetInput {
  userId: string;
  petName: string;
  petType: string;
  breed?: string;
  color?: string;
  size?: string;
  weightLbs?: number;
  ageYears?: number;
  gender?: string;
  microchipId?: string;
  microchipCompany?: string;
  medicalConditions?: string[];
  medications?: string[];
  specialNeeds?: string;
  temperament?: string;
  approachInstructions?: string;
  primaryPhotoUrl?: string;
  additionalPhotos?: string[];
  homeAddress?: string;
  homeCity?: string;
  homeState?: string;
  homeZip?: string;
  homeLat?: number;
  homeLon?: number;
  ownerName: string;
  ownerEmail?: string;
  ownerPhone?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
}

/**
 * Create a new pet in the vault (without subscription)
 */
export async function createVaultPet(input: CreateVaultPetInput): Promise<VaultPet | null> {
  if (!supabase) return null;

  try {
    const { data, error } = await supabase
      .from('pet_vault')
      .insert({
        user_id: input.userId,
        pet_name: input.petName,
        pet_type: input.petType,
        breed: input.breed,
        color: input.color,
        size: input.size,
        weight_lbs: input.weightLbs,
        age_years: input.ageYears,
        gender: input.gender,
        microchip_id: input.microchipId,
        microchip_company: input.microchipCompany,
        medical_conditions: input.medicalConditions,
        medications: input.medications,
        special_needs: input.specialNeeds,
        temperament: input.temperament,
        approach_instructions: input.approachInstructions,
        primary_photo_url: input.primaryPhotoUrl,
        additional_photos: input.additionalPhotos,
        home_address: input.homeAddress,
        home_city: input.homeCity,
        home_state: input.homeState,
        home_zip: input.homeZip,
        home_lat: input.homeLat,
        home_lon: input.homeLon,
        owner_name: input.ownerName,
        owner_email: input.ownerEmail,
        owner_phone: input.ownerPhone,
        emergency_contact_name: input.emergencyContactName,
        emergency_contact_phone: input.emergencyContactPhone,
        is_reunion_ready: false,
        subscription_status: 'inactive'
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error: any) {
    console.error('[ReunionReady] Error creating vault pet:', error.message);
    return null;
  }
}

/**
 * Get all vault pets for a user
 */
export async function getUserVaultPets(userId: string): Promise<VaultPet[]> {
  if (!supabase) return [];

  try {
    const { data, error } = await supabase
      .from('pet_vault')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error: any) {
    console.error('[ReunionReady] Error getting vault pets:', error.message);
    return [];
  }
}

/**
 * Get a single vault pet
 */
export async function getVaultPet(petId: number): Promise<VaultPet | null> {
  if (!supabase) return null;

  try {
    const { data, error } = await supabase
      .from('pet_vault')
      .select('*')
      .eq('id', petId)
      .single();

    if (error) throw error;
    return data;
  } catch (error: any) {
    console.error('[ReunionReady] Error getting vault pet:', error.message);
    return null;
  }
}

/**
 * Create a Stripe checkout session for ReunionReady subscription
 */
export async function createSubscriptionCheckout(
  vaultPetId: number,
  userId: string,
  successUrl: string,
  cancelUrl: string
): Promise<{ checkoutUrl: string; sessionId: string } | null> {
  if (!stripe || !supabase) {
    console.error('[ReunionReady] Stripe or Supabase not configured');
    return null;
  }

  try {
    // Get or create Stripe price
    const price = await getOrCreateStripePrice();
    if (!price) throw new Error('Failed to create Stripe price');

    // Get vault pet details
    const pet = await getVaultPet(vaultPetId);
    if (!pet) throw new Error('Vault pet not found');

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{
        price: price.id,
        quantity: 1
      }],
      success_url: `${successUrl}?session_id={CHECKOUT_SESSION_ID}&vault_pet_id=${vaultPetId}`,
      cancel_url: cancelUrl,
      metadata: {
        vault_pet_id: vaultPetId.toString(),
        user_id: userId,
        pet_name: pet.pet_name
      },
      subscription_data: {
        metadata: {
          vault_pet_id: vaultPetId.toString(),
          user_id: userId
        }
      }
    });

    return {
      checkoutUrl: session.url!,
      sessionId: session.id
    };
  } catch (error: any) {
    console.error('[ReunionReady] Error creating checkout:', error.message);
    return null;
  }
}

/**
 * Get or create the Stripe price for ReunionReady
 */
async function getOrCreateStripePrice(): Promise<Stripe.Price | null> {
  if (!stripe) return null;

  try {
    // Look for existing product
    const products = await stripe.products.search({
      query: `name:'${REUNION_READY_PRICE.productName}'`
    });

    let product = products.data[0];

    // Create product if not exists
    if (!product) {
      product = await stripe.products.create({
        name: REUNION_READY_PRICE.productName,
        description: REUNION_READY_PRICE.productDescription
      });
    }

    // Look for existing price
    const prices = await stripe.prices.list({
      product: product.id,
      active: true
    });

    let price = prices.data.find(p => 
      p.unit_amount === REUNION_READY_PRICE.amount &&
      p.recurring?.interval === REUNION_READY_PRICE.interval
    );

    // Create price if not exists
    if (!price) {
      price = await stripe.prices.create({
        product: product.id,
        unit_amount: REUNION_READY_PRICE.amount,
        currency: REUNION_READY_PRICE.currency,
        recurring: {
          interval: REUNION_READY_PRICE.interval
        }
      });
    }

    return price;
  } catch (error: any) {
    console.error('[ReunionReady] Error with Stripe price:', error.message);
    return null;
  }
}

/**
 * Handle successful subscription (called by webhook or success page)
 */
export async function activateSubscription(
  vaultPetId: number,
  stripeSubscriptionId: string,
  stripeCustomerId: string
): Promise<boolean> {
  if (!supabase) return false;

  try {
    const expiresAt = new Date();
    expiresAt.setFullYear(expiresAt.getFullYear() + 1);

    // Update vault pet
    const { error: petError } = await supabase
      .from('pet_vault')
      .update({
        is_reunion_ready: true,
        subscription_status: 'active',
        stripe_subscription_id: stripeSubscriptionId,
        stripe_customer_id: stripeCustomerId,
        subscription_started_at: new Date().toISOString(),
        subscription_expires_at: expiresAt.toISOString()
      })
      .eq('id', vaultPetId);

    if (petError) throw petError;

    // Create subscription record
    const { error: subError } = await supabase
      .from('reunion_ready_subscriptions')
      .insert({
        vault_pet_id: vaultPetId,
        user_id: (await getVaultPet(vaultPetId))?.user_id,
        stripe_subscription_id: stripeSubscriptionId,
        stripe_customer_id: stripeCustomerId,
        plan_type: 'yearly',
        amount_cents: REUNION_READY_PRICE.amount,
        currency: REUNION_READY_PRICE.currency,
        status: 'active',
        expires_at: expiresAt.toISOString()
      });

    if (subError) console.warn('[ReunionReady] Subscription record warning:', subError);

    console.log(`[ReunionReady] ✅ Activated subscription for pet ${vaultPetId}`);
    return true;
  } catch (error: any) {
    console.error('[ReunionReady] Error activating subscription:', error.message);
    return false;
  }
}

/**
 * Check if a vault pet has an active subscription
 */
export async function isSubscriptionActive(vaultPetId: number): Promise<boolean> {
  if (!supabase) return false;

  try {
    const pet = await getVaultPet(vaultPetId);
    if (!pet) return false;

    if (!pet.is_reunion_ready || pet.subscription_status !== 'active') {
      return false;
    }

    if (pet.subscription_expires_at) {
      const expiresAt = new Date(pet.subscription_expires_at);
      if (expiresAt < new Date()) {
        // Subscription expired, update status
        await supabase
          .from('pet_vault')
          .update({ subscription_status: 'expired' })
          .eq('id', vaultPetId);
        return false;
      }
    }

    return true;
  } catch (error: any) {
    console.error('[ReunionReady] Error checking subscription:', error.message);
    return false;
  }
}

/**
 * INSTANT ALERT: Activate lost pet status with one click
 * This triggers the full lost pet workflow using stored vault data
 */
export async function activateInstantAlert(vaultPetId: number): Promise<{
  success: boolean;
  lostPetId?: number;
  message: string;
  actions?: {
    posterGenerated: boolean;
    volunteersNotified: number;
    qrCodeUrl?: string;
  };
}> {
  if (!supabase) {
    return { success: false, message: 'Database not configured' };
  }

  try {
    // 1. Validate subscription
    const isActive = await isSubscriptionActive(vaultPetId);
    if (!isActive) {
      return { 
        success: false, 
        message: 'Your ReunionReady subscription is not active. Please renew to use Instant Alert.' 
      };
    }

    // 2. Get vault pet data
    const pet = await getVaultPet(vaultPetId);
    if (!pet) {
      return { success: false, message: 'Pet not found in vault' };
    }

    if (pet.is_currently_lost) {
      return { 
        success: false, 
        message: `${pet.pet_name} is already marked as lost. Check your active alerts.` 
      };
    }

    // 3. Create lost pet record from vault data
    const { data: lostPet, error: lostPetError } = await supabase
      .from('lost_pets')
      .insert({
        user_id: pet.user_id,
        pet_name: pet.pet_name,
        pet_type: pet.pet_type,
        breed: pet.breed,
        color: pet.color,
        size: pet.size,
        description: `${pet.temperament ? `Temperament: ${pet.temperament}. ` : ''}${pet.approach_instructions ? `Approach: ${pet.approach_instructions}. ` : ''}${pet.special_needs ? `Special needs: ${pet.special_needs}` : ''}`.trim() || null,
        photo_url: pet.primary_photo_url,
        date_lost: new Date().toISOString().split('T')[0],
        location_city: pet.home_city,
        location_state: pet.home_state,
        location_lat: pet.home_lat,
        location_lon: pet.home_lon,
        owner_name: pet.owner_name,
        owner_email: pet.owner_email,
        owner_phone: pet.owner_phone,
        microchip_id: pet.microchip_id,
        status: 'lost',
        // ReunionReady metadata
        source: 'reunion_ready_vault',
        vault_pet_id: vaultPetId
      })
      .select()
      .single();

    if (lostPetError) throw lostPetError;

    // 4. Update vault pet status
    await supabase
      .from('pet_vault')
      .update({
        is_currently_lost: true,
        lost_pet_id: lostPet.id,
        last_activated_at: new Date().toISOString(),
        activation_count: (pet.activation_count || 0) + 1
      })
      .eq('id', vaultPetId);

    // 5. Trigger the full lost pet workflow
    let posterGenerated = false;
    let volunteersNotified = 0;
    let qrCodeUrl: string | undefined;

    // Generate QR poster
    try {
      const { generatePosterForPet } = await import('./qr-poster-generator');
      const posterResult = await generatePosterForPet(lostPet.id, {
        includeReward: false,
        includePhone: true,
        colorScheme: 'urgent'
      });
      posterGenerated = true;
      qrCodeUrl = posterResult.qrUrl;
      console.log(`[ReunionReady] ✅ QR poster generated for pet ${lostPet.id}`);
    } catch (posterError) {
      console.warn('[ReunionReady] Poster generation failed:', posterError);
    }

    // Notify camera watch volunteers
    if (pet.home_lat && pet.home_lon) {
      try {
        const { notifyNearbyVolunteers } = await import('./camera-watch-service');
        const notifyResult = await notifyNearbyVolunteers({
          petId: lostPet.id,
          petName: pet.pet_name,
          petType: pet.pet_type,
          breed: pet.breed || '',
          color: pet.color || '',
          photoUrl: pet.primary_photo_url,
          lastSeenLat: pet.home_lat,
          lastSeenLon: pet.home_lon,
          lastSeenLocation: `${pet.home_city}, ${pet.home_state}`,
          dateLost: new Date().toISOString()
        });
        volunteersNotified = notifyResult.notified;
        console.log(`[ReunionReady] ✅ Notified ${volunteersNotified} camera watch volunteers`);
      } catch (notifyError) {
        console.warn('[ReunionReady] Camera watch notification failed:', notifyError);
      }
    }

    // 6. Record activation
    await supabase
      .from('reunion_ready_activations')
      .insert({
        vault_pet_id: vaultPetId,
        lost_pet_id: lostPet.id,
        user_id: pet.user_id,
        qr_poster_generated: posterGenerated,
        camera_watch_notified: volunteersNotified
      });

    return {
      success: true,
      lostPetId: lostPet.id,
      message: `🚨 ALERT ACTIVATED! ${pet.pet_name} is now marked as LOST. Our AI is searching.`,
      actions: {
        posterGenerated,
        volunteersNotified,
        qrCodeUrl
      }
    };

  } catch (error: any) {
    console.error('[ReunionReady] Instant alert error:', error.message);
    return { success: false, message: error.message || 'Failed to activate alert' };
  }
}

/**
 * Deactivate lost status (pet found)
 */
export async function deactivateAlert(
  vaultPetId: number,
  resolution: 'found_safe' | 'found_injured' | 'not_found' | 'false_alarm',
  notes?: string
): Promise<boolean> {
  if (!supabase) return false;

  try {
    const pet = await getVaultPet(vaultPetId);
    if (!pet || !pet.is_currently_lost) return false;

    // Update lost pet status
    if (pet.lost_pet_id) {
      await supabase
        .from('lost_pets')
        .update({ 
          status: resolution === 'found_safe' || resolution === 'found_injured' ? 'found' : 'closed'
        })
        .eq('id', pet.lost_pet_id);
    }

    // Update vault pet
    await supabase
      .from('pet_vault')
      .update({
        is_currently_lost: false,
        lost_pet_id: null
      })
      .eq('id', vaultPetId);

    // Update activation record
    await supabase
      .from('reunion_ready_activations')
      .update({
        deactivated_at: new Date().toISOString(),
        resolution_status: resolution,
        resolved_at: new Date().toISOString(),
        resolution_notes: notes
      })
      .eq('vault_pet_id', vaultPetId)
      .is('deactivated_at', null);

    console.log(`[ReunionReady] ✅ Alert deactivated for pet ${vaultPetId}: ${resolution}`);
    return true;
  } catch (error: any) {
    console.error('[ReunionReady] Deactivate error:', error.message);
    return false;
  }
}

/**
 * Cancel subscription
 */
export async function cancelSubscription(vaultPetId: number, reason?: string): Promise<boolean> {
  if (!supabase || !stripe) return false;

  try {
    const pet = await getVaultPet(vaultPetId);
    if (!pet || !pet.stripe_subscription_id) return false;

    // Cancel in Stripe
    await stripe.subscriptions.cancel(pet.stripe_subscription_id);

    // Update database
    await supabase
      .from('pet_vault')
      .update({
        subscription_status: 'cancelled',
        subscription_cancelled_at: new Date().toISOString()
      })
      .eq('id', vaultPetId);

    await supabase
      .from('reunion_ready_subscriptions')
      .update({
        status: 'cancelled',
        cancelled_at: new Date().toISOString(),
        cancel_reason: reason
      })
      .eq('vault_pet_id', vaultPetId)
      .eq('status', 'active');

    console.log(`[ReunionReady] ✅ Subscription cancelled for pet ${vaultPetId}`);
    return true;
  } catch (error: any) {
    console.error('[ReunionReady] Cancel subscription error:', error.message);
    return false;
  }
}

