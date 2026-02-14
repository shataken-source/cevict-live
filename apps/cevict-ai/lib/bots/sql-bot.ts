import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

export class SqlBot {
  /**
   * LEVEL 5: Auto-Migration
   * Creates a formal migration file and pushes it to the remote DB.
   */
  async pushSchema(name: string, sql: string) {
    const timestamp = new Date().toISOString().replace(/[-:T]/g, '').split('.')[0];
    const migrationName = `${timestamp}_${name}.sql`;
    const migrationPath = path.join('C:/cevict-live/supabase/migrations', migrationName);

    console.log(`🚀 Bot: Generating migration ${migrationName}...`);
    
    try {
      // Ensure the migration directory exists
      if (!fs.existsSync(path.dirname(migrationPath))) {
        fs.mkdirSync(path.dirname(migrationPath), { recursive: true });
      }
      
      fs.writeFileSync(migrationPath, sql);

      // Execute the push to the linked project (hhwgbc...)
      const output = execSync('supabase db push', { encoding: 'utf8' });
      console.log("✅ Migration Pushed Successfully:", output);
    } catch (err) {
      console.error("❌ SQL Bot Error:", err);
    }
  }
}
export const sqlBot = new SqlBot();