/**
 * Smart Vacation Package Builder Service
 * Integrates GCC (charters) + WTV (rentals) with AI recommendations
 * Uses NEW vacation_packages migration
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env.local') });

let supabase: SupabaseClient | null = null;

function getClient(): SupabaseClient {
  if (!supabase) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) {
      throw new Error('Supabase credentials missing for Vacation Packages');
    }
    supabase = createClient(url, key);
  }
  return supabase;
}

// ============================================================================
// TYPES
// ============================================================================

export interface VacationPackage {
  id: string;
  package_name: string;
  gcc_charter_id?: number;
  wtv_rental_id?: number;
  discount_percent: number;
  final_price: number;
  customer_id: string;
  recommended_fishing_days: Date[];
  weather_score_avg: number;
  status: 'pending' | 'confirmed' | 'completed';
  created_at: Date;
}

export interface PackageRecommendation {
  charter_title: string;
  rental_title: string;
  charter_price: number;
  rental_price: number;
  discount_amount: number;
  final_price: number;
  recommended_fishing_days: Date[];
  weather_analysis: {
    date: Date;
    weather_score: number;
    conditions: string;
  }[];
  finn_reasoning: string[];
}

// ============================================================================
// GET PACKAGE DISCOUNT (Using PostgreSQL Function)
// ============================================================================

async function calculatePackageDiscount(
  charterPrice: number,
  rentalPrice: number
): Promise<{ discount_percent: number; discount_amount: number; final_price: number }> {
  try {
    const client = getClient();

    const { data, error } = await client.rpc('calculate_package_discount', {
      p_charter_price: charterPrice,
      p_rental_price: rentalPrice,
    });

    if (error) {
      console.error('❌ Error calculating discount:', error);
      return { discount_percent: 0, discount_amount: 0, final_price: charterPrice + rentalPrice };
    }

    return {
      discount_percent: Number(data[0].discount_percent || 15),
      discount_amount: Number(data[0].discount_amount || 0),
      final_price: Number(data[0].final_price || charterPrice + rentalPrice),
    };
  } catch (e: any) {
    console.error('❌ Exception calculating discount:', e.message);
    return { discount_percent: 0, discount_amount: 0, final_price: charterPrice + rentalPrice };
  }
}

// ============================================================================
// GET BEST FISHING DAYS (Using PostgreSQL Function)
// ============================================================================

async function getBestFishingDays(
  startDate: Date,
  endDate: Date,
  location: string
): Promise<Array<{ fishing_date: Date; weather_score: number }>> {
  try {
    const client = getClient();

    const { data, error } = await client.rpc('get_best_fishing_days', {
      p_start_date: startDate.toISOString(),
      p_end_date: endDate.toISOString(),
      p_location: location,
    });

    if (error) {
      console.error('❌ Error getting fishing days:', error);
      return [];
    }

    return (data || []).map((d: any) => ({
      fishing_date: new Date(d.fishing_date),
      weather_score: Number(d.weather_score || 0),
    }));
  } catch (e: any) {
    console.error('❌ Exception getting fishing days:', e.message);
    return [];
  }
}

// ============================================================================
// GENERATE FINN AI RECOMMENDATION
// ============================================================================

export async function generatePackageRecommendation(params: {
  customerId: string;
  charterId?: number;
  rentalId?: number;
  startDate: Date;
  endDate: Date;
  location: string;
}): Promise<PackageRecommendation | null> {
  try {
    const client = getClient();

    // Fetch charter details (if provided)
    let charterPrice = 0;
    let charterTitle = '';
    if (params.charterId) {
      const { data: charter } = await client
        .from('charter_trips')
        .select('title, price')
        .eq('id', params.charterId)
        .single();
      if (charter) {
        charterTitle = charter.title;
        charterPrice = Number(charter.price || 0);
      }
    }

    // Fetch rental details (if provided)
    let rentalPrice = 0;
    let rentalTitle = '';
    if (params.rentalId) {
      const { data: rental } = await client
        .from('rentals')
        .select('title, price_per_night, min_nights')
        .eq('id', params.rentalId)
        .single();
      if (rental) {
        rentalTitle = rental.title;
        const nights = Math.ceil((params.endDate.getTime() - params.startDate.getTime()) / (1000 * 60 * 60 * 24));
        rentalPrice = Number(rental.price_per_night || 0) * Math.max(nights, rental.min_nights || 1);
      }
    }

    // Calculate package discount
    const discount = await calculatePackageDiscount(charterPrice, rentalPrice);

    // Get best fishing days with weather data
    const fishingDays = await getBestFishingDays(params.startDate, params.endDate, params.location);

    // Finn AI reasoning
    const finnReasoning: string[] = [
      `Package saves you $${discount.discount_amount.toFixed(2)} (${discount.discount_percent}% off!)`,
      `Best fishing days: ${fishingDays.slice(0, 3).map(d => d.fishing_date.toLocaleDateString()).join(', ')}`,
    ];

    if (fishingDays.length > 0) {
      const avgScore = fishingDays.reduce((sum, d) => sum + d.weather_score, 0) / fishingDays.length;
      if (avgScore > 85) {
        finnReasoning.push('🎣 Excellent fishing conditions expected!');
      } else if (avgScore > 70) {
        finnReasoning.push('✅ Good fishing conditions expected');
      }
    }

    return {
      charter_title: charterTitle,
      rental_title: rentalTitle,
      charter_price: charterPrice,
      rental_price: rentalPrice,
      discount_amount: discount.discount_amount,
      final_price: discount.final_price,
      recommended_fishing_days: fishingDays.map(d => d.fishing_date),
      weather_analysis: fishingDays.map(d => ({
        date: d.fishing_date,
        weather_score: d.weather_score,
        conditions: d.weather_score > 85 ? 'Excellent' : d.weather_score > 70 ? 'Good' : 'Fair',
      })),
      finn_reasoning: finnReasoning,
    };
  } catch (e: any) {
    console.error('❌ Exception generating recommendation:', e.message);
    return null;
  }
}

// ============================================================================
// CREATE VACATION PACKAGE
// ============================================================================

export async function createVacationPackage(params: {
  customerId: string;
  packageName: string;
  charterId?: number;
  rentalId?: number;
  startDate: Date;
  endDate: Date;
  location: string;
}): Promise<VacationPackage | null> {
  try {
    const client = getClient();

    // Generate recommendation
    const recommendation = await generatePackageRecommendation(params);
    if (!recommendation) {
      return null;
    }

    // Calculate discount
    const discount = await calculatePackageDiscount(
      recommendation.charter_price,
      recommendation.rental_price
    );

    // Insert package
    const { data, error } = await client
      .from('vacation_packages')
      .insert({
        package_name: params.packageName,
        gcc_charter_id: params.charterId,
        wtv_rental_id: params.rentalId,
        discount_percent: discount.discount_percent,
        final_price: discount.final_price,
        customer_id: params.customerId,
        recommended_fishing_days: recommendation.recommended_fishing_days.map(d => d.toISOString()),
        weather_score_avg:
          recommendation.weather_analysis.reduce((sum, w) => sum + w.weather_score, 0) /
          recommendation.weather_analysis.length,
        status: 'pending',
      })
      .select()
      .single();

    if (error) {
      console.error('❌ Error creating package:', error);
      return null;
    }

    console.log(`✅ Created vacation package: ${params.packageName} ($${discount.final_price.toFixed(2)})`);

    return {
      id: data.id,
      package_name: data.package_name,
      gcc_charter_id: data.gcc_charter_id,
      wtv_rental_id: data.wtv_rental_id,
      discount_percent: Number(data.discount_percent),
      final_price: Number(data.final_price),
      customer_id: data.customer_id,
      recommended_fishing_days: data.recommended_fishing_days.map((d: string) => new Date(d)),
      weather_score_avg: Number(data.weather_score_avg || 0),
      status: data.status,
      created_at: new Date(data.created_at),
    };
  } catch (e: any) {
    console.error('❌ Exception creating package:', e.message);
    return null;
  }
}

// ============================================================================
// GET CUSTOMER PACKAGES
// ============================================================================

export async function getCustomerPackages(customerId: string): Promise<VacationPackage[]> {
  try {
    const client = getClient();

    const { data, error } = await client
      .from('vacation_packages')
      .select('*')
      .eq('customer_id', customerId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Error fetching packages:', error);
      return [];
    }

    return (data || []).map(d => ({
      id: d.id,
      package_name: d.package_name,
      gcc_charter_id: d.gcc_charter_id,
      wtv_rental_id: d.wtv_rental_id,
      discount_percent: Number(d.discount_percent),
      final_price: Number(d.final_price),
      customer_id: d.customer_id,
      recommended_fishing_days: d.recommended_fishing_days.map((s: string) => new Date(s)),
      weather_score_avg: Number(d.weather_score_avg || 0),
      status: d.status,
      created_at: new Date(d.created_at),
    }));
  } catch (e: any) {
    console.error('❌ Exception fetching packages:', e.message);
    return [];
  }
}

// ============================================================================
// EXPORT ALL FUNCTIONS
// ============================================================================

export const smartVacationPackages = {
  generatePackageRecommendation,
  createVacationPackage,
  getCustomerPackages,
};
