/**
 * Law Update Service
 * 
 * Fetches updates to smoking laws and regulations from various sources
 * and updates the database with new information
 */

import { createClient } from '@/lib/supabase';
import { SMSService } from '@/lib/sms';

interface LawSource {
  name: string;
  baseUrl: string;
  apiKey?: string;
  lastUpdate?: Date;
}

interface LawUpdate {
  id: string;
  title: string;
  description: string;
  state: string;
  category: string;
  effectiveDate: Date;
  source: string;
  url: string;
  changes: string[];
}

interface UpdateResult {
  totalChecked: number;
  updated: number;
  new: number;
  errors: string[];
  updatedLaws: any[];
}

export class LawUpdateService {
  private supabase: NonNullable<ReturnType<typeof createClient>>;
  private smsService: SMSService;

  constructor() {
    const client = createClient();
    if (!client) {
      throw new Error('Supabase client initialization failed: missing configuration');
    }
    this.supabase = client;
    this.smsService = SMSService.getInstance();
  }

  /**
   * Main method to update laws from all sources
   */
  async updateLaws(): Promise<UpdateResult> {
    const result: UpdateResult = {
      totalChecked: 0,
      updated: 0,
      new: 0,
      errors: [],
      updatedLaws: []
    };

    try {
      // Get configured law sources
      const sources = await this.getLawSources();
      
      for (const source of sources) {
        try {
          const sourceResult = await this.updateFromSource(source);
          result.totalChecked += sourceResult.totalChecked;
          result.updated += sourceResult.updated;
          result.new += sourceResult.new;
          result.updatedLaws.push(...sourceResult.updatedLaws);
          result.errors.push(...sourceResult.errors);
        } catch (error) {
          result.errors.push(`Error updating from ${source.name}: ${error}`);
        }
      }

      // Check for expired or outdated laws
      await this.checkForExpiredLaws(result);

      // Update last run timestamp
      await this.updateLastRun();

    } catch (error) {
      result.errors.push(`Law update service failed: ${error}`);
    }

    return result;
  }

  /**
   * Get configured law sources from database or environment
   */
  private async getLawSources(): Promise<LawSource[]> {
    // Default sources - in production these would come from database
    const sources: LawSource[] = [
      {
        name: 'State Legislative Websites',
        baseUrl: 'https://api.legislation.gov',
        apiKey: process.env.LEGISLATION_API_KEY
      },
      {
        name: 'CDC Smoking Laws Database',
        baseUrl: 'https://api.cdc.gov/smoking-laws',
        apiKey: process.env.CDC_API_KEY
      },
      {
        name: 'Public Health Law Center',
        baseUrl: 'https://api.publichealthlawcenter.org',
        apiKey: process.env.PHLC_API_KEY
      }
    ];

    // Filter out sources without API keys in production
    return sources.filter(source => 
      process.env.NODE_ENV === 'development' || source.apiKey
    );
  }

  /**
   * Update laws from a specific source
   */
  private async updateFromSource(source: LawSource): Promise<UpdateResult> {
    const result: UpdateResult = {
      totalChecked: 0,
      updated: 0,
      new: 0,
      errors: [],
      updatedLaws: []
    };

    try {
      console.log(`Checking for updates from ${source.name}`);

      // Get last update time for this source
      const lastUpdate = await this.getLastUpdate(source.name);
      
      // Fetch updates from source (mock implementation)
      const updates = await this.fetchLawUpdates(source, lastUpdate);
      result.totalChecked = updates.length;

      // Process each update
      for (const update of updates) {
        try {
          const existingLaw = await this.findExistingLaw(update);
          
          if (existingLaw) {
            // Update existing law
            await this.updateExistingLaw(existingLaw.id, update);
            result.updated++;
            result.updatedLaws.push({ ...update, action: 'updated' });
          } else {
            // Create new law
            await this.createNewLaw(update);
            result.new++;
            result.updatedLaws.push({ ...update, action: 'new' });
          }
        } catch (error) {
          result.errors.push(`Error processing law ${update.id}: ${error}`);
        }
      }

    } catch (error) {
      result.errors.push(`Failed to update from ${source.name}: ${error}`);
    }

    return result;
  }

