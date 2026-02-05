# PROGNO Database Migration Guide

## Overview

This guide explains how to set up the PROGNO predictions database in Supabase (or any PostgreSQL database).

## Prerequisites

- Supabase account (or PostgreSQL database)
- Supabase project URL and service role key
- Access to run SQL migrations

## Setup Steps

### 1. Create Supabase Project (if needed)

1. Go to [supabase.com](https://supabase.com)
2. Create a new project
3. Note your project URL and service role key

### 2. Run the Schema Migration

1. Go to Supabase Dashboard → SQL Editor
2. Copy the contents of `database/schema.sql`
3. Paste and run the SQL script
4. Verify tables were created:
   - `progno_predictions`
   - `progno_outcomes`
   - `progno_accuracy_metrics`
   - `progno_prediction_stats` (view)

### 3. Set Environment Variables

Add to your `.env.local` or Vercel environment variables:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### 4. Install Dependencies

```bash
cd apps/progno
npm install @supabase/supabase-js
```

### 5. Test the Connection

The API endpoints will automatically use the database once configured.

## Database Schema

### `progno_predictions`
Main table storing all predictions:
- **prediction_type**: Type of prediction (sports, weather, travel, anything, etc.)
- **category**: More specific category (NFL, NBA, hurricane, etc.)
- **question**: The prediction question
- **prediction_data**: JSONB with prediction-specific details
- **confidence**: 0-100% confidence level
- **status**: pending, correct, incorrect, partial, cancelled
- **outcome_data**: JSONB with actual outcome
- **is_correct**: Boolean indicating if prediction was correct
- **accuracy_score**: 0-100% accuracy score

### `progno_outcomes`
Tracks when outcomes are recorded:
- Links to predictions
- Stores outcome data
- Tracks verification status

### `progno_accuracy_metrics`
Pre-calculated metrics for performance:
- Overall stats
- By type/category
- By confidence range
- By date range

## Migration from File/LocalStorage

The existing `prediction-tracker.ts` will be updated to use the database, but you can migrate existing data:

1. Export existing predictions from files/localStorage
2. Use the `/api/progno/predictions/import` endpoint to bulk import
3. Verify data in Supabase dashboard

## Next Steps

After setup:
1. Update `prediction-tracker.ts` to use database
2. Create API endpoints for predictions
3. Update UI to show win percentages from database
4. Set up automated outcome tracking

