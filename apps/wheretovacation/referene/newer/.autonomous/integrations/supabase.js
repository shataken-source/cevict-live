/**
 * Supabase Integration Utilities
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

class SupabaseHelper {
  constructor(config = {}) {
    this.url = config.url || process.env.NEXT_PUBLIC_SUPABASE_URL;
    this.serviceKey = config.serviceKey || process.env.SUPABASE_SERVICE_ROLE_KEY;
    this.anonKey = config.anonKey || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    
    this.client = this.url && this.serviceKey
      ? createClient(this.url, this.serviceKey)
      : null;
  }

  /**
   * Load config from file
   */
  static loadConfig() {
    const configPath = path.join(__dirname, '../config/api-keys.json');
    if (fs.existsSync(configPath)) {
      const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      return new SupabaseHelper(config.supabase);
    }
    return new SupabaseHelper();
  }

  /**
   * Test connection
   */
  async testConnection() {
    if (!this.client) {
      return { connected: false, error: 'Client not initialized' };
    }

    try {
      const { data, error } = await this.client
        .from('lost_pets')
        .select('id')
        .limit(1);

      return {
        connected: !error,
        error: error?.message
      };
    } catch (error) {
      return {
        connected: false,
        error: error.message
      };
    }
  }

  /**
   * Get database stats
   */
  async getStats() {
    if (!this.client) {
      throw new Error('Supabase client not initialized');
    }

    const [petsResult, matchesResult] = await Promise.all([
      this.client.from('lost_pets').select('status', { count: 'exact', head: true }),
      this.client.from('pet_matches').select('id', { count: 'exact', head: true }).catch(() => ({ count: 0 }))
    ]);

    const { data: allPets } = await this.client.from('lost_pets').select('status');

    return {
      totalPets: allPets?.length || 0,
      lostPets: allPets?.filter(p => p.status === 'lost').length || 0,
      foundPets: allPets?.filter(p => p.status === 'found').length || 0,
      reunitedPets: allPets?.filter(p => p.status === 'reunited').length || 0,
      totalMatches: matchesResult.count || 0
    };
  }

  /**
   * Run SQL query
   */
  async runSQL(query) {
    if (!this.client) {
      throw new Error('Supabase client not initialized');
    }

    // Note: Supabase JS client doesn't support raw SQL
    // This would need to be done via REST API or Edge Function
    throw new Error('Raw SQL queries require REST API or Edge Function');
  }

  /**
   * Backup table
   */
  async backupTable(tableName) {
    if (!this.client) {
      throw new Error('Supabase client not initialized');
    }

    const { data, error } = await this.client
      .from(tableName)
      .select('*');

    if (error) {
      throw error;
    }

    const backupPath = path.join(__dirname, `../debug/snapshots/${tableName}-${Date.now()}.json`);
    fs.writeFileSync(backupPath, JSON.stringify(data, null, 2));

    return {
      path: backupPath,
      count: data.length
    };
  }

  /**
   * Check table exists
   */
  async tableExists(tableName) {
    if (!this.client) {
      return false;
    }

    try {
      const { error } = await this.client
        .from(tableName)
        .select('id')
        .limit(1);

      return !error || error.code !== '42P01';
    } catch {
      return false;
    }
  }
}

module.exports = SupabaseHelper;












