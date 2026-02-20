/**
 * Step 1: Create exec_sql helper function via a workaround.
 * Supabase service role can call pg_catalog functions.
 * We use the /rest/v1/ endpoint with a raw SQL trick via the pg extension.
 *
 * Actually: we'll use the Supabase REST API's built-in ability to call
 * stored procedures. First we need to create the function.
 * 
 * Since we can't run DDL directly, we use the Supabase "pg" extension
 * via the REST API by calling pg_execute through a workaround.
 *
 * REAL approach: POST to /rest/v1/rpc/<function> only works for existing functions.
 * We need to use the Supabase Dashboard SQL editor or the CLI.
 *
 * This script outputs the exact SQL to run + opens the URL.
 */

const { execSync } = require('child_process');

const PROJECT_REF = 'rdbuwyefbgnbuhmjrizo';
const SQL_EDITOR_URL = `https://supabase.com/dashboard/project/${PROJECT_REF}/sql/new`;

const SQL = `
-- Fix syndicated_picks: add all missing columns
-- Run this in the Supabase SQL Editor

ALTER TABLE public.syndicated_picks ADD COLUMN IF NOT EXISTS batch_id text;
ALTER TABLE public.syndicated_picks ADD COLUMN IF NOT EXISTS tier text;
ALTER TABLE public.syndicated_picks ADD COLUMN IF NOT EXISTS pick_index integer;
ALTER TABLE public.syndicated_picks ADD COLUMN IF NOT EXISTS source_file text;
ALTER TABLE public.syndicated_picks ADD COLUMN IF NOT EXISTS game_id text;
ALTER TABLE public.syndicated_picks ADD COLUMN IF NOT EXISTS sport text;
ALTER TABLE public.syndicated_picks ADD COLUMN IF NOT EXISTS home_team text;
ALTER TABLE public.syndicated_picks ADD COLUMN IF NOT EXISTS away_team text;
ALTER TABLE public.syndicated_picks ADD COLUMN IF NOT EXISTS game_time timestamptz;
ALTER TABLE public.syndicated_picks ADD COLUMN IF NOT EXISTS pick_type text DEFAULT 'MONEYLINE';
ALTER TABLE public.syndicated_picks ADD COLUMN IF NOT EXISTS pick_selection text;
ALTER TABLE public.syndicated_picks ADD COLUMN IF NOT EXISTS confidence numeric;
ALTER TABLE public.syndicated_picks ADD COLUMN IF NOT EXISTS odds numeric;
ALTER TABLE public.syndicated_picks ADD COLUMN IF NOT EXISTS expected_value numeric;
ALTER TABLE public.syndicated_picks ADD COLUMN IF NOT EXISTS edge numeric;
ALTER TABLE public.syndicated_picks ADD COLUMN IF NOT EXISTS recommended_line numeric;
ALTER TABLE public.syndicated_picks ADD COLUMN IF NOT EXISTS mc_win_probability numeric;
ALTER TABLE public.syndicated_picks ADD COLUMN IF NOT EXISTS analysis text;
ALTER TABLE public.syndicated_picks ADD COLUMN IF NOT EXISTS raw_data jsonb;

CREATE INDEX IF NOT EXISTS idx_sp_game_time   ON public.syndicated_picks (game_time);
CREATE INDEX IF NOT EXISTS idx_sp_confidence  ON public.syndicated_picks (confidence DESC);
CREATE INDEX IF NOT EXISTS idx_sp_batch_id    ON public.syndicated_picks (batch_id);
CREATE INDEX IF NOT EXISTS idx_sp_sport       ON public.syndicated_picks (sport);
CREATE INDEX IF NOT EXISTS idx_sp_tier        ON public.syndicated_picks (tier);
`.trim();

console.log('\n' + '='.repeat(60));
console.log('SYNDICATED_PICKS SCHEMA FIX');
console.log('='.repeat(60));
console.log('\nPaste this SQL into the Supabase SQL Editor:');
console.log(`  ${SQL_EDITOR_URL}\n`);
console.log('-'.repeat(60));
console.log(SQL);
console.log('-'.repeat(60));
console.log('\nOpening SQL Editor in browser...');

try {
  execSync(`start "" "${SQL_EDITOR_URL}"`, { stdio: 'ignore' });
  console.log('Browser opened.');
} catch (e) {
  console.log('Could not open browser automatically. Open manually:', SQL_EDITOR_URL);
}
