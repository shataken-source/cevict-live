# 🗄️ Claude Effect Database Setup

## Quick Setup

You need to run the SQL schema to create all the tables for The Claude Effect framework.

### Option 1: Supabase Dashboard (Recommended)

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Copy the contents of `apps/progno/lib/db/claude-effect-schema.sql`
4. Paste into the SQL Editor
5. Click **Run**

### Option 2: Command Line (psql)

```bash
# If you have psql installed and SUPABASE_DB_URL set
psql $SUPABASE_DB_URL -f apps/progno/lib/db/claude-effect-schema.sql
```

### Option 3: Using Supabase CLI

```bash
# If you have Supabase CLI installed
supabase db push --file apps/progno/lib/db/claude-effect-schema.sql
```

---

## What Gets Created

The schema creates tables for all 7 phases:

### Phase 1: Sentiment Field
- `team_baselines` - Team sentiment baselines
- `sentiment_readings` - Sentiment calculations
- `social_posts` - Social media data
- `press_conferences` - Press conference transcripts
- `news_articles` - News articles

### Phase 2: Narrative Momentum
- `narrative_readings` - Narrative momentum scores
- `detected_narratives` - Detected narrative types

### Phase 3: Information Asymmetry Index
- `iai_readings` - IAI scores
- `line_movements` - Line movement history

### Phase 4: Chaos Sensitivity Index
- `csi_readings` - CSI scores
- `chaos_factors_detected` - Detected chaos factors

### Phase 5: Network Influence Graph
- `nig_readings` - Network influence scores
- `player_nodes` - Player relationship nodes
- `relationship_edges` - Team relationship edges

### Phase 6: Temporal Relevance Decay
- `temporal_events` - Temporal events for decay calculation

### Phase 7: Emergent Pattern Detection
- `emergent_patterns` - ML-discovered patterns
- `pattern_matches` - Pattern match history

### Combined
- `claude_effect_readings` - Full Claude Effect results

---

## Verification

After running the schema, verify tables were created:

```sql
-- Check if tables exist
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name LIKE '%sentiment%'
   OR table_name LIKE '%narrative%'
   OR table_name LIKE '%iai%'
   OR table_name LIKE '%csi%'
   OR table_name LIKE '%nig%'
   OR table_name LIKE '%temporal%'
   OR table_name LIKE '%emergent%'
   OR table_name LIKE '%claude%';
```

You should see all the tables listed above.

---

## Notes

- All tables use `CREATE TABLE IF NOT EXISTS` so it's safe to run multiple times
- Indexes are automatically created for performance
- The schema is compatible with PostgreSQL (Supabase uses PostgreSQL)

---

## Next Steps

After running the schema:

1. ✅ Tables are created
2. ⏳ Set up data collection (Twitter API, etc.)
3. ⏳ Start collecting data
4. ⏳ Run backtests

---

## 🐘 ROLL TIDE!

Once the schema is run, The Claude Effect framework is ready to store data!