  /**
   * Fetch law updates from source (mock implementation)
   */
  private async fetchLawUpdates(source: LawSource, since?: Date): Promise<LawUpdate[]> {
    // In production, this would make actual API calls to the source
    // For now, we'll return mock data or simulate the process
    
    if (process.env.NODE_ENV === 'development') {
      // Mock some updates for development
      return [
        {
          id: `${source.name.toLowerCase().replace(/\s+/g, '_')}_${Date.now()}_1`,
          title: 'New Smoking Ban in Public Parks',
          description: 'All public parks in the state are now designated as non-smoking areas',
          state: 'CA',
          category: 'outdoor_public',
          effectiveDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
          source: source.name,
          url: `${source.baseUrl}/law/12345`,
          changes: ['Added public parks to smoke-free zones', 'Increased penalties for violations']
        },
        {
          id: `${source.name.toLowerCase().replace(/\s+/g, '_')}_${Date.now()}_2`,
          title: 'Vaping Age Restriction Update',
          description: 'Minimum age for purchasing vaping products increased to 21',
          state: 'NY',
          category: 'vaping',
          effectiveDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000), // 60 days from now
          source: source.name,
          url: `${source.baseUrl}/law/12346`,
          changes: ['Age requirement changed from 18 to 21', 'New ID verification requirements']
        }
      ];
    }

    // In production, make actual API calls
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };

    if (source.apiKey) {
      headers['Authorization'] = `Bearer ${source.apiKey}`;
    }

    const url = since 
      ? `${source.baseUrl}/updates?since=${since.toISOString()}`
      : `${source.baseUrl}/updates`;

    // Mock API call - replace with actual fetch in production
    console.log(`Would fetch from: ${url}`);
    return [];
  }

  /**
   * Find existing law in database
   */
  private async findExistingLaw(update: LawUpdate): Promise<any> {
    const { data, error } = await this.supabase
      .from('sr_law_cards')
      .select('*')
      .eq('state_code', update.state)
      .eq('category', update.category)
      .eq('title', update.title)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 is "not found"
      throw error;
    }

    return data;
  }

  /**
   * Update existing law in database
   */
  private async updateExistingLaw(lawId: string, update: LawUpdate): Promise<void> {
    const { error } = await this.supabase
      .from('sr_law_cards')
      .update({
        title: update.title,
        summary: update.description,
        updated_at: new Date().toISOString(),
        effective_date: update.effectiveDate.toISOString(),
        source_url: update.url,
        changes: update.changes,
        last_source_update: new Date().toISOString()
      })
      .eq('id', lawId);

    if (error) throw error;
  }

  /**
   * Create new law in database
   */
  private async createNewLaw(update: LawUpdate): Promise<void> {
    const { error } = await this.supabase
      .from('sr_law_cards')
      .insert({
        title: update.title,
        summary: update.description,
        state_code: update.state,
        category: update.category,
        effective_date: update.effectiveDate.toISOString(),
        source_url: update.url,
        changes: update.changes,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        last_source_update: new Date().toISOString()
      });

    if (error) throw error;
  }

  /**
   * Check for expired or outdated laws
   */
  private async checkForExpiredLaws(result: UpdateResult): Promise<void> {
    try {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      
      const { data: expiredLaws, error } = await this.supabase
        .from('sr_law_cards')
        .select('*')
        .lt('effective_date', thirtyDaysAgo.toISOString())
        .eq('is_active', true);

      if (error) throw error;

      if (expiredLaws && expiredLaws.length > 0) {
        // Mark expired laws as inactive
        for (const law of expiredLaws) {
          await this.supabase
            .from('sr_law_cards')
            .update({ is_active: false })
            .eq('id', (law as any).id);
        }

        result.updatedLaws.push(...expiredLaws.map((law: any) => ({
          ...law,
          action: 'expired',
          message: 'Law marked as expired'
        })));
      }
    } catch (error) {
      result.errors.push(`Error checking expired laws: ${error}`);
    }
  }

  /**
   * Get last update timestamp for source
   */
  private async getLastUpdate(sourceName: string): Promise<Date | undefined> {
    try {
      const { data, error } = await this.supabase
        .from('bot_source_updates')
        .select('last_update')
        .eq('source_name', sourceName)
        .single();

      if (error || !data) {
        return undefined;
      }

      return new Date(data.last_update);
    } catch (error) {
      return undefined;
    }
  }

  /**
   * Update last run timestamp
   */
  private async updateLastRun(): Promise<void> {
    try {
      await this.supabase
        .from('bot_settings')
        .upsert({
          key: 'last_law_update',
          value: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
    } catch (error) {
      console.error('Failed to update last run timestamp:', error);
    }
  }
}
