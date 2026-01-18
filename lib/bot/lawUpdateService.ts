/**
 * Law Update Service
 * 
 * Fetches updates to smoking laws and regulations from various sources
 * and updates the database with new information
 */

import { getSupabaseAdminClient } from '@/lib/supabase';

interface UpdateResult {
  totalChecked: number;
  updated: number;
  new: number;
  errors: string[];
  updatedLaws: any[];
}

export class LawUpdateService {
  private supabase: NonNullable<ReturnType<typeof getSupabaseAdminClient>>;

  constructor() {
    const client = getSupabaseAdminClient();
    if (!client) {
      throw new Error('Supabase client initialization failed: missing configuration');
    }
    this.supabase = client;
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
      // Enterprise: use the real regulation scraper output (no mocks)
      // CommonJS script export
      const { scrapeRegulations } = require('@/scripts/regulation-scraper.js');

      const scraped = await scrapeRegulations();
      const regs = Array.isArray(scraped?.regulations) ? scraped.regulations : [];
      result.totalChecked = regs.length;

      // Convert scraped regs -> updates for sr_law_cards (policy snapshot) + log update rows
      for (const reg of regs) {
        try {
          const headline = String(reg?.headline || '').trim();
          const summary = String(reg?.summary || '').trim();
          const url = String(reg?.url || '').trim();
          const source = String(reg?.source || 'Regulation Feed').trim();
          const states: string[] = Array.isArray(reg?.geography?.states) ? reg.geography.states : [];
          const isFederal = !!reg?.geography?.federal;

          const categories = deriveCategoriesFromText(`${headline} ${summary}`);

          const targetStates = isFederal ? ALL_STATES : states;
          if (targetStates.length === 0) continue;

          for (const state_code of targetStates) {
            const state_name = STATE_NAMES[state_code] || state_code;
            for (const category of categories) {
              const upsert = {
                state_code,
                state_name,
                category,
                summary: summary || headline,
                details: headline,
                tags: reg?.analysis?.matchedKeywords || [],
                source_urls: url ? [url] : [],
                last_verified_at: new Date().toISOString(),
                last_updated_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
                is_active: true,
              };

              const { error } = await this.supabase
                .from('sr_law_cards')
                .upsert(upsert as any, { onConflict: 'state_code,category' });

              if (error) throw error;
              result.updated++;
              result.updatedLaws.push({ ...upsert, source });
            }
          }
        } catch (e: any) {
          result.errors.push(e?.message || String(e));
        }
      }

      await this.updateLastRun();
    } catch (error) {
      result.errors.push(`Law update service failed: ${error}`);
    }

    return result;
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

const ALL_STATES = [
  'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA','KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT','VA','WA','WV','WI','WY'
];

const STATE_NAMES: Record<string, string> = {
  AL: 'Alabama', AK: 'Alaska', AZ: 'Arizona', AR: 'Arkansas', CA: 'California', CO: 'Colorado', CT: 'Connecticut', DE: 'Delaware', FL: 'Florida', GA: 'Georgia',
  HI: 'Hawaii', ID: 'Idaho', IL: 'Illinois', IN: 'Indiana', IA: 'Iowa', KS: 'Kansas', KY: 'Kentucky', LA: 'Louisiana', ME: 'Maine', MD: 'Maryland',
  MA: 'Massachusetts', MI: 'Michigan', MN: 'Minnesota', MS: 'Mississippi', MO: 'Missouri', MT: 'Montana', NE: 'Nebraska', NV: 'Nevada', NH: 'New Hampshire',
  NJ: 'New Jersey', NM: 'New Mexico', NY: 'New York', NC: 'North Carolina', ND: 'North Dakota', OH: 'Ohio', OK: 'Oklahoma', OR: 'Oregon', PA: 'Pennsylvania',
  RI: 'Rhode Island', SC: 'South Carolina', SD: 'South Dakota', TN: 'Tennessee', TX: 'Texas', UT: 'Utah', VT: 'Vermont', VA: 'Virginia', WA: 'Washington',
  WV: 'West Virginia', WI: 'Wisconsin', WY: 'Wyoming',
};

function deriveCategoriesFromText(text: string): string[] {
  const t = String(text || '').toLowerCase();
  const cats = new Set();
  if (t.includes('vape') || t.includes('e-cig') || t.includes('nicotine pouch')) cats.add('vaping');
  if (t.includes('menthol') || t.includes('flavor') || t.includes('retail') || t.includes('sale')) cats.add('retail_sales');
  if (t.includes('tax')) cats.add('penalties');
  if (t.includes('smoking') || t.includes('cigarette') || t.includes('tobacco')) cats.add('indoor_smoking');
  if (cats.size === 0) cats.add('vaping');
  return Array.from(cats) as string[];
}
