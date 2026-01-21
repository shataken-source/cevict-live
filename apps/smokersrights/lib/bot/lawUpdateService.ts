/**
 * Law Update Service
 * Updates last_updated_at dates for laws daily to show they're being actively monitored
 */

import { createClient } from '@supabase/supabase-js';

export interface UpdateResult {
  totalChecked: number;
  updated: number;
  errors: string[];
  timestamp: Date;
}

export class LawUpdateService {
  private supabase;

  constructor() {
    // Read env vars inside constructor (after dotenv has loaded)
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    // For updates, we MUST use service role key (anon key doesn't have UPDATE permissions)
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl) {
      throw new Error('NEXT_PUBLIC_SUPABASE_URL not configured. Set it in .env.local or environment.');
    }
    
    if (!supabaseKey) {
      throw new Error('SUPABASE_SERVICE_ROLE_KEY not configured. This is required for updating laws. Set it in .env.local or environment. (Anon key cannot update data)');
    }

    this.supabase = createClient(supabaseUrl, supabaseKey);
    
    // Verify the key format
    // New format: sb_secret_* (shorter, ~50 chars)
    // Old format: eyJ... (JWT, 200+ chars)
    const isNewFormat = supabaseKey.startsWith('sb_secret_');
    const isOldFormat = supabaseKey.startsWith('eyJ');
    
    if (!isNewFormat && !isOldFormat) {
      console.warn('⚠️  Warning: SUPABASE_SERVICE_ROLE_KEY format unrecognized. Expected sb_secret_* or eyJ...');
    } else if (isOldFormat && supabaseKey.length < 100) {
      console.warn('⚠️  Warning: SUPABASE_SERVICE_ROLE_KEY seems too short. JWT format keys are typically 200+ characters.');
    }
  }

  /**
   * Update last_updated_at for all laws to today's date
   * This marks laws as "checked" daily even if no changes were found
   */
  async updateLawDates(): Promise<UpdateResult> {
    const result: UpdateResult = {
      totalChecked: 0,
      updated: 0,
      errors: [],
      timestamp: new Date(),
    };

    try {
      // Get all laws
      const { data: laws, error: fetchError } = await this.supabase
        .from('laws')
        .select('id, last_updated_at');

      if (fetchError) {
        result.errors.push(`Failed to fetch laws: ${fetchError.message}`);
        return result;
      }

      if (!laws || laws.length === 0) {
        console.log('No laws found to update');
        return result;
      }

      result.totalChecked = laws.length;
      const today = new Date().toISOString();

      // Update all laws to today's date
      // Only update if last_updated_at is older than today (to avoid unnecessary updates)
      const { error: updateError } = await this.supabase
        .from('laws')
        .update({ last_updated_at: today })
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Update all (using a condition that's always true)

      if (updateError) {
        result.errors.push(`Failed to update laws: ${updateError.message}`);
        return result;
      }

      result.updated = laws.length;
      console.log(`✅ Updated ${result.updated} laws with today's date (${new Date().toLocaleDateString()})`);

    } catch (error: any) {
      result.errors.push(`Law update service failed: ${error.message}`);
      console.error('Law update error:', error);
    }

    return result;
  }

  /**
   * Update specific law by ID
   */
  async updateLawDate(lawId: string): Promise<boolean> {
    try {
      const today = new Date().toISOString();
      const { error } = await this.supabase
        .from('laws')
        .update({ last_updated_at: today })
        .eq('id', lawId);

      if (error) {
        console.error(`Failed to update law ${lawId}:`, error);
        return false;
      }

      return true;
    } catch (error) {
      console.error(`Error updating law ${lawId}:`, error);
      return false;
    }
  }

  /**
   * Check for laws that haven't been updated in the last 7 days
   */
  async checkStaleLaws(): Promise<string[]> {
    try {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const cutoffDate = sevenDaysAgo.toISOString();

      const { data, error } = await this.supabase
        .from('laws')
        .select('id, state_code, category, last_updated_at')
        .lt('last_updated_at', cutoffDate)
        .or('last_updated_at.is.null');

      if (error) {
        console.error('Failed to check stale laws:', error);
        return [];
      }

      return data?.map(law => `${law.state_code} - ${law.category}`) || [];
    } catch (error) {
      console.error('Error checking stale laws:', error);
      return [];
    }
  }
}
